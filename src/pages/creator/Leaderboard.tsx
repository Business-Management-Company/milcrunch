import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function Leaderboard() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">Top creators by engagement and growth.</p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Top creators</CardTitle>
          <CardDescription>Ranked by engagement, growth, and reach.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-6">Leaderboard will appear here.</p>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
