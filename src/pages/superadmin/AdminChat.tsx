import { useRef, useEffect } from "react";
import { useAdminChatContext } from "@/contexts/AdminChatContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, Loader2, Shield, Calendar, Eye, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

const ROLE_ICONS = {
  shield: Shield,
  calendar: Calendar,
  eye: Eye,
  building: Building2,
  megaphone: MessageSquare,
} as const;

export default function AdminChat() {
  const { messages, streamingContent, confirmations, loading, loadingHistory, sendMessage, clearConfirmations, hasApiKey, roleConfig } = useAdminChatContext();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const RoleIcon = ROLE_ICONS[roleConfig.icon];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, confirmations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputRef.current?.value?.trim();
    if (!text || loading) return;
    inputRef.current!.value = "";
    sendMessage(text);
  };

  const handleQuickAction = (prompt: string) => {
    if (loading) return;
    sendMessage(prompt);
  };

  if (!hasApiKey) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">AI Assistant Chat</h1>
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              Set <code className="text-foreground">VITE_ANTHROPIC_API_KEY</code> in <code className="text-foreground">.env</code> to enable the AI assistant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Role-aware header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <RoleIcon className="h-6 w-6 text-purple-500" />
            <div>
              <h1 className="text-xl font-bold leading-tight">{roleConfig.label}</h1>
              <p className="text-xs text-muted-foreground font-medium">{roleConfig.sublabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 && !streamingContent && !loading ? (
              <div className="text-center text-muted-foreground py-12">
                <div className="inline-flex items-center gap-2 mb-2">
                  <RoleIcon className="h-5 w-5 text-purple-500" />
                  <p className="font-medium">{roleConfig.label} &middot; {roleConfig.sublabel}</p>
                </div>
                <p className="text-sm mt-1">Ask for status, manage events, search creators, or update tasks.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {roleConfig.quickActions.map((a) => (
                    <Button key={a.label} variant="outline" size="sm" onClick={() => handleQuickAction(a.prompt)}>
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%]",
                      m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted/60"
                    )}
                  >
                    <p className="text-xs font-medium opacity-80 mb-1">{m.role === "user" ? "You" : "Assistant"}</p>
                    {m.role === "assistant" ? (
                      <MarkdownRenderer content={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">{format(new Date(m.created_at), "MMM d, HH:mm")}</p>
                  </div>
                ))}
                {confirmations.length > 0 && (
                  <div className="space-y-1">
                    {confirmations.map((c, i) => (
                      <p key={i} className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {c}
                      </p>
                    ))}
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearConfirmations}>
                      Dismiss
                    </Button>
                  </div>
                )}
                {streamingContent && (
                  <div className="rounded-lg px-3 py-2 bg-muted/60 max-w-[85%]">
                    <p className="text-xs font-medium opacity-80 mb-1">Assistant</p>
                    <MarkdownRenderer content={streamingContent} />
                  </div>
                )}
                {loading && !streamingContent && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="border-t px-4 py-2 flex flex-wrap gap-2">
            {roleConfig.quickActions.map((a) => (
              <Button
                key={a.label}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickAction(a.prompt)}
                disabled={loading}
              >
                {a.label}
              </Button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                className="flex-1 min-h-[44px] max-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                placeholder="Ask to update events, manage tasks, search creators..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">Powered by Claude</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
