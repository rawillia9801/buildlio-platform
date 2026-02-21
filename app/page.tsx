"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Buildlio() {
  const [page, setPage] = useState("builder");
  const [projectId, setProjectId] = useState("replace-with-your-uuid"); 
  const [prompt, setPrompt] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  async function runBuild() {
    setIsRunning(true);
    const res = await fetch("/api/claude-test", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt }),
    });
    const data = await res.json();
    setLastResult(data);
    setIsRunning(false);
  }

  return (
    <div className="flex h-screen bg-[#0b0c15] text-white">
      {/* Sidebar: The Chat Agent */}
      <aside className="w-[400px] border-r border-slate-800 p-6 flex flex-col">
        <h2 className="font-bold mb-4">Architect AI</h2>
        <div className="flex-1 overflow-auto bg-black/20 rounded-xl p-4 mb-4 text-xs font-mono">
          {isRunning ? "Generating Site..." : "Describe what you want to build."}
        </div>
        <textarea 
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm mb-3"
          placeholder="e.g. A coffee shop landing page..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button 
          onClick={runBuild}
          className="bg-cyan-400 text-black font-bold py-2 rounded-lg hover:bg-cyan-300"
        >
          {isRunning ? "Building..." : "Run Build"}
        </button>
      </aside>

      {/* Main: The Visual Site Preview */}
      <main className="flex-1 bg-white overflow-y-auto">
        {!lastResult?.snapshot ? (
          <div className="h-full flex items-center justify-center text-slate-400">Canvas Empty</div>
        ) : (
          <div className="text-slate-900">
            {lastResult.snapshot.pages[0].blocks.map((block: any, i: number) => (
              <div key={i} className="py-20 px-10 border-b">
                {block.type === 'hero' && (
                  <div className="text-center">
                    <h1 className="text-6xl font-black">{block.headline}</h1>
                    <p className="text-xl mt-4 text-slate-600">{block.subhead}</p>
                  </div>
                )}
                {block.type === 'features' && (
                  <div className="grid grid-cols-3 gap-10 mt-10">
                    {block.items.map((it: any, j: number) => (
                      <div key={j} className="p-6 bg-slate-50 rounded-2xl">
                        <h3 className="font-bold">{it.title}</h3>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}