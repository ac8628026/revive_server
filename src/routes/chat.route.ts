import express, { type Request, type Response } from "express";
import auth from "../middleware/authMiddleware.js";
import { v4 as uuidv4 } from "uuid";
import { ChatModel, MessageModel } from "../db.js";
import { pcIndex } from "../config/pinecone.js";
import { genaiClient } from "../config/gemini.js";

const chatRoute = express.Router();

chatRoute.get("/create", auth, async (req: Request, res: Response) => {
  const userId = req.userId;
  try {
    const newChatId = uuidv4();
    const newChat = await ChatModel.create({
      chatId: newChatId,
      title: "New Chat",
      userId: userId,
    });
    return res.status(201).json({ chatId: newChat.chatId });
  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({ error: "Failed to create chat" });
  }
});

chatRoute.post("/message", auth, async (req: Request, res: Response) => {
  const userId = req.userId;
  const { query, chatId } = req.body;
  try {
    const chat = await ChatModel.findOne({ chatId: chatId, userId: userId });
    if (!chat) {
      res
        .status(404)
        .json({ message: "chat is not found, please create a new chat" });
      return;
    }
    if (!userId) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    await MessageModel.create({
      content: query,
      chatObjectId: chat._id,
      userId: userId,
      role: "user",
    });

    let updatedTitle = null;
    if (chat.title === "New Chat") {
      updatedTitle = query.substring(0, 30) + "...";
      await ChatModel.findOneAndUpdate(
        { _id: chat._id },
        { title: updatedTitle }
      );
    }

    const matched_chunks = await pcIndex.searchRecords({
      query: {
        topK: 3,
        inputs: { text: query },
        filter: {
          userId: { $eq: userId.toString() },
        },
      },
      fields: ["chunk_text", "sourceLink", "title"],
    });

    const contextText = matched_chunks.result.hits
      .map((hit) => (hit.fields as any).chunk_text)
      .join("\n\n---\n\n");

    const systemPrompt = `
  You are an intelligent helpful assistant.
  CONTEXT FROM DOCUMENTS:
    ${contextText}

    USER QUESTION:
    ${query}
    
    INSTRUCTIONS:
  1. Use ONLY the Context provided above to answer the user's question.
  2. If the answer is not in the Context, politely say "I couldn’t find that information in your response or your thought may not completely prepared for conversation. Please wait a moment while we process your thoughts for conversation"
  3. Do not make up facts.
  `;

    const response = await genaiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: systemPrompt,
    });

    const savedMessage = await MessageModel.create({
      content: response.text,
      chatObjectId: chat._id,
      userId: userId,
      role: "assistant",
    });
    res.json({
      ...savedMessage.toObject(),
      newTitle: updatedTitle,
      realChatId: chatId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

chatRoute.get(
  "/conversations/:chatId",
  auth,
  async (req: Request, res: Response) => {
    const userId = req.userId;
    const { chatId } = req.params;
    try {
      const chat = await ChatModel.findOne({ chatId: chatId, userId: userId });
      if (!chat) {
        res.status(404).json({ message: "chat is not found" });
        return;
      }
      if (!userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
      const messages = await MessageModel.find({
        chatObjectId: chat._id,
        userId: userId,
      });
      res.json(messages);
    } catch (error) {
      console.error("Error creating chat:", error);
      return res.status(500).json({ error: "Failed to create chat" });
    }
  }
);

chatRoute.get("/all-chats", auth, async (req: Request, res: Response) => {
  const userId = req.userId;
  const chats = await ChatModel.find({ userId }).sort({ updatedAt: -1 });
  res.json(chats);
});

export { chatRoute };
