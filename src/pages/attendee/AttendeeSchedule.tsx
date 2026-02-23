import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Star, Search, MapPin, Clock, Loader2, CalendarPlus, Share2,
  ChevronRight, Filter, Users, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isSameDay, addDays, differenceInDays, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";

/* ---------- types ---------- */
interface Session {
  id: string;
  event_id: string;
  day_number: number;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  location_room: string | null;
  session_type: string;
  sort_order: number;
  speaker_names: string | null;
  is_featured: boolean | null;
  capacity: number | null;
}

interface PersonalBookmark {
  id: string;
  session_id: string;
}

const SESSION_COLORS: Record<string, string> = {
  keynote: "border-l-[#1e3a5f]",
  panel: "border-l-blue-500",
  workshop: "border-l-green-500",
  networking: "border-l-orange-500",
  meal: "border-l-gray-400",
  ceremony: "border-l-amber-500",
  break: "border-l-gray-300",
};

const SESSION_BADGE_COLORS: Record<string, string> = {
  keynote: "bg-blue-100 text-blue-800",
  panel: "bg-blue-100 text-blue-700",
  workshop: "bg-green-100 text-green-700",
  networking: "bg-orange-100 text-orange-700",
  meal: "bg-gray-100 text-gray-600",
  ceremony: "bg-amber-100 text-amber-700",
  break: "bg-gray-100 text-gray-500",
};

const FILTER_TYPES = ["All", "Keynotes", "Panels", "Workshops", "Networking"];

/* ======================================== */
const AttendeeScheduleContent = () => {
  const { event, eventSlug, isRegistered } = useAttendeeEvent();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookmarks, setBookmarks] = useState<PersonalBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showMySchedule, setShowMySchedule] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessions();
    if (user) fetchBookmarks();
  }, [event.id, user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("event_agenda")
        .select("*")
        .eq("event_id", event.id)
        .order("day_number")
        .order("sort_order")
        .order("start_time");
      if (error) throw error;
      setSessions((data || []) as unknown as Session[]);
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("personal_schedule")
        .select("id, session_id")
        .eq("user_id", user.id)
        .eq("event_id", event.id);
      setBookmarks((data || []) as unknown as PersonalBookmark[]);
    } catch {
      // Silent
    }
  };

  const toggleBookmark = async (sessionId: string) => {
    if (!user) {
      toast.error("Sign in to save sessions to your schedule");
      return;
    }
    const existing = bookmarks.find((b) => b.session_id === sessionId);
    if (existing) {
      await supabase.from("personal_schedule").delete().eq("id", existing.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      toast.success("Removed from your schedule");
    } else {
      const { data, error } = await supabase
        .from("personal_schedule")
        .insert({ user_id: user.id, event_id: event.id, session_id: sessionId } as Record<string, unknown>)
        .select("id, session_id")
        .single();
      if (error) {
        toast.error("Failed to save");
        return;
      }
      setBookmarks((prev) => [...prev, data as unknown as PersonalBookmark]);
      toast.success("Added to your schedule!");
    }
  };

  const isBookmarked = (sessionId: string) => bookmarks.some((b) => b.session_id === sessionId);

  /* ---- computed ---- */
  const dayNumbers = useMemo(() => {
    const days = [...new Set(sessions.map((s) => s.day_number))].sort();
    return days.length > 0 ? days : [1];
  }, [sessions]);

  const eventStartDate = event.start_date ? parseISO(event.start_date) : null;

  const getDayDate = (dayNum: number) => {
    if (!eventStartDate) return null;
    return addDays(eventStartDate, dayNum - 1);
  };

  // Auto-select current day
  useEffect(() => {
    if (!eventStartDate) return;
    const now = new Date();
    for (const dayNum of dayNumbers) {
      const dayDate = getDayDate(dayNum);
      if (dayDate && isSameDay(now, dayDate)) {
        setSelectedDay(dayNum);
        return;
      }
    }
  }, [dayNumbers, eventStartDate]);

  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter((s) => s.day_number === selectedDay);

    if (showMySchedule) {
      const bookmarkIds = new Set(bookmarks.map((b) => b.session_id));
      filtered = filtered.filter((s) => bookmarkIds.has(s.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.speaker_names?.toLowerCase().includes(q)
      );
    }

    if (activeFilter !== "All") {
      const typeMap: Record<string, string> = {
        Keynotes: "keynote",
        Panels: "panel",
        Workshops: "workshop",
        Networking: "networking",
      };
      filtered = filtered.filter((s) => s.session_type === typeMap[activeFilter]);
    }

    return filtered;
  }, [sessions, selectedDay, showMySchedule, searchQuery, activeFilter, bookmarks]);

  // Group by time
  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    for (const s of filteredSessions) {
      const time = s.start_time;
      if (!groups[time]) groups[time] = [];
      groups[time].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSessions]);

  /* ---- countdown ---- */
  const getCountdown = () => {
    if (!eventStartDate) return null;
    const now = new Date();
    const endDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    if (isBefore(now, eventStartDate)) {
      const days = differenceInDays(eventStartDate, now);
      return `Starts in ${days} day${days !== 1 ? "s" : ""}`;
    }
    if (isAfter(now, endDate)) {
      return "Event ended";
    }
    const dayNum = differenceInDays(now, eventStartDate) + 1;
    const totalDays = differenceInDays(endDate, eventStartDate) + 1;
    return `Day ${dayNum} of ${totalDays}`;
  };

  const formatTime = (t: string) => {
    try {
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${h12}:${m} ${ampm}`;
    } catch {
      return t;
    }
  };

  const generateICS = (session: Session) => {
    const dayDate = getDayDate(session.day_number);
    if (!dayDate) return;
    const [sh, sm] = session.start_time.split(":").map(Number);
    const [eh, em] = session.end_time.split(":").map(Number);
    const start = new Date(dayDate);
    start.setHours(sh, sm, 0);
    const end = new Date(dayDate);
    end.setHours(eh, em, 0);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${session.title}`,
      `LOCATION:${session.location_room || ""}`,
      `DESCRIPTION:${(session.description || "").replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
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
      {/* Event Info Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 text-lg">{event.title}</h2>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          {eventStartDate && (
            <span>{format(eventStartDate, "MMM d")} - {event.end_date ? format(parseISO(event.end_date), "MMM d, yyyy") : format(eventStartDate, "yyyy")}</span>
          )}
          {event.city && <span>· {event.city}{event.state ? `, ${event.state}` : ""}</span>}
        </div>
        {getCountdown() && (
          <p className="text-sm font-medium text-[#1e3a5f] mt-1">{getCountdown()}</p>
        )}
        {!isRegistered && (
          <Button asChild className="w-full mt-3 bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
            <Link to={`/attend/${eventSlug}/register`}>Register Now</Link>
          </Button>
        )}
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {dayNumbers.map((dayNum) => {
          const dayDate = getDayDate(dayNum);
          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                selectedDay === dayNum
                  ? "bg-[#1e3a5f] text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#1e3a5f]"
              )}
            >
              Day {dayNum}
              {dayDate && <span className="ml-1 opacity-80">· {format(dayDate, "MMM d")}</span>}
            </button>
          );
        })}
      </div>

      {/* Toggle + Search */}
      <div className="space-y-3">
        {/* My Schedule Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMySchedule(false)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              !showMySchedule ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-600"
            )}
          >
            Full Agenda
          </button>
          <button
            onClick={() => setShowMySchedule(true)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              showMySchedule ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-600"
            )}
          >
            My Schedule ({bookmarks.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sessions, speakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TYPES.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeFilter === f
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions */}
      {groupedSessions.length === 0 ? (
        <Card className="p-8 text-center border-gray-200">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {showMySchedule
              ? "No bookmarked sessions. Tap the star on sessions to save them."
              : "No sessions found."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedSessions.map(([time, groupSessions]) => (
            <div key={time}>
              {/* Time Header */}
              <div className="sticky top-14 z-10 bg-gray-50 py-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {formatTime(time)}
                </p>
              </div>

              <div className="space-y-2 mt-1">
                {groupSessions.map((session) => (
                  <Card
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={cn(
                      "p-4 border-l-4 cursor-pointer hover:shadow-md transition-shadow bg-white min-h-[72px]",
                      SESSION_COLORS[session.session_type] || "border-l-gray-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{session.title}</h3>
                          {session.is_featured && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">Featured</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </span>
                          {session.location_room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location_room}
                            </span>
                          )}
                        </div>
                        <Badge className={cn("mt-2 text-[10px] px-1.5 py-0", SESSION_BADGE_COLORS[session.session_type] || "bg-gray-100 text-gray-600")}>
                          {session.session_type}
                        </Badge>
                        {session.speaker_names && (
                          <p className="text-xs text-gray-500 mt-1.5">{session.speaker_names}</p>
                        )}
                        {session.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{session.description}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(session.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                      >
                        <Star
                          className={cn(
                            "h-5 w-5 transition-colors",
                            isBookmarked(session.id)
                              ? "fill-[#1e3a5f] text-[#1e3a5f]"
                              : "text-gray-300"
                          )}
                        />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Detail Modal */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn("text-xs", SESSION_BADGE_COLORS[selectedSession.session_type] || "bg-gray-100 text-gray-600")}>
                    {selectedSession.session_type}
                  </Badge>
                  {selectedSession.is_featured && (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">Featured</Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedSession.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#1e3a5f]" />
                    {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                  </span>
                  {selectedSession.location_room && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[#1e3a5f]" />
                      {selectedSession.location_room}
                    </span>
                  )}
                </div>

                {selectedSession.speaker_names && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Speakers</h4>
                    <p className="text-sm text-gray-600">{selectedSession.speaker_names}</p>
                  </div>
                )}

                {selectedSession.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">About</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSession.description}</p>
                  </div>
                )}

                {selectedSession.capacity && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    Capacity: {selectedSession.capacity}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => generateICS(selectedSession)}
                  >
                    <CalendarPlus className="h-4 w-4 mr-1.5" />
                    Add to Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${selectedSession.title} - ${formatTime(selectedSession.start_time)}`
                      );
                      toast.success("Copied to clipboard!");
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    Share
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    toggleBookmark(selectedSession.id);
                  }}
                  className={cn(
                    "w-full",
                    isBookmarked(selectedSession.id)
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
                  )}
                >
                  <Star className={cn("h-4 w-4 mr-1.5", isBookmarked(selectedSession.id) && "fill-current")} />
                  {isBookmarked(selectedSession.id) ? "Remove from My Schedule" : "Add to My Schedule"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AttendeeSchedule = () => {
  const location = useLocation();
  const isScheduleRoute = location.pathname.endsWith("/schedule");
  return (
    <AttendeeLayout activeTab={isScheduleRoute ? "schedule" : "home"}>
      <AttendeeScheduleContent />
    </AttendeeLayout>
  );
};

export default AttendeeSchedule;
