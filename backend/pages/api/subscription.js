import { PrismaClient } from "@prisma/client";
import mercadopago from "mercadopago";

const prisma = new PrismaClient();

mercadopago.configurations.setAccessToken(process.env.MERCADOPAGO_ACCESS_TOKEN);

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Create subscription or handle subscription creation logic
    const { userId, planId, paymentMethodId } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    try {
      // TODO: Create MercadoPago subscription and save to DB
      // Placeholder response
      return res.status(200).json({ message: "Suscripción creada (simulada)" });
    } catch (error) {
      console.error("Error creando suscripción:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  } else if (req.method === "GET") {
    // Retrieve subscription info for user
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Falta userId" });
    }
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });
      return res.status(200).json({ subscription });
    } catch (error) {
      console.error("Error obteniendo suscripción:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  } else if (req.method === "POST" && req.headers["x-mercadopago-signature"]) {
    // Handle MercadoPago webhook events
    // TODO: Verify signature and update subscription status accordingly
    return res.status(200).json({ message: "Webhook recibido" });
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).json({ error: "Método no permitido" });
  }
}
