import { PrismaClient } from "@prisma/client";
import OpenAI from 'openai';
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

import { applyRateLimit } from "./_middlewares";
import Cors from 'cors';
import initMiddleware from '../../lib/init-middleware';
const rateLimit = require('../../middleware/rateLimit.cjs');

const cors = initMiddleware(  
  Cors({
    methods: ['POST', 'OPTIONS'],
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL | 'http://localhost:3001', 
    credentials: true,
  })
);

const prisma = new PrismaClient();

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function handler(req, res) {
  await cors(req, res);
  console.log("CORS aplicado");

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.error("Método no permitido:", req.method);
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    await limiter.check(res, 10, clientIp);
    console.log(`IP del cliente: ${clientIp} - Límite de tasa verificado`);
  } catch {
    console.error("Demasiadas peticiones desde:", clientIp);
    return res.status(429).json({ error: "Demasiadas peticiones. Intenta más tarde." });
  }

  const session = await getServerSession(req, res, authOptions);

  const { message, userId, emotionalState } = req.body;
  console.log("Datos recibidos:", { message, userId, emotionalState });

  if (!message || typeof message !== "string") {
    console.error("Mensaje inválido:", message);
    return res.status(400).json({ error: "Mensaje inválido" });
  }

  if (!userId) {
    console.error("Falta ID de sesión de chat");
    return res.status(400).json({ error: "Falta ID de sesión de chat" });
  }

  try {
    let chatSession = await prisma.chatSession.findFirst({
      where: {
        userId: userId,
      }
    });
    
    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: userId,
        },
      });
    }
    
    const chatSessionId = chatSession.id;
    
    const chatHistories = await prisma.chatHistory.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "asc" },
    });
    console.log("Historial de chat obtenido:", chatHistories);

    const messages = [
      { role: "system", content: "Eres un asistente empático experto en relaciones humanas que habla en español. Tu rol es guiar emocionalmente a las personas y ofrecer consejos útiles según su estado emocional." },
      { role: "user", content: message },
    ];

    if (emotionalState) {
      messages.push({ role: "system", content: `El usuario actualmente se siente "${emotionalState}". Ajusta tu respuesta en consecuencia.` });
      if (emotionalState === "esperanzado") {
        messages.push({ role: "system", content: "Motívalo y refuerza esa esperanza." });
      } else if (emotionalState === "frustrado") {
        messages.push({ role: "system", content: "Tranquilízalo y ayúdalo a ver opciones posibles sin invalidar sus emociones." });
      } else if (emotionalState === "triste") {
        messages.push({ role: "system", content: "Habla con ternura, dale apoyo emocional y recuerda que está bien sentirse así." });
      }
    }

    chatHistories.forEach((chat) => {
      const sender = chat.isUser ? "user" : "assistant";
      messages.push({ role: sender, content: chat.message });
    });

    console.log("Prompt enviado a OpenAI:", messages);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 200,
      temperature: 0.75,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log("Respuesta de OpenAI:", aiResponse);

    

    await prisma.chatHistory.create({
      data: {
          chatSessionId,
          message,
          isUser:  true,
          emotionalState: emotionalState || "neutral",
      },
    });

    await prisma.chatHistory.create({
      data: {
        chatSessionId,
        message: aiResponse,
        isUser:  false,
        emotionalState: emotionalState || "neutral",
      },
    });

    const updatedHistory = await prisma.chatHistory.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "asc" },
    });
    console.log("Historial de chat actualizado:", updatedHistory);

    res.status(200).json({ response: aiResponse, history: updatedHistory });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export default applyRateLimit(handler);