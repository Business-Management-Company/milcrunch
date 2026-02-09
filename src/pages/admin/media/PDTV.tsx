import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PDTV() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">PDTV</h1>
          <p className="text-sm text-muted-foreground">Video and broadcast content management. Coming soon.</p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center text-muted-foreground">
        <p className="font-medium">Placeholder</p>
        <p className="mt-1 text-sm">PDTV management will be available here.</p>
      </div>
    </div>
  );
}
