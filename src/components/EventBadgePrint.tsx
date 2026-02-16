import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface BadgeData {
  id: string;
  first_name: string;
  last_name: string;
  registration_code: string | null;
  ticket_name: string;
  ticket_color: string;
}

interface EventBadgePrintProps {
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  badges: BadgeData[];
  onClose: () => void;
}

const TICKET_COLORS: Record<string, { bg: string; text: string; printBg: string }> = {
  vip: { bg: "bg-amber-100", text: "text-amber-800", printBg: "#fef3c7" },
  creator: { bg: "bg-purple-100", text: "text-purple-800", printBg: "#f3e8ff" },
  general: { bg: "bg-blue-100", text: "text-blue-800", printBg: "#dbeafe" },
  default: { bg: "bg-gray-100", text: "text-gray-800", printBg: "#f3f4f6" },
};

function getTicketStyle(ticketName: string) {
  const lower = ticketName.toLowerCase();
  if (lower.includes("vip")) return TICKET_COLORS.vip;
  if (lower.includes("creator")) return TICKET_COLORS.creator;
  if (lower.includes("general")) return TICKET_COLORS.general;
  return TICKET_COLORS.default;
}

const BadgeCard = ({
  badge,
  eventTitle,
  eventDate,
  eventVenue,
}: {
  badge: BadgeData;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
}) => {
  const style = getTicketStyle(badge.ticket_name);
  const qrValue = badge.registration_code
    ? `https://milcrunch.com/checkin/${badge.registration_code}`
    : badge.id;

  return (
    <div
      className="badge-card border-2 border-gray-300 rounded-lg overflow-hidden"
      style={{ width: "4in", height: "3in", pageBreakInside: "avoid" }}
    >
      <div className="h-full flex flex-col p-4">
        {/* Event name */}
        <div className="text-center border-b border-gray-200 pb-2 mb-2">
          <p className="font-bold text-sm leading-tight">{eventTitle}</p>
        </div>

        {/* Attendee name */}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-2xl font-bold text-center leading-tight">
            {badge.first_name} {badge.last_name}
          </p>
        </div>

        {/* Ticket type */}
        <div className="flex justify-center mb-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${style.bg} ${style.text}`}
          >
            {badge.ticket_name}
          </span>
        </div>

        {/* Bottom: QR + event info */}
        <div className="flex items-end justify-between border-t border-gray-200 pt-2">
          <div className="text-xs text-gray-500 leading-tight">
            <p>{eventDate}</p>
            <p>{eventVenue}</p>
          </div>
          <div className="bg-white p-1 rounded">
            <QRCodeSVG value={qrValue} size={48} level="M" />
          </div>
        </div>
      </div>
    </div>
  );
};

const EventBadgePrint = ({ eventTitle, eventDate, eventVenue, badges, onClose }: EventBadgePrintProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      {/* Controls (hidden in print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Event Badges</h2>
          <p className="text-sm text-gray-500">{badges.length} badge{badges.length !== 1 ? "s" : ""} ready to print</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Printer className="h-4 w-4 mr-2" /> Print All Badges
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>

      {/* Badge grid */}
      <div className="p-8 print:p-0">
        <div className="badge-grid grid grid-cols-2 gap-4 max-w-[8.5in] mx-auto print:gap-0">
          {badges.map((badge, i) => (
            <div key={badge.id} className={`flex justify-center ${i % 4 === 0 && i > 0 ? "print:break-before-page" : ""}`}>
              <BadgeCard
                badge={badge}
                eventTitle={eventTitle}
                eventDate={eventDate}
                eventVenue={eventVenue}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .badge-grid, .badge-grid * { visibility: visible; }
          .badge-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 8.5in;
            display: grid;
            grid-template-columns: repeat(2, 4in);
            gap: 0.25in;
            padding: 0.25in;
          }
          .badge-card {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: letter;
            margin: 0.25in;
          }
        }
      `}</style>
    </div>
  );
};

export default EventBadgePrint;
