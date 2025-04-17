import prisma from '../../../lib/prisma'; 
import bcrypt from 'bcryptjs';
import Cors from 'cors';
import initMiddleware from '../../../lib/init-middleware';

const cors = initMiddleware(
  Cors({
    methods: ['POST', 'OPTIONS'],
    origin:  process.env.NEXT_PUBLIC_FRONTEND_URL | 'http://localhost:3001', 
    credentials: true,
  })
);

export default async function handler(req, res) {
    await cors(req, res);
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
        return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
        });

        return res.status(201).json({ message: 'Usuario registrado con éxito', user });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}
