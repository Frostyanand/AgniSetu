import { NextResponse } from "next/server";
// Use the default export which contains all functions
import backend from "@/app/backend"; 

// POST /api/alerts/trigger
export async function POST(req) {
  try {
    // Get the secret service key from the request headers

    const serviceKey = req.headers.get("x-service-key");
    console.log("Headers:", req.headers);
    console.log("Env SERVICE_KEY:", process.env.SERVICE_KEY);

    if (!serviceKey) {
      return NextResponse.json({ error: "Service key is missing" }, { status: 401 });
    }

    // Get the full payload from the request body
    const body = await req.json();
    const { cameraId, snapshotBase64, className, confidence } = body;

    if (!cameraId || !snapshotBase64 || !className) {
      return NextResponse.json({ error: "Missing required fields: cameraId, snapshotBase64, className" }, { status: 400 });
    }

    // Construct the payload object that the backend function expects
    const payload = {
      serviceKey,
      cameraId,
      snapshotBase64,
      className,
      confidence: confidence || 0, // Default confidence to 0 if not provided
      // You can add other fields like bbox or timestamp here if needed
      // bbox: body.bbox,
      // timestamp: body.timestamp
    };
    
    // Call the backend function with the single payload object
    const alert = await backend.triggerAlert(payload);
    
    return NextResponse.json({ success: true, alert });
  } catch (err) {
    console.error("Trigger alert error:", err);
    // Handle specific auth error from the backend function
    if (err.status === 401) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to trigger alert" }, { status: 500 });
  }
}