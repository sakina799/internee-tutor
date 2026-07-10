import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient } from "@/lib/groq/client";
import { LessonPlan } from "@/lib/types/lessonPlan";
import { Quiz, QuizQuestion } from "@/lib/types/quiz";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, planId } = body;

    if (!userId || !planId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or planId" },
        { status: 400 }
      );
    }

    const planSnap = await adminDb.collection("lessonPlans").doc(planId).get();
    if (!planSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }
    const plan = planSnap.data() as LessonPlan;

    // Build a summary of everything covered, to ground the quiz in real content
    const topicsSummary = plan.modules
      .map(
        (mod) =>
          `${mod.title}: ${mod.topics.map((t) => `${t.title} (${t.description})`).join("; ")}`
      )
      .join("\n");

    const prompt = `
You are creating a quiz to test a student's understanding after they completed this learning plan:

${topicsSummary}

Generate exactly 8 multiple-choice questions covering these topics, mixing difficulty levels. Each question needs exactly 4 options with only one correct answer.

Respond with ONLY valid JSON, no markdown, no code fences, using exactly this structure:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswerIndex": number (0-3),
      "topic": "string, which topic this question tests"
    }
  ]
}
`;

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const rawText = completion.choices[0].message.content ?? "";

    let parsed: { questions: any[] };
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse quiz JSON:", rawText);
      return NextResponse.json(
        { success: false, error: "AI returned invalid quiz format. Please try again." },
        { status: 502 }
      );
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { success: false, error: "AI response missing expected 'questions' array" },
        { status: 502 }
      );
    }

    const questions: QuizQuestion[] = parsed.questions.map((q, index) => ({
      id: `q${index + 1}`,
      question: q.question,
      options: q.options ?? [],
      correctAnswerIndex: typeof q.correctAnswerIndex === "number" ? q.correctAnswerIndex : 0,
      topic: q.topic ?? "General",
    }));

    const quizRef = adminDb.collection("quizzes").doc();
    const newQuiz: Quiz = {
      id: quizRef.id,
      userId,
      planId,
      planVersion: plan.version,
      questions,
      answers: {},
      score: null,
      status: "not_started",
      generatedAt: Date.now(),
      completedAt: null,
    };

    await quizRef.set(newQuiz);

    return NextResponse.json({ success: true, quiz: newQuiz });
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

