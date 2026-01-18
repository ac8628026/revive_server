import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

console.log("Worker starting...");

if (!process.env.DB_URI) {
  throw new Error("DB_URI missing in worker");
}

await mongoose.connect(process.env.DB_URI);
console.log("Worker Mongo connected");

import "./extraction.worker.js";
import "./embedding.worker.js";

console.log("Workers initialized");
