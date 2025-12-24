/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use server"

import { PrismaClient, LeadStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// --- AUTHENTICATION ---

type LoginState = {
  error?: string;
};

export async function loginAction(
  prevState: LoginState,
  formData: FormData
) {
  const email = formData.get('email') as string
  const passkey = (formData.get('passkey') as string | null) ?? ""
  const requiredSecret = process.env.LOGIN_SECRET

  if (requiredSecret && passkey !== requiredSecret) {
    return { error: 'Invalid passkey.' }
  }

  // Simple "exists" check for V1
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return { error: 'User not found. Ask admin for access.' }
  }

  // Set a simple session cookie and role (non-HttpOnly, mock auth)
  const cookieStore = await cookies()
  cookieStore.set('mae_user', user.id, { httpOnly: true, secure: true, path: '/', maxAge: 60 * 60 * 24 })
  cookieStore.set('mae_role', user.role, { httpOnly: true, secure: true, path: '/', maxAge: 60 * 60 * 24 })
  redirect('/dashboard')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('mae_user')
  cookieStore.delete('mae_role')
  redirect('/')
}

// Note: Set LOGIN_SECRET in your env to require a shared passkey for login.

// --- DASHBOARD DATA ---

export async function getLeadDetails(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          phoneType: true,
          email: true,
          score: true,
          priority: true,
          // ownerMatch intentionally excluded to avoid Prisma type conversion errors
        },
      },
      property: true,
    },
  })
  if (!lead) return null

  const interactions = await prisma.interaction.findMany({
    where: { contactId: lead.contactId },
    orderBy: { createdAt: 'asc' }
  })

  return { ...lead, interactions }
}

type ReplyState = {
  error?: string;
  success?: boolean;
};

export async function sendReplyAction(
  prevState: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const leadId = formData.get("leadId");
  const message = formData.get("message");
  const provider = (formData.get("provider") as string) || "twilio";

  if (!leadId || typeof leadId !== "string") {
    return { error: "Missing lead identifier." };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return { error: "Message body is required." };
  }

  const cleanMessage = message.trim();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contact: {
        select: {
          id: true,
          phoneE164: true,
        },
      },
    },
  });

  if (!lead) {
    return { error: "Lead not found." };
  }

  if (!lead.contact.phoneE164) {
    return { error: "Contact has no phone number." };
  }

  // Import and use the shared SMS utility
  const { sendSMS } = await import("@/lib/sms");
  
  const smsResult = await sendSMS({
    leadId,
    to: lead.contact.phoneE164,
    message: cleanMessage,
    provider: provider as "twilio" | "eztexting",
  });

  if (!smsResult.success) {
    console.error('SMS send failed:', smsResult.error);
    return { error: smsResult.error || 'Failed to send SMS' };
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/chat/${leadId}`)
  return { success: true }
}

type LeadStatusOptions = {
  assignToCurrent?: boolean;
  assignTo?: string | null;
  note?: string;
};

export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  options?: LeadStatusOptions
): Promise<{ success?: boolean; error?: string }> {
  try {
    const user = options?.assignToCurrent ? await getCurrentUser() : null;

    const updateData: Prisma.LeadUpdateInput = {
      status: newStatus,
    };

    if (options?.assignToCurrent) {
      if (!user) {
        return { error: "Authentication required to assign lead." };
      }
      updateData.assignedTo = { connect: { id: user.id } };
    } else if (options?.assignTo) {
      updateData.assignedTo = { connect: { id: options.assignTo } };
    } else if (options?.assignTo === null) {
      updateData.assignedTo = { disconnect: true };
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await prisma.leadAudit.create({
      data: {
        id: randomUUID(),
        leadId,
        userId: user?.id ?? null,
        action: "STATUS_CHANGE",
        details: buildAuditDetails(newStatus, options),
        updatedAt: new Date(),  // ADD THIS
      },
    });

    revalidateLeadViews(leadId);
    return { success: true };
  } catch (err: any) {
    console.warn("updateLeadStatus failed:", err);
    return { error: err?.message ?? String(err) };
  }
}

type AssignmentOptions = {
  note?: string;
  slaMinutes?: number;
};

export async function assignLeadAction(
  leadId: string,
  agentId: string,
  options?: AssignmentOptions
): Promise<{ success?: boolean; error?: string }> {
  try {
    const actingUser = await getCurrentUser();

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { notes: true },
    });

    let updatedNotes = lead?.notes ?? null;
    if (options?.note) {
      updatedNotes = [lead?.notes, options.note].filter(Boolean).join("\n");
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedTo: { connect: { id: agentId } },
        ...(options?.note ? { notes: updatedNotes } : {}),
      },
    });

    const slaNote = options?.slaMinutes
      ? `SLA: ${options.slaMinutes}m (due ${new Date(
          Date.now() + options.slaMinutes * 60 * 1000
        ).toISOString()})`
      : null;

    await prisma.leadAudit.create({
      data: {
        id: randomUUID(),
        leadId,
        userId: actingUser?.id ?? null,
        action: "ASSIGNED",
        details: [
          `Assigned to agent ${agentId}`,
          options?.note ? `Note: ${options.note}` : null,
          options?.slaMinutes ? `SLA: ${options.slaMinutes}m (due ${new Date(Date.now() + options.slaMinutes * 60 * 1000).toISOString()})` : null
        ].filter(Boolean).join(" | "),
        updatedAt: new Date(),  // ADD THIS
      },
    });

    revalidateLeadViews(leadId);
    return { success: true };
  } catch (err: any) {
    console.warn("assignLeadAction failed:", err);
    return { error: err?.message ?? String(err) };
  }
}

type CallOutcomeInput = {
  outcome: string;
  note?: string;
  status?: LeadStatus;
  calledAt?: string;
  callId?: string;
};

/**
 * Log a call outcome - uses unified lib/calls.ts
 */
export async function logCallOutcomeAction(
  leadId: string,
  payload: CallOutcomeInput
) {
  try {
    const actingUser = await getCurrentUser();
    if (!actingUser) {
      return { error: "Not authenticated" };
    }

    // Use unified call utility
    const { logCallOutcome } = await import("@/lib/calls");
    
    const result = await logCallOutcome({
      callId: payload.callId,
      leadId,
      userId: actingUser.id,
      direction: "OUTBOUND",
      outcome: payload.outcome,
      notes: payload.note,
      status: payload.status,
    });

    if (!result.success) {
      return { error: result.error || "Failed to log call" };
    }

    revalidateLeadViews(leadId);
    return { success: true } as { success: boolean };
  } catch (err: any) {
    console.warn("logCallOutcomeAction failed:", err);
    return { error: err?.message ?? String(err) };
  }
}

function revalidateLeadViews(leadId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/queue");
  revalidatePath(`/dashboard/chat/${leadId}`);
}

function buildAuditDetails(status: LeadStatus, options?: LeadStatusOptions) {
  const notes = [];
  notes.push(`Status set to ${status}`);
  if (options?.assignToCurrent) {
    notes.push("Assigned to current user");
  } else if (options?.assignTo) {
    notes.push(`Assigned to ${options.assignTo}`);
  }
  if (options?.note) {
    notes.push(options.note);
  }
  return notes.join(" | ");
}

// --- COMMAND CENTER INTELLIGENCE (Schema-aware) ---

export async function getDashboardStats() {
  const [totalLeads, hotLeads, activeQueue, recentActivity] = await Promise.all([
    // 1. Total Database Count
    prisma.lead.count(),

    // 2. Hot Leads Count (use raw SQL to avoid enum typing mismatch between clients)
    (async () => {
      const res: any = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "Lead" WHERE status::text IN ('HOT','RESP_HOT')`
      return Array.isArray(res) ? res[0]?.cnt ?? 0 : res?.cnt ?? 0
    })(),

    // 3. Call Queue: fallback to createdAt ordering if lastInteractionAt isn't present
    prisma.lead.findMany(({
      where: { status: 'QUEUED_FOR_CALL' as any },
      take: 5,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        contactId: true,
        status: true,
        createdAt: true,
        sentimentScore: true
      }
    }) as any),

    // 4. Recent Activity: Inbound texts
    // 4. Recent Activity: Inbound texts — include contact info (lead relation may not be present)
    prisma.interaction.findMany(({
      where: { direction: 'INBOUND' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneE164: true,
          }
        }
      }
    }) as any)
  ]);

  return {
    kpi: {
      total: totalLeads.toLocaleString(),
      hot: hotLeads,
      revenue: "$1.2M",
      conversion: "24%"
    },
    queue: (activeQueue as any).map((l: any) => ({
      id: l.id,
      name: `Contact ${l.contactId.slice(-4)}`,
      status: "Waiting",
      time: l.lastInteractionAt || new Date()
    })),
    activity: (recentActivity as any).map((i: any) => ({
      id: i.id,
      name: i.lead ? `Lead ${i.lead.contactId.slice(-4)}` : "Unknown",
      action: "Inbound SMS",
      status: i.lead?.status || "New",
      time: i.createdAt
    }))
  };
}
