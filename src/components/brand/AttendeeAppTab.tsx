import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save, Loader2, ExternalLink, Copy, Plus, Trash2, Pencil, ChevronUp,
  ChevronDown, Send, Wifi, Phone, Mail, User, HelpCircle, Bell, X, Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

/* ---------- types ---------- */
interface FaqRow {
  id: string;
  event_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

interface Props {
  eventId: string;
  eventSlug: string | null;
  eventTitle: string;
}

/* ======================================== */
const AttendeeAppTab = ({ eventId, eventSlug, eventTitle }: Props) => {
  /* --- App Settings --- */
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  /* --- FAQs --- */
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [addingFaq, setAddingFaq] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [savingFaq, setSavingFaq] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  /* --- Notifications --- */
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("announcement");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [registrantCount, setRegistrantCount] = useState(0);

  /* --- Load data --- */
  useEffect(() => {
    fetchSettings();
    fetchFaqs();
    fetchRegistrantCount();
  }, [eventId]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select("contact_name, contact_email, contact_phone, wifi_name, wifi_password")
        .eq("id", eventId)
        .single();
      if (data) {
        const d = data as Record<string, string | null>;
        setContactName(d.contact_name || "");
        setContactEmail(d.contact_email || "");
        setContactPhone(d.contact_phone || "");
        setWifiName(d.wifi_name || "");
        setWifiPassword(d.wifi_password || "");
      }
    } catch {
      // columns may not exist yet
    }
  };

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from("event_faqs")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");
      if (error) throw error;
      setFaqs((data || []) as unknown as FaqRow[]);
    } catch {
      // table may not exist yet
    } finally {
      setLoadingFaqs(false);
    }
  };

  const fetchRegistrantCount = async () => {
    try {
      const { count } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");
      setRegistrantCount(count || 0);
    } catch {
      // silent
    }
  };

  /* --- Save Settings --- */
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          wifi_name: wifiName.trim() || null,
          wifi_password: wifiPassword.trim() || null,
        } as Record<string, unknown>)
        .eq("id", eventId);
      if (error) throw error;
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingSettings(false);
    }
  };

  /* --- FAQ CRUD --- */
  const addFaq = async () => {
    if (!newQ.trim() || !newA.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSavingFaq(true);
    try {
      const { data, error } = await supabase
        .from("event_faqs")
        .insert({
          event_id: eventId,
          question: newQ.trim(),
          answer: newA.trim(),
          sort_order: faqs.length,
        } as Record<string, unknown>)
        .select("*")
        .single();
      if (error) throw error;
      setFaqs((prev) => [...prev, data as unknown as FaqRow]);
      setNewQ("");
      setNewA("");
      setAddingFaq(false);
      toast.success("FAQ added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add FAQ");
    } finally {
      setSavingFaq(false);
    }
  };

  const updateFaq = async (id: string) => {
    if (!editQ.trim() || !editA.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSavingFaq(true);
    try {
      const { error } = await supabase
        .from("event_faqs")
        .update({ question: editQ.trim(), answer: editA.trim() } as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
      setFaqs((prev) =>
        prev.map((f) => (f.id === id ? { ...f, question: editQ.trim(), answer: editA.trim() } : f))
      );
      setEditingFaqId(null);
      toast.success("FAQ updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update FAQ");
    } finally {
      setSavingFaq(false);
    }
  };

  const deleteFaq = async (id: string) => {
    try {
      await supabase.from("event_faqs").delete().eq("id", id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success("FAQ deleted");
    } catch {
      toast.error("Failed to delete FAQ");
    }
  };

  const moveFaq = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;
    const reordered = [...faqs];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setFaqs(reordered);
    // Persist sort orders
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from("event_faqs")
        .update({ sort_order: i } as Record<string, unknown>)
        .eq("id", reordered[i].id);
    }
  };

  /* --- Send Notification --- */
  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSendingNotif(true);
    try {
      const { error } = await supabase
        .from("event_notifications")
        .insert({
          event_id: eventId,
          type: notifType,
          title: notifTitle.trim(),
          body: notifMessage.trim(),
        } as Record<string, unknown>);
      if (error) throw error;
      setNotifTitle("");
      setNotifMessage("");
      toast.success(`Notification sent to ${registrantCount} attendee${registrantCount !== 1 ? "s" : ""}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSendingNotif(false);
    }
  };

  const appUrl = `https://milcrunch.com/attend/${eventSlug || eventId}`;
  const previewPath = `/attend/${eventSlug || eventId}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ===== LEFT COLUMN — Management Controls ===== */}
      <div className="lg:col-span-3 space-y-6">
        {/* --- Section 1: App Settings --- */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Wifi className="h-5 w-5 text-[#1e3a5f]" />
            App Settings
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Event Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">
                    <User className="h-3 w-3 inline mr-1" />Name
                  </Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Smith"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">
                    <Mail className="h-3 w-3 inline mr-1" />Email
                  </Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">
                    <Phone className="h-3 w-3 inline mr-1" />Phone
                  </Label>
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">WiFi Credentials</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">WiFi Name</Label>
                  <Input
                    value={wifiName}
                    onChange={(e) => setWifiName(e.target.value)}
                    placeholder="MIC2026"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">WiFi Password</Label>
                  <Input
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="military!"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
            >
              {savingSettings ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" />Save Settings</>
              )}
            </Button>
          </div>
        </Card>

        {/* --- Section 2: FAQ Manager --- */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#1e3a5f]" />
              FAQ Manager
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingFaq(!addingFaq)}
            >
              {addingFaq ? (
                <><X className="h-4 w-4 mr-1" />Cancel</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" />Add FAQ</>
              )}
            </Button>
          </div>

          {/* Add FAQ inline form */}
          {addingFaq && (
            <div className="mb-4 p-4 border border-dashed border-[#1e3a5f]/30 rounded-lg bg-blue-50/30 dark:bg-blue-900/10 space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Question</Label>
                <Input
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  placeholder="What should attendees bring?"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Answer</Label>
                <Textarea
                  value={newA}
                  onChange={(e) => setNewA(e.target.value)}
                  placeholder="A valid photo ID, your QR code, and business cards..."
                  rows={3}
                  className="mt-1 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={addFaq}
                disabled={savingFaq}
                className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
              >
                {savingFaq ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Save FAQ
              </Button>
            </div>
          )}

          {/* FAQ list */}
          {loadingFaqs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No FAQs yet. Add your first one above.
            </p>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div
                  key={faq.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  {editingFaqId === faq.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editQ}
                        onChange={(e) => setEditQ(e.target.value)}
                        className="text-sm"
                      />
                      <Textarea
                        value={editA}
                        onChange={(e) => setEditA(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateFaq(faq.id)} disabled={savingFaq} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
                          {savingFaq ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingFaqId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{faq.question}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveFaq(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveFaq(idx, "down")}
                          disabled={idx === faqs.length - 1}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingFaqId(faq.id);
                            setEditQ(faq.question);
                            setEditA(faq.answer);
                          }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteFaq(faq.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* --- Section 3: Send Notification --- */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#1e3a5f]" />
            Send Notification
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-600">Title</Label>
              <Input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Schedule Change Alert"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600">Message</Label>
              <Textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="The keynote has been moved to Ballroom A..."
                rows={3}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600">Type</Label>
              <Select value={notifType} onValueChange={setNotifType}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="schedule">Schedule Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {registrantCount} attendee{registrantCount !== 1 ? "s" : ""} will receive this
              </p>
              <Button
                onClick={sendNotification}
                disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
              >
                {sendingNotif ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-1.5" />Send to Attendees</>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* --- Section 4: App Link --- */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-[#1e3a5f]" />
            App Link
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <code className="text-sm flex-1 truncate text-[#1e3a5f] font-medium">
                {appUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  toast.success("Link copied!");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-start gap-6">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <QRCodeSVG
                  value={appUrl}
                  size={120}
                  level="M"
                  fgColor="#1e3a5f"
                />
              </div>
              <div className="flex-1 space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">
                  Print this QR code on event signage so attendees can quickly access the app.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(previewPath, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open App
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== RIGHT COLUMN — Phone Preview ===== */}
      <div className="lg:col-span-2">
        <div className="sticky top-24">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">
            Live Attendee Preview
          </p>

          {/* Phone frame */}
          <div className="mx-auto" style={{ width: 300 }}>
            <div
              className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl"
              style={{ aspectRatio: "9/19.5" }}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />

              {/* Screen */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-gray-50 pt-[40px]">
                <iframe
                  src={previewPath}
                  className="w-full h-full border-0"
                  style={{
                    pointerEvents: "auto",
                    transform: "scale(0.75)",
                    transformOrigin: "top left",
                    width: "133.33%",
                    height: "133.33%",
                  }}
                  title="Attendee App Preview"
                />
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(previewPath, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Full Preview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendeeAppTab;
