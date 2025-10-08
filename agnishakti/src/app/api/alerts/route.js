import { NextResponse } from "next/server";
import { getAlertsByOwnerEmail } from "@/app/backend";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerEmail = searchParams.get("ownerEmail");
    
    if (!ownerEmail) {
      return NextResponse.json({ error: "ownerEmail required" }, { status: 400 });
    }
    
    const alerts = await getAlertsByOwnerEmail(ownerEmail);
    return NextResponse.json({ success: true, alerts });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
