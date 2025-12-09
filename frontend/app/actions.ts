"use server"

import { PrismaClient, LeadStatus, Prisma } from "@prisma/client";
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
  
  // Simple "exists" check for V1
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return { error: 'User not found. Ask admin for access.' }
  }

  // Set a simple session cookie
  cookies().set('mae_user', user.id)
  redirect('/dashboard')
}

export async function logoutAction() {
  cookies().delete('mae_user')
  redirect('/')
}

// --- DASHBOARD DATA ---

export async function getLeadDetails(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contact: true,
      property: true
    }
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

  if (!leadId || typeof leadId !== "string") {
    return { error: "Missing lead identifier." };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return { error: "Message body is required." };
  }

  const cleanMessage = message.trim();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { contact: true },
  });

  if (!lead) {
    return { error: "Lead not found." };
  }

  await prisma.interaction.create({
    data: {
      contactId: lead.contactId,
      channel: 'EZTEXTING', // or TWILIO
      direction: 'OUTBOUND',
      body: cleanMessage,
      externalId: `sim_out_${Date.now()}`
    }
  })

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'CONVERSATION_ACTIVE' }
  })

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
        leadId,
        userId: user?.id ?? null,
        action: "STATUS_CHANGE",
        details: buildAuditDetails(newStatus, options),
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
        leadId,
        userId: actingUser?.id ?? null,
        action: "ASSIGNED",
        details: [
          `Assigned to ${agentId}`,
          options?.note ? `Note: ${options.note}` : null,
          slaNote,
        ]
          .filter(Boolean)
          .join(" | "),
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
};

export async function logCallOutcomeAction(
  leadId: string,
  payload: CallOutcomeInput
) {
  try {
    const actingUser = await getCurrentUser();
    const calledAt = payload.calledAt
      ? new Date(payload.calledAt)
      : new Date();

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
      },
    });

    await prisma.leadAudit.create({
      data: {
        leadId,
        userId: actingUser?.id ?? null,
        action: "CALL_LOG",
        details: [
          `Outcome: ${payload.outcome}`,
          payload.note ? `Notes: ${payload.note}` : null,
          `Called at: ${calledAt.toISOString()}`,
          payload.status ? `Status set to ${payload.status}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      },
    });

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
