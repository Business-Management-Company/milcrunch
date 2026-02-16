import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchCredits } from "@/lib/influencers-club";
import { useLists } from "@/contexts/ListContext";
import { Loader2, CreditCard, Users, ListChecks } from "lucide-react";

const BrandDashboard = () => {
  const [credits, setCredits] = useState<{ credits_available: number; credits_used: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { lists } = useLists();

  useEffect(() => {
    fetchCredits().then((c) => { setCredits(c); setLoading(false); });
  }, []);

  const totalCreators = lists.reduce((sum, l) => sum + l.creators.length, 0);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Brand Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Community and campaign stats at a glance.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Available</p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <p className="text-2xl font-bold text-[#000741] dark:text-white">
              {credits?.credits_available?.toLocaleString() ?? "—"}
            </p>
          )}
        </Card>
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Used</p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <p className="text-2xl font-bold text-[#000741] dark:text-white">
              {credits?.credits_used?.toLocaleString() ?? "—"}
            </p>
          )}
        </Card>
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lists</p>
          </div>
          <p className="text-2xl font-bold text-[#000741] dark:text-white">{lists.length}</p>
        </Card>
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Creators in Lists</p>
          </div>
          <p className="text-2xl font-bold text-[#000741] dark:text-white">{totalCreators}</p>
        </Card>
      </div>
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-8 rounded-xl">
        <p className="text-muted-foreground">
          Campaign overview, creator analytics, and performance reports coming soon.
        </p>
      </Card>
    </>
  );
};

export default BrandDashboard;
