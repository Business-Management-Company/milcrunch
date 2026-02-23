import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Shield, CheckCircle2, ExternalLink, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */
interface Speaker {
  id: string;
  event_id: string;
  creator_name: string;
  creator_handle: string | null;
  avatar_url: string | null;
  role: string | null;
  topic: string | null;
  bio: string | null;
  confirmed: boolean | null;
  sort_order: number;
  social_instagram: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  military_branch: string | null;
}

const BRANCH_COLORS: Record<string, string> = {
  Army: "bg-green-100 text-green-700",
  Navy: "bg-blue-100 text-blue-700",
  Marines: "bg-red-100 text-red-700",
  "Air Force": "bg-sky-100 text-sky-700",
  "Coast Guard": "bg-orange-100 text-orange-700",
  "Space Force": "bg-indigo-100 text-indigo-700",
};

/* ======================================== */
const AttendeeSpeakersContent = () => {
  const { event } = useAttendeeEvent();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  useEffect(() => {
    fetchSpeakers();
  }, [event.id]);

  const fetchSpeakers = async () => {
    try {
      const { data, error } = await supabase
        .from("event_speakers")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order");
      if (error) throw error;
      setSpeakers((data || []) as unknown as Speaker[]);
    } catch (err) {
      console.error("Error loading speakers:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Speakers</h2>
        <p className="text-sm text-gray-500">{speakers.length} speaker{speakers.length !== 1 ? "s" : ""}</p>
      </div>

      {speakers.length === 0 ? (
        <Card className="p-8 text-center border-gray-200">
          <Mic className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Speakers will be announced soon.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {speakers.map((speaker) => (
            <Card
              key={speaker.id}
              onClick={() => setSelectedSpeaker(speaker)}
              className="p-3 bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col items-center text-center gap-2">
                {speaker.avatar_url ? (
                  <img
                    src={speaker.avatar_url}
                    alt={speaker.creator_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#1e3a5f] to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                    {speaker.creator_name[0]}
                  </div>
                )}
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{speaker.creator_name}</h3>
                    {speaker.confirmed && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                  </div>
                  {speaker.role && (
                    <p className="text-[11px] text-gray-500 truncate">{speaker.role}</p>
                  )}
                  {speaker.topic && (
                    <p className="text-[11px] text-[#1e3a5f] font-medium mt-0.5 line-clamp-1">{speaker.topic}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Speaker Detail Modal */}
      <Dialog open={!!selectedSpeaker} onOpenChange={(open) => !open && setSelectedSpeaker(null)}>
        <DialogContent className="max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
          {selectedSpeaker && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  {selectedSpeaker.avatar_url ? (
                    <img
                      src={selectedSpeaker.avatar_url}
                      alt={selectedSpeaker.creator_name}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#1e3a5f] to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                      {selectedSpeaker.creator_name[0]}
                    </div>
                  )}
                  <div>
                    <DialogTitle className="text-xl">{selectedSpeaker.creator_name}</DialogTitle>
                    {selectedSpeaker.role && (
                      <p className="text-sm text-gray-500">{selectedSpeaker.role}</p>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {selectedSpeaker.military_branch && (
                  <Badge className={cn("text-xs", BRANCH_COLORS[selectedSpeaker.military_branch] || "bg-gray-100 text-gray-600")}>
                    <Shield className="h-3 w-3 mr-1" />
                    {selectedSpeaker.military_branch}
                  </Badge>
                )}

                {selectedSpeaker.topic && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Speaking On</h4>
                    <p className="text-sm text-[#1e3a5f]">{selectedSpeaker.topic}</p>
                  </div>
                )}

                {selectedSpeaker.bio && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">About</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSpeaker.bio}</p>
                  </div>
                )}

                {/* Social Links */}
                <div className="flex gap-2">
                  {selectedSpeaker.social_instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://instagram.com/${selectedSpeaker.social_instagram}`} target="_blank" rel="noopener noreferrer">
                        Instagram
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {selectedSpeaker.social_twitter && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://twitter.com/${selectedSpeaker.social_twitter}`} target="_blank" rel="noopener noreferrer">
                        Twitter
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {selectedSpeaker.social_linkedin && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedSpeaker.social_linkedin} target="_blank" rel="noopener noreferrer">
                        LinkedIn
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AttendeeSpeakers = () => (
  <AttendeeLayout activeTab="home" pageTitle="Speakers">
    <AttendeeSpeakersContent />
  </AttendeeLayout>
);

export default AttendeeSpeakers;
