import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  position: "bottom" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="insights"]',
    title: "Your 365 Insights",
    description:
      "Real-time sponsor analytics — track impressions, community growth, and YoY performance all year round.",
    position: "bottom",
  },
  {
    selector: 'a[href="/brand/campaigns"]',
    title: "AI Campaign Builder",
    description:
      "Generate full social media campaigns in seconds with AI-powered captions, scheduling, and platform-specific content.",
    position: "right",
  },
  {
    selector: 'a[href="/brand/discover"]',
    title: "Creator Discovery",
    description:
      "Search 1,000+ verified military creators with AI-powered filters, confidence scoring, and deep enrichment.",
    position: "right",
  },
  {
    selector: 'a[href="/brand/events"]',
    title: "Live Attendee App",
    description:
      "Your Whova replacement — end-to-end event creation, ticketing, agenda, speakers, and a mobile-first attendee experience.",
    position: "right",
  },
  {
    selector: 'a[href="/brand/posting"]',
    title: "Social Posting",
    description:
      "Publish to all platforms at once with AI captions, first-comment support, and scheduled delivery.",
    position: "right",
  },
  {
    selector: 'a[href="/analytics"]',
    title: "Sponsor Intelligence",
    description:
      "Show sponsors their ROI with multi-sponsor dashboards, impression tracking, and exportable reports.",
    position: "right",
  },
];

const STORAGE_KEY = "demo-tour-seen";
const PAD = 12;

interface DemoTourProps {
  active: boolean;
  onComplete: () => void;
}

export default function DemoTour({ active, onComplete }: DemoTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    if (!active) return;
    const el = document.querySelector(TOUR_STEPS[step]?.selector);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step, active]);

  useEffect(() => {
    measure();
    const id = setTimeout(measure, 350); // re-measure after scroll
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setStep(0);
    onComplete();
  };

  const next = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  // Position tooltip
  const style: React.CSSProperties = { position: "absolute" };
  if (rect) {
    if (current.position === "bottom") {
      style.top = rect.bottom + PAD;
      style.left = rect.left + rect.width / 2;
      style.transform = "translateX(-50%)";
    } else {
      style.top = rect.top + rect.height / 2;
      style.left = rect.right + PAD;
      style.transform = "translateY(-50%)";
    }
  } else {
    style.top = "50%";
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={finish} />

      {/* Spotlight ring */}
      {rect && (
        <div
          className="absolute rounded-lg ring-[3px] ring-[#6C5CE7] bg-transparent pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="w-72 bg-[#6C5CE7] rounded-xl p-4 shadow-2xl text-white"
        style={style}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium opacity-80">
            {step + 1} of {TOUR_STEPS.length}
          </span>
          <button onClick={finish} className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-bold text-sm mb-1">{current.title}</h3>
        <p className="text-xs leading-relaxed opacity-90">{current.description}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={finish}
            className="text-xs opacity-70 hover:opacity-100 underline"
          >
            Skip Tour
          </button>
          <button
            onClick={next}
            className="text-xs font-semibold bg-white text-[#6C5CE7] px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
