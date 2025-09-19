import { NextResponse } from "next/server";
import { registerUser } from "@/app/backend"; // our backend.js function

// POST /api/auth/register
export async function POST(req) {
  try {
    const { email, name, role, houseId } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await registerUser({ email, name, role, houseId });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("Error registering user:", err);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
