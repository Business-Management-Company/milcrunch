import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "creator" | "brand" | "admin" | "super_admin";

/** Map Supabase app_role enum → our simplified UserRole. */
function mapAppRole(appRole: string | null): UserRole {
  if (!appRole) return "creator";
  switch (appRole) {
    case "super_admin": return "super_admin";
    case "org_admin": return "admin";
    case "brand_admin":
    case "event_planner":
    case "sponsor": return "brand";
    default: return "creator"; // judge, attendee, or unknown
  }
}

export interface CreatorProfileRow {
  id: string;
  user_id: string;
  handle: string | null;
  display_name: string | null;
  role: UserRole | null;
  onboarding_step: number;
  onboarding_completed: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Set after loading; from profiles + user_roles tables */
  creatorProfile: CreatorProfileRow | null;
  /** Resolved role from user_roles table (includes super_admin). */
  role: UserRole | null;
  isSuperAdmin: boolean;
  refetchCreatorProfile: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signUpCreator: (opts: {
    email: string;
    password: string;
    displayName: string;
    audienceType?: string;
    branch?: string;
    tosAccepted: boolean;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  /** Where to send user after login: /creator/onboard, /creator/dashboard, or /brand/dashboard */
  getRedirectPath: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Role priority: higher index = higher privilege. */
const ROLE_PRIORITY: Record<string, number> = {
  attendee: 0, judge: 1, sponsor: 2, event_planner: 3,
  brand_admin: 4, org_admin: 5, super_admin: 6,
};

/** Fetch the user's highest-privilege role from user_roles table.
 *  A user can have multiple roles (unique on user_id+role). */
async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.warn("[AuthContext] user_roles fetch failed:", error.message);
    return "creator";
  }
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  // Pick the highest-privilege role
  let best: string | null = null;
  let bestPriority = -1;
  for (const r of roles) {
    const p = ROLE_PRIORITY[r] ?? -1;
    if (p > bestPriority) {
      best = r;
      bestPriority = p;
    }
  }
  const mapped = mapAppRole(best);
  console.log("[AuthContext] fetchUserRole:", { userId, roles, best, mapped });
  return mapped;
}

async function fetchCreatorProfile(userId: string, userMeta: Record<string, unknown> = {}): Promise<CreatorProfileRow | null> {
  // 1. Get role from user_roles table
  const role = await fetchUserRole(userId);

  // 2. Get basic profile from profiles table
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, bio, military_branch")
    .eq("user_id", userId)
    .maybeSingle();

  const meta = userMeta ?? {};

  // Return profile with role from user_roles + data from profiles + metadata
  return {
    id: (data?.id as string) ?? userId,
    user_id: userId,
    handle: (meta.handle as string) ?? null,
    display_name: (data?.full_name as string) ?? (meta.full_name as string) ?? null,
    role,
    onboarding_step: (meta.onboarding_step as number) ?? 0,
    onboarding_completed: (meta.onboarding_completed as boolean) ?? false,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileRow | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const refetchCreatorProfile = useCallback(async () => {
    if (!user?.id) {
      setCreatorProfile(null);
      return;
    }
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    const meta = freshUser?.user_metadata ?? user.user_metadata ?? {};
    const profile = await fetchCreatorProfile(user.id, meta);
    setCreatorProfile(profile);
  }, [user?.id, user?.user_metadata]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setCreatorProfile(null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setCreatorProfile(null);
      setProfileLoaded(false);
      return;
    }
    setProfileLoaded(false);
    const meta = user.user_metadata ?? {};
    fetchCreatorProfile(user.id, meta).then((profile) => {
      setCreatorProfile(profile);
      setProfileLoaded(true);
    });
  }, [user?.id]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signUpCreator = async (opts: {
    email: string;
    password: string;
    displayName: string;
    audienceType?: string;
    branch?: string;
    tosAccepted: boolean;
  }) => {
    if (!opts.tosAccepted) {
      return { error: new Error("Please agree to the Terms of Service and Privacy Policy") };
    }
    const redirectUrl = `${window.location.origin}/creator/onboard`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: opts.displayName,
          audience_type: opts.audienceType,
          branch: opts.branch,
        },
      },
    });
    if (authError) return { error: authError };
    if (authData.user) {
      await supabase.from("profiles").upsert(
        {
          user_id: authData.user.id,
          full_name: opts.displayName.trim() || null,
          military_branch: opts.branch || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithOAuth = async (provider: "google" | "apple") => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider === "apple" ? "apple" : "google",
      options: { redirectTo: redirectUrl },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCreatorProfile(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/login?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const getRedirectPath = useCallback((): string | null => {
    if (!user) return null;
    if (user.email === "demo@recurrentx.com") return "/brand/dashboard";

    // Wait for profile fetch (including user_roles query) to finish
    if (!profileLoaded) return null;

    // Role comes from user_roles table (via creatorProfile.role)
    const role: UserRole = creatorProfile?.role || "creator";

    console.log("[getRedirectPath] User:", user.email, "| role:", role, "| onboarding_complete:", creatorProfile?.onboarding_completed);

    if (role === "super_admin") return "/admin";
    if (role === "admin" || role === "brand") return "/brand/dashboard";
    // Only creators hit onboarding check
    if (!creatorProfile || !creatorProfile.onboarding_completed) return "/creator/onboard";
    return "/creator/dashboard";
  }, [user, creatorProfile, profileLoaded]);

  const resolvedRole: UserRole = creatorProfile?.role || "creator";
  const isSuperAdmin = resolvedRole === "super_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        creatorProfile,
        role: user ? resolvedRole : null,
        isSuperAdmin: !!user && isSuperAdmin,
        refetchCreatorProfile,
        signUp,
        signUpCreator,
        signIn,
        signInWithOAuth,
        signOut,
        resetPassword,
        getRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
