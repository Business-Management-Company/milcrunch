import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mic,
  Search,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Speaker {
  id: string;
  name: string;
  branch: string | null;
  rank: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  verification_id: string | null;
  verification_status: string | null;
  created_at: string | null;
}

export default function Speakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("speakers")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setSpeakers((data ?? []) as Speaker[]);
      setLoading(false);
    })();
  }, []);

  const filtered = speakers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.branch ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.rank ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000741] dark:text-white flex items-center gap-2">
          <Mic className="h-6 w-6" /> Speakers
        </h1>
        <p className="text-muted-foreground mt-0.5">Manage event speakers and invite creators to your stages.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Total Speakers</p>
            <p className="text-2xl font-bold text-[#000741] dark:text-white">{speakers.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold text-emerald-600">
              {speakers.filter((s) => s.verification_status === "verified").length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Unverified</p>
            <p className="text-2xl font-bold text-gray-500">
              {speakers.filter((s) => !s.verification_id).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search speakers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0064B1]" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gray-800">
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Bio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((speaker) => (
                <TableRow key={speaker.id} className="border-gray-200 dark:border-gray-800">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {speaker.photo_url ? (
                        <img src={speaker.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[#0064B1]/10 flex items-center justify-center">
                          <Mic className="h-4 w-4 text-[#0064B1]" />
                        </div>
                      )}
                      <span>{speaker.name}</span>
                      {speaker.verification_status === "verified" && (
                        <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" variant="secondary">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{speaker.branch ?? "—"}</TableCell>
                  <TableCell>{speaker.rank ?? "—"}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground line-clamp-2">{speaker.bio ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    {speaker.verification_id ? (
                      <Badge className={cn(
                        "gap-1",
                        speaker.verification_status === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : speaker.verification_status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                      )} variant="secondary">
                        {speaker.verification_status ?? "linked"}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No verification</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {speaker.created_at ? new Date(speaker.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No speakers yet. Add speakers from the Verification page using the "Add as Speaker" action.
          </div>
        )}
      </Card>
    </div>
  );
}
