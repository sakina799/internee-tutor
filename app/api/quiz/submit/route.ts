import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Quiz } from "@/lib/types/quiz";
import { WeakArea } from "@/lib/types/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, userId, answers } = body;

    if (!quizId || !userId || !answers) {
      return NextResponse.json(
        { success: false, error: "Missing quizId, userId, or answers" },
        { status: 400 }
      );
    }

    const quizRef = adminDb.collection("quizzes").doc(quizId);
    const quizSnap = await quizRef.get();

    if (!quizSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quiz = quizSnap.data() as Quiz;

    // Grade it
    let correctCount = 0;
    const missedTopics: string[] = [];

    quiz.questions.forEach((q) => {
      const studentAnswer = answers[q.id];
      if (studentAnswer === q.correctAnswerIndex) {
        correctCount++;
      } else {
        missedTopics.push(q.topic);
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    await quizRef.update({
      answers,
      score,
      status: "completed",
      completedAt: Date.now(),
    });

    // Auto-add missed topics as weak areas
    if (missedTopics.length > 0) {
      const userRef = adminDb.collection("users").doc(userId);
      const userSnap = await userRef.get();
      const currentWeakAreas: WeakArea[] = userSnap.data()?.weakAreas ?? [];

      const uniqueMissed = [...new Set(missedTopics)];
      const newWeakAreas = uniqueMissed.filter(
        (topic) =>
          !currentWeakAreas.some((w) => w.topic.toLowerCase() === topic.toLowerCase())
      );

      if (newWeakAreas.length > 0) {
        const toAdd: WeakArea[] = newWeakAreas.map((topic, i) => ({
          id: `wa_${Date.now()}_${i}`,
          topic,
          status: "not_started",
          addedAt: Date.now(),
          source: "auto_detected",
        }));
        await userRef.update({
          weakAreas: [...currentWeakAreas, ...toAdd],
        });
      }
    }

    return NextResponse.json({
      success: true,
      score,
      correctCount,
      totalQuestions: quiz.questions.length,
      missedTopics: [...new Set(missedTopics)],
    });
  } catch (error: any) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}