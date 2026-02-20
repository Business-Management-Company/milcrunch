import { Checkbox } from "@/components/ui/checkbox";
import { RIDESHARE_DISCLAIMER } from "./types";

interface Props {
  accepted: boolean;
  onChange: (val: boolean) => void;
}

export default function RideshareDisclaimer({ accepted, onChange }: Props) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-xs text-gray-600 leading-relaxed mb-3">
        {RIDESHARE_DISCLAIMER}
      </p>
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={accepted}
          onCheckedChange={(v) => onChange(v === true)}
          className="mt-0.5"
        />
        <span className="text-sm font-medium text-gray-800">
          I have read and agree to the terms above
        </span>
      </label>
    </div>
  );
}
