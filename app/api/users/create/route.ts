import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { UserDocument } from "@/lib/types/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email, name } = body;

    // Basic validation — never trust the request body blindly
    if (!uid || !email || !name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: uid, email, or name" },
        { status: 400 }
      );
    }

    const newUser: UserDocument = {
      uid,
      email,
      name,
      createdAt: Date.now(),
      currentModule: null,
      progress: {},
      weakAreas: [],
    };

    // Write to Firestore: users/{uid}
    await adminDb.collection("users").doc(uid).set(newUser);

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}