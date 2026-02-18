import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "demo-tour-seen";

interface DemoWelcomeModalProps {
  isDemo: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export default function DemoWelcomeModal({
  isDemo,
  onStartTour,
  onSkip,
}: DemoWelcomeModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isDemo && !localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [isDemo]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Welcome to the MilCrunch Demo
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed mt-2">
            Explore the full platform — creator discovery, event management, AI
            campaigns, social posting, and analytics. Some write actions are
            disabled in demo mode.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "true");
              setOpen(false);
              onSkip();
            }}
          >
            Explore on my own
          </Button>
          <Button
            className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white"
            onClick={() => {
              setOpen(false);
              onStartTour();
            }}
          >
            Start Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
