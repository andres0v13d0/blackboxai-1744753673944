import { PrismaClient } from "@prisma/client";
import { Configuration, OpenAIApi } from "openai";
import { getSession } from "next-auth/react";

const prisma = new PrismaClient();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

import { applyRateLimit } from "./_middlewares";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { message, chatSessionId, partnerId } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Mensaje inválido" });
  }

  try {
    // Fetch previous chat history for context
    const chatHistories = await prisma.chatHistory.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "asc" },
    });

    // Build prompt with context in Spanish
    let prompt = "Eres un asistente empático que ofrece orientación en relaciones en español.\n";
    prompt += "Mantén el contexto emocional y la coherencia en la conversación.\n\n";

    chatHistories.forEach((chat) => {
      const sender = chat.isUser ? "Usuario" : "Asistente";
      prompt += `${sender}: ${chat.message}\n`;
    });

    prompt += `Usuario: ${message}\nAsistente:`;

    // Call OpenAI GPT-4 API
    const completion = await openai.createCompletion({
      model: "gpt-4",
      prompt,
      max_tokens: 150,
      temperature: 0.7,
      stop: ["Usuario:", "Asistente:"],
      language: "es",
    });

    const aiResponse = completion.data.choices[0].text.trim();

    // Save user message
    await prisma.chatHistory.create({
      data: {
        chatSessionId,
        message,
        isUser: true,
      },
    });

    // Save AI response
    await prisma.chatHistory.create({
      data: {
        chatSessionId,
        message: aiResponse,
        isUser: false,
      },
    });

    // TODO: Analyze emotional state from AI response or user message and save summary

    res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export default applyRateLimit(handler);
