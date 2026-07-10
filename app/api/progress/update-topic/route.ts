import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { LessonPlan } from "@/lib/types/lessonPlan";
import { WeakArea } from "@/lib/types/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, moduleId, topicId, newStatus, userId, topicTitle, markedAsWeak } = body;

    if (!planId || !moduleId || !topicId || !newStatus) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["not_started", "in_progress", "completed"].includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    const planRef = adminDb.collection("lessonPlans").doc(planId);
    const planSnap = await planRef.get();

    if (!planSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const plan = planSnap.data() as LessonPlan;

    let topicFound = false;
    const updatedModules = plan.modules.map((mod) => {
      if (mod.id !== moduleId) return mod;
      return {
        ...mod,
        topics: mod.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          topicFound = true;
          return { ...topic, status: newStatus };
        }),
      };
    });

    if (!topicFound) {
      return NextResponse.json(
        { success: false, error: "Topic not found in plan" },
        { status: 404 }
      );
    }

    await planRef.update({ modules: updatedModules });

    let updatedWeakAreas: WeakArea[] | undefined;
 
    // Update currentModule when starting something
    if (newStatus === "in_progress") {
      const moduleTitle = updatedModules.find((m) => m.id === moduleId)?.title;
      if (moduleTitle) {
        await adminDb.collection("users").doc(plan.userId).update({
          currentModule: moduleTitle,
        });
      }
    }

   // Add to weakAreas if the student flagged this topic as difficult
if (newStatus === "completed" && markedAsWeak && topicTitle && userId) {
  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();
  const currentWeakAreas: WeakArea[] = userSnap.data()?.weakAreas ?? [];

  const alreadyExists = currentWeakAreas.some(
    (w) => w.topic.toLowerCase() === topicTitle.toLowerCase()
  );

  if (!alreadyExists) {
    const newWeakArea: WeakArea = {
      id: `wa_${Date.now()}`,
      topic: topicTitle,
      status: "not_started",
      addedAt: Date.now(),
      source: "auto_detected",
    };
    updatedWeakAreas = [...currentWeakAreas, newWeakArea];
    await userRef.update({ weakAreas: updatedWeakAreas });
  } else {
    updatedWeakAreas = currentWeakAreas;
  }
}

    return NextResponse.json({
      success: true,
      modules: updatedModules,
      weakAreas: updatedWeakAreas,
    });
  } catch (error: any) {
    console.error("Update topic status error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}