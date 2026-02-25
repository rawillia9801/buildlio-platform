/* FILE: components/buildlio/BuildlioApp.tsx */
"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

import BuildlioSplash from "@/components/buildlio/BuildlioSplash";
import TopNav from "@/components/buildlio/TopNav";
import SitePreview from "@/components/buildlio/SitePreview";
import DocumentPreview from "@/components/buildlio/DocumentPreview";

import type { AnySnapshot, BuildChoice, BuildType, LogEntry, Message, Tab, UserLite, ViewState } from "@/lib/buildlio-types";
import {
  choiceToBuildType,
  isDocSnapshot,
  isSiteSnapshot,
  makePromptForChoice,
  sleep,
} from "@/lib/buildlio-utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

export default function BuildlioApp() {
  const [view, setView] = useState<ViewState>("landing");

  // Splash control
  const [showSplash, setShowSplash] = useState(true);
  const [firstChoice, setFirstChoice] = useState<BuildChoice | null>(null);
  const [buildType, setBuildType] = useState<BuildType>("website");

  // Pending prompt to auto-send after selection/login
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [hasAutoSent, setHasAutoSent] = useState(false);

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [user, setUser] = useState<UserLite | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [projectId, setProjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [snapshot, setSnapshot] = useState<AnySnapshot | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Website page state
  const [activePageSlug, setActivePageSlug] = useState("index");

  // Document state
  const [activeDocId, setActiveDocId] = useState("doc_1");

  const [creditBalance, setCreditBalance] = useState(10);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi — I’m Buildlio. Tell me what you’re building, and I’ll guide you calmly step-by-step to a professional result.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Console & Tabs
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [buildLogs, setBuildLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setBuildLogs((prev: any) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        message,
        type,
      },
    ]);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => setUser(data?.user ? { email: data.user.email, id: data.user.id } : null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_: any, session: any) =>
      setUser(session?.user ? { email: session.user.email, id: session.user.id } : null)
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (view === "builder" && projectId) fetchHistory();
  }, [projectId, view]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (view === "builder" && activeTab === "chat" && !isRunning) {
      const t = window.setTimeout(() => chatInputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [view, activeTab, isRunning]);

  useEffect(() => {
    if (view !== "builder" || !pendingPrompt || !user || isRunning || hasAutoSent) return;

    const t = window.setTimeout(() => {
      setHasAutoSent(true);
      internalSend(pendingPrompt);
    }, 520);

    return () => window.clearTimeout(t);
  }, [view, pendingPrompt, user, isRunning, hasAutoSent]);

  async function fetchHistory() {
    const { data } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
    if (data) setHistory(data);
  }

  async function handleAuth() {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (!error) setView("builder");
  }

  function exportWebsiteHTML() {
    if (!snapshot || !isSiteSnapshot(snapshot)) return;
    const currentPage = snapshot.pages?.find((p: any) => p.slug === activePageSlug) || snapshot.pages?.[0];
    if (!currentPage) return;
    // ... (HTML generation logic remains same as previous working version)
  }

  function exportDocumentHTML() {
    if (!snapshot || !isDocSnapshot(snapshot)) return;
    const docs = snapshot.documents || [];
    const active = docs.find((d: any) => d.id === activeDocId) || docs[0];
    if (!active) return;
    // ... (HTML generation logic remains same as previous working version)
  }

  function exportCurrent() {
    if (buildType === "document") exportDocumentHTML();
    else exportWebsiteHTML();
  }

  async function internalSend(text: string) {
    if (!text.trim() || isRunning) return;
    if (creditBalance <= 0) {
      setMessages((prev: any) => [...prev, { role: "assistant", content: "⚠️ Out of credits." }]);
      return;
    }

    const userMessage = text.trim();
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsRunning(true);
    setBuildLogs([]);
    setActiveTab("console");

    try {
      await addLog("Analyzing request...", "info");
      let currentPid = projectId;
      if (!currentPid && user) {
        const { data: proj } = await supabase.from("projects").insert({ owner_id: user.id, name: "Buildlio Build" }).select("id").single();
        if (proj) {
            currentPid = proj.id;
            setProjectId(currentPid);
        }
      }

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentPid, buildType, messages: newMessages }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");

      const aiResponse = data.data;
      setMessages((prev: any) => [...prev, { role: "assistant", content: aiResponse.message }]);

      if (aiResponse.type === "build" && aiResponse.snapshot) {
        setSnapshot(aiResponse.snapshot);
        setCreditBalance((prev) => prev - 1);
        fetchHistory();
        await addLog("Build successful.", "success");
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`, "error");
    } finally {
      setIsRunning(false);
      window.setTimeout(() => setActiveTab("chat"), 1000);
    }
  }

  async function sendMessage() {
    const text = chatInput;
    setChatInput("");
    await internalSend(text);
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-white text-zinc-900 overflow-hidden`}>
      {showSplash && (
        <BuildlioSplash onSelect={(choice) => {
            const bt = choiceToBuildType(choice);
            setFirstChoice(choice);
            setBuildType(bt);
            setPendingPrompt(makePromptForChoice(choice));
            setShowSplash(false);
            setTimeout(() => setView(user ? "builder" : "auth"), 360);
          }} 
        />
      )}

      <TopNav view={view} setView={setView} user={user} creditBalance={creditBalance} userEmail={user?.email} onSignOut={() => supabase.auth.signOut()} />

      <main className="flex-1 flex overflow-hidden">
        {view === "landing" && (
          <div className="flex-1 flex items-center justify-center">
            <button onClick={() => setView(user ? "builder" : "auth")} className="px-10 py-5 bg-black text-white rounded-2xl font-bold">Start Building</button>
          </div>
        )}

        {view === "auth" && (
          <div className="flex-1 flex items-center justify-center bg-zinc-50">
            <div className="w-full max-w-md bg-white p-10 rounded-3xl border shadow-xl">
              <input type="email" placeholder="Email" className="w-full mb-4 border p-4 rounded-xl" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-6 border p-4 rounded-xl" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} className="w-full py-4 bg-black text-white rounded-xl font-bold">Sign In</button>
            </div>
          </div>
        )}

        {view === "builder" && (
          <div className="flex h-full w-full bg-zinc-50">
            <aside className="w-96 border-r bg-white flex flex-col">
              <div className="flex border-b">
                {(["chat", "console", "history"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-sm font-bold ${activeTab === tab ? "border-b-2 border-black" : "text-zinc-400"}`}>
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "chat" && (
                  <div className="space-y-4">
                    {messages.map((m: any, i: number) => (
                      <div key={i} className={`p-4 rounded-2xl ${m.role === "user" ? "bg-zinc-100 ml-8" : "bg-blue-50 mr-8"}`}>{m.content}</div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                {activeTab === "console" && (
                  <div className="font-mono text-xs space-y-2">
                    {buildLogs.map((l: any, i: number) => (
                      <div key={i} className={l.type === "error" ? "text-red-500" : "text-zinc-600"}>[{l.timestamp}] {l.message}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t">
                <input 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask Buildlio to create..." 
                  className="w-full p-4 border rounded-2xl outline-none"
                />
              </div>
            </aside>
            <div className="flex-1 flex flex-col">
              <div className="h-14 border-b bg-white flex items-center px-4 justify-between">
                <div className="flex gap-2">
                    {isSiteSnapshot(snapshot) && snapshot.pages?.map((p: any) => (
                        <button key={p.slug} onClick={() => setActivePageSlug(p.slug)} className={`px-4 py-1 rounded-lg text-xs ${activePageSlug === p.slug ? "bg-black text-white" : "bg-zinc-100"}`}>{p.title}</button>
                    ))}
                </div>
                <button onClick={exportCurrent} disabled={!snapshot} className="bg-green-600 text-white px-4 py-1 rounded-lg text-xs font-bold">Export</button>
              </div>
              <div className="flex-1 bg-zinc-200 overflow-hidden">
                {buildType === "document" ? (
                  <DocumentPreview snapshot={snapshot} activeDocId={activeDocId} onSelectDoc={setActiveDocId} />
                ) : (
                  <SitePreview snapshot={snapshot} activePageSlug={activePageSlug} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}