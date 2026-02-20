import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  MapPin,
  Clock,
  Users,
  Baby,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import type { RideshareDriver, RideshareRider } from "./types";

interface Props {
  driver: RideshareDriver;
  currentUserId: string | undefined;
  matchedRiders: RideshareRider[];
  onRequestRide: (driverId: string) => void;
  requesting: boolean;
}

export default function DriverCard({
  driver,
  currentUserId,
  matchedRiders,
  onRequestRide,
  requesting,
}: Props) {
  const isOwnListing = currentUserId === driver.user_id;
  const myMatch = matchedRiders.find(
    (r) => r.user_id === currentUserId && r.driver_id === driver.id,
  );
  const isMatched = !!myMatch;
  const seatsFull = driver.seats_available <= 0;

  return (
    <Card className="p-4 border-gray-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-900">{driver.name}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            {driver.pickup_type === "pickup" ? (
              <>
                <Car className="w-3.5 h-3.5 text-purple-500" />
                <span>Will pick up</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span>Meet at: {driver.meetup_location || "TBD"}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={
              seatsFull
                ? "border-red-200 text-red-600 bg-red-50"
                : "border-green-200 text-green-700 bg-green-50"
            }
          >
            <Users className="w-3 h-3 mr-1" />
            {driver.seats_available} seat{driver.seats_available !== 1 ? "s" : ""}
          </Badge>
          {driver.car_seat_spaces > 0 && (
            <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">
              <Baby className="w-3 h-3 mr-1" />
              {driver.car_seat_spaces}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Pick-up: {driver.pickup_time}
        </span>
        {driver.dropoff_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Drop-off: {driver.dropoff_time}
          </span>
        )}
      </div>

      {/* Contact info — only shown to matched riders */}
      {isMatched && (
        <div className="rounded-md bg-purple-50 border border-purple-100 p-3 mb-3">
          <p className="text-xs font-medium text-purple-700 mb-1.5">Driver contact info:</p>
          <div className="flex flex-col gap-1 text-sm">
            {driver.share_phone && driver.phone && (
              <span className="flex items-center gap-1.5 text-gray-700">
                <Phone className="w-3.5 h-3.5 text-purple-500" />
                {driver.phone}
              </span>
            )}
            {driver.share_email && driver.email && (
              <span className="flex items-center gap-1.5 text-gray-700">
                <Mail className="w-3.5 h-3.5 text-purple-500" />
                {driver.email}
              </span>
            )}
            {!driver.share_phone && !driver.share_email && (
              <span className="text-xs text-gray-400 italic">
                Driver has not shared contact info
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action button */}
      {isOwnListing ? (
        <p className="text-xs text-gray-400 italic">This is your listing</p>
      ) : isMatched ? (
        <p className="text-xs text-green-600 font-medium">You have a ride with this driver</p>
      ) : seatsFull ? (
        <p className="text-xs text-red-500 font-medium">No seats available</p>
      ) : (
        <Button
          size="sm"
          className="bg-purple-500 hover:bg-purple-600 text-white"
          onClick={() => onRequestRide(driver.id)}
          disabled={requesting}
        >
          {requesting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Car className="w-4 h-4 mr-1" />
          )}
          Request Ride
        </Button>
      )}
    </Card>
  );
}
