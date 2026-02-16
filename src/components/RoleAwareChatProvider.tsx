import { ReactNode } from "react";
import { AdminChatProvider } from "@/contexts/AdminChatContext";
import { useDevAdmin } from "@/contexts/DevAdminContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatRole } from "@/lib/ai-chat-roles";

/**
 * Wraps AdminChatProvider and automatically detects the user's effective role
 * from DevAdminContext (which checks user_roles table + dev role switcher).
 * Falls back to AuthContext role from user_metadata.
 */
export default function RoleAwareChatProvider({ children }: { children: ReactNode }) {
  const { effectiveRole } = useDevAdmin();
  const { role: authRole } = useAuth();

  // Priority: effectiveRole from DB (DevAdminContext) > authRole from user_metadata
  const chatRole: ChatRole = (effectiveRole as ChatRole) ?? (authRole as ChatRole) ?? null;

  return (
    <AdminChatProvider userRole={chatRole}>
      {children}
    </AdminChatProvider>
  );
}
