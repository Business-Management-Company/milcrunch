import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { AdminChatContext } from "@/contexts/AdminChatContext";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Floating chat bubble and slide-over panel on all /admin/* pages.
 * Only rendered when inside AdminChatProvider (super admin layout).
 */
export default function FloatingAdminChat() {
  const location = useLocation();
  const chat = useContext(AdminChatContext);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, chat?.messages, chat?.streamingContent]);

  if (!chat) return null;
  const { messages, streamingContent, confirmations, loading, sendMessage } = chat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputRef.current?.value?.trim();
    if (!text || loading) return;
    inputRef.current!.value = "";
    sendMessage(text);
  };

  const isOnChatPage = location.pathname === "/admin/chat";

  return (
    <>
      {/* FAB - hide when already on full chat page */}
      {!isOnChatPage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hidden bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => setOpen(true)}
            aria-label="Open AI chat"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-3 border-b">
              <Link to="/admin/chat" className="font-semibold flex items-center gap-2" onClick={() => setOpen(false)}>
                <MessageSquare className="h-5 w-5" /> AI Assistant
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.slice(-20).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-sm max-w-[90%]",
                    m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted/60"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content.slice(0, 500)}{m.content.length > 500 ? "…" : ""}</p>
                  <p className="text-xs opacity-70 mt-0.5">{format(new Date(m.created_at), "HH:mm")}</p>
                </div>
              ))}
              {confirmations.length > 0 && (
                <div className="space-y-0.5">
                  {confirmations.slice(-5).map((c, i) => (
                    <p key={i} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {c}
                    </p>
                  ))}
                </div>
              )}
              {streamingContent && (
                <div className="rounded-lg px-2 py-1.5 bg-muted/60 text-sm">
                  <p className="whitespace-pre-wrap break-words">{streamingContent}</p>
                </div>
              )}
              {loading && !streamingContent && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-3 border-t">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 min-h-[40px] max-h-[100px] rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                  placeholder="Message..."
                  rows={1}
                  onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const t = inputRef.current;
                    if (t?.value.trim()) {
                      sendMessage(t.value.trim());
                      t.value = "";
                    }
                  }
                }}
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
