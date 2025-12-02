import { Mic, Sparkles, Users, TrendingUp, Heart, Zap } from "lucide-react";
import Hero from "@/components/Hero";
import CategoryCard from "@/components/CategoryCard";
import PodcastCard from "@/components/PodcastCard";
import podcast1 from "@/assets/podcast-1.jpg";
import podcast2 from "@/assets/podcast-2.jpg";
import podcast3 from "@/assets/podcast-3.jpg";
import podcast4 from "@/assets/podcast-4.jpg";
import podcast5 from "@/assets/podcast-5.jpg";
import podcast6 from "@/assets/podcast-6.jpg";

const Index = () => {
  const categories = [
    {
      icon: Mic,
      title: "Best True Crime",
      description: "Gripping investigations and compelling narratives that keep listeners on the edge of their seats.",
      nominees: 12
    },
    {
      icon: Sparkles,
      title: "Best Comedy",
      description: "Laughter-inducing shows that brighten our days with wit, humor, and entertainment.",
      nominees: 15
    },
    {
      icon: Users,
      title: "Best Interview",
      description: "Thoughtful conversations with fascinating guests that inspire and inform audiences.",
      nominees: 10
    },
    {
      icon: TrendingUp,
      title: "Best Business",
      description: "Insightful analysis and expert advice on entrepreneurship, finance, and innovation.",
      nominees: 8
    },
    {
      icon: Heart,
      title: "Best Storytelling",
      description: "Masterful narratives that transport listeners to new worlds and perspectives.",
      nominees: 14
    },
    {
      icon: Zap,
      title: "Breakthrough Podcast",
      description: "Fresh voices and innovative formats that are reshaping the podcast landscape.",
      nominees: 18
    }
  ];

  const featuredPodcasts = [
    {
      title: "Shadows & Secrets",
      host: "Sarah Mitchell",
      category: "True Crime",
      image: podcast1,
      isWinner: true
    },
    {
      title: "The Laugh Lab",
      host: "Mike Chen & Lisa Park",
      category: "Comedy",
      image: podcast2,
      isWinner: true
    },
    {
      title: "Stories Untold",
      host: "James Rivera",
      category: "Storytelling",
      image: podcast3,
      isWinner: false
    },
    {
      title: "Business Decoded",
      host: "Rachel Thompson",
      category: "Business",
      image: podcast4,
      isWinner: true
    },
    {
      title: "Culture Shift",
      host: "Alex Kim",
      category: "Society & Culture",
      image: podcast5,
      isWinner: false
    },
    {
      title: "Tech Tomorrow",
      host: "David Santos",
      category: "Technology",
      image: podcast6,
      isWinner: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl md:text-6xl font-display font-bold text-foreground">
              Award Categories
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Recognizing excellence across diverse podcast genres and formats
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            {categories.map((category, index) => (
              <div key={index} style={{ animationDelay: `${index * 100}ms` }}>
                <CategoryCard {...category} />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl md:text-6xl font-display font-bold text-foreground">
              Featured Podcasts
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              This year's most outstanding shows and breakthrough creators
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            {featuredPodcasts.map((podcast, index) => (
              <div key={index} style={{ animationDelay: `${index * 100}ms` }}>
                <PodcastCard {...podcast} />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="text-sm">© 2024 Podcast Awards. Celebrating excellence in audio storytelling.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
