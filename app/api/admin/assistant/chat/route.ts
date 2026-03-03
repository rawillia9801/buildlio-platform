type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: any };

function isToolUseBlock(c: any): c is ToolUseBlock {
  return !!c && c.type === "tool_use" && typeof c.id === "string" && typeof c.name === "string";
}

// If Claude used tools, execute them and send results back once (simple, stable)
const toolUses = ((first as any).content || []).filter(isToolUseBlock) as ToolUseBlock[];

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
      { role: "assistant", content: (first as any).content as any },
      { role: "user", content: toolResults as any },
    ],
  });

  assistantText =
    ((second as any).content || []).find((c: any) => c.type === "text")?.text || "Done.";
} else {
  assistantText =
    ((first as any).content || []).find((c: any) => c.type === "text")?.text || "Done.";
}