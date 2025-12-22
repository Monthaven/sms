import { NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type AgentPresence = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  leadsAssigned: number;
  status: "online" | "away" | "offline";
};

export async function GET() {
  const agents = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      updatedAt: true,
      assignedLeads: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  const now = Date.now();
  const payload: AgentPresence[] = agents.map((agent) => {
    const updatedDiff = now - agent.updatedAt.getTime();
    let status: AgentPresence["status"] = "offline";
    if (updatedDiff < 5 * 60 * 1000) {
      status = "online";
    } else if (updatedDiff < 20 * 60 * 1000) {
      status = "away";
    }

    return {
      id: agent.id,
      name: agent.name ?? agent.email,
      email: agent.email,
      role: agent.role,
      leadsAssigned: agent.assignedLeads.length,
      status,
    };
  });

  return NextResponse.json(payload);
}
