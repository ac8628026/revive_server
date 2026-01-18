import { GoogleGenAI } from "@google/genai";
import 'dotenv/config'

export const genaiClient = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!});

 