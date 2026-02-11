import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";

const BrandDirectory = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <FolderOpen className="h-16 w-16 text-gray-300 mb-4" />
      <h1 className="text-2xl font-bold text-[#000741] dark:text-white mb-2">Directories</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        Build directories of creators for events, conferences, and attendee management.
        This feature is coming soon.
      </p>
      <Button onClick={() => navigate("/brand/discover")} className="bg-pd-blue hover:bg-pd-darkblue text-white">
        Go to Discovery
      </Button>
    </div>
  );
};

export default BrandDirectory;
