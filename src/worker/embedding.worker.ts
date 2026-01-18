import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { ContentModel } from "../db.js";
import { getFromS3 } from "../service/s3.service.js";
import { pcIndex } from "../config/pinecone.js";

export const embadingWorker = new Worker(
  "embading-queue",
  async (job) => {
    const { contentId } = job.data;
    const lockedContent = await ContentModel.findOneAndUpdate(
      { _id: contentId, status: "PENDING_EMBEDDING" },
      { status: "EMBEDDING" },
      { new: true }
    );

    if (!lockedContent) return;
    console.log(lockedContent);

    try {
      console.log(lockedContent.s3Key);
      const extractedData = await getFromS3(lockedContent.s3Key!);
      console.log(extractedData);

      const chunks = (text:string,chunks_size:number):string[]=>{
        let start = 0;
        const chunk:string[] = [];
        for(start;start<extractedData.length;start+=chunks_size){
           chunk.push(extractedData.slice(start,start+chunks_size));
        }
        return chunk;
      }
      
      const chunked_data = chunks(extractedData,1000);
      const records = chunked_data.map((chunk,index)=>({
          id: `${lockedContent._id.toString()}_${index}`,
          chunk_text: chunk,
          userId: lockedContent?.userId?.toString()!,
          contentId: lockedContent._id.toString(),
          sourceType: lockedContent.type?.toString()!,
          sourceLink: lockedContent.link!,
          title: lockedContent.title || ""
      }))

      const batch_size = 50;
      let start = 0;
      for(start;start<records.length;start+=batch_size){
        const batch = records.slice(start,start+batch_size);   
        await pcIndex.upsertRecords(batch);
      }
 
      console.log("saved in pinecone")

      await ContentModel.updateOne(
        { _id: lockedContent._id },
        {
          status: "COMPLETED",
        }
      );
    } catch (error) {
      ContentModel.findOneAndUpdate(
        { _id: contentId },
        { status: "Failed" },
        { new: true }
      );
      throw error;
    }
  },
  {
    concurrency: 3,
    connection: redisConnection,
  }
);
