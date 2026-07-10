export interface WeakArea {
  id: string;
  topic: string;
  status: "not_started" | "in_progress" | "completed";
  addedAt: number;
  source: "manual" | "auto_detected";
}

export interface UserProgress {
  [moduleId: string]: {
    completed: boolean;
    score?: number;
    lastUpdated?: number;
  };
}

export interface UserDocument {
  uid: string;
  email: string;
  name: string;
  createdAt: number;
  currentModule: string | null;
  progress: UserProgress;
  weakAreas: WeakArea[];
}