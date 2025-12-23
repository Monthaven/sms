import { NextResponse } from "next/server";
import { releaseExpiredLocks } from "@/lib/lead-queue";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Invalid cron secret" } },
      { status: 403 }
    );
  }

  try {
    const releasedCount = await releaseExpiredLocks();
    return NextResponse.json({ success: true, data: { releasedCount } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to release locks" } },
      { status: 500 }
    );
  }
}
