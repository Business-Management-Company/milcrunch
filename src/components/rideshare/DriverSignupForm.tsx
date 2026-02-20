import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Car, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RideshareDisclaimer from "./RideshareDisclaimer";

interface Props {
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  onSuccess: () => void;
}

export default function DriverSignupForm({
  eventId,
  userId,
  userName,
  userEmail,
  onSuccess,
}: Props) {
  const [name, setName] = useState(userName);
  const [seats, setSeats] = useState(3);
  const [carSeats, setCarSeats] = useState(0);
  const [pickupType, setPickupType] = useState<"pickup" | "meetup">("pickup");
  const [meetupLocation, setMeetupLocation] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [sharePhone, setSharePhone] = useState(false);
  const [shareEmail, setShareEmail] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [baseConfirmed, setBaseConfirmed] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    name.trim() &&
    seats > 0 &&
    pickupTime.trim() &&
    baseConfirmed &&
    disclaimerAccepted &&
    (pickupType !== "meetup" || meetupLocation.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("event_rideshare_drivers")
        .insert({
          event_id: eventId,
          user_id: userId,
          name: name.trim(),
          seats_available: seats,
          car_seat_spaces: carSeats,
          pickup_type: pickupType,
          meetup_location: pickupType === "meetup" ? meetupLocation.trim() : null,
          pickup_time: pickupTime.trim(),
          dropoff_time: dropoffTime.trim() || null,
          share_phone: sharePhone,
          share_email: shareEmail,
          phone: sharePhone ? phone.trim() : null,
          email: shareEmail ? email.trim() : null,
          base_confirmed: baseConfirmed,
          disclaimer_accepted: disclaimerAccepted,
        } as Record<string, unknown>);
      if (error) throw error;
      toast.success("Ride offer posted!");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
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

      {/* Seats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Passenger seats</Label>
          <Input
            type="number"
            min={1}
            max={10}
            className="mt-1"
            value={seats}
            onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Car seat spaces</Label>
          <Input
            type="number"
            min={0}
            max={5}
            className="mt-1"
            value={carSeats}
            onChange={(e) => setCarSeats(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>
      </div>

      {/* Pickup type */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Pick-up option</Label>
        <RadioGroup
          value={pickupType}
          onValueChange={(v) => setPickupType(v as "pickup" | "meetup")}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="pickup" />
            <Car className="w-4 h-4 text-purple-500" />
            <span className="text-sm">I will pick up</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="meetup" />
            <MapPin className="w-4 h-4 text-purple-500" />
            <span className="text-sm">Meet at location</span>
          </label>
        </RadioGroup>
        {pickupType === "meetup" && (
          <Input
            className="mt-2"
            value={meetupLocation}
            onChange={(e) => setMeetupLocation(e.target.value)}
            placeholder="Address or gate name"
          />
        )}
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Est. pick-up time</Label>
          <Input
            className="mt-1"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            placeholder="e.g. 8:00 AM"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Est. drop-off time</Label>
          <Input
            className="mt-1"
            value={dropoffTime}
            onChange={(e) => setDropoffTime(e.target.value)}
            placeholder="e.g. 6:00 PM"
          />
        </div>
      </div>

      {/* Contact sharing */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Share with matched riders</Label>
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

      {/* Submit */}
      <Button
        className="w-full bg-purple-500 hover:bg-purple-600 text-white"
        disabled={!canSubmit || saving}
        onClick={handleSubmit}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Car className="w-4 h-4 mr-2" />
        )}
        Offer a Ride
      </Button>
    </div>
  );
}
