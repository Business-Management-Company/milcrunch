import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface FeaturedEventCardProps {
  image: string;
  logo?: string;
  title: string;
  subtitle: string;
  date?: string;
  location?: string;
  attendees?: string;
  ctaText: string;
  ctaLink: string;
  gradient?: "amber" | "blue" | "purple";
}

const FeaturedEventCard = ({
  image,
  logo,
  title,
  subtitle,
  date,
  location,
  attendees,
  ctaText,
  ctaLink,
  gradient = "amber"
}: FeaturedEventCardProps) => {
  const gradientClasses = {
    amber: "from-amber-500/20 via-orange-500/10 to-transparent",
    blue: "from-blue-500/20 via-cyan-500/10 to-transparent",
    purple: "from-purple-500/20 via-pink-500/10 to-transparent"
  };

  const accentClasses = {
    amber: "bg-amber-500 text-white",
    blue: "bg-blue-500 text-white",
    purple: "bg-purple-500 text-white"
  };

  return (
    <Card className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated">
      {/* Image with gradient overlay */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${gradientClasses[gradient]}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Logo overlay */}
        {logo && (
          <div className="absolute top-4 left-4">
            <img src={logo} alt="" className="w-16 h-16 rounded-xl shadow-lg bg-white/10 backdrop-blur-sm p-2" />
          </div>
        )}

        {/* Floating badge */}
        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full ${accentClasses[gradient]} text-xs font-bold uppercase tracking-wide shadow-lg`}>
          Featured Event
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl md:text-3xl font-headline font-bold text-white mb-2 drop-shadow-lg">
            {title}
          </h3>
          <p className="text-white/80 text-sm md:text-base max-w-md">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Details section */}
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          {date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm">{date}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">{location}</span>
            </div>
          )}
          {attendees && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm">{attendees}</span>
            </div>
          )}
        </div>

        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:scale-[1.02] transition-transform">
          <Link to={ctaLink}>
            {ctaText}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </Card>
  );
};

export default FeaturedEventCard;
