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
    "userId":{type:Types.ObjectId, ref:"Users" } ,
    status: {
      type: String,
      enum: [
        "PENDING_EXTRACTION",
        "EXTRACTING",
        "PENDING_EMBEDDING",
        "EMBEDDING",
        "COMPLETED",
        "FAILED",
      ],
      default: "PENDING_EXTRACTION",
      index: true},
    s3Key: {type: String},
    extractionError: {type: String},
    embeddingError: {type: String},
},{timestamps:true})



const linkSchema = new Schema({
    "uniqueHash":{type:String},
    "userId":{type:Types.ObjectId,ref:"Users",required:true}
},{timestamps:true})

const chatSchema = new Schema({
   "chatId": { type: String, required: true, unique: true, index: true }, 
   "title": { type: String },
   "userId": { type: Types.ObjectId, ref: "Users", required: true }
}, { timestamps: true });

const messageSchema = new Schema({
   "content": { type: String, required: true },
   "chatObjectId": { type: Types.ObjectId, ref: "Chats", required: true },
   "userId": { type: Types.ObjectId, ref: "Users", required: true },
   "role": { type: String, enum: ["user", "assistant"], required: true },
}, { timestamps: true });

userSchema.index({ email: 1 });
contentSchema.index({ userId: 1 });
linkSchema.index({ uniqueHash: 1 });
linkSchema.index({ userId: 1 });

const UserModel = model("Users",userSchema)
const ContentModel = model("Contents",contentSchema)
const LinkModel = model("SharedLinks",linkSchema)
const ChatModel = model("Chats",chatSchema)
const MessageModel = model('Messages',messageSchema)

export {UserModel,ContentModel,LinkModel,ChatModel,MessageModel}

