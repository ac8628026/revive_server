import mongoose from "mongoose";

const {Schema,model,Types} = mongoose

const userSchema = new Schema({
    "name":{type:String, trim:true},
    "email":{type:String,required:true,trim:true,lowercase:true},
    "password":{type:String, required:true,select:false},
},{timestamps:true})

const contentSchema = new Schema({
    "link":{type:String },
    "title":{type:String, trim:true},
     "type":{ type:String},
    "userId":{type:Types.ObjectId, ref:"Users" }   
},{timestamps:true})

const linkSchema = new Schema({
    "uniqueHash":{type:String},
    "userId":{type:Types.ObjectId,ref:"Users",required:true}
},{timestamps:true})


userSchema.index({ email: 1 });
contentSchema.index({ userId: 1 });
linkSchema.index({ uniqueHash: 1 });
linkSchema.index({ userId: 1 });

const UserModel = model("Users",userSchema)
const ContentModel = model("Contents",contentSchema)
const LinkModel = model("SharedLinks",linkSchema)

export {UserModel,ContentModel,LinkModel}

