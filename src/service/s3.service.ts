import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import "dotenv/config";
import type { Readable } from "stream";

const s3Client = new S3Client({ region: process.env.AWS_REGION! });
const bucketName = process.env.S3_BUCKET;

export async function uploadToS3(key: string, textContent: string) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: textContent,
    ContentType: "text/plain",
  });

  try {
    const response = await s3Client.send(command);
    console.log("Upload success. ETag:", response.ETag);
    return response;
  } catch (error) {
    console.error("Error uploading string to S3:", error);
    throw error;
  }
}

const streamToString = async (stream: Readable): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
};

export async function getFromS3(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    console.log("Get success. ETag:", response.ETag);
    if (!response.Body) {
      throw new Error("Empty S3 object body");
    }
    return await streamToString(response.Body as Readable);
  } catch (error) {
    console.error("Error Getting string to S3:", error);
    throw error;
  }
}


