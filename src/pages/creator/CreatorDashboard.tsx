import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";

const CreatorDashboard = () => {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          Creator Dashboard
        </h1>
        <p className="text-muted-foreground">
          Your home base for stats, upcoming opportunities, and profile performance.
          Track reach, engagement, and event invites in one place.
        </p>
      </div>
      <Card className="bg-gradient-card border-border p-8">
        <p className="text-muted-foreground">
          Stats and quick actions will appear here once connected to your profile and socials.
        </p>
      </Card>
    </CreatorLayout>
  );
};

export default CreatorDashboard;
