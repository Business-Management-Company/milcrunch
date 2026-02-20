import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "presentation_mode";
const DEMO_NAME = "Demo User";
const DEMO_EMAIL = "demo@milcrunch.com";

/** Reads presentation mode synchronously (for non-hook contexts). */
export function isPresentationMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Super-admin-only presentation mode.
 * When enabled, overrides display name and email throughout the UI.
 * The actual auth credentials remain unchanged.
 */
export function usePresentationMode() {
  const { user, isSuperAdmin, creatorProfile } = useAuth();
  const [enabled, setEnabled] = useState(() => isPresentationMode());

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabled(e.newValue === "true");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* quota errors */ }
  }, [enabled]);

  // Only super_admin can use presentation mode
  const active = enabled && isSuperAdmin;

  const realName =
    creatorProfile?.display_name ||
    (user?.user_metadata?.full_name as string) ||
    "";
  const realEmail = user?.email ?? "";

  return {
    /** Whether presentation mode is currently active */
    active,
    /** Toggle it on/off (persists to localStorage) */
    toggle,
    /** Whether the toggle is enabled in storage (regardless of role) */
    enabled,
    /** Display name — overridden when active */
    displayName: active ? DEMO_NAME : (realName || realEmail || "User"),
    /** Email — overridden when active */
    displayEmail: active ? DEMO_EMAIL : realEmail,
    /** First name for greetings */
    firstName: active ? "Demo" : (realName.split(" ")[0] || "there"),
    /** Initials for avatar */
    initials: active ? "DU" : undefined, // undefined = let caller compute
  };
}
