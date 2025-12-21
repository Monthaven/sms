import { NextResponse } from "next/server";
import { LeadStatus, PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  let statuses: LeadStatus[] | undefined = undefined;
  if (statusParam) {
    statuses = statusParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s as LeadStatus);
  }

  const leads = await prisma.lead.findMany({
    where: statuses && statuses.length > 0 ? { status: { in: statuses } } : undefined,
    include: {
      Contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          phoneType: true,
          email: true,
          score: true,
          Interaction: {
            orderBy: { createdAt: "asc" },
            take: 50,
          },
        },
      },
      Property: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  // Normalize PascalCase relations to camelCase for the frontend
  const normalizedLeads = leads.map((lead) => {
    const { Contact, Property, ...rest } = lead;
    return {
      ...rest,
      contact: Contact,
      property: Property,
    };
  });

  return NextResponse.json(normalizedLeads);
}
