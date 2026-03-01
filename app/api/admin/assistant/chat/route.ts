export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { Anthropic } from "@anthropic-ai/sdk";

const Body = z.object({
  thread_id: z.string().uuid().nullable().optional(),
  message: z.string().min(1),
});

type ToolResult = { ok: true; summary: string; did_mutate: boolean } | { ok: false; error: string };

function sysPrompt() {
  return `
You are SWVA Chihuahua's admin assistant.
You can create and update litters and puppies.
Never invent prices. If price is not provided, leave it null.
When you need to change data, call a tool.
Return short, clear confirmations.
`;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const input = Body.parse(await req.json());
    const userId = auth.user.id;

    // Load or create thread
    let threadId = input.thread_id || null;

    if (!threadId) {
      const { data: th, error } = await supabase
        .from("chat_threads")
        .insert({ owner_id: userId, title: "Admin Assistant" })
        .select("id")
        .single();
      if (error || !th) return NextResponse.json({ error: error?.message || "Failed to create thread" }, { status: 500 });
      threadId = th.id;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      owner_id: userId,
      role: "user",
      content: input.message,
    });

    // Pull recent messages for context
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(30);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Define tools Claude can call
    const tools: any[] = [
      {
        name: "create_litter",
        description: "Create a litter (requires sire_id and dam_id as UUIDs)",
        input_schema: {
          type: "object",
          properties: {
            litter_name: { type: "string" },
            dob: { type: "string", description: "YYYY-MM-DD" },
            sire_id: { type: "string" },
            dam_id: { type: "string" },
            notes: { type: "string" },
          },
          required: ["litter_name", "dob", "sire_id", "dam_id"],
        },
      },
      {
        name: "create_puppy",
        description: "Create a puppy in a litter",
        input_schema: {
          type: "object",
          properties: {
            litter_id: { type: "string" },
            name: { type: "string" },
            sex: { type: "string" },
            collar_color: { type: "string" },
            color: { type: "string" },
            birth_weight_oz: { type: "number" },
            registry_type: { type: "string" },
            price: { type: "number" },
            status: { type: "string" },
            notes: { type: "string" },
          },
          required: ["litter_id", "name"],
        },
      },
      {
        name: "update_puppy",
        description: "Update a puppy by id (only provided fields are updated)",
        input_schema: {
          type: "object",
          properties: {
            puppy_id: { type: "string" },
            patch: { type: "object" },
          },
          required: ["puppy_id", "patch"],
        },
      },
      {
        name: "log_puppy_event",
        description: "Log an event like weight, deworming, vaccine, note",
        input_schema: {
          type: "object",
          properties: {
            puppy_id: { type: "string" },
            event_type: { type: "string" },
            event_date: { type: "string", description: "YYYY-MM-DD" },
            weight_oz: { type: "number" },
            notes: { type: "string" },
          },
          required: ["puppy_id", "event_type", "event_date"],
        },
      },
    ];

    // helper: execute tool
    async function runTool(name: string, input: any): Promise<ToolResult> {
      try {
        if (name === "create_litter") {
          const { error } = await supabase.from("litters").insert({
            owner_id: userId,
            litter_name: input.litter_name,
            dob: input.dob,
            sire_id: input.sire_id,
            dam_id: input.dam_id,
            notes: input.notes ?? null,
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true, summary: `Created litter: ${input.litter_name} (${input.dob})`, did_mutate: true };
        }

        if (name === "create_puppy") {
          const { error } = await supabase.from("puppies").insert({
            owner_id: userId,
            litter_id: input.litter_id,
            name: input.name,
            sex: input.sex ?? null,
            collar_color: input.collar_color ?? null,
            color: input.color ?? null,
            birth_weight_oz: input.birth_weight_oz ?? null,
            registry_type: input.registry_type ?? null,
            price: input.price ?? null,
            status: input.status ?? "available",
            notes: input.notes ?? null,
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true, summary: `Added puppy: ${input.name}`, did_mutate: true };
        }

        if (name === "update_puppy") {
          const { puppy_id, patch } = input;
          if (!puppy_id || !patch || typeof patch !== "object") return { ok: false, error: "Invalid patch" };

          // never allow assistant to invent price; if price not explicitly in patch, leave it alone.
          const { error } = await supabase.from("puppies").update(patch).eq("id", puppy_id);
          if (error) return { ok: false, error: error.message };
          return { ok: true, summary: `Updated puppy ${puppy_id.slice(-6)}`, did_mutate: true };
        }

        if (name === "log_puppy_event") {
          const { error } = await supabase.from("puppy_events").insert({
            owner_id: userId,
            puppy_id: input.puppy_id,
            event_type: input.event_type,
            event_date: input.event_date,
            weight_oz: input.weight_oz ?? null,
            notes: input.notes ?? null,
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true, summary: `Logged ${input.event_type} for puppy ${input.puppy_id.slice(-6)} on ${input.event_date}`, did_mutate: true };
        }

        return { ok: false, error: `Unknown tool: ${name}` };
      } catch (e: any) {
        return { ok: false, error: e?.message || "Tool failed" };
      }
    }

    // Claude loop: allow tool calls
    let didMutate = false;
    let assistantText = "";

    const conversation = (msgs || []).map((m: any) => ({
      role: m.role,
      content: [{ type: "text", text: m.content }],
    }));

    const first = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 700,
      system: sysPrompt(),
      tools,
      messages: conversation as any,
    });

    // If Claude used tools, execute them and send results back once (simple, stable)
    const toolUses = (first.content || []).filter((c: any) => c.type === "tool_use");
    if (toolUses.length) {
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const r = await runTool(tu.name, tu.input);
        if (r.ok && r.did_mutate) didMutate = true;

        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: r.ok ? r.summary : `ERROR: ${r.error}`,
        });
      }

      const second = await client.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 700,
        system: sysPrompt(),
        tools,
        messages: [
          ...(conversation as any),
          { role: "assistant", content: first.content as any },
          { role: "user", content: toolResults as any },
        ],
      });

      assistantText =
        (second.content || []).find((c: any) => c.type === "text")?.text ||
        "Done.";
    } else {
      assistantText =
        (first.content || []).find((c: any) => c.type === "text")?.text ||
        "Done.";
    }

    // Save assistant response
    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      owner_id: userId,
      role: "assistant",
      content: assistantText,
    });

    return NextResponse.json({ thread_id: threadId, reply: assistantText, did_mutate: didMutate });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}