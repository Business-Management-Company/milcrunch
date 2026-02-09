import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";

const CreatorOpportunities = () => {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          Opportunities
        </h1>
        <p className="text-muted-foreground">
          Event invites and campaign offers from brands. View, accept, or decline
          opportunities matched to your profile and audience.
        </p>
      </div>
      <Card className="bg-gradient-card border-border p-8">
        <p className="text-muted-foreground">
          List of event invites and campaign offers will appear here.
        </p>
      </Card>
    </CreatorLayout>
  );
};

export default CreatorOpportunities;
