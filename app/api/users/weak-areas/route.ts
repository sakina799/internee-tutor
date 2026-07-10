import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { WeakArea } from "@/lib/types/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, area, weakAreaId, newStatus, source } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing userId or action" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const currentWeakAreas: WeakArea[] = userSnap.data()?.weakAreas ?? [];
    let updatedWeakAreas: WeakArea[];

    if (action === "add") {
      if (!area || !area.trim()) {
        return NextResponse.json(
          { success: false, error: "Missing area name" },
          { status: 400 }
        );
      }
      const trimmedArea = area.trim();

      const alreadyExists = currentWeakAreas.some(
        (w) => w.topic.toLowerCase() === trimmedArea.toLowerCase()
      );

      if (alreadyExists) {
        updatedWeakAreas = currentWeakAreas;
      } else {
        const newWeakArea: WeakArea = {
          id: `wa_${Date.now()}`,
          topic: trimmedArea,
          status: "not_started",
          addedAt: Date.now(),
          source: source === "auto_detected" ? "auto_detected" : "manual",
        };
        updatedWeakAreas = [...currentWeakAreas, newWeakArea];
      }
    } else if (action === "remove") {
      if (!weakAreaId) {
        return NextResponse.json(
          { success: false, error: "Missing weakAreaId" },
          { status: 400 }
        );
      }
      updatedWeakAreas = currentWeakAreas.filter((w) => w.id !== weakAreaId);
    } else if (action === "update_status") {
      if (!weakAreaId || !newStatus) {
        return NextResponse.json(
          { success: false, error: "Missing weakAreaId or newStatus" },
          { status: 400 }
        );
      }
      if (!["not_started", "in_progress", "completed"].includes(newStatus)) {
        return NextResponse.json(
          { success: false, error: "Invalid status value" },
          { status: 400 }
        );
      }
      updatedWeakAreas = currentWeakAreas.map((w) =>
        w.id === weakAreaId ? { ...w, status: newStatus } : w
      );
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    await userRef.update({ weakAreas: updatedWeakAreas });

    return NextResponse.json({ success: true, weakAreas: updatedWeakAreas });
  } catch (error: any) {
    console.error("Weak area update error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}