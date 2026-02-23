import { useState, useMemo } from "react";
import {
  Search, UserPlus, Check, Clock, Mail, MessageCircle, QrCode,
  Users, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ---------- types ---------- */
interface Attendee {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  branch: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
}

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "connected";

interface Props {
  eventId: string;
}

/* ---------- mock data ---------- */
const MOCK_ATTENDEES: Attendee[] = [
  { id: "a1", name: "Johnny Marines", title: "Content Creator", company: "Johnny Marines Media", branch: "Marines", avatar_url: null, bio: "168K on Instagram. Full-time military creator focused on fitness and veteran lifestyle.", email: "johnny@marines.com" },
  { id: "a2", name: "Florent Groberg", title: "Keynote Speaker", company: "Medal of Honor Foundation", branch: "Army", avatar_url: null, bio: "Medal of Honor recipient. Leadership speaker. Veteran advocate.", email: null },
  { id: "a3", name: "Jessica Dee Bruden", title: "Podcast Host", company: "MilLife Media", branch: "Navy", avatar_url: null, bio: "Host of the MilSpouse podcast. 45K followers. Content creator and military spouse advocate.", email: "jess@millife.com" },
  { id: "a4", name: "Dave Bray USA", title: "Musician / Performer", company: "Dave Bray USA", branch: "Navy", avatar_url: null, bio: "Patriotic rock musician. 89K followers. Performing at MIC 2026 opening ceremony.", email: null },
  { id: "a5", name: "Sarah Mitchell", title: "Military Spouse Creator", company: "MilSpouse Life", branch: "Air Force", avatar_url: null, bio: "PCS tips, military family life, and brand partnerships. Looking to connect!", email: "sarah@milspouselife.com" },
  { id: "a6", name: "Ranger Fitness", title: "Fitness Creator", company: "Ranger Fit LLC", branch: "Army", avatar_url: null, bio: "120K on IG. Army veteran. Fitness content and veteran wellness advocate.", email: null },
  { id: "a7", name: "PCS With Pets", title: "Lifestyle Creator", company: null, branch: "Army", avatar_url: null, bio: "67K followers. Military family + pet content. Speaker at MIC 2026.", email: "hello@pcswithpets.com" },
  { id: "a8", name: "SGM (Ret) Jackson", title: "Leadership Consultant", company: "Jackson Leadership Group", branch: "Army", avatar_url: null, bio: "178K on TikTok. Retired SGM turned content creator. Leadership and mentorship.", email: null },
  { id: "a9", name: "Navy Wife Cooks", title: "Food Creator", company: "Navy Wife Cooks", branch: "Navy", avatar_url: null, bio: "89K followers. Military spouse food blog turned brand. Offering headshots at MIC!", email: "cook@navywife.com" },
  { id: "a10", name: "Tactical Brit", title: "Defense Content Creator", company: "TactBrit Media", branch: "Civilian", avatar_url: null, bio: "234K followers. London-based defense and tactical content. First time at MIC!", email: null },
  { id: "a11", name: "Military Connect", title: "Community Manager", company: "Military Connect", branch: "Civilian", avatar_url: null, bio: "Building the largest veteran professional network. 155K community members.", email: "team@milconnect.com" },
  { id: "a12", name: "Air Force Family", title: "Family Life Creator", company: null, branch: "Air Force", avatar_url: null, bio: "78K followers. Showing the real side of military family life. Panel speaker.", email: null },
  { id: "a13", name: "VetBiz Daily", title: "Journalist", company: "VetBiz Media", branch: "Marines", avatar_url: null, bio: "31K followers. Covering the veteran business and creator economy.", email: "press@vetbiz.com" },
  { id: "a14", name: "Veteran Mom Life", title: "Blogger", company: null, branch: "Army", avatar_url: null, bio: "34K followers. Motherhood + military life. Volunteer at MIC 2026.", email: null },
  { id: "a15", name: "Combat Flip Flops", title: "Founder", company: "Combat Flip Flops", branch: "Army", avatar_url: null, bio: "42K followers. Veteran-owned brand making a difference through entrepreneurship.", email: "info@combatflipflops.com" },
];

const BRANCH_COLORS: Record<string, string> = {
  Army: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Navy: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Air Force": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  Marines: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Coast Guard": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Space Force": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  Civilian: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-12 w-12 rounded-full object-cover" />;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-blue-600 to-blue-500", "from-blue-500 to-teal-500", "from-green-500 to-emerald-500", "from-amber-500 to-orange-500", "from-red-500 to-pink-500"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-sm font-bold`}>
      {initials}
    </div>
  );
}

/* ======================================== */
export default function AttendeePeople({ eventId }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"directory" | "connections">("directory");
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({
    a2: "connected",
    a5: "connected",
    a9: "pending_sent",
  });
  const [connectModal, setConnectModal] = useState<Attendee | null>(null);
  const [connectMessage, setConnectMessage] = useState("");

  const filteredAttendees = useMemo(() => {
    if (!search.trim()) return MOCK_ATTENDEES;
    const q = search.toLowerCase();
    return MOCK_ATTENDEES.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.company?.toLowerCase().includes(q)) ||
        (a.branch?.toLowerCase().includes(q)) ||
        (a.title?.toLowerCase().includes(q))
    );
  }, [search]);

  const connectedAttendees = useMemo(() => {
    return MOCK_ATTENDEES.filter((a) => connections[a.id] === "connected");
  }, [connections]);

  const getStatus = (id: string): ConnectionStatus => connections[id] || "none";

  const sendConnection = (attendee: Attendee) => {
    setConnections((prev) => ({ ...prev, [attendee.id]: "pending_sent" }));
    setConnectModal(null);
    setConnectMessage("");
    toast.success(`Connection request sent to ${attendee.name}`);
  };

  const acceptConnection = (id: string) => {
    setConnections((prev) => ({ ...prev, [id]: "connected" }));
    toast.success("Connection accepted!");
  };

  const StatusButton = ({ attendee }: { attendee: Attendee }) => {
    const status = getStatus(attendee.id);
    if (status === "connected") {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
          <Check className="h-3 w-3" /> Connected
        </Badge>
      );
    }
    if (status === "pending_sent") {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    }
    if (status === "pending_received") {
      return (
        <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5282] text-xs h-7" onClick={() => acceptConnection(attendee.id)}>
          Accept
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setConnectModal(attendee)}>
        <UserPlus className="h-3 w-3" /> Connect
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
        <button
          onClick={() => setTab("directory")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            tab === "directory" ? "bg-white dark:bg-[#1A1D27] shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Directory ({MOCK_ATTENDEES.length})
        </button>
        <button
          onClick={() => setTab("connections")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            tab === "connections" ? "bg-white dark:bg-[#1A1D27] shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Check className="h-4 w-4 inline mr-1.5" />
          My Connections ({connectedAttendees.length})
        </button>
      </div>

      {tab === "directory" && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* QR Networking Banner */}
          <div className="rounded-xl bg-gradient-to-r from-[#1e3a5f]/10 to-blue-100/50 dark:from-[#1e3a5f]/20 dark:to-blue-900/20 border border-[#1e3a5f]/20 p-3 flex items-center gap-3">
            <QrCode className="h-8 w-8 text-[#1e3a5f] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1e3a5f]">Scan to Connect</p>
              <p className="text-xs text-muted-foreground">Share your QR code from the Profile tab to instantly connect with nearby attendees</p>
            </div>
          </div>

          {/* Attendee List */}
          <div className="space-y-2">
            {filteredAttendees.map((attendee) => (
              <Card key={attendee.id} className="p-3 bg-white dark:bg-[#1A1D27] rounded-xl border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <Avatar name={attendee.name} url={attendee.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{attendee.name}</span>
                      <StatusButton attendee={attendee} />
                    </div>
                    {attendee.title && <p className="text-xs text-muted-foreground">{attendee.title}</p>}
                    {attendee.company && <p className="text-xs text-muted-foreground">{attendee.company}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {attendee.branch && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${BRANCH_COLORS[attendee.branch] || BRANCH_COLORS.Civilian}`}>
                          {attendee.branch}
                        </Badge>
                      )}
                    </div>
                    {attendee.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{attendee.bio}</p>}
                  </div>
                </div>
              </Card>
            ))}
            {filteredAttendees.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No attendees match your search.</p>
            )}
          </div>
        </>
      )}

      {tab === "connections" && (
        <div className="space-y-2">
          {connectedAttendees.length === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-[#1A1D27]">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium mb-1">No connections yet</p>
              <p className="text-xs text-muted-foreground">Browse the directory and connect with fellow attendees!</p>
            </Card>
          ) : (
            connectedAttendees.map((attendee) => (
              <Card key={attendee.id} className="p-3 bg-white dark:bg-[#1A1D27] rounded-xl border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <Avatar name={attendee.name} url={attendee.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{attendee.name}</span>
                    {attendee.title && <p className="text-xs text-muted-foreground">{attendee.title}</p>}
                    {attendee.company && <p className="text-xs text-muted-foreground">{attendee.company}</p>}
                    {attendee.branch && (
                      <Badge className={`text-[10px] px-1.5 py-0 mt-1 ${BRANCH_COLORS[attendee.branch] || BRANCH_COLORS.Civilian}`}>
                        {attendee.branch}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {attendee.email && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Email">
                        <a href={`mailto:${attendee.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Message" onClick={() => toast.info("Messaging coming soon!")}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Connect Modal */}
      <Dialog open={!!connectModal} onOpenChange={(open) => !open && setConnectModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect with {connectModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {connectModal && <Avatar name={connectModal.name} url={connectModal.avatar_url} />}
              <div>
                <p className="font-semibold text-sm">{connectModal?.name}</p>
                <p className="text-xs text-muted-foreground">{connectModal?.title}</p>
              </div>
            </div>
            <Textarea
              placeholder="Add a note (optional): Hi, I'd love to connect about..."
              value={connectMessage}
              onChange={(e) => setConnectMessage(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => connectModal && sendConnection(connectModal)}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]"
            >
              <UserPlus className="h-4 w-4 mr-2" /> Send Connection Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
