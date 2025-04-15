import { PrismaClient } from "@prisma/client";
import { getSession } from "next-auth/react";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { mood } = req.body;

  if (!mood || typeof mood !== "string") {
    return res.status(400).json({ error: "Estado emocional inválido" });
  }

  try {
    await prisma.emotionalCheckin.create({
      data: {
        userId: session.user.id,
        mood,
      },
    });

    res.status(200).json({ message: "Estado emocional guardado" });
  } catch (error) {
    console.error("Error en /api/emotion:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
