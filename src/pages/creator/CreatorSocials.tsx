import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";

const CreatorSocials = () => {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          Connected Socials
        </h1>
        <p className="text-muted-foreground">
          Connect your social platforms and view analytics. Brands use this to see
          your reach and engagement when considering you for campaigns and events.
        </p>
      </div>
      <Card className="bg-gradient-card border-border p-8">
        <p className="text-muted-foreground">
          Social connection cards and analytics will appear here.
        </p>
      </Card>
    </CreatorLayout>
  );
};

export default CreatorSocials;
