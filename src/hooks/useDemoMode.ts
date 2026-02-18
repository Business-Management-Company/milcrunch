import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const DEMO_EMAIL = "demo@recurrentx.com";

const MESSAGES: Record<string, string> = {
  delete: "Deleting items is disabled in demo mode.",
  save: "Saving changes is disabled in demo mode.",
  create: "Creating new items is disabled in demo mode.",
  update: "Updating items is disabled in demo mode.",
  connect_social: "Social connections are pre-configured in demo mode.",
  notification: "Notifications are disabled in demo mode.",
  social_post: "Publishing posts is disabled in demo mode.",
  generic: "This action is disabled in demo mode.",
};

export type DemoAction =
  | "delete"
  | "save"
  | "create"
  | "update"
  | "connect_social"
  | "notification"
  | "social_post"
  | "generic";

export function useDemoMode() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const isDemo = user?.email === DEMO_EMAIL;

  /** Returns true if the action was BLOCKED (demo mode). */
  const guardAction = (action: DemoAction, customMessage?: string): boolean => {
    if (!isDemo) return false;
    toast.info(customMessage ?? MESSAGES[action] ?? MESSAGES.generic, {
      icon: "🎯",
      duration: 3000,
    });
    return true;
  };

  const exitDemo = async () => {
    await signOut();
    navigate("/login");
  };

  return { isDemo, guardAction, exitDemo };
}
