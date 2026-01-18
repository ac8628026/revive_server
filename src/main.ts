import express from 'express'
import {routes} from './routes/content.route.js'
import mongoose from 'mongoose'
import cors from 'cors'

import dotenv from 'dotenv'
import {chatRoute} from './routes/chat.route.js'
dotenv.config();

console.log("ABOUT TO LISTEN ON PORT", process.env.PORT);


const app = express()
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://revive.kgpian.site",
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true
}));


app.use(express.json())
app.use('/v0/api/chat',chatRoute)
app.use("/v0/api",routes)


const db = mongoose.connection

db.on("error",(e)=>{console.log("mongo connection error",e)})

db.on("disconnected",()=>{console.log("mongo disconnected")})

async function startServer() {
  try {
    if (!process.env.DB_URI) {
      throw new Error("DB URI is not found in env");
    }

    await mongoose.connect(process.env.DB_URI);
    console.log("mongo connected");

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log("server is running on port", PORT);
    });
  } catch (e) {
    console.error("startup error:", e);
    process.exit(1); 
  }
}

startServer();
