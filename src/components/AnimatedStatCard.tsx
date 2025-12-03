import { Card } from "@/components/ui/card";
import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedStatCardProps {
  value: string;
  label: string;
}

const AnimatedStatCard = ({ value, label }: AnimatedStatCardProps) => {
  // Parse the numeric value and suffix (e.g., "10K+" -> 10, "K+")
  const numericMatch = value.match(/^([\d.]+)/);
  const numericValue = numericMatch ? parseFloat(numericMatch[1]) : 0;
  const suffix = value.replace(/^[\d.]+/, "");
  
  const { count, ref } = useCountUp({ 
    end: numericValue, 
    duration: 2000 
  });

  return (
    <Card 
      ref={ref} 
      className="bg-gradient-card border-border p-6 text-center group hover:scale-105 transition-transform duration-300"
    >
      <p className="text-4xl font-display font-bold text-primary mb-2 group-hover:scale-110 transition-transform">
        {count}{suffix}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
};

export default AnimatedStatCard;
