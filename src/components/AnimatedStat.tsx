import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedStatProps {
  value: string;
  label: string;
  className?: string;
}

const AnimatedStat = ({ value, label, className = "" }: AnimatedStatProps) => {
  // Parse the numeric value and suffix (e.g., "10K+" -> 10, "K+")
  const numericMatch = value.match(/^([\d.]+)/);
  const numericValue = numericMatch ? parseFloat(numericMatch[1]) : 0;
  const suffix = value.replace(/^[\d.]+/, "");
  
  // Determine if we should show decimals
  const hasDecimal = value.includes(".");
  const multiplier = hasDecimal ? 10 : 1;
  
  const { count, ref } = useCountUp({ 
    end: Math.round(numericValue * multiplier), 
    duration: 2000 
  });

  const displayValue = hasDecimal 
    ? (count / multiplier).toFixed(1) 
    : count;

  return (
    <div ref={ref} className={className}>
      <div className="text-2xl font-display font-bold text-foreground">
        {displayValue}{suffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

export default AnimatedStat;
