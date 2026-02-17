import { useState } from "react";
import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import { Card } from "@/components/ui/card";
import {
  MapPin, Clock, Wifi, ChevronDown, Phone, ExternalLink, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

/* ---------- FAQ data ---------- */
const FAQS = [
  {
    q: "What should I bring?",
    a: "A valid photo ID, your QR code (digital or printed), business cards for networking, and a phone charger. Dress code is business casual.",
  },
  {
    q: "Is parking available?",
    a: "Yes — check the venue website for parking details, rates, and any validation options. Rideshare drop-off is available at the main entrance.",
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
    a: "Use the Community tab to browse attendees, or scan QR codes in person. Your profile controls what information is shared.",
  },
];

/* ---------- Emergency contacts ---------- */
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

  const startDate = event.start_date ? parseISO(event.start_date) : null;
  const endDate = event.end_date ? parseISO(event.end_date) : null;

  const googleMapsUrl = event.venue
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [event.venue, event.city, event.state].filter(Boolean).join(", ")
      )}`
    : null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Event Details Card */}
      <Card className="p-5 bg-white rounded-xl">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Event Details</h2>

        {/* Dates */}
        <div className="flex items-start gap-3 mb-4">
          <Calendar className="h-5 w-5 text-[#6C5CE7] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Dates & Times</p>
            <p className="text-sm text-gray-500">
              {startDate && endDate
                ? `${format(startDate, "EEEE, MMM d")} — ${format(endDate, "EEEE, MMM d, yyyy")}`
                : startDate
                  ? format(startDate, "EEEE, MMM d, yyyy")
                  : "TBD"}
            </p>
            {event.timezone && (
              <p className="text-xs text-gray-400 mt-0.5">{event.timezone}</p>
            )}
          </div>
        </div>

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
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>
        )}

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
          <div>
            <p className="text-sm font-medium text-gray-900">WiFi Access</p>
            <p className="text-xs text-gray-500">
              Network and password will be announced at the event.
            </p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-5 bg-white rounded-xl">
        <h3 className="font-bold text-gray-900 text-base mb-2">
          Frequently Asked Questions
        </h3>
        <div>
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
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
  );
}

const AttendeeInfoPage = () => (
  <AttendeeLayout activeTab="info">
    <AttendeeInfoContent />
  </AttendeeLayout>
);

export default AttendeeInfoPage;
