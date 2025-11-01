import { NextResponse } from "next/server";
import { updateAlertImage } from "@/app/backend";

// POST /api/alerts/update-image
// Updates the detection image for an active alert
export async function POST(req) {
  try {
    const { alertId, imageId } = await req.json();
    
    if (!alertId || !imageId) {
      return NextResponse.json(
        { success: false, message: "Alert ID and Image ID are required" },
        { status: 400 }
      );
    }

    const result = await updateAlertImage(alertId, imageId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("[NEXT_API] ❌ Error updating alert image:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update alert image" },
      { status: 500 }
    );
  }
}

