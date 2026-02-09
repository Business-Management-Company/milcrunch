import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";

const CreatorProfile = () => {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          Profile Builder
        </h1>
        <p className="text-muted-foreground">
          Build your ParadeDeck creator profile: name, bio, branch, specialties, and avatar.
          This is how brands and event organizers discover and vet you.
        </p>
      </div>
      <Card className="bg-gradient-card border-border p-8">
        <p className="text-muted-foreground">
          Profile form (name, bio, branch, specialties, avatar upload) will go here.
        </p>
      </Card>
    </CreatorLayout>
  );
};

export default CreatorProfile;
