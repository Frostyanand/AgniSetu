import { NextResponse } from "next/server";
import backend from "@/app/backend";

export async function POST(req) {
  try {
    const { ownerEmail, address, coords, monitorPassword, nearestFireStationId } = await req.json();
    const result = await backend.createHouse({ ownerEmail, address, coords, monitorPassword, nearestFireStationId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerEmail = searchParams.get("ownerEmail");
    if (!ownerEmail) return NextResponse.json({ error: "ownerEmail required" }, { status: 400 });
    const houses = await backend.getHousesByOwnerEmail(ownerEmail);
    return NextResponse.json({ success: true, houses });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
