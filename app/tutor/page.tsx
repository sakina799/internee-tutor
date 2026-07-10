"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { ChatMessage, ChatSession } from "@/lib/types/chat";

export default function TutorPage() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setFirebaseUser(user);
      await fetchChatHistory(user.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChatHistory = async (uid: string) => {
    try {
      const q = query(
        collection(db, "chatSessions"),
        where("userId", "==", uid),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const session = snap.docs[0].data() as ChatSession;
        setMessages(session.messages);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !question.trim()) return;

    const questionText = question;
    setQuestion("");
    setSending(true);
    setError("");

    const optimisticUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: questionText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: firebaseUser.uid, question: questionText }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5F0FA] flex items-center justify-center text-[#5B7A99] font-body">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5F0FA] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-[#1E3A5F] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5B9BD5] font-mono">
            Internee Tutor
          </p>
          <h1 className="font-display text-lg font-semibold text-[#1E3A5F]">
            Ask a question
          </h1>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-[#5B7A99] hover:text-[#1E3A5F] transition-colors"
        >
          ← Back to dashboard
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-[#5B7A99] text-sm mt-10">
            Ask anything about your current module or lesson plan — I'll tailor
            my answer to what you're working on.
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap border-2 ${
                  msg.role === "user"
                    ? "bg-[#A2D2FF] border-[#5B9BD5] text-[#1E3A5F]"
                    : "bg-white border-[#1E3A5F] text-[#1E3A5F]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {sending && (
          <div className="flex justify-start mt-4">
            <div className="bg-white border-2 border-[#1E3A5F] rounded-2xl px-4 py-3 text-sm text-[#5B7A99]">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center mb-2">{error}</p>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleAsk}
        className="border-t-2 border-[#1E3A5F] bg-white px-6 py-4"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about closures, async/await, anything..."
            className="flex-1 bg-[#E5F0FA] border-2 border-[#BDE0FE] rounded-lg px-4 py-2.5 text-sm text-[#1E3A5F] placeholder:text-[#5B7A99] focus:outline-none focus:border-[#1E3A5F]"
          />
          <button
            type="submit"
            disabled={sending || !question.trim()}
            className="bg-[#A2D2FF] hover:bg-[#8FC9FF] text-[#1E3A5F] font-medium text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#1E3A5F]"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}