import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "lucide-react";

export default function CreatorLists() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">My Lists</h1>
        <p className="text-muted-foreground">Lists you&apos;ve been added to by brands (read-only).</p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><List className="h-5 w-5" /> Lists</CardTitle>
          <CardDescription>View lists you belong to.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-6">Lists you&apos;ve been added to will appear here.</p>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
