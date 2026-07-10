import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient } from "@/lib/groq/client";
import { ChatMessage, ChatSession } from "@/lib/types/chat";
import { UserDocument } from "@/lib/types/user";
import { LessonPlan } from "@/lib/types/lessonPlan";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, question } = body;

    if (!userId || !question) {
      return NextResponse.json(
        { success: false, error: "Missing userId or question" },
        { status: 400 }
      );
    }

    // 1. Gather context: user's profile + active plan
    const userSnap = await adminDb.collection("users").doc(userId).get();
    const userData = userSnap.exists ? (userSnap.data() as UserDocument) : null;

    const planQuery = await adminDb
      .collection("lessonPlans")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    const activePlan = !planQuery.empty
      ? (planQuery.docs[0].data() as LessonPlan)
      : null;

    // 2. Fetch or create their chat session
    const sessionQuery = await adminDb
      .collection("chatSessions")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    let sessionRef;
    let existingMessages: ChatMessage[] = [];

    if (!sessionQuery.empty) {
      sessionRef = sessionQuery.docs[0].ref;
      existingMessages = (sessionQuery.docs[0].data() as ChatSession).messages;
    } else {
      sessionRef = adminDb.collection("chatSessions").doc();
    }

    // 3. Build context for the prompt
    const currentModule = userData?.currentModule ?? "not started yet";
    const weakAreas = userData?.weakAreas?.join(", ") || "none identified";
    const planSummary = activePlan
      ? activePlan.modules
          .map((m) => `${m.title}: ${m.topics.map((t) => t.title).join(", ")}`)
          .join(" | ")
      : "no active plan";

    // Keep only the last 6 messages as conversation context, to control prompt size
    const recentHistory = existingMessages.slice(-6);
    const historyText = recentHistory
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are a helpful, encouraging AI tutor for interns at Internee.pk, a tech training program.

Student's current module: ${currentModule}
Student's known weak areas: ${weakAreas}
Student's current learning plan: ${planSummary}

Answer clearly and concisely. If the question relates to their weak areas or current module, tailor your explanation to that context. Keep answers focused — a few short paragraphs at most, using simple language and examples where helpful.

Recent conversation:
${historyText}`;

    // 4. Call Groq
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0.6,
    });

    const answer = completion.choices[0].message.content ?? "Sorry, I couldn't generate a response.";

    // 5. Build the new messages and save
    const now = Date.now();
    const userMessage: ChatMessage = {
      id: `msg_${now}`,
      role: "user",
      content: question,
      timestamp: now,
    };
    const assistantMessage: ChatMessage = {
      id: `msg_${now + 1}`,
      role: "assistant",
      content: answer,
      timestamp: now + 1,
    };

    const updatedMessages = [...existingMessages, userMessage, assistantMessage];

    if (!sessionQuery.empty) {
      await sessionRef.update({
        messages: updatedMessages,
        updatedAt: now,
      });
    } else {
      const newSession: ChatSession = {
        id: sessionRef.id,
        userId,
        messages: updatedMessages,
        createdAt: now,
        updatedAt: now,
      };
      await sessionRef.set(newSession);
    }

    return NextResponse.json({ success: true, answer, messages: updatedMessages });
  } catch (error: any) {
    console.error("Ask route error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}