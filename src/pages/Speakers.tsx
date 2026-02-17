import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mic,
  Search,
  ShieldCheck,
  Loader2,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  XCircle,
  Trash2,
  Pencil,
  Eye,
  Plus,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TYPE_OPTIONS } from "@/types/verification";
import { SPEAKER_TYPES } from "@/components/brand/AddSpeakerModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface EventInfo {
  id: string;
  title: string;
  start_date: string | null;
}

interface VerificationInfo {
  id: string;
  verification_score: number | null;
  status: string | null;
  claimed_branch: string | null;
  claimed_type: string | null;
  claimed_status: string | null;
  ai_analysis: string | null;
}

function MiniGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score}%</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    verified: { label: "Verified", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: <Clock className="h-3.5 w-3.5" /> },
    flagged: { label: "Flagged", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    denied: { label: "Denied", className: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <Badge className={cn("gap-1", s.className)} variant="secondary">
      {s.icon} {s.label}
    </Badge>
  );
}

export default function Speakers() {
  const navigate = useNavigate();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedVerification, setExpandedVerification] = useState<VerificationInfo | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<EventInfo[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", branch: "", rank: "", bio: "" });

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add to Event modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSpeaker, setInviteSpeaker] = useState<Speaker | null>(null);
  const [allEvents, setAllEvents] = useState<EventInfo[]>([]);
  const [existingEventIds, setExistingEventIds] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRole, setSelectedRole] = useState("presenter");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);

  const fetchSpeakers = async () => {
    const { data, error } = await supabase
      .from("speakers")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSpeakers((data ?? []) as Speaker[]);
  };

  useEffect(() => {
    (async () => {
      await fetchSpeakers();
      setLoading(false);
    })();
  }, []);

  const filtered = speakers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.branch ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.rank ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleExpand = async (speakerId: string) => {
    if (expandedId === speakerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(speakerId);
    setExpandLoading(true);
    setExpandedVerification(null);
    setExpandedEvents([]);

    const speaker = speakers.find((s) => s.id === speakerId);
    if (!speaker) {
      setExpandLoading(false);
      return;
    }

    // Fetch verification data
    if (speaker.verification_id) {
      const { data } = await supabase
        .from("verifications")
        .select("id, verification_score, status, claimed_branch, claimed_type, claimed_status, ai_analysis")
        .eq("id", speaker.verification_id)
        .single();
      setExpandedVerification(data as VerificationInfo | null);
    }

    // Fetch events this speaker is assigned to via event_speakers
    const { data: speakerLinks } = await supabase
      .from("event_speakers")
      .select("event_id")
      .eq("creator_name", speaker.name);

    if (speakerLinks?.length) {
      const eventIds = speakerLinks.map((i: { event_id: string }) => i.event_id);
      const { data: events } = await supabase
        .from("events")
        .select("id, title, start_date")
        .in("id", eventIds);
      setExpandedEvents((events ?? []) as EventInfo[]);
    }

    setExpandLoading(false);
  };

  const handleEdit = (speaker: Speaker) => {
    setEditForm({
      id: speaker.id,
      name: speaker.name,
      branch: speaker.branch ?? "",
      rank: speaker.rank ?? "",
      bio: speaker.bio ?? "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from("speakers")
      .update({
        name: editForm.name,
        branch: editForm.branch || null,
        rank: editForm.rank || null,
        bio: editForm.bio || null,
      })
      .eq("id", editForm.id);
    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success("Speaker updated");
      setEditOpen(false);
      await fetchSpeakers();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from("speakers").delete().eq("id", deleteConfirmId);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      setSpeakers((prev) => prev.filter((s) => s.id !== deleteConfirmId));
      if (expandedId === deleteConfirmId) setExpandedId(null);
      toast.success("Speaker removed");
    }
    setDeleteConfirmId(null);
  };

  const handleOpenInvite = async (speaker: Speaker) => {
    setInviteSpeaker(speaker);
    setSelectedEventId("");
    setSelectedRole("presenter");
    setSelectedTopic("");

    const { data: events } = await supabase
      .from("events")
      .select("id, title, start_date")
      .order("start_date", { ascending: false })
      .limit(100);
    setAllEvents((events ?? []) as EventInfo[]);

    // Find events this speaker is already linked to via event_speakers
    const { data: existing } = await supabase
      .from("event_speakers")
      .select("event_id")
      .eq("creator_name", speaker.name);
    setExistingEventIds((existing ?? []).map((e: { event_id: string }) => e.event_id));

    setInviteOpen(true);
  };

  const handleSaveInvite = async () => {
    if (!inviteSpeaker || !selectedEventId) return;
    setInviteSaving(true);

    // Get current speaker count for sort_order
    const { data: existingSpeakers } = await supabase
      .from("event_speakers")
      .select("id")
      .eq("event_id", selectedEventId);
    const sortOrder = existingSpeakers?.length ?? 0;

    const { error } = await supabase.from("event_speakers").insert({
      event_id: selectedEventId,
      creator_name: inviteSpeaker.name,
      avatar_url: inviteSpeaker.photo_url,
      bio: inviteSpeaker.bio,
      role: selectedRole,
      topic: selectedTopic.trim() || null,
      sort_order: sortOrder,
      confirmed: false,
    });

    if (error) {
      toast.error("Failed to add to event: " + error.message);
    } else {
      const eventTitle = allEvents.find((e) => e.id === selectedEventId)?.title ?? "event";
      toast.success(`Added ${inviteSpeaker.name} to ${eventTitle}`);
      setInviteOpen(false);
      // Refresh expanded events if this speaker is expanded
      if (expandedId === inviteSpeaker.id) {
        const { data: links } = await supabase
          .from("event_speakers")
          .select("event_id")
          .eq("creator_name", inviteSpeaker.name);
        if (links?.length) {
          const ids = links.map((i: { event_id: string }) => i.event_id);
          const { data: evts } = await supabase.from("events").select("id, title, start_date").in("id", ids);
          setExpandedEvents((evts ?? []) as EventInfo[]);
        }
      }
    }
    setInviteSaving(false);
  };

  const handleViewVerification = (speaker: Speaker) => {
    if (speaker.verification_id) {
      navigate("/verification", { state: { expandId: speaker.verification_id } });
    }
  };

  const handleStartVerification = (speaker: Speaker) => {
    navigate("/verification", {
      state: {
        prefill: {
          fullName: speaker.name,
          claimedBranch: speaker.branch ?? "",
          claimedType: speaker.rank ?? "",
          claimedStatus: "veteran",
          linkedinUrl: speaker.linkedin_url ?? "",
          websiteUrl: speaker.website_url ?? "",
          notes: speaker.bio ?? "",
        },
      },
    });
  };

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
            <p className="text-2xl font-bold text-purple-600">
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
            <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gray-800">
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((speaker) => (
                <React.Fragment key={speaker.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer border-gray-200 dark:border-gray-800",
                      expandedId === speaker.id && "bg-muted/50"
                    )}
                    onClick={() => handleExpand(speaker.id)}
                  >
                    <TableCell>
                      {expandedId === speaker.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {speaker.photo_url ? (
                          <img src={speaker.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center">
                            <Mic className="h-4 w-4 text-[#6C5CE7]" />
                          </div>
                        )}
                        <span>{speaker.name}</span>
                        {speaker.verification_status === "verified" && (
                          <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                        )}
                        {speaker.verification_status === "pending" && speaker.verification_id && (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        {speaker.verification_status === "flagged" && (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
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
                        speaker.verification_status === "verified"
                          ? <ShieldCheck className="h-4 w-4 text-purple-600" />
                          : speaker.verification_status === "flagged"
                            ? <AlertTriangle className="h-4 w-4 text-red-500" />
                            : <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {speaker.created_at ? new Date(speaker.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInvite(speaker);
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" /> Add to Event
                          </DropdownMenuItem>
                          {speaker.verification_id ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewVerification(speaker);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Verification
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartVerification(speaker);
                              }}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" /> Start Verification
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(speaker);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Edit Speaker
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(speaker.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remove Speaker
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row */}
                  {expandedId === speaker.id && (
                    <TableRow className="bg-muted/30 border-gray-200 dark:border-gray-800">
                      <TableCell colSpan={8} className="p-0">
                        <div className="p-6">
                          {expandLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-[#6C5CE7]" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Verification Card */}
                              <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" /> Verification
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {expandedVerification ? (
                                    <div className="flex flex-col items-center gap-3">
                                      <MiniGauge score={expandedVerification.verification_score ?? 0} />
                                      <StatusBadge status={expandedVerification.status ?? "pending"} />
                                      <div className="flex flex-wrap gap-1.5 justify-center">
                                        {expandedVerification.claimed_branch && (
                                          <Badge variant="secondary" className="text-xs">
                                            {expandedVerification.claimed_branch}
                                          </Badge>
                                        )}
                                        {expandedVerification.claimed_type && (
                                          <Badge variant="secondary" className="text-xs">
                                            {expandedVerification.claimed_type}
                                          </Badge>
                                        )}
                                        {expandedVerification.claimed_status && (
                                          <Badge variant="secondary" className="text-xs capitalize">
                                            {expandedVerification.claimed_status}
                                          </Badge>
                                        )}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => handleViewVerification(speaker)}
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1.5" /> View Full Verification
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-sm text-muted-foreground mb-3">Not yet verified</p>
                                      <Button
                                        size="sm"
                                        className="bg-[#6C5CE7] hover:bg-[#5B4BD1]"
                                        onClick={() => handleStartVerification(speaker)}
                                      >
                                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Start Verification
                                      </Button>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Bio Card */}
                              <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">Bio</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {speaker.bio || "No bio available."}
                                  </p>
                                </CardContent>
                              </Card>

                              {/* Events Card */}
                              <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Events
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {expandedEvents.length > 0 ? (
                                    <ul className="space-y-2">
                                      {expandedEvents.map((ev) => (
                                        <li key={ev.id} className="flex items-center gap-2 text-sm">
                                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <span className="font-medium">{ev.title}</span>
                                          {ev.start_date && (
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(ev.start_date).toLocaleDateString()}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No events assigned yet.</p>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-3"
                                    onClick={() => handleOpenInvite(speaker)}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add to Event
                                  </Button>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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

      {/* Edit Speaker Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit Speaker
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Branch</Label>
              <Input
                value={editForm.branch}
                onChange={(e) => setEditForm((f) => ({ ...f, branch: e.target.value }))}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editForm.rank} onValueChange={(v) => setEditForm((f) => ({ ...f, rank: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Event Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Add to Event
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add <strong>{inviteSpeaker?.name}</strong> as a speaker to an event.
          </p>
          <div className="space-y-4">
            <div>
              <Label>Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger>
                <SelectContent>
                  {allEvents.length === 0 ? (
                    <SelectItem value="__none" disabled>No events found</SelectItem>
                  ) : (
                    allEvents.map((ev) => {
                      const alreadyAdded = existingEventIds.includes(ev.id);
                      return (
                        <SelectItem key={ev.id} value={ev.id} disabled={alreadyAdded}>
                          <span className="flex items-center gap-2">
                            {ev.title}
                            {ev.start_date && (
                              <span className="text-xs text-muted-foreground">
                                — {new Date(ev.start_date).toLocaleDateString()}
                              </span>
                            )}
                            {alreadyAdded && (
                              <span className="text-xs text-muted-foreground ml-1">(already added)</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPEAKER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic</Label>
              <Input
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder="Talk topic or panel name"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveInvite}
            disabled={!selectedEventId || inviteSaving}
            className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1] mt-2"
          >
            {inviteSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add to Event
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove speaker?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this speaker. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
