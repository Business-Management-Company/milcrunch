import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLists } from "@/contexts/ListContext";
import type { ListCreator } from "@/contexts/ListContext";
import {
  sendMessageWithTools,
  getAnthropicApiKey,
  executeSearchCreators,
  type AIMessage,
  type AIMessageRole,
} from "@/lib/ai-assistant";
import type { CreatorCard } from "@/lib/influencers-club";
import { toast } from "sonner";

type AIAssistantContextValue = {
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  messages: AIMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
};

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastSearchCreatorsRef = useRef<CreatorCard[]>([]);
  const { addCreatorToList, lists, createList } = useLists();

  const togglePanel = useCallback(() => setIsOpen((v) => !v), []);
  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const apiKey = getAnthropicApiKey();
      if (!apiKey) {
        toast.error("AI Assistant is not configured. Add VITE_ANTHROPIC_API_KEY to .env");
        return;
      }

      const userMessage: AIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const history: { role: AIMessageRole; content: string }[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: trimmed },
      ];

      const executor = {
        searchCreators: async (input: Record<string, unknown>) => {
          const result = await executeSearchCreators(input);
          lastSearchCreatorsRef.current = result.creators;
          return result;
        },
        addToList: async (input: Record<string, unknown>) => {
          const names = (input.creator_names as string[]) ?? [];
          const listName = String(input.list_name ?? "").trim();
          if (!listName || names.length === 0) {
            return { summary: "Error: list_name and creator_names required." };
          }
          const list = lists.find((l) => l.name.toLowerCase() === listName.toLowerCase());
          const listId = list?.id ?? createList(listName);
          const creators = lastSearchCreatorsRef.current;
          let added = 0;
          for (const name of names) {
            const normalized = name.toLowerCase().trim();
            const creator = creators.find(
              (c) =>
                c.name.toLowerCase().includes(normalized) ||
                (c.username?.toLowerCase().includes(normalized.replace(/^@/, "")))
            );
            if (creator) {
              const listCreator: ListCreator = {
                id: creator.id,
                name: creator.name,
                username: creator.username,
                avatar: creator.avatar,
                followers: creator.followers,
                engagementRate: creator.engagementRate,
                platforms: creator.platforms,
                bio: creator.bio,
                location: creator.location,
              };
              addCreatorToList(listId, listCreator);
              added++;
            }
          }
          if (added > 0) {
            toast.success(`Added ${added} creator(s) to ${listName}`);
          }
          return { summary: `Added ${added} creator(s) to list "${listName}".` };
        },
      };

      try {
        const { messages: newMsgs } = await sendMessageWithTools(apiKey, history, executor);
        setMessages((prev) => [...prev, ...newMsgs]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get response";
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            role: "assistant",
            content: `Sorry, something went wrong: ${message}`,
          },
        ]);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, lists, addCreatorToList, createList]
  );

  const clearChat = useCallback(() => setMessages([]), []);

  const value: AIAssistantContextValue = {
    isOpen,
    togglePanel,
    openPanel,
    closePanel,
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) {
    return {
      isOpen: false,
      togglePanel: () => {},
      openPanel: () => {},
      closePanel: () => {},
      messages: [],
      isLoading: false,
      sendMessage: async (_: string) => {},
      clearChat: () => {},
    };
  }
  return ctx;
}
