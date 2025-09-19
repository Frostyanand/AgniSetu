import { NextResponse } from "next/server";
import { triggerAlert } from "@/app/backend";

// POST /api/alerts/trigger
export async function POST(req) {
  try {
    const { cameraId, detectionImage } = await req.json();
    if (!cameraId || !detectionImage) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const alert = await triggerAlert(cameraId, detectionImage);
    return NextResponse.json({ success: true, alert });
  } catch (err) {
    console.error("Trigger alert error:", err);
    return NextResponse.json({ error: "Failed to trigger alert" }, { status: 500 });
  }
}
