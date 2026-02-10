import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "creator" | "brand" | "admin" | "super_admin";

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
  /** Set after loading when user exists; from creator_profiles or null if brand/admin/no row */
  creatorProfile: CreatorProfileRow | null;
  /** Resolved role from creator_profiles or user_metadata (includes super_admin). */
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

async function fetchCreatorProfile(userId: string): Promise<CreatorProfileRow | null> {
  const { data } = await supabase
    .from("creator_profiles")
    .select("id, user_id, handle, display_name, role, onboarding_step, onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();
  return data as CreatorProfileRow | null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileRow | null>(null);

  const refetchCreatorProfile = useCallback(async () => {
    if (!user?.id) {
      setCreatorProfile(null);
      return;
    }
    const profile = await fetchCreatorProfile(user.id);
    setCreatorProfile(profile);
  }, [user?.id]);

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
      return;
    }
    fetchCreatorProfile(user.id).then(setCreatorProfile);
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
          role: "creator",
          audience_type: opts.audienceType,
          branch: opts.branch,
        },
      },
    });
    if (authError) return { error: authError };
    if (authData.user) {
      await supabase.from("creator_profiles").upsert(
        {
          user_id: authData.user.id,
          display_name: opts.displayName.trim() || null,
          role: "creator",
          audience_type: opts.audienceType || null,
          branch: opts.branch || null,
          onboarding_step: 0,
          onboarding_completed: false,
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
    const role = (user?.user_metadata?.role as UserRole) || "creator";
    if (role === "super_admin") return "/admin";
    if (role === "admin" || role === "brand") return "/brand/dashboard";
    if (!creatorProfile || !creatorProfile.onboarding_completed) return "/creator/onboard";
    return "/creator/dashboard";
  }, [user, creatorProfile]);

  const resolvedRole = (user?.user_metadata?.role as UserRole) ?? ("creator" as UserRole);
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
