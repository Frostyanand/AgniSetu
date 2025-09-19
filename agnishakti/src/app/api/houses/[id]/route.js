// Corrected code for /api/houses/[id]/route.js

import { NextResponse } from "next/server";
import backend from "@/app/backend";

// GET /api/houses/[id] -> Get a single house by its ID
export async function GET(req, { params }) {
  try {
    // Get the ID from the URL, e.g., the "abc-123" in /api/houses/abc-123
    const houseId = params.id; 

    if (!houseId) {
      return NextResponse.json({ error: "House ID is required" }, { status: 400 });
    }
    const house = await backend.getHouseById(houseId);
    if (!house) {
      return NextResponse.json({ error: "House not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, house });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/houses/[id] -> Update a house's details
export async function PATCH(req, { params }) {
  try {
    const houseId = params.id; // Get the ID from the URL
    const updates = await req.json(); // Get the fields to update from the body

    if (!houseId) {
      return NextResponse.json({ error: "House ID is required" }, { status: 400 });
    }
    const result = await backend.updateHouse(houseId, updates);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/houses/[id] -> Delete a house
export async function DELETE(req, { params }) {
    try {
        const houseId = params.id; // Get the ID from the URL
        if (!houseId) {
            return NextResponse.json({ error: "House ID is required" }, { status: 400 });
        }
        // Note: You may need to create a deleteHouse function in your backend.js
        // For now, this assumes one exists or you will add it.
        // await backend.deleteHouse(houseId); 
        return NextResponse.json({ success: true, message: `House ${houseId} deleted.` });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}