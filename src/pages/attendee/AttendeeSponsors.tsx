import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Building2, ExternalLink, MapPin, ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import SponsorLeadRetrieval from "./SponsorLeadRetrieval";

/* ---------- types ---------- */
interface Sponsor {
  id: string;
  event_id: string;
  sponsor_name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  description: string | null;
  sort_order: number;
  booth_location: string | null;
}

const TIER_ORDER = ["presenting", "diamond", "platinum", "gold", "silver", "bronze", "partner"];

const TIER_STYLES: Record<string, { bg: string; text: string; label: string; logoSize: string }> = {
  presenting: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", label: "Presenting Sponsor", logoSize: "h-24" },
  diamond: { bg: "bg-sky-50 border-sky-200", text: "text-sky-700", label: "Diamond Sponsor", logoSize: "h-20" },
  platinum: { bg: "bg-gray-50 border-gray-300", text: "text-gray-700", label: "Platinum Sponsor", logoSize: "h-16" },
  gold: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Gold Sponsor", logoSize: "h-14" },
  silver: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Silver Sponsor", logoSize: "h-12" },
  bronze: { bg: "bg-orange-50 border-orange-200", text: "text-orange-600", label: "Bronze Sponsor", logoSize: "h-12" },
  partner: { bg: "bg-blue-50 border-blue-200", text: "text-blue-600", label: "Partner", logoSize: "h-12" },
};

/* ======================================== */
const AttendeeSponsorsContent = () => {
  const { event } = useAttendeeEvent();
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [leadRetrievalSponsor, setLeadRetrievalSponsor] = useState<Sponsor | null>(null);

  // Check if current user is a brand/admin (sponsor rep)
  const userRole = user?.user_metadata?.role;
  const isSponsorRep = userRole === "brand" || userRole === "admin" || userRole === "super_admin";

  useEffect(() => {
    fetchSponsors();
  }, [event.id]);

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from("event_sponsors")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order");
      if (error) throw error;
      setSponsors((data || []) as unknown as Sponsor[]);
    } catch (err) {
      console.error("Error loading sponsors:", err);
    } finally {
      setLoading(false);
    }
  };

  const groupedSponsors = useMemo(() => {
    const groups: Record<string, Sponsor[]> = {};
    for (const s of sponsors) {
      const tier = (s.tier || "partner").toLowerCase();
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(s);
    }
    return TIER_ORDER
      .filter((t) => groups[t])
      .map((tier) => ({ tier, sponsors: groups[tier] }));
  }, [sponsors]);

  // Show Lead Retrieval full-screen when active
  if (leadRetrievalSponsor) {
    return (
      <SponsorLeadRetrieval
        eventId={event.id}
        sponsorId={leadRetrievalSponsor.id}
        sponsorName={leadRetrievalSponsor.sponsor_name}
        onBack={() => setLeadRetrievalSponsor(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sponsors</h2>
        <p className="text-sm text-gray-500">Our event sponsors & partners</p>
      </div>

      {sponsors.length === 0 ? (
        <Card className="p-8 text-center border-gray-200">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Sponsors will be announced soon.</p>
        </Card>
      ) : (
        groupedSponsors.map(({ tier, sponsors: tierSponsors }) => {
          const style = TIER_STYLES[tier] || TIER_STYLES.partner;
          return (
            <div key={tier} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-sm font-bold uppercase tracking-wider", style.text)}>
                  {style.label}
                </h3>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className={cn(
                "grid gap-3",
                tier === "presenting" || tier === "diamond" ? "grid-cols-1" : "grid-cols-2"
              )}>
                {tierSponsors.map((sponsor) => (
                  <Card
                    key={sponsor.id}
                    onClick={() => setSelectedSponsor(sponsor)}
                    className={cn(
                      "p-4 cursor-pointer hover:shadow-md transition-shadow border",
                      style.bg
                    )}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      {sponsor.logo_url ? (
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.sponsor_name}
                          className={cn("object-contain w-auto", style.logoSize)}
                        />
                      ) : (
                        <div className={cn("flex items-center justify-center bg-gray-200 rounded-lg w-full", style.logoSize)}>
                          <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <h4 className="font-semibold text-gray-900 text-sm">{sponsor.sponsor_name}</h4>
                      <Badge className={cn("text-[10px] px-1.5 py-0", `${style.text} bg-white/50`)}>
                        {style.label}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Sponsor Detail Modal */}
      <Dialog open={!!selectedSponsor} onOpenChange={(open) => !open && setSelectedSponsor(null)}>
        <DialogContent className="max-w-lg mx-4">
          {selectedSponsor && (() => {
            const style = TIER_STYLES[(selectedSponsor.tier || "partner").toLowerCase()] || TIER_STYLES.partner;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    {selectedSponsor.logo_url ? (
                      <img
                        src={selectedSponsor.logo_url}
                        alt={selectedSponsor.sponsor_name}
                        className="h-16 w-auto object-contain"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <DialogTitle>{selectedSponsor.sponsor_name}</DialogTitle>
                      <Badge className={cn("text-xs mt-1", style.text, style.bg)}>
                        {style.label}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  {selectedSponsor.description && (
                    <p className="text-sm text-gray-600">{selectedSponsor.description}</p>
                  )}

                  {selectedSponsor.booth_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-[#6C5CE7]" />
                      Booth: {selectedSponsor.booth_location}
                    </div>
                  )}

                  {selectedSponsor.website_url && (
                    <Button asChild className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white">
                      <a href={selectedSponsor.website_url} target="_blank" rel="noopener noreferrer">
                        Visit Website
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  )}

                  {isSponsorRep && (
                    <Button
                      onClick={() => {
                        setSelectedSponsor(null);
                        setLeadRetrievalSponsor(selectedSponsor);
                      }}
                      className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white gap-2"
                    >
                      <ScanLine className="h-4 w-4" />
                      Lead Retrieval
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AttendeeSponsors = () => (
  <AttendeeLayout activeTab="home" pageTitle="Sponsors">
    <AttendeeSponsorsContent />
  </AttendeeLayout>
);

export default AttendeeSponsors;
