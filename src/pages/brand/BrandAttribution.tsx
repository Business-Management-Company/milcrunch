import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

/**
 * Brand attribution dashboard: creator attribution table, pixel management,
 * embeddable script generation, and conversion funnel.
 * Data from pixel_events (brand_visit, conversion) and pixel_visitors.
 * API: POST /api/px/track for brand pixel events; /px/{brand_id}.js for embed script.
 */
export default function BrandAttribution() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2 flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Creator attribution
        </h1>
        <p className="text-muted-foreground">
          See which creators drive traffic and conversions to your site. Manage your embeddable pixel and view attribution reports.
        </p>
      </div>
      <Card className="p-8">
        <p className="text-muted-foreground">
          Pixel management and creator attribution reports will appear here. Configure your brand pixel in settings to start tracking visits and conversions from creator bio links.
        </p>
      </Card>
    </div>
  );
}
