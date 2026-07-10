export interface LessonTopic {
  id: string;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  practiceExercise: string;
}

export interface LessonModule {
  id: string;
  title: string;
  order: number;
  topics: LessonTopic[];
}

export interface LessonPlan {
  id: string;
  userId: string;
  version: number;
  modules: LessonModule[];
  basedOnWeakAreas: string[];
  sourceType: "weak_areas" | "subject" | "document";
  sourceLabel: string | null;
  generatedAt: number;
  isActive: boolean;
}