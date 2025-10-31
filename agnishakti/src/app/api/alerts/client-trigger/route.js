import { NextResponse } from "next/server";
import { triggerAlert } from "@/app/backend";

// POST /api/alerts/client-trigger
// Client-safe version that doesn't require service key from client
// Uses server-side service key instead
// Optimized: Fire-and-forget pattern for zero-lag response
export async function POST(req) {
  try {
    const body = await req.json();
    const { cameraId, imageId, className, confidence, bbox, timestamp } = body;

    if (!cameraId || !imageId || !className) {
      return NextResponse.json(
        { error: "Missing required fields: cameraId, imageId, className" },
        { status: 400 }
      );
    }

    // Use server-side service key (safe, not exposed to client)
    const serverServiceKey = process.env.SERVICE_KEY || "my_secret_service_key";

    // Construct the payload with server-side service key
    const payload = {
      serviceKey: serverServiceKey,
      cameraId,
      imageId,
      className,
      confidence: confidence || 0,
      bbox: bbox || null,
      timestamp: timestamp || new Date().toISOString()
    };

    console.log(`[CLIENT ALERT] Fire/smoke detected: ${className} (${confidence?.toFixed(2)}) on camera ${cameraId}`);

    // DO NOT await. Fire and forget.
    // This triggers the alert processing in the background without blocking the response
    triggerAlert(payload);

    // Return 202 Accepted IMMEDIATELY
    // This tells the browser the request was received and is being processed
    return NextResponse.json(
      { success: true, message: "Alert trigger accepted." },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error in client-trigger:", error);
    return NextResponse.json(
      { success: false, message: "Error accepting alert." },
      { status: 500 }
    );
  }
}

