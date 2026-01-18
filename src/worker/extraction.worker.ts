import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { ContentModel } from "../db.js";
import { extractFromLink } from "../service/extractdata.service.js";
import { uploadToS3 } from "../service/s3.service.js";
import { embeddingQueue } from "../queue/embadingQueue.js";

export const extractionWorker = new Worker(
  "extraction-queue",
  async (job) => {
    console.log("extraction worker started");
    const { contentId } = job.data;
    console.log(contentId);
    console.log("Before DB update");

    let lockedContent;
    try {
      lockedContent = await ContentModel.findOneAndUpdate(
        { _id: contentId, status: "PENDING_EXTRACTION" },
        { status: "EXTRACTING" },
        { new: true }
      );
    } catch (err) {
      console.error("Mongo error in worker:", err);
      throw err;
    }

    console.log("After DB update");
    console.log("lockedContent:", lockedContent);

    if (!lockedContent) return;
    console.log("content locked for extraction data from link");
    try {
      const extractedText =  await extractFromLink(
        lockedContent.link!,
        lockedContent.type!
      );

      const s3Key = `extracted-data/${lockedContent.userId}/${lockedContent._id}_row.txt`;
      await uploadToS3(s3Key, extractedText);
      console.log("uploaded to s3");
      await ContentModel.findOneAndUpdate(
        { _id: lockedContent._id },
        {
          status: "PENDING_EMBEDDING",
          s3Key: s3Key,
        }
      );

      await embeddingQueue.add(
        "embed-content",
        { contentId: lockedContent._id.toString() },
        { jobId: lockedContent._id.toString() }
      );
    } catch (error) {
      await ContentModel.updateOne(
        { _id: lockedContent._id },
        {
          status: "FAILED",
          extractionError: error,
        }
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);
