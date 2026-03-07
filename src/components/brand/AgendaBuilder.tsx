import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { getCreatorAvatar, getAvatarFallback } from "@/lib/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Mic, Zap, Shuffle, Coffee, PartyPopper, Pencil, Palette,
  GripVertical, Trash2, Plus, Loader2, Clock,
  PanelLeftClose, PanelLeftOpen, Search, X, Check,
  Wand2, LayoutList, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays } from "date-fns";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================================================================
   Types
   ================================================================ */

interface SpeakerRow {
  id: string;
  creator_name: string | null;
  creator_handle: string | null;
  avatar_url: string | null;
  role: string | null;
  topic: string | null;
  bio: string | null;
  confirmed: boolean | null;
  sort_order: number;
}

interface AgendaRow {
  id: string;
  event_id: string;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string | null;
  location_room: string | null;
  session_type: string | null;
  sort_order: number;
  speaker_ids: string[];
}

interface AgendaBuilderProps {
  eventId: string;
  startDate: string | null;
  endDate: string | null;
  speakers: SpeakerRow[];
  onRefresh: () => void;
}

/* ================================================================
   Session Type Constants
   ================================================================ */

interface SessionTypeDef {
  key: string;
  label: string;
  icon: typeof Mic;
  color: string;
}

const SESSION_TYPES: SessionTypeDef[] = [
  { key: "main_speaker", label: "Main Speaker", icon: Mic, color: "#1e3a5f" },
  { key: "experience", label: "Experience", icon: Zap, color: "#0891B2" },
  { key: "breakout", label: "Breakout", icon: Shuffle, color: "#EA580C" },
  { key: "break", label: "Break", icon: Coffee, color: "#6B7280" },
  { key: "opening_closing", label: "Opening/Closing", icon: PartyPopper, color: "#1E3A5F" },
  { key: "custom", label: "Custom", icon: Pencil, color: "#EC4899" },
];

const SESSION_TYPE_MAP: Record<string, SessionTypeDef> = Object.fromEntries(SESSION_TYPES.map((t) => [t.key, t]));
// Backward compat for existing "opening" / "closing" rows
SESSION_TYPE_MAP["opening"] = SESSION_TYPE_MAP["opening_closing"];
SESSION_TYPE_MAP["closing"] = SESSION_TYPE_MAP["opening_closing"];

function getSessionType(key: string | null): SessionTypeDef {
  if (!key) return SESSION_TYPE_MAP["custom"];
  if (key.startsWith("custom:")) {
    return { ...SESSION_TYPE_MAP["custom"], color: key.slice(7) };
  }
  return SESSION_TYPE_MAP[key] || SESSION_TYPE_MAP["custom"];
}

function computeDuration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return null;
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

/* ================================================================
   Anthropic Helper
   ================================================================ */

async function callAnthropic(system: string, userMessage: string, maxTokens = 4096): Promise<string> {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

/* ================================================================
   Speaker Avatar
   ================================================================ */

function SpeakerAvatar({ speaker, size = 28 }: { speaker: SpeakerRow; size?: number }) {
  const initials = (speaker.creator_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return getCreatorAvatar(speaker) ? (
    <img
      src={getCreatorAvatar(speaker)!}
      alt={speaker.creator_name || ""}
      className="rounded-full object-cover border border-white dark:border-gray-700"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold border border-white dark:border-gray-700"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

/* ================================================================
   Draggable Speaker (sidebar panel)
   ================================================================ */

function DraggableSpeaker({ speaker }: { speaker: SpeakerRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `speaker-${speaker.id}`,
    data: { type: "speaker", speakerId: speaker.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isDragging ? "opacity-40" : ""}`}
    >
      <SpeakerAvatar speaker={speaker} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{speaker.creator_name || "Unnamed"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{speaker.role || "Speaker"}</p>
      </div>
      {speaker.confirmed && <Check className="h-3 w-3 text-green-500 shrink-0" />}
    </div>
  );
}

/* ================================================================
   Sortable Session Card
   ================================================================ */

function SortableSessionCard({
  session,
  speakers,
  speakerMap,
  overSpeaker,
  onUpdate,
  onDelete,
  onRemoveSpeaker,
}: {
  session: AgendaRow;
  speakers: SpeakerRow[];
  speakerMap: Map<string, SpeakerRow>;
  overSpeaker: boolean;
  onUpdate: (id: string, field: string, value: unknown) => void;
  onDelete: (id: string) => void;
  onRemoveSpeaker: (sessionId: string, speakerId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: session.id,
    data: { type: "session", session, dayNumber: session.day_number },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `session-drop-${session.id}`,
    data: { type: "session-drop", sessionId: session.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const typeDef = getSessionType(session.session_type);
  const TypeIcon = typeDef.icon;
  const assignedSpeakers = (session.speaker_ids || [])
    .map((id) => speakerMap.get(id))
    .filter(Boolean) as SpeakerRow[];
  const duration = computeDuration(session.start_time, session.end_time);

  const showHighlight = overSpeaker || isOver;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      style={{ ...style, borderLeftColor: typeDef.color }}
      className={`group rounded-xl border bg-white dark:bg-[#1A1D27] border-l-4 ${showHighlight ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-800"} transition-all`}
    >
      <div className="p-3">
        {/* Row 1: Handle + Badge + Times + Duration + Room */}
        <div className="flex items-center gap-2 mb-1.5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Badge className="text-[10px] px-1.5 py-0 gap-1 border-0" style={{ backgroundColor: `${typeDef.color}1A`, color: typeDef.color }}>
            <TypeIcon className="h-3 w-3" />
            {typeDef.label}
          </Badge>
          <input
            type="time"
            defaultValue={session.start_time || ""}
            className="text-xs bg-transparent border-transparent hover:border-gray-300 dark:hover:border-gray-600 border rounded px-1 py-0.5 w-[80px] focus:outline-none focus:border-blue-500"
            onBlur={(e) => onUpdate(session.id, "start_time", e.target.value || null)}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="time"
            defaultValue={session.end_time || ""}
            className="text-xs bg-transparent border-transparent hover:border-gray-300 dark:hover:border-gray-600 border rounded px-1 py-0.5 w-[80px] focus:outline-none focus:border-blue-500"
            onBlur={(e) => onUpdate(session.id, "end_time", e.target.value || null)}
          />
          {duration && (
            <span className="text-[10px] text-muted-foreground/70 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 shrink-0">
              {duration}
            </span>
          )}
          <input
            defaultValue={session.location_room || ""}
            placeholder="Room"
            className="text-xs bg-transparent border-transparent hover:border-gray-300 dark:hover:border-gray-600 border rounded px-1 py-0.5 w-[100px] text-muted-foreground focus:outline-none focus:border-blue-500 ml-auto"
            onBlur={(e) => onUpdate(session.id, "location_room", e.target.value || null)}
          />
          <button
            onClick={() => onDelete(session.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Row 2: Title */}
        <input
          defaultValue={session.title}
          className="w-full font-medium text-sm bg-transparent border-none focus:outline-none focus:ring-0 px-0 mb-1"
          onBlur={(e) => {
            if (e.target.value.trim() !== session.title) {
              onUpdate(session.id, "title", e.target.value.trim() || "Untitled");
            }
          }}
        />

        {/* Row 3: Speaker avatars + description */}
        <div className="flex items-center gap-2">
          {assignedSpeakers.length > 0 && (
            <div className="flex items-center -space-x-1.5 shrink-0">
              {assignedSpeakers.slice(0, 3).map((sp) => (
                <div key={sp.id} className="relative group/avatar">
                  <SpeakerAvatar speaker={sp} size={24} />
                  <button
                    onClick={() => onRemoveSpeaker(session.id, sp.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-3 w-3 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
              {assignedSpeakers.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 text-[9px] font-bold flex items-center justify-center border border-white dark:border-gray-600">
                  +{assignedSpeakers.length - 3}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground truncate flex-1">
            {session.description || ""}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Day Container (droppable for cross-day)
   ================================================================ */

function DayContainer({
  dayNumber,
  children,
  sessionIds,
}: {
  dayNumber: number;
  children: React.ReactNode;
  sessionIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-container-${dayNumber}`,
    data: { type: "day-container", dayNumber },
  });

  return (
    <SortableContext items={sessionIds} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[120px] rounded-lg p-2 transition-colors ${isOver ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
      >
        {children}
      </div>
    </SortableContext>
  );
}

/* ================================================================
   Timeline View
   ================================================================ */

function TimelineView({ sessions, speakerMap }: { sessions: AgendaRow[]; speakerMap: Map<string, SpeakerRow> }) {
  const scheduled = sessions.filter((s) => s.start_time && s.end_time);
  const unscheduled = sessions.filter((s) => !s.start_time || !s.end_time);

  // Find time range
  let minHour = 8, maxHour = 18;
  scheduled.forEach((s) => {
    const sh = parseInt(s.start_time!.split(":")[0], 10);
    const eh = parseInt(s.end_time!.split(":")[0], 10) + 1;
    if (sh < minHour) minHour = sh;
    if (eh > maxHour) maxHour = eh;
  });

  const totalHours = maxHour - minHour;
  const PX_PER_HOUR = 80;

  function timeToOffset(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return ((h - minHour) + m / 60) * PX_PER_HOUR;
  }

  const hours = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);

  return (
    <div className="relative">
      {/* Hour markers */}
      <div className="relative" style={{ height: totalHours * PX_PER_HOUR + 40 }}>
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 w-full flex items-center"
            style={{ top: (h - minHour) * PX_PER_HOUR }}
          >
            <span className="text-[10px] text-muted-foreground w-12 shrink-0 text-right pr-2">
              {String(h).padStart(2, "0")}:00
            </span>
            <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
          </div>
        ))}

        {/* Session blocks */}
        {scheduled.map((s) => {
          const top = timeToOffset(s.start_time!) + 8;
          const height = Math.max(timeToOffset(s.end_time!) - timeToOffset(s.start_time!), 28);
          const typeDef = getSessionType(s.session_type);
          const TypeIcon = typeDef.icon;
          return (
            <div
              key={s.id}
              className="absolute left-14 right-2 rounded-lg border-l-4 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 px-3 py-1.5 overflow-hidden"
              style={{ top, height, borderLeftColor: typeDef.color }}
            >
              <div className="flex items-center gap-1.5">
                <Badge className="text-[9px] px-1 py-0 gap-0.5 border-0" style={{ backgroundColor: `${typeDef.color}1A`, color: typeDef.color }}>
                  <TypeIcon className="h-2.5 w-2.5" />
                  {typeDef.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {s.start_time}–{s.end_time}
                </span>
                {s.location_room && (
                  <span className="text-[10px] text-muted-foreground ml-auto truncate">
                    {s.location_room}
                  </span>
                )}
              </div>
              {height > 36 && (
                <p className="text-xs font-medium truncate mt-0.5">{s.title}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-xs font-medium text-muted-foreground mb-2">Unscheduled</p>
          <div className="space-y-1.5">
            {unscheduled.map((s) => {
              const typeDef = getSessionType(s.session_type);
              const TypeIcon = typeDef.icon;
              return (
                <div key={s.id} className="rounded-lg border-l-4 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 px-3 py-2" style={{ borderLeftColor: typeDef.color }}>
                  <div className="flex items-center gap-1.5">
                    <Badge className="text-[9px] px-1 py-0 gap-0.5 border-0" style={{ backgroundColor: `${typeDef.color}1A`, color: typeDef.color }}>
                      <TypeIcon className="h-2.5 w-2.5" />
                      {typeDef.label}
                    </Badge>
                    <span className="text-xs font-medium">{s.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Main AgendaBuilder Component
   ================================================================ */

export default function AgendaBuilder({ eventId, startDate, endDate, speakers, onRefresh }: AgendaBuilderProps) {
  /* ---- state ---- */
  const [sessions, setSessions] = useState<AgendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const [view, setView] = useState<"cards" | "timeline">("cards");
  const [speakerPanelOpen, setSpeakerPanelOpen] = useState(true);
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overSessionId, setOverSessionId] = useState<string | null>(null);

  // Add session form
  const [newType, setNewType] = useState("main_speaker");
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDay, setNewDay] = useState(1);
  const [newSpeakerIds, setNewSpeakerIds] = useState<string[]>([]);
  const [newCustomColor, setNewCustomColor] = useState("#EC4899");
  const [addingSess, setAddingSess] = useState(false);

  // AI config
  const [aiStartTime, setAiStartTime] = useState("09:00");
  const [aiEndTime, setAiEndTime] = useState("17:00");
  const [aiMainSpeakers, setAiMainSpeakers] = useState(3);
  const [aiTalkLen, setAiTalkLen] = useState(45);
  const [aiBreaks, setAiBreaks] = useState(true);
  const [aiBreakLen, setAiBreakLen] = useState(15);
  const [aiBreakouts, setAiBreakouts] = useState(false);
  const [aiBreakoutLen, setAiBreakoutLen] = useState(30);

  // Confirm replace
  const [confirmReplace, setConfirmReplace] = useState(false);
  const pendingAI = useRef<Array<Record<string, unknown>> | null>(null);

  /* ---- derived ---- */
  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const diff = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
    return Math.max(1, diff);
  }, [startDate, endDate]);

  const speakerMap = useMemo(() => {
    const m = new Map<string, SpeakerRow>();
    speakers.forEach((s) => m.set(s.id, s));
    return m;
  }, [speakers]);

  const filteredSpeakers = useMemo(() => {
    if (!speakerSearch.trim()) return speakers;
    const q = speakerSearch.toLowerCase();
    return speakers.filter(
      (s) =>
        (s.creator_name || "").toLowerCase().includes(q) ||
        (s.role || "").toLowerCase().includes(q)
    );
  }, [speakers, speakerSearch]);

  const daySessions = useMemo(
    () => sessions.filter((s) => s.day_number === activeDay).sort((a, b) => a.sort_order - b.sort_order),
    [sessions, activeDay]
  );

  const daySessionIds = useMemo(() => daySessions.map((s) => s.id), [daySessions]);

  /* ---- sensors ---- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  /* ---- fetch ---- */
  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_agenda")
      .select("*")
      .eq("event_id", eventId)
      .order("day_number")
      .order("sort_order");
    if (error) {
      toast.error("Failed to load agenda");
      return;
    }
    setSessions(
      (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        speaker_ids: Array.isArray(r.speaker_ids) ? r.speaker_ids : [],
      })) as AgendaRow[]
    );
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ---- update helper ---- */
  const updateField = async (id: string, field: string, value: unknown) => {
    await supabase
      .from("event_agenda")
      .update({ [field]: value } as Record<string, unknown>)
      .eq("id", id);
    // Optimistic — update local
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const deleteSession = async (id: string) => {
    await supabase.from("event_agenda").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const removeSpeakerFromSession = async (sessionId: string, speakerId: string) => {
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return;
    const updated = (sess.speaker_ids || []).filter((sid: string) => sid !== speakerId);
    await supabase
      .from("event_agenda")
      .update({ speaker_ids: updated } as Record<string, unknown>)
      .eq("id", sessionId);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, speaker_ids: updated } : s))
    );
  };

  const addSpeakerToSession = async (sessionId: string, speakerId: string) => {
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return;
    if ((sess.speaker_ids || []).includes(speakerId)) return; // already assigned
    const updated = [...(sess.speaker_ids || []), speakerId];
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, speaker_ids: updated } : s))
    );
    await supabase
      .from("event_agenda")
      .update({ speaker_ids: updated } as Record<string, unknown>)
      .eq("id", sessionId);
  };

  /* ---- persist sort_order batch ---- */
  const persistOrder = async (items: AgendaRow[]) => {
    const updates = items.map((s, i) => ({ id: s.id, sort_order: i, day_number: s.day_number }));
    for (const u of updates) {
      await supabase
        .from("event_agenda")
        .update({ sort_order: u.sort_order, day_number: u.day_number } as Record<string, unknown>)
        .eq("id", u.id);
    }
  };

  /* ---- DnD handlers ---- */
  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    const activeData = e.active.data.current;
    const overData = e.over?.data.current;
    if (activeData?.type === "speaker" && overData?.type === "session-drop") {
      setOverSessionId(overData.sessionId as string);
    } else {
      setOverSessionId(null);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    setOverSessionId(null);

    const { active, over } = e;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 1. Speaker dropped onto session
    if (activeData?.type === "speaker") {
      const speakerId = activeData.speakerId as string;
      // Over a session-drop zone
      if (overData?.type === "session-drop") {
        addSpeakerToSession(overData.sessionId as string, speakerId);
        return;
      }
      // Over a sortable session card (fallback)
      if (overData?.type === "session") {
        addSpeakerToSession(overData.session.id as string, speakerId);
        return;
      }
      return;
    }

    // 2. Session reorder / cross-day move
    if (activeData?.type === "session") {
      const activeSessionId = String(active.id);
      const activeDayNum = activeData.dayNumber as number;

      // Cross-day: dropped onto a day-container
      if (overData?.type === "day-container") {
        const targetDay = overData.dayNumber as number;
        if (targetDay !== activeDayNum) {
          setSessions((prev) => {
            const updated = prev.map((s) =>
              s.id === activeSessionId ? { ...s, day_number: targetDay, sort_order: 999 } : s
            );
            const dayItems = updated
              .filter((s) => s.day_number === targetDay)
              .sort((a, b) => a.sort_order - b.sort_order);
            persistOrder(dayItems);
            return updated;
          });
        }
        return;
      }

      // Same-day reorder
      if (overData?.type === "session") {
        const overDayNum = overData.dayNumber as number;

        if (activeDayNum === overDayNum) {
          // Same day reorder
          const oldIndex = daySessions.findIndex((s) => s.id === activeSessionId);
          const newIndex = daySessions.findIndex((s) => s.id === String(over.id));
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reordered = arrayMove(daySessions, oldIndex, newIndex);
            const fullUpdated = sessions.map((s) => {
              if (s.day_number !== activeDay) return s;
              const idx = reordered.findIndex((r) => r.id === s.id);
              return idx !== -1 ? { ...s, sort_order: idx } : s;
            });
            setSessions(fullUpdated);
            persistOrder(reordered.map((s, i) => ({ ...s, sort_order: i })));
          }
        } else {
          // Cross-day: dropped onto a session in another day
          setSessions((prev) => {
            const updated = prev.map((s) =>
              s.id === activeSessionId ? { ...s, day_number: overDayNum, sort_order: 999 } : s
            );
            const dayItems = updated
              .filter((s) => s.day_number === overDayNum)
              .sort((a, b) => a.sort_order - b.sort_order);
            persistOrder(dayItems);
            return updated;
          });
        }
      }
    }
  };

  /* ---- add session ---- */
  const handleAddSession = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setAddingSess(true);
    const finalType = newType === "custom" ? `custom:${newCustomColor}` : newType;
    const { error } = await supabase.from("event_agenda").insert({
      event_id: eventId,
      title: newTitle.trim(),
      day_number: newDay,
      session_type: finalType,
      start_time: newStart || null,
      end_time: newEnd || null,
      location_room: newRoom || null,
      description: newDesc || null,
      sort_order: sessions.filter((s) => s.day_number === newDay).length,
      speaker_ids: newSpeakerIds,
    } as Record<string, unknown>);
    setAddingSess(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Session added");
    setAddSheetOpen(false);
    resetAddForm();
    fetchSessions();
  };

  const resetAddForm = () => {
    setNewType("main_speaker");
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
    setNewRoom("");
    setNewDesc("");
    setNewDay(activeDay);
    setNewSpeakerIds([]);
    setNewCustomColor("#EC4899");
  };

  /* ---- AI schedule ---- */
  const generateSchedule = async () => {
    setAiGenerating(true);
    try {
      const systemPrompt = `You are a military event scheduling assistant. Generate a structured event agenda.
Return ONLY a JSON array. Each element must have these exact fields:
- day_number (number, starting at 1)
- start_time (string, "HH:MM" 24-hour format)
- end_time (string, "HH:MM" 24-hour format)
- title (string)
- description (string, 1 sentence)
- location_room (string or null)
- session_type (one of: main_speaker, experience, breakout, break, opening_closing, custom)

Rules:
- Sessions must not overlap within the same day
- Use "opening_closing" for the first and last session of each day
- Use "break" for coffee/lunch breaks
- Use "main_speaker" for keynote/speaker sessions
- Use "breakout" for breakout sessions
- Keep descriptions military/professional themed
- Return ONLY the JSON array, no markdown fences, no explanation`;

      const userMsg = `Generate a ${dayCount}-day event schedule.
Each day runs from ${aiStartTime} to ${aiEndTime}.
Main speaker sessions: ${aiMainSpeakers} per day, ${aiTalkLen} minutes each.
${aiBreaks ? `Include ${aiBreakLen}-minute breaks between sessions.` : "No breaks needed."}
${aiBreakouts ? `Include ${aiBreakoutLen}-minute breakout sessions.` : "No breakout sessions."}
Total days: ${dayCount}`;

      const raw = await callAnthropic(systemPrompt, userMsg);
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleaned) as Array<Record<string, unknown>>;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast.error("AI returned invalid schedule");
        return;
      }

      if (sessions.length > 0) {
        pendingAI.current = parsed;
        setConfirmReplace(true);
      } else {
        await insertAISessions(parsed);
      }
    } catch (err) {
      console.error("AI schedule error:", err);
      toast.error("Failed to generate schedule");
    } finally {
      setAiGenerating(false);
    }
  };

  const insertAISessions = async (items: Array<Record<string, unknown>>) => {
    // Delete existing
    await supabase.from("event_agenda").delete().eq("event_id", eventId);

    // Insert generated
    const rows = items.map((item, i) => ({
      event_id: eventId,
      day_number: item.day_number || 1,
      start_time: item.start_time || null,
      end_time: item.end_time || null,
      title: item.title || "Untitled",
      description: item.description || null,
      location_room: item.location_room || null,
      session_type: item.session_type || "custom",
      sort_order: i,
      speaker_ids: [],
    }));

    const { error } = await supabase.from("event_agenda").insert(rows as Record<string, unknown>[]);
    if (error) {
      toast.error("Failed to insert schedule");
      return;
    }

    toast.success(`Generated ${rows.length} sessions`);
    setAiOpen(false);
    fetchSessions();
  };

  /* ---- drag overlay content ---- */
  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null;
    // Check if it's a speaker
    if (activeDragId.startsWith("speaker-")) {
      const spId = activeDragId.replace("speaker-", "");
      return { type: "speaker" as const, speaker: speakerMap.get(spId) };
    }
    // Session
    const sess = sessions.find((s) => s.id === activeDragId);
    return sess ? { type: "session" as const, session: sess } : null;
  }, [activeDragId, sessions, speakerMap]);

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  /* ================================================================
     Render
     ================================================================ */
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 relative">
        {/* ── Speaker Panel ── */}
        <div
          className={`shrink-0 transition-all duration-200 ${speakerPanelOpen ? "w-[240px]" : "w-[48px]"}`}
        >
          <Card className="h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
            {speakerPanelOpen ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Speakers
                  </span>
                  <button
                    onClick={() => setSpeakerPanelOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-2 py-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search speakers..."
                      value={speakerSearch}
                      onChange={(e) => setSpeakerSearch(e.target.value)}
                      className="h-7 text-xs pl-7"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 px-1 pb-2">
                  {filteredSpeakers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {speakers.length === 0 ? "No speakers yet" : "No matches"}
                    </p>
                  ) : (
                    filteredSpeakers.map((sp) => (
                      <DraggableSpeaker key={sp.id} speaker={sp} />
                    ))
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center py-3 gap-2">
                <button
                  onClick={() => setSpeakerPanelOpen(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                <Badge variant="secondary" className="text-[10px] px-1">
                  {speakers.length}
                </Badge>
              </div>
            )}
          </Card>
        </div>

        {/* ── Main Session Area ── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAiOpen(!aiOpen);
              }}
              className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20"
            >
              <Wand2 className="h-3.5 w-3.5" />
              AI Schedule
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setView("cards")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${view === "cards" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                Cards
              </button>
              <button
                onClick={() => setView("timeline")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${view === "timeline" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                Timeline
              </button>
            </div>
          </div>

          {/* AI Config Panel */}
          {aiOpen && (
            <Card className="mb-3 p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4 text-blue-700" />
                  AI Schedule Generator
                </h3>
                <button onClick={() => setAiOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input type="time" value={aiStartTime} onChange={(e) => setAiStartTime(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Input type="time" value={aiEndTime} onChange={(e) => setAiEndTime(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Main Speakers / Day</Label>
                  <Input type="number" min={1} max={20} value={aiMainSpeakers} onChange={(e) => setAiMainSpeakers(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Talk Length (min)</Label>
                  <Input type="number" min={5} max={120} value={aiTalkLen} onChange={(e) => setAiTalkLen(Number(e.target.value))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={aiBreaks} onCheckedChange={setAiBreaks} />
                  Breaks
                  {aiBreaks && (
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={aiBreakLen}
                      onChange={(e) => setAiBreakLen(Number(e.target.value))}
                      className="h-6 text-xs w-14 ml-1"
                    />
                  )}
                  {aiBreaks && <span className="text-muted-foreground">min</span>}
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={aiBreakouts} onCheckedChange={setAiBreakouts} />
                  Breakouts
                  {aiBreakouts && (
                    <Input
                      type="number"
                      min={10}
                      max={90}
                      value={aiBreakoutLen}
                      onChange={(e) => setAiBreakoutLen(Number(e.target.value))}
                      className="h-6 text-xs w-14 ml-1"
                    />
                  )}
                  {aiBreakouts && <span className="text-muted-foreground">min</span>}
                </label>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={generateSchedule}
                    disabled={aiGenerating}
                    className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
                  >
                    {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Generate Schedule
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Day Tabs */}
          {dayCount > 1 && (
            <div className="flex gap-1 mb-3">
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => {
                const count = sessions.filter((s) => s.day_number === d).length;
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(d)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${activeDay === d ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                  >
                    Day {d}
                    {count > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cards or Timeline */}
          {view === "cards" ? (
            <DayContainer dayNumber={activeDay} sessionIds={daySessionIds}>
              {daySessions.map((s) => (
                <SortableSessionCard
                  key={s.id}
                  session={s}
                  speakers={speakers}
                  speakerMap={speakerMap}
                  overSpeaker={overSessionId === s.id}
                  onUpdate={updateField}
                  onDelete={deleteSession}
                  onRemoveSpeaker={removeSpeakerFromSession}
                />
              ))}
              {daySessions.length === 0 && (
                <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                  <LayoutList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No sessions for Day {activeDay}</p>
                  <p className="text-xs mt-1">Click "Add Session" or use AI Schedule to get started</p>
                </Card>
              )}
              <button
                onClick={() => {
                  resetAddForm();
                  setNewDay(activeDay);
                  setAddSheetOpen(true);
                }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-700 dark:hover:border-blue-800 dark:hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Session
              </button>
            </DayContainer>
          ) : (
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
              <TimelineView sessions={daySessions} speakerMap={speakerMap} />
            </Card>
          )}

          {/* Session count */}
          <p className="text-xs text-muted-foreground mt-2">
            {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
            {dayCount > 1 && ` \u00B7 ${daySessions.length} on Day ${activeDay}`}
          </p>
        </div>
      </div>

      {/* ── Drag Overlay ── */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem?.type === "speaker" && activeDragItem.speaker && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1A1D27] rounded-lg shadow-lg border border-blue-400 opacity-90">
            <SpeakerAvatar speaker={activeDragItem.speaker} size={28} />
            <span className="text-xs font-medium">{activeDragItem.speaker.creator_name}</span>
          </div>
        )}
        {activeDragItem?.type === "session" && (() => {
          const overlayType = getSessionType(activeDragItem.session.session_type);
          return (
          <div className="rounded-xl border-l-4 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-3 shadow-lg opacity-90 max-w-[400px]" style={{ borderLeftColor: overlayType.color }}>
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] px-1.5 py-0 border-0" style={{ backgroundColor: `${overlayType.color}1A`, color: overlayType.color }}>
                {overlayType.label}
              </Badge>
              {activeDragItem.session.start_time && (
                <span className="text-xs text-muted-foreground">
                  {activeDragItem.session.start_time}–{activeDragItem.session.end_time}
                </span>
              )}
            </div>
            <p className="text-sm font-medium mt-1">{activeDragItem.session.title}</p>
          </div>
          );
        })()}
      </DragOverlay>

      {/* ── Add Session Sheet ── */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Add Session</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {/* Session type picker */}
            <div>
              <Label className="text-xs mb-2 block">Session Type</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {SESSION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isActive = newType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setNewType(t.key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${isActive ? "" : "border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      style={isActive ? { borderColor: t.color, backgroundColor: `${t.color}15`, color: t.color } : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {newType === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs shrink-0">Color</Label>
                  <input
                    type="color"
                    value={newCustomColor}
                    onChange={(e) => setNewCustomColor(e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-gray-200 dark:border-gray-700 p-0"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">{newCustomColor}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Session title" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Room / Location</Label>
              <Input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="e.g. Main Hall" />
            </div>

            {dayCount > 1 && (
              <div>
                <Label className="text-xs">Day</Label>
                <Select value={String(newDay)} onValueChange={(v) => setNewDay(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Speaker multi-select */}
            {speakers.length > 0 && (
              <div>
                <Label className="text-xs mb-2 block">Speakers</Label>
                <ScrollArea className="max-h-[160px]">
                  <div className="space-y-1">
                    {speakers.map((sp) => (
                      <label key={sp.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSpeakerIds.includes(sp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSpeakerIds((prev) => [...prev, sp.id]);
                            } else {
                              setNewSpeakerIds((prev) => prev.filter((id) => id !== sp.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <SpeakerAvatar speaker={sp} size={24} />
                        <span className="text-xs">{sp.creator_name || "Unnamed"}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleAddSession}
              disabled={addingSess}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
            >
              {addingSess ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Session
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Confirm Replace Dialog ── */}
      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace {sessions.length} existing session{sessions.length !== 1 ? "s" : ""} with the AI-generated schedule.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { pendingAI.current = null; }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAI.current) {
                  insertAISessions(pendingAI.current);
                  pendingAI.current = null;
                }
                setConfirmReplace(false);
              }}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              Replace All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
