import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function SimilarCreators() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Similar Creators</h1>
        <p className="text-muted-foreground">Creators in your niche or branch.</p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Discover</CardTitle>
          <CardDescription>Based on category and military branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-6">Similar creators will appear here.</p>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
