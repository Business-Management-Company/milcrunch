import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export default function CreatorHelp() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Help</h1>
        <p className="text-muted-foreground">FAQs and support for creators.</p>
      </div>
      <Card className="rounded-xl border-border max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Help & support</CardTitle>
          <CardDescription>Resources and contact.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Help content and links to resources will go here.</p>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
