import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminChatContext, executeAdminTool, ADMIN_CHAT_TOOLS } from "@/lib/admin-chat-tools";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const SYSTEM_PROMPT = `You are the RecurrentX project assistant. You have direct access to the task board, deployment log, and prompt library. When the user tells you about progress, bugs, or new features, you update the board automatically. You can:
- Create new tasks
- Move tasks between columns (backlog, in_progress, testing, done, bugs)
- Check off checklist items
- Add notes to tasks
- Log deployments
- Save Cursor prompts to the library
- Summarize current project status
- Suggest what to work on next based on priorities

Current project: RecurrentX (milcrunch.com) — a military creator platform with discovery, verification, events, podcasts, creator bio pages, and brand tools.`;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: unknown;
  created_at: string;
}

export function useAdminChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [confirmations, setConfirmations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("admin_chat_messages")
        .select("id, role, content, tool_calls, created_at")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load chat history", error);
        setLoadingHistory(false);
        return;
      }
      setMessages((data ?? []) as ChatMessage[]);
      setLoadingHistory(false);
    })();
  }, []);

  const saveMessage = useCallback(async (role: "user" | "assistant", content: string, toolCalls?: unknown) => {
    const { data, error } = await supabase
      .from("admin_chat_messages")
      .insert({ role, content, tool_calls: toolCalls ?? null })
      .select("id, role, content, tool_calls, created_at")
      .single();
    if (error) {
      console.error("Failed to save message", error);
      return null;
    }
    const msg = data as ChatMessage;
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const callAnthropic = useCallback(
    async (
      apiMessages: { role: string; content: unknown[] }[],
      systemWithContext: string,
      onStreamDelta?: (text: string) => void,
      onToolUse?: (toolUses: { id: string; name: string; input: Record<string, unknown> }[]) => Promise<{ toolResults: { tool_use_id: string; content: string }[]; confirmations: string[] }>
    ): Promise<{ stopReason: string; text: string; toolUses: { id: string; name: string; input: Record<string, unknown> }[] }> => {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: systemWithContext,
          messages: apiMessages,
          tools: ADMIN_CHAT_TOOLS,
          tool_choice: { type: "any" },
          stream: true,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `API ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];
      let currentToolUse: { id: string; name: string; inputJson: string } | null = null;
      let stopReason = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (raw === "[DONE]" || raw === "") continue;
            try {
              const data = JSON.parse(raw);
              if (data.type === "content_block_delta" && data.delta) {
                if (data.delta.type === "text_delta" && data.delta.text) {
                  text += data.delta.text;
                  onStreamDelta?.(data.delta.text);
                }
                if (data.delta.type === "input_json_delta" && data.delta.partial_json) {
                  if (currentToolUse) currentToolUse.inputJson += data.delta.partial_json;
                }
              }
              if (data.type === "content_block_start" && data.content_block?.type === "tool_use") {
                const b = data.content_block;
                currentToolUse = { id: b.id, name: b.name, inputJson: typeof b.input === "object" ? JSON.stringify(b.input) : (b.input ?? "") };
              }
              if (data.type === "content_block_stop" && currentToolUse) {
                let input: Record<string, unknown> = {};
                try {
                  input = JSON.parse(currentToolUse.inputJson || "{}");
                } catch {
                  input = {};
                }
                toolUses.push({ id: currentToolUse.id, name: currentToolUse.name, input });
                currentToolUse = null;
              }
              if (data.type === "message_delta" && data.delta?.stop_reason) {
                stopReason = data.delta.stop_reason;
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
      return { stopReason, text, toolUses };
    },
    [apiKey]
  );

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!apiKey || !userContent.trim() || loading) return;
      setLoading(true);
      setConfirmations([]);
      setStreamingContent("");

      await saveMessage("user", userContent.trim());

      const context = await getAdminChatContext();
      const systemWithContext = `${SYSTEM_PROMPT}\n\n${context}`;

      const apiMessages: { role: string; content: unknown[] }[] = [
        ...messages.map((m) => ({ role: m.role, content: [{ type: "text", text: m.content }] })),
        { role: "user", content: [{ type: "text", text: userContent.trim() }] },
      ];

      let fullAssistantText = "";

      const runTurn = async (messagesSoFar: { role: string; content: unknown[] }[]): Promise<void> => {
        const toolUsesAccum: { id: string; name: string; input: Record<string, unknown> }[] = [];
        fullAssistantText = "";
        const { stopReason, toolUses } = await callAnthropic(
          messagesSoFar,
          systemWithContext,
          (delta) => {
            fullAssistantText += delta;
            setStreamingContent((c) => c + delta);
          },
          undefined
        );
        toolUsesAccum.push(...toolUses);

        if (stopReason === "tool_use" && toolUsesAccum.length > 0) {
          const toolResults: { tool_use_id: string; content: string }[] = [];
          const newConfirmations: string[] = [];
          for (const tu of toolUsesAccum) {
            try {
              const out = await executeAdminTool(tu.name, tu.input);
              toolResults.push({ tool_use_id: tu.id, content: out.result });
              if (out.confirmation) newConfirmations.push(out.confirmation);
            } catch (e) {
              toolResults.push({ tool_use_id: tu.id, content: `Error: ${String(e)}` });
            }
          }
          setConfirmations((prev) => [...prev, ...newConfirmations]);
          const assistantBlock = [
            ...(fullAssistantText ? [{ type: "text" as const, text: fullAssistantText }] : []),
            ...toolUsesAccum.map((tu) => ({ type: "tool_use" as const, id: tu.id, name: tu.name, input: tu.input })),
          ];
          const nextMessages: { role: string; content: unknown[] }[] = [
            ...messagesSoFar,
            { role: "assistant", content: assistantBlock },
            {
              role: "user",
              content: toolResults.map((r) => ({ type: "tool_result" as const, tool_use_id: r.tool_use_id, content: r.content })),
            },
          ];
          setStreamingContent("");
          await runTurn(nextMessages);
          return;
        }

        setStreamingContent("");
        const finalText = fullAssistantText.trim();
        if (finalText) {
          await saveMessage("assistant", finalText, toolUsesAccum.length ? toolUsesAccum : undefined);
        }
      };

      try {
        await runTurn(apiMessages);
      } catch (e) {
        console.error(e);
        setStreamingContent("");
        await saveMessage("assistant", `Error: ${String(e)}`);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, loading, messages, saveMessage, callAnthropic]
  );

  const clearConfirmations = useCallback(() => setConfirmations([]), []);

  return {
    messages,
    streamingContent,
    confirmations,
    loading,
    loadingHistory,
    sendMessage,
    clearConfirmations,
    hasApiKey: !!apiKey,
  };
}
