export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  topic: string;
}

export interface Quiz {
  id: string;
  userId: string;
  planId: string;
  planVersion: number;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  score: number | null;
  status: "not_started" | "in_progress" | "completed";
  generatedAt: number;
  completedAt: number | null;
}