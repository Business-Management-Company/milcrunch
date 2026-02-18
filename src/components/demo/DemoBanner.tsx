import { useDemoMode } from "@/hooks/useDemoMode";

export const DEMO_BANNER_HEIGHT = 32;

export default function DemoBanner() {
  const { isDemo, exitDemo } = useDemoMode();

  if (!isDemo) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 text-white text-xs font-medium"
      style={{ height: DEMO_BANNER_HEIGHT, backgroundColor: "#1a1f2e" }}
    >
      <span>🎯 You're exploring the MilCrunch demo</span>
      <span className="text-white/40">—</span>
      <button
        onClick={exitDemo}
        className="underline underline-offset-2 hover:text-gray-300 transition-colors"
      >
        Exit Demo
      </button>
    </div>
  );
}
