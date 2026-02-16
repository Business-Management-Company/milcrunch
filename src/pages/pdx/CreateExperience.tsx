import { Card } from "@/components/ui/card";

const CreateExperience = () => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
          The RecurrentX Experience
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Create virtual or live experiences that connect brands with military creators.
        </p>
      </div>
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-pd-blue/20 p-8 rounded-xl">
        <p className="text-muted-foreground text-center py-4">
          Coming soon. You'll be able to create and manage experiences here.
        </p>
      </Card>
    </>
  );
};

export default CreateExperience;
