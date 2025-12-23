import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { claimLead } from "@/lib/lead-queue";
import { UserRole } from "@prisma/client";

export async function POST(_: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }
  const allowed: UserRole[] = ["CALLER", "AGENT", "ADMIN", "MANAGER"];
  if (!allowed.includes(user.role as UserRole)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  try {
    const lead = await claimLead(params.id, user.id);
    return NextResponse.json({ success: true, data: { lead } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to claim lead";
    const status = message.includes("Lead already claimed") ? 403 : 400;
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message } }, { status });
  }
}
