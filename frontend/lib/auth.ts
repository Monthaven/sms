import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = cookies().get("mae_user")?.value;
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user ?? null;
}
