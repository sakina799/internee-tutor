"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { UserDocument } from "@/lib/types/user";
import { LessonPlan } from "@/lib/types/lessonPlan";
import ProgressRing from "@/components/ProgressRing";

export default function DashboardPage() {
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  const [newWeakArea, setNewWeakArea] = useState("");
  const [weakAreaSubmitting, setWeakAreaSubmitting] = useState(false);

  const [subjectInput, setSubjectInput] = useState("");
  const [sourceTextInput, setSourceTextInput] = useState("");
  const [showGenerateForm, setShowGenerateForm] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setFirebaseUser(user);

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserDoc(docSnap.data() as UserDocument);
      }
      setLoading(false);

      await fetchActivePlan(user.uid);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchActivePlan = async (uid: string) => {
    setPlanLoading(true);
    try {
      const q = query(
        collection(db, "lessonPlans"),
        where("userId", "==", uid),
        where("isActive", "==", true),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPlan(snap.docs[0].data() as LessonPlan);
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error("Failed to fetch active plan:", err);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleGeneratePlan = async () => {
    if (!firebaseUser) return;
    setGeneratingPlan(true);
    setPlanError("");
    try {
      const res = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: firebaseUser.uid,
          subject: subjectInput,
          sourceText: sourceTextInput,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to generate plan");
      setPlan(data.plan);
      setShowGenerateForm(false);
      setSubjectInput("");
      setSourceTextInput("");
    } catch (err: any) {
      setPlanError(err.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      alert("Only .txt files are supported right now.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSourceTextInput(text);
    };
    reader.readAsText(file);
  };

  const handleUpdateTopicStatus = async (
    moduleId: string,
    topicId: string,
    currentStatus: string
  ) => {
    if (!plan || !firebaseUser) return;

    const nextStatus =
      currentStatus === "not_started"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "completed"
        : "not_started";

    try {
      const res = await fetch("/api/progress/update-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          moduleId,
          topicId,
          newStatus: nextStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPlan({ ...plan, modules: data.modules });
    } catch (err: any) {
      console.error("Failed to update topic status:", err.message);
    }
  };

  const handleAddWeakArea = async () => {
    if (!firebaseUser || !newWeakArea.trim()) return;
    setWeakAreaSubmitting(true);
    try {
      const res = await fetch("/api/users/weak-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: firebaseUser.uid,
          action: "add",
          area: newWeakArea,
          source: "manual",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setUserDoc((prev) => (prev ? { ...prev, weakAreas: data.weakAreas } : prev));
      setNewWeakArea("");
    } catch (err: any) {
      console.error("Failed to add weak area:", err.message);
    } finally {
      setWeakAreaSubmitting(false);
    }
  };

  const handleRemoveWeakArea = async (weakAreaId: string) => {
    if (!firebaseUser) return;
    try {
      const res = await fetch("/api/users/weak-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: firebaseUser.uid,
          action: "remove",
          weakAreaId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setUserDoc((prev) => (prev ? { ...prev, weakAreas: data.weakAreas } : prev));
    } catch (err: any) {
      console.error("Failed to remove weak area:", err.message);
    }
  };

  const handleUpdateWeakAreaStatus = async (weakAreaId: string, currentStatus: string) => {
    if (!firebaseUser) return;

    const nextStatus =
      currentStatus === "not_started"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "completed"
        : "not_started";

    try {
      const res = await fetch("/api/users/weak-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: firebaseUser.uid,
          action: "update_status",
          weakAreaId,
          newStatus: nextStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setUserDoc((prev) => (prev ? { ...prev, weakAreas: data.weakAreas } : prev));
    } catch (err: any) {
      console.error("Failed to update weak area status:", err.message);
    }
  };

 

  if (loading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5F0FA] text-[#5B7A99] font-body">
        Loading...
      </div>
    );
  }

  const allTopics = plan?.modules.flatMap((m) => m.topics) ?? [];
  const completedCount = allTopics.filter((t) => t.status === "completed").length;
  const totalCount = allTopics.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const planFullyCompleted = totalCount > 0 && completedCount === totalCount;

  const statusStyles: Record<string, string> = {
    not_started: "bg-[#D1E8FC] text-[#5B7A99] border-[#BDE0FE] hover:border-[#A2D2FF] hover:bg-[#BDE0FE]",
    in_progress: "bg-[#A2D2FF] text-[#1E3A5F] border-[#5B9BD5] hover:bg-[#8FC9FF]",
    completed: "bg-[#22C55E]/15 text-[#16A34A] border-[#22C55E] hover:bg-[#22C55E]/25",
  };

  const statusIcons: Record<string, string> = {
    not_started: "○",
    in_progress: "◐",
    completed: "✓",
  };

  const difficultyStyles: Record<string, string> = {
    beginner: "text-[#5B9BD5]",
    intermediate: "text-[#3A7CA5]",
    advanced: "text-[#1E3A5F]",
  };

  return (
    <div className="min-h-screen bg-[#E5F0FA] px-6 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#5B9BD5] font-mono mb-1">
              Internee Tutor
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#1E3A5F]">
              {userDoc?.name ? `Welcome, ${userDoc.name.split(" ")[0]}` : "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/tutor"
              className="text-sm text-[#1E3A5F] bg-[#A2D2FF] hover:bg-[#8FC9FF] transition-colors px-4 py-2 rounded-lg font-medium"
            >
              Ask Tutor
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-[#5B7A99] border border-[#BDE0FE] hover:border-[#A2D2FF] hover:text-[#1E3A5F] bg-white transition-colors px-4 py-2 rounded-lg"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-[#BDE0FE] rounded-2xl p-6 flex items-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#5B7A99] mb-2 font-body">
                Current module
              </p>
              <p className="font-display text-lg text-[#1E3A5F]">
                {userDoc?.currentModule ?? "Not started"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#BDE0FE] rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wide text-[#5B7A99] mb-2 font-body">
              Topics completed
            </p>
            <p className="font-mono text-3xl text-[#1E3A5F]">
              {completedCount}
              <span className="text-lg text-[#5B7A99]">/{totalCount || 0}</span>
            </p>
          </div>

          <div className="bg-white border border-[#BDE0FE] rounded-2xl p-6 flex items-center justify-center">
            <ProgressRing percentage={percentage} />
          </div>
        </div>

        {/* Weak areas — manual tracking */}
        <div className="mb-10 bg-white border border-[#BDE0FE] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wide text-[#5B7A99] mb-3 font-body">
            Weak areas / topics you're struggling with
          </p>

          {userDoc && userDoc.weakAreas?.length > 0 && (
            <div className="space-y-2 mb-4">
              {userDoc.weakAreas.map((wa) => (
                <div
                  key={wa.id}
                  className="flex items-center justify-between gap-3 bg-[#E5F0FA] rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-[#1E3A5F]">{wa.topic}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateWeakAreaStatus(wa.id, wa.status)}
                      className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-mono border-2 transition-all cursor-pointer hover:scale-105 ${statusStyles[wa.status]}`}
                    >
                      {statusIcons[wa.status]} {wa.status.replace("_", " ")}
                    </button>
                    <button
                      onClick={() => handleRemoveWeakArea(wa.id)}
                      className="text-[#5B7A99] hover:text-red-500 font-bold leading-none px-1"
                      aria-label={`Remove ${wa.topic}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newWeakArea}
              onChange={(e) => setNewWeakArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWeakArea()}
              placeholder="e.g. async/await, recursion, CSS flexbox..."
              className="flex-1 border border-[#BDE0FE] rounded-lg px-3 py-2 text-sm text-[#1E3A5F] focus:outline-none focus:border-[#A2D2FF]"
            />
            <button
              onClick={handleAddWeakArea}
              disabled={weakAreaSubmitting || !newWeakArea.trim()}
              className="bg-[#A2D2FF] hover:bg-[#8FC9FF] text-[#1E3A5F] text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        {/* Learning plan section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-[#1E3A5F]">
            Your learning plan
          </h2>
        </div>

        {(!plan || planFullyCompleted) && (
          <div className="mb-6">
            {!showGenerateForm ? (
              <button
                onClick={() => setShowGenerateForm(true)}
                className="bg-[#A2D2FF] text-[#1E3A5F] font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-[#8FC9FF] transition-colors"
              >
                {plan ? "Generate new plan" : "Generate my plan"}
              </button>
            ) : (
              <div className="bg-white border border-[#BDE0FE] rounded-2xl p-6">
                <p className="text-sm font-medium text-[#1E3A5F] mb-3">
                  What do you want to study?
                </p>

                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="Subject or topic (e.g. React Hooks, SQL Joins)"
                  className="w-full border border-[#BDE0FE] rounded-lg px-3 py-2 text-sm text-[#1E3A5F] mb-3 focus:outline-none focus:border-[#A2D2FF]"
                />

                <textarea
                  value={sourceTextInput}
                  onChange={(e) => setSourceTextInput(e.target.value)}
                  placeholder="Optional: paste your study material here for a plan based exactly on this content..."
                  rows={5}
                  className="w-full border border-[#BDE0FE] rounded-lg px-3 py-2 text-sm text-[#1E3A5F] mb-3 focus:outline-none focus:border-[#A2D2FF]"
                />

                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs text-[#5B7A99] cursor-pointer">
                    <span className="underline">Or upload a .txt file</span>
                    <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {sourceTextInput && (
                    <span className="text-xs text-[#22C55E]">Content loaded ✓</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan || (!subjectInput.trim() && !sourceTextInput.trim())}
                    className="bg-[#A2D2FF] hover:bg-[#8FC9FF] text-[#1E3A5F] font-medium text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingPlan ? "Generating..." : "Generate plan"}
                  </button>
                  <button
                    onClick={() => setShowGenerateForm(false)}
                    className="text-sm text-[#5B7A99] px-4 py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {planFullyCompleted && (
  <div className="mb-6 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl px-4 py-3">
    <p className="text-sm text-[#1E3A5F]">
      🎉 You've completed this plan! Generate a new one to keep going.
    </p>
  </div>
)}

        {planError && <p className="text-sm text-red-500 mb-4">{planError}</p>}

        {plan && !showGenerateForm && (
          <div>
            <p className="text-xs font-mono text-[#5B7A99] mb-6">
              Version {plan.version} · Generated{" "}
              {new Date(plan.generatedAt).toLocaleString()}
              {plan.sourceLabel && <> · From: {plan.sourceLabel}</>}
            </p>

            <div className="space-y-5">
              {plan.modules.map((mod) => {
                const modTopics = mod.topics;
                const modCompleted = modTopics.filter((t) => t.status === "completed").length;
                const modPercentage = modTopics.length > 0
                  ? Math.round((modCompleted / modTopics.length) * 100)
                  : 0;

                return (
                  <div
                    key={mod.id}
                    className="bg-white border border-[#BDE0FE] rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display text-lg text-[#1E3A5F]">{mod.title}</h3>
                      <span className="font-mono text-xs text-[#5B9BD5]">
                        {modCompleted}/{modTopics.length}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-[#D1E8FC] rounded-full mb-5 overflow-hidden">
                      <div
                        className="h-full bg-[#A2D2FF] rounded-full transition-all duration-500"
                        style={{ width: `${modPercentage}%` }}
                      />
                    </div>

                    <div className="space-y-3">
                      {mod.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-start justify-between gap-4 border-t border-[#E5F0FA] pt-3 first:border-t-0 first:pt-0"
                        >
                          <div>
                            <p className="text-[#1E3A5F] font-medium text-sm">
                              {topic.title}
                            </p>
                            <p className="text-[#5B7A99] text-xs mt-1">
                              {topic.description}
                            </p>
                            <p className={`text-xs mt-1 font-mono ${difficultyStyles[topic.difficulty]}`}>
                              {topic.difficulty} · ~{topic.estimatedMinutes} min
                            </p>
                            {topic.practiceExercise && (
                              <p className="text-xs mt-2 bg-[#D1E8FC] text-[#3A7CA5] rounded-lg px-2.5 py-1.5">
                                <span className="font-medium">Practice: </span>
                                {topic.practiceExercise}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleUpdateTopicStatus(mod.id, topic.id, topic.status)}
                            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-mono border-2 transition-all cursor-pointer hover:scale-105 ${statusStyles[topic.status]}`}
                          >
                            {statusIcons[topic.status]} {topic.status.replace("_", " ")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!plan && !showGenerateForm && (
          <div className="bg-white border border-dashed border-[#BDE0FE] rounded-2xl p-10 text-center">
            <p className="text-[#5B7A99] text-sm">
              No plan yet. Click "Generate my plan" to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}