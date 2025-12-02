import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMCAzYy0xLjY1NyAwLTMgMS4zNDMtMyAzczEuMzQzIDMgMyAzIDMtMS4zNDMgMy0zLTEuMzQzLTMtMy0zeiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">2024 Annual Awards</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight">
            The Podcast
            <span className="block bg-gradient-gold bg-clip-text text-transparent">
              Awards
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Celebrating excellence in audio storytelling. Discover this year's most innovative and captivating podcasts.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow transition-all hover:scale-105">
              View Winners
            </Button>
            <Button size="lg" variant="secondary" className="bg-secondary hover:bg-secondary/80 transition-all hover:scale-105">
              Explore Nominees
            </Button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};

export default Hero;
