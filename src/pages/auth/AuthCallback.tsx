import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { enrichOAuthUser } from "@/lib/oauth-enrichment";
import { Loader2 } from "lucide-react";

/** Query creator_profiles + user_roles to determine the right post-login destination. */
async function getRedirectForUser(userId: string): Promise<string> {
  // Check role from user_roles table first
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  const role = roleRow?.role;

  if (role === "super_admin") return "/admin/dashboard";
  if (role === "admin" || role === "brand") return "/brand/dashboard";

  // Creator path — check onboarding status
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .single();

  if (!profile || !profile.onboarding_completed) return "/creator/onboard";
  return "/creator/dashboard";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      // Provider returned an error (e.g. user denied consent)
      if (errorParam) {
        console.error("[AuthCallback] Provider error:", errorParam, errorDescription);
        navigate(`/login?error=${encodeURIComponent(errorParam)}`, { replace: true });
        return;
      }

      // PKCE flow: code in query params
      if (code) {
        console.log("[AuthCallback] PKCE flow — exchanging code for session");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[AuthCallback] Code exchange failed:", error.message);
          navigate("/login?error=auth_failed", { replace: true });
          return;
        }

        // Fire-and-forget: enrich profile via PDL on first OAuth login
        if (data.session?.user) {
          enrichOAuthUser(data.session.user).catch(() => {});
          const dest = await getRedirectForUser(data.session.user.id);
          console.log("[AuthCallback] PKCE redirect →", dest);
          navigate(dest, { replace: true });
        } else {
          navigate("/login?error=auth_failed", { replace: true });
        }
        return;
      }

      // Implicit flow fallback: tokens in URL hash (#access_token=...&refresh_token=...)
      if (window.location.hash && window.location.hash.includes("access_token")) {
        console.log("[AuthCallback] Implicit flow — processing hash tokens");

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.log("[AuthCallback] getSession returned null, waiting for auth state change...");
          const timeout = setTimeout(() => {
            console.error("[AuthCallback] Timed out waiting for session from hash");
            navigate("/login?error=auth_failed", { replace: true });
          }, 10000);

          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (session) {
                clearTimeout(timeout);
                subscription.unsubscribe();
                enrichOAuthUser(session.user).catch(() => {});
                const dest = await getRedirectForUser(session.user.id);
                console.log("[AuthCallback] Implicit (async) redirect →", dest);
                navigate(dest, { replace: true });
              }
            }
          );
          return;
        }

        enrichOAuthUser(session.user).catch(() => {});
        const dest = await getRedirectForUser(session.user.id);
        console.log("[AuthCallback] Implicit redirect →", dest);
        navigate(dest, { replace: true });
        return;
      }

      // No code, no hash, no error — nothing to process
      console.error("[AuthCallback] No code or hash tokens found in URL:", window.location.href);
      navigate("/login?error=auth_failed", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1B2A4A] to-[#0d2137]">
      <div className="text-center text-white">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
