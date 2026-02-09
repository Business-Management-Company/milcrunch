import { Link } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

export default function CreatorCustomize() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Customize</h1>
        <p className="text-muted-foreground">Bio page theme, colors, and layout.</p>
      </div>
      <Card className="rounded-xl border-border max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Bio page theme</CardTitle>
          <CardDescription>Hero image format, theme (light/dark/auto), and link styles are in Profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link to="/creator/profile">Edit profile & bio layout</Link></Button>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
