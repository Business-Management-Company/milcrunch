import { Card } from "@/components/ui/card";

const BrandCampaigns = () => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
          Campaigns
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Create and manage campaigns: set goals, select creators from your lists,
          send offers, and track performance.
        </p>
      </div>
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-8 rounded-xl">
        <p className="text-muted-foreground">
          Campaign list and creation flow will appear here.
        </p>
      </Card>
    </>
  );
};

export default BrandCampaigns;
