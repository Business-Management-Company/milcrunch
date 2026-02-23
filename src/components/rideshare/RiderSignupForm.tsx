import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RideshareDisclaimer from "./RideshareDisclaimer";
import type { RideshareDriver } from "./types";

interface Props {
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  driver: RideshareDriver;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RiderSignupForm({
  eventId,
  userId,
  userName,
  userEmail,
  driver,
  onSuccess,
  onCancel,
}: Props) {
  const [name, setName] = useState(userName);
  const [sharePhone, setSharePhone] = useState(false);
  const [shareEmail, setShareEmail] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [baseConfirmed, setBaseConfirmed] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim() && baseConfirmed && disclaimerAccepted;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      // 1. Insert rider record
      const { error: riderErr } = await supabase
        .from("event_rideshare_riders")
        .insert({
          event_id: eventId,
          user_id: userId,
          driver_id: driver.id,
          name: name.trim(),
          share_phone: sharePhone,
          share_email: shareEmail,
          phone: sharePhone ? phone.trim() : null,
          email: shareEmail ? email.trim() : null,
          base_confirmed: baseConfirmed,
          disclaimer_accepted: disclaimerAccepted,
        } as Record<string, unknown>);
      if (riderErr) throw riderErr;

      // 2. Decrement driver seats
      const { error: seatErr } = await supabase
        .from("event_rideshare_drivers")
        .update({
          seats_available: Math.max(0, driver.seats_available - 1),
        } as Record<string, unknown>)
        .eq("id", driver.id);
      if (seatErr) console.warn("Seat decrement failed:", seatErr.message);

      toast.success("Ride confirmed! You're matched with " + driver.name);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to request ride";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Driver summary */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ride with</p>
        <p className="font-semibold text-gray-900">{driver.name}</p>
        <p className="text-sm text-gray-500">
          {driver.pickup_type === "pickup" ? "Will pick you up" : `Meet at: ${driver.meetup_location || "TBD"}`}
          {" · "}Pick-up: {driver.pickup_time}
          {driver.dropoff_time && ` · Drop-off: ${driver.dropoff_time}`}
        </p>
      </div>

      {/* Name */}
      <div>
        <Label className="text-sm font-medium">Your name</Label>
        <Input
          className="mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
      </div>

      {/* Contact sharing */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Share with your driver</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Share phone number</span>
          <Switch checked={sharePhone} onCheckedChange={setSharePhone} />
        </div>
        {sharePhone && (
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
          />
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Share email address</span>
          <Switch checked={shareEmail} onCheckedChange={setShareEmail} />
        </div>
        {shareEmail && (
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />
        )}
      </div>

      {/* Base confirmation */}
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={baseConfirmed}
          onCheckedChange={(v) => setBaseConfirmed(v === true)}
          className="mt-0.5"
        />
        <span className="text-sm text-gray-700">
          I confirm that I reside on a military installation
        </span>
      </label>

      {/* Disclaimer */}
      <RideshareDisclaimer
        accepted={disclaimerAccepted}
        onChange={setDisclaimerAccepted}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ThumbsUp className="w-4 h-4 mr-2" />
          )}
          Confirm Ride
        </Button>
      </div>
    </div>
  );
}
