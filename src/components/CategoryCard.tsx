import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  nominees: number;
}

const CategoryCard = ({ icon: Icon, title, description, nominees }: CategoryCardProps) => {
  return (
    <Card className="group relative overflow-hidden bg-gradient-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-glow hover:scale-105 cursor-pointer">
      <div className="absolute inset-0 bg-gradient-gold opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
      
      <div className="relative p-8 space-y-4">
        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        
        <div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{nominees}</span> nominees
          </span>
        </div>
      </div>
    </Card>
  );
};

export default CategoryCard;
