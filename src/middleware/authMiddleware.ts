import type { Request,Response,NextFunction } from "express"
import jwt, { type JwtPayload } from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config();


const JWT_SECRATE = process.env.JWT_SECRATE!;
const auth=(req:Request,res:Response,next:NextFunction)=>{
    const authheader = req.headers.authorization;
    if(!authheader || typeof authheader !== "string"){
        res.status(401).json({message:"Invalid or missing token"})
        return
    }
    const token = authheader.split(" ")[1]
    if (!token) {
       return res.status(401).json({ message: "Malformed Authorization header" });
    }
    try{
        const decoded_info = jwt.verify(token, JWT_SECRATE) as JwtPayload & {userId:string}
        req.userId = decoded_info.userId;
        next() 
    }
    catch{
          res.status(401).json({ message: "Invalid or expired token" });
          return
    }
   
}

export default auth