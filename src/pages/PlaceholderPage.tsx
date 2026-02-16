import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          {icon ?? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7]">
              <Construction className="h-8 w-8" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-[#000741] dark:text-white mb-2">{title}</h1>
        <Badge variant="secondary" className="mb-4 rounded-full px-3 py-0.5 text-xs font-medium">
          Coming Soon
        </Badge>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-500">
          This feature is under development.
        </p>
      </Card>
    </div>
  );
}
