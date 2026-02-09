import { createContext, useContext, ReactNode } from "react";
import { useAdminChat } from "@/hooks/useAdminChat";

type AdminChatValue = ReturnType<typeof useAdminChat>;

export const AdminChatContext = createContext<AdminChatValue | null>(null);

export function AdminChatProvider({ children }: { children: ReactNode }) {
  const value = useAdminChat();
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
