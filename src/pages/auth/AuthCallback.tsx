import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { enrichOAuthUser } from "@/lib/oauth-enrichment";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        console.error("[AuthCallback] Session exchange failed:", error.message);
        navigate("/login", { replace: true });
        return;
      }

      // Fire-and-forget: enrich profile via PDL on first OAuth login
      if (data.session?.user) {
        enrichOAuthUser(data.session.user).catch(() => {});
      }

      // Session is now set — redirect to dashboard.
      // AuthContext's onAuthStateChange will pick up the session
      // and getRedirectPath() will route to the correct dashboard.
      navigate("/", { replace: true });
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
