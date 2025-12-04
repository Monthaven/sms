import { Router } from 'express';
import { prisma } from '../db';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email } = req.body;
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // Return the user object (Security: Don't return sensitive fields if you add passwords later)
  res.json(user);
});
