import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Car,
  Search,
  LogIn,
  Loader2,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DriverSignupForm from "./DriverSignupForm";
import RiderSignupForm from "./RiderSignupForm";
import DriverCard from "./DriverCard";
import type { RideshareDriver, RideshareRider } from "./types";

interface Props {
  eventId: string;
}

export default function RidesharePanel({ eventId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [drivers, setDrivers] = useState<RideshareDriver[]>([]);
  const [riders, setRiders] = useState<RideshareRider[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [requestingDriverId, setRequestingDriverId] = useState<string | null>(null);
  const [riderDialogDriver, setRiderDialogDriver] = useState<RideshareDriver | null>(null);

  // Derived state
  const myDriverOffer = drivers.find((d) => d.user_id === userId);
  const myRiderMatch = riders.find((r) => r.user_id === userId);
  const matchedDriver = myRiderMatch
    ? drivers.find((d) => d.id === myRiderMatch.driver_id)
    : null;

  // Fetch data
  const fetchAll = useCallback(async () => {
    const [dRes, rRes] = await Promise.all([
      supabase
        .from("event_rideshare_drivers")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase
        .from("event_rideshare_riders")
        .select("*")
        .eq("event_id", eventId),
    ]);
    if (dRes.data) setDrivers(dRes.data as unknown as RideshareDriver[]);
    if (rRes.data) setRiders(rRes.data as unknown as RideshareRider[]);
    setLoadingData(false);
  }, [eventId]);

  useEffect(() => {
    if (!userId) {
      setLoadingData(false);
      return;
    }
    fetchAll();
  }, [userId, fetchAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`rideshare-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_rideshare_drivers",
          filter: `event_id=eq.${eventId}`,
        },
        () => fetchAll(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_rideshare_riders",
          filter: `event_id=eq.${eventId}`,
        },
        () => fetchAll(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, eventId, fetchAll]);

  const handleRequestRide = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (driver) {
      setRequestingDriverId(driverId);
      setRiderDialogDriver(driver);
    }
  };

  const handleRiderSuccess = () => {
    setRiderDialogDriver(null);
    setRequestingDriverId(null);
    fetchAll();
  };

  // --- Auth gate ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="p-6 text-center border-gray-200">
        <LogIn className="w-8 h-8 text-blue-500 mx-auto mb-3" />
        <p className="font-medium text-gray-900 mb-1">Sign in to participate</p>
        <p className="text-sm text-gray-500 mb-4">
          You need an account to offer or request rides.
        </p>
        <Button asChild variant="outline" className="border-blue-400 text-blue-800">
          <Link to="/login">Sign In</Link>
        </Button>
      </Card>
    );
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">Loading ride share...</span>
      </div>
    );
  }

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "";
  const userEmail = user.email || "";

  return (
    <>
      <Tabs defaultValue="find" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="find" className="text-sm">
            <Search className="w-4 h-4 mr-1.5" />
            Find a Ride
          </TabsTrigger>
          <TabsTrigger value="offer" className="text-sm">
            <Car className="w-4 h-4 mr-1.5" />
            Offer a Ride
          </TabsTrigger>
        </TabsList>

        {/* ====== FIND A RIDE ====== */}
        <TabsContent value="find">
          {myRiderMatch && matchedDriver ? (
            <Card className="p-5 border-green-200 bg-green-50/50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-800">You have a ride!</p>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Riding with <span className="font-medium">{matchedDriver.name}</span>
                {" · "}
                {matchedDriver.pickup_type === "pickup"
                  ? "Will pick you up"
                  : `Meet at: ${matchedDriver.meetup_location || "TBD"}`}
                {" · "}Pick-up: {matchedDriver.pickup_time}
              </p>
              {/* Show driver contact if shared */}
              <div className="flex flex-col gap-1 text-sm">
                {matchedDriver.share_phone && matchedDriver.phone && (
                  <span className="flex items-center gap-1.5 text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-green-600" />
                    {matchedDriver.phone}
                  </span>
                )}
                {matchedDriver.share_email && matchedDriver.email && (
                  <span className="flex items-center gap-1.5 text-gray-700">
                    <Mail className="w-3.5 h-3.5 text-green-600" />
                    {matchedDriver.email}
                  </span>
                )}
              </div>
            </Card>
          ) : drivers.length === 0 ? (
            <Card className="p-6 text-center border-gray-200">
              <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No rides available yet. Check back later or offer a ride!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {drivers.map((d) => (
                <DriverCard
                  key={d.id}
                  driver={d}
                  currentUserId={userId}
                  matchedRiders={riders}
                  onRequestRide={handleRequestRide}
                  requesting={requestingDriverId === d.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ====== OFFER A RIDE ====== */}
        <TabsContent value="offer">
          {myDriverOffer ? (
            <Card className="p-5 border-green-200 bg-green-50/50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-800">Your ride is posted!</p>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  {myDriverOffer.seats_available} seat
                  {myDriverOffer.seats_available !== 1 ? "s" : ""} available
                  {myDriverOffer.car_seat_spaces > 0 &&
                    ` · ${myDriverOffer.car_seat_spaces} car seat space${myDriverOffer.car_seat_spaces !== 1 ? "s" : ""}`}
                </p>
                <p>
                  {myDriverOffer.pickup_type === "pickup"
                    ? "Will pick up"
                    : `Meet at: ${myDriverOffer.meetup_location || "TBD"}`}
                  {" · "}Pick-up: {myDriverOffer.pickup_time}
                  {myDriverOffer.dropoff_time && ` · Drop-off: ${myDriverOffer.dropoff_time}`}
                </p>
              </div>
              {/* Show matched riders */}
              {riders.filter((r) => r.driver_id === myDriverOffer.id).length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-2">Your riders:</p>
                  {riders
                    .filter((r) => r.driver_id === myDriverOffer.id)
                    .map((r) => (
                      <div key={r.id} className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">{r.name}</span>
                        {r.share_phone && r.phone && (
                          <span className="ml-2 text-gray-500">
                            <Phone className="w-3 h-3 inline mr-0.5" />
                            {r.phone}
                          </span>
                        )}
                        {r.share_email && r.email && (
                          <span className="ml-2 text-gray-500">
                            <Mail className="w-3 h-3 inline mr-0.5" />
                            {r.email}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </Card>
          ) : (
            <DriverSignupForm
              eventId={eventId}
              userId={userId!}
              userName={userName}
              userEmail={userEmail}
              onSuccess={fetchAll}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Rider signup dialog */}
      <Dialog
        open={!!riderDialogDriver}
        onOpenChange={(open) => {
          if (!open) {
            setRiderDialogDriver(null);
            setRequestingDriverId(null);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a Ride</DialogTitle>
          </DialogHeader>
          {riderDialogDriver && (
            <RiderSignupForm
              eventId={eventId}
              userId={userId!}
              userName={userName}
              userEmail={userEmail}
              driver={riderDialogDriver}
              onSuccess={handleRiderSuccess}
              onCancel={() => {
                setRiderDialogDriver(null);
                setRequestingDriverId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
