import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Mail } from "lucide-react";

export default function CreatorDeals() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Brand Deals</h1>
        <p className="text-muted-foreground">Incoming outreach from brands. Reply and manage status here.</p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Outreach</CardTitle>
          <CardDescription>Filter: All | New | Active | Completed</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-6">Brand outreach messages will appear here. Each card: brand name, message preview, Interested / Not interested.</p>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
