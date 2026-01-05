import express from 'express'
import {routes} from './routes/route.js'
import mongoose from 'mongoose'
import cors from 'cors'

import dotenv from 'dotenv'
dotenv.config();

const app = express()
app.use(cors())

app.use(express.json())
app.use("/v0/api",routes)


const db = mongoose.connection

db.on("connected",()=>{console.log("mongo connected")})

db.on("error",(e)=>{console.log("mongo connection error",e)})

db.on("disconnected",()=>{console.log("mongo disconnected")})

async function startServer(){

    try{
        if(!process.env.DB_URI){
            throw new Error("DB URI is not found in env")
        }
        await mongoose.connect(process.env.DB_URI)
        console.log("mongo connected")
        app.listen(3000,()=>console.log("server is runing"))
    }
    catch(e){
        console.error(e)
    }
}

startServer()