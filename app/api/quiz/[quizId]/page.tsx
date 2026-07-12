"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Quiz } from "@/lib/types/quiz";

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    missedTopics: string[];
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setFirebaseUser(user);

      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);
      if (quizSnap.exists()) {
        setQuiz(quizSnap.data() as Quiz);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, quizId]);

  const handleSelect = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz || !firebaseUser) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          userId: firebaseUser.uid,
          answers: selectedAnswers,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      console.error("Submit failed:", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5F0FA] text-[#5B7A99] font-body">
        Loading...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5F0FA] text-[#5B7A99] font-body">
        Quiz not found.
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => selectedAnswers[q.id] !== undefined);

  return (
    <div className="min-h-screen bg-[#E5F0FA] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-semibold text-[#1E3A5F]">
            Knowledge Check
          </h1>
          <a href="/dashboard" className="text-sm text-[#5B7A99] hover:text-[#1E3A5F]">
            ← Back to dashboard
          </a>
        </div>

        {result ? (
          <div className="bg-white border border-[#BDE0FE] rounded-2xl p-8 text-center">
            <p className="font-mono text-4xl text-[#1E3A5F] mb-2">{result.score}%</p>
            <p className="text-sm text-[#5B7A99] mb-6">
              {result.correctCount} out of {result.totalQuestions} correct
            </p>

            {result.missedTopics.length > 0 && (
              <div className="text-left bg-[#D1E8FC] rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-[#1E3A5F] mb-2">
                  Added to your weak areas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.missedTopics.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-3 py-1 rounded-full bg-white text-[#3A7CA5] border border-[#BDE0FE]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <a
              href="/dashboard"
              className="inline-block bg-[#A2D2FF] hover:bg-[#8FC9FF] text-[#1E3A5F] font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              Back to dashboard
            </a>
          </div>
        ) : (
          <div className="space-y-5">
            {quiz.questions.map((q, index) => (
              <div key={q.id} className="bg-white border border-[#BDE0FE] rounded-2xl p-6">
                <p className="text-xs text-[#5B9BD5] font-mono mb-2">
                  Question {index + 1} of {quiz.questions.length}
                </p>
                <p className="text-[#1E3A5F] font-medium mb-4">{q.question}</p>

                <div className="space-y-2">
                  {q.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => handleSelect(q.id, optIndex)}
                      className={`w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-colors ${
                        selectedAnswers[q.id] === optIndex
                          ? "bg-[#A2D2FF]/30 border-[#A2D2FF] text-[#1E3A5F]"
                          : "bg-[#E5F0FA] border-transparent text-[#1E3A5F] hover:border-[#BDE0FE]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="w-full bg-[#A2D2FF] hover:bg-[#8FC9FF] text-[#1E3A5F] font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Grading..." : allAnswered ? "Submit Quiz" : "Answer all questions to submit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}