import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function CopyDeepLink() {
  const { isSuperAdmin } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isSuperAdmin) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may be blocked */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-all duration-200 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-white/10"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Link copied!</span>
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" />
          <span>Copy Deep Link</span>
        </>
      )}
    </button>
  );
}
