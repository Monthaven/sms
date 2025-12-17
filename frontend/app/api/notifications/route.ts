import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    // Get recent hot leads (within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const hotLeads = await prisma.lead.findMany({
      where: {
        status: "RESP_HOT",
        updatedAt: { gte: twoHoursAgo },
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, phoneE164: true, score: true },
        },
        property: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // Get recent responses (interactions from last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentResponses = await prisma.interaction.findMany({
      where: {
        direction: "INBOUND",
        createdAt: { gte: oneHourAgo },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneE164: true,
            leads: {
              take: 1,
              orderBy: { updatedAt: "desc" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const notifications = [
      ...hotLeads.map((lead) => ({
        id: `hot-${lead.id}`,
        type: "hot_lead" as const,
        title: `🔥 Hot Lead: ${lead.contact.firstName || ""} ${lead.contact.lastName || ""}`.trim(),
        body: `${lead.property?.addressLine1 || "Property"} - Score: ${lead.contact.score || "N/A"}`,
        href: `/dashboard/chat/${lead.id}`,
        time: lead.updatedAt,
      })),
      ...recentResponses.map((interaction) => ({
        id: `response-${interaction.id}`,
        type: "new_response" as const,
        title: `New Response: ${interaction.contact.firstName || ""} ${interaction.contact.lastName || ""}`.trim(),
        body: interaction.body?.substring(0, 80) + (interaction.body && interaction.body.length > 80 ? "..." : "") || "New message received",
        href: `/dashboard/chat/${interaction.contact.leads[0]?.id || interaction.contactId}`,
        time: interaction.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json([]);
  }
}
