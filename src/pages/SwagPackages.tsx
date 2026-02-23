import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Gift, Loader2, PartyPopper, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

interface SwagItem {
  name: string;
  description: string;
  sponsor_name: string | null;
  image_url: string;
}

interface SwagPackage {
  id: string;
  title: string;
  description: string | null;
  event_id: string;
  image_url: string | null;
  items: SwagItem[];
  max_claims: number;
  claimed_count: number;
  is_active: boolean;
}

interface EventGroup {
  event_id: string;
  event_title: string;
  packages: SwagPackage[];
}

const GRADIENTS = [
  "from-blue-700 to-indigo-700",
  "from-blue-600 to-blue-800",
  "from-indigo-500 to-blue-700",
  "from-violet-600 to-blue-800",
];

export default function SwagPackages() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [userClaims, setUserClaims] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPackages();
    fetchUserClaims();
  }, []);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("swag_packages")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const pkgs = (data || []) as SwagPackage[];
    if (pkgs.length === 0) { setGroups([]); setLoading(false); return; }

    // Get event titles
    const eventIds = [...new Set(pkgs.map((p) => p.event_id))];
    const { data: evts } = await supabase.from("events").select("id, title").in("id", eventIds);
    const eventMap: Record<string, string> = {};
    (evts || []).forEach((e: { id: string; title: string }) => { eventMap[e.id] = e.title; });

    // Group by event
    const groupMap: Record<string, EventGroup> = {};
    pkgs.forEach((p) => {
      if (!groupMap[p.event_id]) {
        groupMap[p.event_id] = { event_id: p.event_id, event_title: eventMap[p.event_id] || "Event", packages: [] };
      }
      groupMap[p.event_id].packages.push(p);
    });

    setGroups(Object.values(groupMap));
    setLoading(false);
  };

  const fetchUserClaims = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("swag_claims")
      .select("package_id")
      .eq("user_id", user.id);
    setUserClaims(new Set((data || []).map((c: { package_id: string }) => c.package_id)));
  };

  const handleClaim = async (pkg: SwagPackage) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    if (pkg.max_claims > 0 && pkg.claimed_count >= pkg.max_claims) {
      toast({ title: "Sold Out", description: "This package is fully claimed.", variant: "destructive" });
      return;
    }

    if (userClaims.has(pkg.id)) {
      toast({ title: "Already Claimed", description: "You've already claimed this package." });
      return;
    }

    setClaiming(pkg.id);

    const { error } = await supabase.from("swag_claims").insert({
      package_id: pkg.id,
      user_id: user.id,
      user_email: user.email || "",
      user_name: user.user_metadata?.full_name || user.email || "User",
      status: "claimed",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setClaiming(null);
      return;
    }

    // Increment claimed_count
    await supabase
      .from("swag_packages")
      .update({ claimed_count: pkg.claimed_count + 1 })
      .eq("id", pkg.id);

    toast({
      title: "Claimed!",
      description: `You claimed "${pkg.title}". Check your email for details.`,
    });

    setClaiming(null);
    setUserClaims((prev) => new Set(prev).add(pkg.id));
    fetchPackages();
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-white">
      <PublicNav />
      <div className="pt-14">
        {/* Hero */}
        <div className="bg-gradient-to-b from-[#1A1A2E] to-[#0D0D1A] py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">SWAG Packages</h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Exclusive swag for event attendees. Claim yours before they're gone!
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-xl font-medium text-gray-400">No active SWAG packages</p>
              <p className="text-gray-500 mt-2">Check back when events are announced!</p>
            </div>
          ) : (
            <div className="space-y-12">
              {groups.map((group) => (
                <div key={group.event_id}>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <Gift className="h-6 w-6 text-[#1e3a5f]" />
                    {group.event_title}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {group.packages.map((pkg, i) => {
                      const soldOut = pkg.max_claims > 0 && pkg.claimed_count >= pkg.max_claims;
                      const alreadyClaimed = userClaims.has(pkg.id);
                      const claimPct = pkg.max_claims > 0 ? (pkg.claimed_count / pkg.max_claims) * 100 : 0;
                      const gradient = GRADIENTS[i % GRADIENTS.length];

                      return (
                        <div
                          key={pkg.id}
                          className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#1e3a5f]/40 transition-all flex flex-col"
                        >
                          {/* Package image */}
                          <div className={`h-48 bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
                            {pkg.image_url ? (
                              <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-16 w-16 text-white/30" />
                            )}
                            {soldOut && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Badge className="bg-red-600 text-white text-sm px-4 py-1">SOLD OUT</Badge>
                              </div>
                            )}
                            {alreadyClaimed && !soldOut && (
                              <div className="absolute top-3 right-3">
                                <Badge className="bg-green-600 text-white text-xs gap-1">
                                  <CheckCircle className="h-3 w-3" /> Claimed
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-lg mb-1">{pkg.title}</h3>
                            <Badge variant="outline" className="w-fit text-xs text-gray-400 border-gray-600 mb-3">
                              {group.event_title}
                            </Badge>

                            {/* Items preview */}
                            {pkg.items && pkg.items.length > 0 && (
                              <div className="mb-4">
                                <ul className="space-y-1">
                                  {pkg.items.slice(0, 3).map((item, j) => (
                                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
                                      <span className="truncate">{item.name}</span>
                                      {item.sponsor_name && (
                                        <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-600 shrink-0 py-0">
                                          {item.sponsor_name}
                                        </Badge>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {pkg.items.length > 3 && (
                                  <p className="text-xs text-gray-500 mt-1">+{pkg.items.length - 3} more items</p>
                                )}
                              </div>
                            )}

                            {/* Availability */}
                            {pkg.max_claims > 0 && (
                              <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>{pkg.claimed_count} of {pkg.max_claims} claimed</span>
                                  <span>{Math.round(claimPct)}%</span>
                                </div>
                                <Progress value={claimPct} className="h-2 bg-white/10" />
                              </div>
                            )}

                            {/* Claim button */}
                            <div className="mt-auto">
                              {alreadyClaimed ? (
                                <Button disabled className="w-full bg-green-600/20 text-green-400 border border-green-600/30">
                                  <CheckCircle className="h-4 w-4 mr-2" /> Package Claimed
                                </Button>
                              ) : soldOut ? (
                                <Button disabled className="w-full">Sold Out</Button>
                              ) : (
                                <Button
                                  onClick={() => handleClaim(pkg)}
                                  disabled={claiming === pkg.id}
                                  className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
                                >
                                  {claiming === pkg.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Gift className="h-4 w-4 mr-2" />
                                  )}
                                  Claim Package
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
