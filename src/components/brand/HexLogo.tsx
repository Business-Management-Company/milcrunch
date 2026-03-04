/** MilCrunch hex logo: gold hexagon icon + "MilCrunch" wordmark in Sora 800. */
export function HexIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <polygon points="16,1 29,8.5 29,23.5 16,31 3,23.5 3,8.5" fill="#f59e0b" />
    </svg>
  );
}

interface HexLogoProps {
  /** "dark" = white text (for dark backgrounds), "light" = dark text (for light backgrounds) */
  variant?: "dark" | "light";
  /** Icon size in px */
  iconSize?: number;
  /** Text size class — defaults to text-xl */
  textClass?: string;
  className?: string;
}

export default function HexLogo({
  variant = "dark",
  iconSize = 24,
  textClass = "text-xl",
  className = "",
}: HexLogoProps) {
  const textColor = variant === "dark" ? "text-white" : "text-[#0f1a2e]";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <HexIcon size={iconSize} />
      <span
        className={`${textColor} ${textClass} tracking-tight`}
        style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800 }}
      >
        MilCrunch
      </span>
    </span>
  );
}
