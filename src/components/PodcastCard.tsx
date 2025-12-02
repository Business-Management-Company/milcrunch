import { Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PodcastCardProps {
  title: string;
  host: string;
  category: string;
  image: string;
  isWinner?: boolean;
}

const PodcastCard = ({ title, host, category, image, isWinner = false }: PodcastCardProps) => {
  return (
    <Card className="group relative overflow-hidden bg-gradient-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-card hover:scale-[1.02] cursor-pointer">
      <div className="aspect-square overflow-hidden relative">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {isWinner && (
          <div className="absolute top-4 right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-glow animate-in zoom-in duration-500">
            <Award className="w-5 h-5" />
          </div>
        )}
      </div>
      
      <div className="p-6 space-y-3">
        <Badge variant="secondary" className="text-xs font-medium">
          {category}
        </Badge>
        
        <div>
          <h3 className="text-xl font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            Hosted by {host}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default PodcastCard;
