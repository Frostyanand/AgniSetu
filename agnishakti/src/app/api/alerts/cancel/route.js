import { NextResponse } from "next/server";
import { cancelAlert } from "@/app/backend";

// POST /api/alerts/cancel
export async function POST(req) {
  try {
    const { alertId } = await req.json();
    if (!alertId) {
      return NextResponse.json({ error: "Missing alertId" }, { status: 400 });
    }

    await cancelAlert(alertId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel alert error:", err);
    return NextResponse.json({ error: "Failed to cancel alert" }, { status: 500 });
  }
}
