import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient } from "@/lib/groq/client";
import { LessonPlan, LessonModule } from "@/lib/types/lessonPlan";
import { UserDocument } from "@/lib/types/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, subject, sourceText } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const userSnap = await adminDb.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    const userData = userSnap.data() as UserDocument;

    // Decide generation mode based on what was provided
    let prompt: string;
    let sourceType: "weak_areas" | "subject" | "document";
    let sourceLabel: string | null = null;

    if (sourceText && sourceText.trim().length > 0) {
      // Mode: generate strictly from provided study material
      sourceType = "document";
      sourceLabel = subject?.trim() || "Uploaded material";
      prompt = `
You are a curriculum designer for an intern training program (Internee.pk).

Below is study material the student needs to learn. Break it into a structured lesson plan covering ALL the topics present in this material — do not add unrelated topics, and do not skip anything covered in the material.

STUDY MATERIAL:
"""
${sourceText.slice(0, 8000)}
"""

For each topic, include ONE short practice exercise the student can do to test their understanding (a question, small task, or coding challenge — matched to the subject).

Respond with ONLY valid JSON, no markdown, no code fences, using exactly this structure:
{
  "modules": [
    {
      "title": "string",
      "topics": [
        {
          "title": "string",
          "description": "string, one sentence",
          "difficulty": "beginner" | "intermediate" | "advanced",
          "estimatedMinutes": number,
          "practiceExercise": "string, one practice question or task"
        }
      ]
    }
  ]
}
`;
    } else if (subject && subject.trim().length > 0) {
      // Mode: generate from a named subject, no material provided
      sourceType = "subject";
      sourceLabel = subject.trim();
      prompt = `
You are a curriculum designer for an intern training program (Internee.pk).

Create a complete, well-structured lesson plan to teach the subject: "${subject.trim()}".
Cover it comprehensively, from fundamentals to more advanced points, in 2-4 modules.

For each topic, include ONE short practice exercise (a question, small task, or coding challenge).

Respond with ONLY valid JSON, no markdown, no code fences, using exactly this structure:
{
  "modules": [
    {
      "title": "string",
      "topics": [
        {
          "title": "string",
          "description": "string, one sentence",
          "difficulty": "beginner" | "intermediate" | "advanced",
          "estimatedMinutes": number,
          "practiceExercise": "string, one practice question or task"
        }
      ]
    }
  ]
}
`;
    } else {
      // Fallback: original weak-area based generic plan
      sourceType = "weak_areas";
      prompt = `
You are a curriculum designer creating a personalized learning plan for an intern at Internee.pk.

Intern's current weak areas: ${userData.weakAreas.length > 0 ? userData.weakAreas.join(", ") : "none identified yet, this is their first plan"}
Intern's current module: ${userData.currentModule ?? "none yet, this is a fresh start"}

Generate a personalized learning plan with 2-3 modules, each containing 2-4 topics.
For each topic, include ONE short practice exercise (a question, small task, or coding challenge).

Respond with ONLY valid JSON, no markdown, no code fences, using exactly this structure:
{
  "modules": [
    {
      "title": "string",
      "topics": [
        {
          "title": "string",
          "description": "string, one sentence",
          "difficulty": "beginner" | "intermediate" | "advanced",
          "estimatedMinutes": number,
          "practiceExercise": "string, one practice question or task"
        }
      ]
    }
  ]
}
`;
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const rawText = completion.choices[0].message.content ?? "";

    let parsed: { modules: { title: string; topics: any[] }[] };
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse AI response:", rawText);
      return NextResponse.json(
        { success: false, error: "AI returned invalid JSON. Please try again." },
        { status: 502 }
      );
    }

    if (!parsed.modules || !Array.isArray(parsed.modules)) {
      return NextResponse.json(
        { success: false, error: "AI response missing expected 'modules' array" },
        { status: 502 }
      );
    }

    const modules: LessonModule[] = parsed.modules.map((mod, modIndex) => ({
      id: `m${modIndex + 1}`,
      title: mod.title,
      order: modIndex + 1,
      topics: (mod.topics ?? []).map((topic: any, topicIndex: number) => ({
        id: `m${modIndex + 1}-t${topicIndex + 1}`,
        title: topic.title,
        description: topic.description,
        status: "not_started" as const,
        difficulty: topic.difficulty ?? "beginner",
        estimatedMinutes: topic.estimatedMinutes ?? 30,
        practiceExercise: topic.practiceExercise ?? "Review this topic and summarize it in your own words.",
      })),
    }));

    const existingPlansSnap = await adminDb
      .collection("lessonPlans")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    const batch = adminDb.batch();
    let newVersion = 1;

    existingPlansSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, { isActive: false });
      const data = docSnap.data() as LessonPlan;
      if (data.version >= newVersion) {
        newVersion = data.version + 1;
      }
    });

    const newPlanRef = adminDb.collection("lessonPlans").doc();
    const newPlan: LessonPlan = {
      id: newPlanRef.id,
      userId,
      version: newVersion,
      modules,
      basedOnWeakAreas: userData.weakAreas.map((w) => w.topic),
      sourceType,
      sourceLabel,
      generatedAt: Date.now(),
      isActive: true,
    };

    batch.set(newPlanRef, newPlan);
    await batch.commit();

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: any) {
    console.error("Lesson plan generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}