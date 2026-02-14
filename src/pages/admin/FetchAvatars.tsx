import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ImageDown, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AvatarResult {
  handle: string;
  display_name: string;
  status: string;
  avatar_url?: string;
  detail?: string;
  code?: number;
  top_level_keys?: string[];
}

interface FetchResponse {
  summary: string;
  total: number;
  succeeded: number;
  failed: number;
  first_response_logged: string;
  first_response_keys: string[];
  results: AvatarResult[];
}

export default function FetchAvatars() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FetchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runFetch = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      const resp = await fetch("/api/fetch-avatars", { method: "POST" });
      const json = await resp.json();

      if (!resp.ok) {
        setError(JSON.stringify(json, null, 2));
        toast.error(json.error || "Avatar fetch failed");
        return;
      }

      setResponse(json);
      toast.success(json.summary);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    if (status === "no_avatar_found") return <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />;
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#000741] mb-2">Fetch Creator Avatars</h1>
      <p className="text-sm text-gray-500 mb-6">
        Calls Influencers.club enrichment API for each featured creator and saves their profile picture URL to the database.
        Takes ~2 seconds per creator due to rate limit delay.
      </p>

      <Button onClick={runFetch} disabled={loading} size="lg" className="rounded-lg mb-8">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <ImageDown className="h-5 w-5 mr-2" />
        )}
        {loading ? "Fetching Avatars… (this takes ~40 seconds)" : "Fetch All Avatars"}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
          <pre className="text-xs text-red-700 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {response && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-semibold text-[#000741] mb-3">Summary</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[#000741]">{response.total}</p>
                <p className="text-xs text-gray-500">Total Creators</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{response.succeeded}</p>
                <p className="text-xs text-green-600">Avatars Saved</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{response.failed}</p>
                <p className="text-xs text-red-500">Failed</p>
              </div>
            </div>

            {/* Debug info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>{response.first_response_logged}</p>
              {response.first_response_keys.length > 0 && (
                <p>
                  First response top-level keys:{" "}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                    {response.first_response_keys.join(", ")}
                  </code>
                </p>
              )}
            </div>
          </div>

          {/* Per-creator results */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-sm text-[#000741]">Per-Creator Results</h2>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {response.results.map((r) => (
                <div key={r.handle} className="px-5 py-3 flex items-start gap-3">
                  {statusIcon(r.status)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#000741]">{r.display_name}</span>
                      <span className="text-xs text-gray-400">@{r.handle}</span>
                      <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === "success" ? "bg-green-100 text-green-700" :
                        r.status === "no_avatar_found" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    {r.avatar_url && (
                      <p className="text-xs text-blue-600 truncate mt-0.5">{r.avatar_url}</p>
                    )}
                    {r.detail && (
                      <p className="text-xs text-red-500 mt-0.5">{r.detail}</p>
                    )}
                    {r.top_level_keys && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Response keys: {r.top_level_keys.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
