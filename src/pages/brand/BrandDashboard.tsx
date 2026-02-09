import { Card } from "@/components/ui/card";

const BrandDashboard = () => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
          Brand Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Community and campaign stats at a glance. See creator reach, list performance,
          and active campaigns for your organization.
        </p>
      </div>
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-8 rounded-xl">
        <p className="text-muted-foreground">
          Community stats and campaign overview will appear here.
        </p>
      </Card>
    </>
  );
};

export default BrandDashboard;
