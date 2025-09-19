import { NextResponse } from "next/server"; // Fix #1: Added the missing import
import {
  addCamera,
  getCamerasByOwnerEmail, // Correct function for GET
  deleteCamera,
  getHousesByOwnerEmail,
} from "@/app/backend";

// POST /api/cameras → Add new camera
export async function POST(req) {
  try {
    const { ownerEmail, cameraName, streamUrl } = await req.json();
    if (!ownerEmail || !cameraName || !streamUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const houses = await getHousesByOwnerEmail(ownerEmail);
    if (!houses || houses.length === 0) {
      return NextResponse.json({ error: "No house found for the provided owner email" }, { status: 404 });
    }

    const houseId = houses[0].houseId;

    // Fix #2: Call addCamera with a single object containing houseId
    const newCameraData = {
      houseId: houseId,
      label: cameraName,
      source: streamUrl,
      streamType: "rtsp",
    };
    const camera = await addCamera(newCameraData);

    return NextResponse.json({ success: true, camera });
  } catch (err) {
    console.error("Add camera error:", err);
    // This line will now work because NextResponse is imported
    return NextResponse.json({ error: "Failed to add camera" }, { status: 500 });
  }
}

// GET /api/cameras?ownerEmail=abc@xyz.com → List cameras
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerEmail = searchParams.get("ownerEmail");
    if (!ownerEmail) {
      return NextResponse.json({ error: "Missing ownerEmail" }, { status: 400 });
    }

    const cameras = await getCamerasByOwnerEmail(ownerEmail);
    return NextResponse.json({ success: true, cameras });
  } catch (err) {
    console.error("Get cameras error:", err);
    return NextResponse.json({ error: "Failed to fetch cameras" }, { status: 500 });
  }
}

// DELETE /api/cameras → Remove camera
export async function DELETE(req) {
  try {
    const { cameraId } = await req.json();
    if (!cameraId) {
      return NextResponse.json({ error: "Missing cameraId" }, { status: 400 });
    }

    await deleteCamera(cameraId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete camera error:", err);
    return NextResponse.json({ error: "Failed to delete camera" }, { status: 500 });
  }
}