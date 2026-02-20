export interface RideshareDriver {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  seats_available: number;
  car_seat_spaces: number;
  pickup_type: "pickup" | "meetup";
  meetup_location: string | null;
  pickup_time: string;
  dropoff_time: string | null;
  share_phone: boolean;
  share_email: boolean;
  phone: string | null;
  email: string | null;
  base_confirmed: boolean;
  disclaimer_accepted: boolean;
  created_at: string;
}

export interface RideshareRider {
  id: string;
  event_id: string;
  user_id: string;
  driver_id: string;
  name: string;
  share_phone: boolean;
  share_email: boolean;
  phone: string | null;
  email: string | null;
  base_confirmed: boolean;
  disclaimer_accepted: boolean;
  matched_at: string | null;
  created_at: string;
}

export const RIDESHARE_DISCLAIMER = `By participating in the MilCrunch Ride Share program, you agree to the following: (1) You confirm that you reside on a military installation. (2) Drivers confirm they hold a valid driver's license and current auto insurance. (3) This is a voluntary, community-organized carpooling service. MilCrunch, event organizers, and partner organizations are not responsible for any incidents, injuries, damages, or losses that occur during transportation. (4) You agree to coordinate directly and respectfully with your driver/rider. (5) MilCrunch reserves the right to remove any participant from the program at any time.`;
