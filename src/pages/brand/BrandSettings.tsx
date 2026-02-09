import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const BrandSettings = () => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your account and brand preferences.
        </p>
      </div>
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Account and notification settings will appear here.
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export default BrandSettings;
