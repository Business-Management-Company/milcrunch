import { createContext, useContext, ReactNode } from "react";
import { useAdminChat } from "@/hooks/useAdminChat";
import type { ChatRole } from "@/lib/ai-chat-roles";

type AdminChatValue = ReturnType<typeof useAdminChat>;

export const AdminChatContext = createContext<AdminChatValue | null>(null);

export function AdminChatProvider({ children, userRole }: { children: ReactNode; userRole?: ChatRole }) {
  const value = useAdminChat(userRole ?? "super_admin");
  return (
    <AdminChatContext.Provider value={value}>
      {children}
    </AdminChatContext.Provider>
  );
}

export function useAdminChatContext() {
  const ctx = useContext(AdminChatContext);
  if (!ctx) throw new Error("useAdminChatContext must be used within AdminChatProvider");
  return ctx;
}
