
import express, { response, Router } from "express"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {UserModel,ContentModel,LinkModel} from "../db.js"
import {z}  from 'zod'
import auth from '../middleware/authMiddleware.js'
import type {Request,Response} from 'express';
import { randomUUID } from "crypto"
import dotenv from 'dotenv'
import { extractionQueue } from "../queue/extractionQueue.js"
dotenv.config();


const routes = express.Router()
const JWT_SECRATE = process.env.JWT_SECRATE!;

const passwordFormate = z.string()
.min(8,{message:"Password length must between 8 to 18"})
.max(18,{message:"Password length must between 8 to 18"})
.regex(/[A-Z]/,{message:"Password must containe atleast one uppercase"})
.regex(/[a-z]/,{message:"Password must contain atleast lower case"})
.regex(/[^A-Za-z0-9]/,{message:"Password must contain special char"})

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: passwordFormate
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});


routes.post("/user/signup",async(req:Request,res:Response)=>{

    const parsereqbody =  signupSchema.safeParse(req.body);

    if(!parsereqbody.success){
        const errors = parsereqbody.error.issues.map((issue: z.ZodIssue) => issue.message).join(",");

        res.status(400).json({message:errors}) 
         return
    }
    const {name, email, password} = parsereqbody.data
     try{
        const userDetails = await UserModel.findOne({"email":email.toLowerCase()});

        if(userDetails){
            res.status(409).json({message:"user already exist"})
            return;
        }
        
        const hashPassword = await bcrypt.hash(password,5)
        await UserModel.create({
            "name":name,
            "email":email.toLowerCase(),
            "password":hashPassword
        })

        res.status(201).json({message:"Successfully Signed Up"})
     }catch(e){
        console.error(e)
        res.status(500).json({message:"something went wrong"})
     }
 

})


routes.post("/user/signin",async(req:Request,res:Response)=>{

    
    const parsereqbody =  signinSchema.safeParse(req.body);

    if(!parsereqbody.success){
        res.status(400).json({message:parsereqbody.error.issues}) 
         return
    }
    const { email, password} = parsereqbody.data

     try{
           const userDetails = await UserModel.findOne({"email":email.toLowerCase()}).select('+password');

            if(!userDetails){
                res.status(401).json({message:"Invalid email or password"})
                return;
            }
            
            const hashPasswordCompare = await bcrypt.compare(password, userDetails.password)
            if(!hashPasswordCompare){
                res.status(401).json({message:"Invalid email or password"})
                return;
            }
            
            const token = jwt.sign({userId:userDetails._id},JWT_SECRATE)
            res.json({token})

     }catch(e){
        console.error(e);
        res.status(500).json({message:"something went wrong"})
     }

})

routes.get("/user/me",auth,async(req:Request,res:Response)=>{
    const userId = req.userId;
    try{
        const userDetails = await UserModel.findById(userId);
        res.json(userDetails);
      }catch(e){
        console.error(e);
        res.status(500).json({message:"something went wrong"})
     }
    
})


const contentSchema = z.object({
    link:z.string(),
    title:z.string(),
    type:z.string()
})

routes.post("/contents",auth,async (req:Request,res:Response)=>{
    const parsedBody = contentSchema.safeParse(req.body)
    if(!parsedBody.success){
         res.status(400).json({message:parsedBody.error.issues})
        return
    }
    const {link,title,type} = parsedBody.data;
    const userId = req.userId;
    if(!userId){return res.status(401).json({message:"Invalid or Expire Token"})}
    try{
        const content = await ContentModel.create({
          link,
          title,
          type,
          userId:userId,
          status: "PENDING_EXTRACTION"
        })
      const job =   await extractionQueue.add(
           "extract-link",
           { contentId: content._id.toString()},
           { jobId: content._id.toString() }
         );
         console.log("adding queue",job.id)
        const jobcount = await extractionQueue.getJobCounts()
        console.log("total jobs are ",jobcount);
        const allcontent = await ContentModel.find({userId:userId})
        res.status(202).json({contents:allcontent})
    }
    catch(err){
        res.status(500).json({message:"something went wrong"})
    }
    
})

routes.get("/contents",auth,async (req:Request,res:Response)=>{
    const userId = req.userId;
    if(!userId){return res.status(401).json({message:"Invalid or Expire Token"})}
    try{
        const allcontent = await ContentModel.find({userId:userId})
        res.json({contents:allcontent})
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:"somthing went wrong"})
    }
})

routes.delete("/contents/:id",auth,async(req:Request,res:Response)=>{
    const contentId = req.params.id;
    const userId = req.userId;
    if(!userId){return res.status(401).json({message:"Invalid or Expire Token"})}
    try{
        const deleteContent = await ContentModel.findOneAndDelete({userId:userId,_id:contentId})
        if(!deleteContent){return res.status(404).json({message:"No relevent content find"})}
        res.json({message:"contetn deleted successfully"})
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:"somthing went wrong"})
    }

})

routes.post("/contents/share",auth,async(req:Request,res:Response)=>{
   const userId = req.userId
   const isShare = req.body.isShare
   if(!userId){return res.status(401).json({message:"Invalid or Expire Token"})}
   const uniqueHash =randomUUID()

   try{
    if(!isShare){
        await LinkModel.findOneAndDelete({userId:userId})
        res.json({shareId:"",shared:false})
        return
    }
    const oldLink = await LinkModel.findOneAndDelete({userId:userId})
    if(oldLink){return res.json({shareId:oldLink.uniqueHash,shared:true})}

    await LinkModel.create({uniqueHash:uniqueHash,userId:userId})
    res.status(201).json({shareId:uniqueHash,shared:true})
   }
   catch(err){
    console.error(err);
    return res.status(500).json({message:"somthing went wrong"})
   }

})

routes.get("/contents/share",auth,async(req:Request,res:Response)=>{
   const userId = req.userId
   if(!userId){return res.status(401).json({message:"Invalid or Expire Token"})}

   try{
    const oldLink = await LinkModel.findOne({userId:userId})
    if(oldLink){return res.json({shareId:oldLink.uniqueHash,shared:true})}

    res.json({shareId:"",shared:false})
   }
   catch(err){
    console.error(err);
    return res.status(500).json({message:"somthing went wrong"})
   }

})

routes.get("/contents/share/:id",async(req:Request,res:Response)=>{
    const uniqueHash = req.params.id;
    if(!uniqueHash){return res.status(400).json({message:"provide a valid brainId"})}
    try{
       const linkdetails = await LinkModel.findOne({uniqueHash:uniqueHash})
       if(!linkdetails){return res.status(404).json({message:"could not find relevent brain"})}
       const contents = await ContentModel.find({userId:linkdetails.userId})
       res.json({contents:contents})
    }
    catch(err){
        console.log(err)
        res.status(500).json({message:"somthing went wrong"})
    }
   
})


export {routes}