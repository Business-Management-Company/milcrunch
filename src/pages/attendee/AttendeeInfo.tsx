import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import { Card } from "@/components/ui/card";
import {
  MapPin, Wifi, ChevronDown, Phone, ExternalLink, Calendar, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

/* ---------- defaults ---------- */
const DEFAULT_FAQS = [
  {
    q: "What should I bring?",
    a: "A valid photo ID, your QR code (digital or printed), business cards for networking, and a phone charger. Dress code is business casual.",
  },
  {
    q: "Is parking available?",
    a: "Yes \u2014 check the venue website for parking details, rates, and any validation options. Rideshare drop-off is available at the main entrance.",
  },
  {
    q: "Can I get a refund?",
    a: "Refund requests must be submitted at least 7 days before the event. Contact the event organizer directly through the app.",
  },
  {
    q: "Is there food at the event?",
    a: "Meals and snacks are provided during the event. Dietary restrictions noted during registration will be accommodated.",
  },
  {
    q: "How do I connect with other attendees?",
    a: "Use the My Profile tab to scan QR codes in person or browse attendees in the community section.",
  },
];

const EMERGENCY_CONTACTS = [
  { label: "Event Support", number: "(555) 123-4567" },
  { label: "Venue Security", number: "(555) 987-6543" },
  { label: "Emergency", number: "911" },
];

/* ---------- Accordion Item ---------- */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left"
    >
      <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </div>
      {open && (
        <p className="text-sm text-gray-500 py-3 leading-relaxed">{a}</p>
      )}
    </button>
  );
}

/* ======================================== */
function AttendeeInfoContent() {
  const { event } = useAttendeeEvent();

  const [wifiName, setWifiName] = useState("MIC2026");
  const [wifiPassword, setWifiPassword] = useState("military!");
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>(DEFAULT_FAQS);
  const [loadingFaqs, setLoadingFaqs] = useState(true);

  useEffect(() => {
    fetchWifi();
    fetchFaqs();
  }, [event.id]);

  const fetchWifi = async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select("wifi_name, wifi_password")
        .eq("id", event.id)
        .single();
      if (data) {
        const d = data as Record<string, string | null>;
        if (d.wifi_name) setWifiName(d.wifi_name);
        if (d.wifi_password) setWifiPassword(d.wifi_password);
      }
    } catch {
      // columns may not exist; keep defaults
    }
  };

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from("event_faqs")
        .select("question, answer")
        .eq("event_id", event.id)
        .order("sort_order");
      if (!error && data && data.length > 0) {
        setFaqs(
          (data as unknown as { question: string; answer: string }[]).map((r) => ({
            q: r.question,
            a: r.answer,
          }))
        );
      }
    } catch {
      // table may not exist; keep defaults
    } finally {
      setLoadingFaqs(false);
    }
  };

  const startDate = event.start_date ? parseISO(event.start_date) : null;
  const endDate = event.end_date ? parseISO(event.end_date) : null;

  const googleMapsUrl = event.venue
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [event.venue, event.city, event.state].filter(Boolean).join(", ")
      )}`
    : null;

  return (
    <div className="space-y-4">
      {/* Hero Image */}
      {event.cover_image_url && (
        <div className="w-full">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      <div className="px-4 pb-4 space-y-4">
        {/* Event Details Card */}
        <Card className="p-5 bg-white rounded-xl">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Event Details</h2>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="h-5 w-5 text-[#6C5CE7] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{event.venue}</p>
                <p className="text-sm text-gray-500">
                  {[event.city, event.state].filter(Boolean).join(", ")}
                </p>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#6C5CE7] font-medium mt-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-start gap-3 mb-4">
            <Calendar className="h-5 w-5 text-[#6C5CE7] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Dates & Times</p>
              <p className="text-sm text-gray-500">
                {startDate && endDate
                  ? `${format(startDate, "EEEE, MMM d")} \u2014 ${format(endDate, "EEEE, MMM d, yyyy")}`
                  : startDate
                    ? format(startDate, "EEEE, MMM d, yyyy")
                    : "TBD"}
              </p>
              {event.timezone && (
                <p className="text-xs text-gray-400 mt-0.5">{event.timezone}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="border-t border-gray-100 pt-4 mt-2">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </Card>

        {/* WiFi Card */}
        <Card className="p-4 bg-white rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
              <Wifi className="h-5 w-5 text-[#6C5CE7]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">WiFi Access</p>
              <div className="flex items-center gap-4 mt-1">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Network</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{wifiName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Password</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{wifiPassword}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="p-5 bg-white rounded-xl">
          <h3 className="font-bold text-gray-900 text-base mb-2">
            Frequently Asked Questions
          </h3>
          {loadingFaqs ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div>
              {faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          )}
        </Card>

        {/* Emergency Contacts */}
        <Card className="p-5 bg-white rounded-xl">
          <h3 className="font-bold text-gray-900 text-base mb-3">
            Emergency Contacts
          </h3>
          <div className="space-y-3">
            {EMERGENCY_CONTACTS.map((c) => (
              <a
                key={c.label}
                href={`tel:${c.number.replace(/\D/g, "")}`}
                className="flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{c.label}</span>
                </div>
                <span className="text-sm text-[#6C5CE7] font-medium group-hover:underline">
                  {c.number}
                </span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const AttendeeInfoPage = () => (
  <AttendeeLayout activeTab="info">
    <AttendeeInfoContent />
  </AttendeeLayout>
);

export default AttendeeInfoPage;
