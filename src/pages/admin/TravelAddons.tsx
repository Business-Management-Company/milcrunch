import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Hotel, 
  Plane, 
  Plus, 
  MapPin, 
  Phone, 
  Globe, 
  Calendar,
  DollarSign,
  Users,
  Car,
  Clock,
  ExternalLink,
  Edit,
  Trash2,
  Star
} from "lucide-react";
import { toast } from "sonner";

interface HotelBlock {
  id: string;
  hotel_name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  booking_link: string;
  booking_code: string;
  rate_per_night: number;
  block_size: number;
  rooms_booked: number;
  check_in_date: string;
  check_out_date: string;
  cutoff_date: string;
  amenities: string[];
  is_primary: boolean;
}

interface AirportInfo {
  id: string;
  airport_code: string;
  airport_name: string;
  distance_miles: number;
  drive_time_minutes: number;
  rideshare_estimate: string;
  shuttle_info: string;
  rental_car_info: string;
  is_primary: boolean;
}

const TravelAddons = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);
  const [isAirportDialogOpen, setIsAirportDialogOpen] = useState(false);

  // Placeholder data
  const [hotels] = useState<HotelBlock[]>([
    {
      id: "1",
      hotel_name: "Marriott Crystal City",
      address: "1999 Richmond Hwy",
      city: "Arlington",
      state: "VA",
      phone: "(703) 413-5500",
      website: "https://marriott.com",
      booking_link: "https://marriott.com/book",
      booking_code: "MILPOD24",
      rate_per_night: 159,
      block_size: 50,
      rooms_booked: 32,
      check_in_date: "2024-09-14",
      check_out_date: "2024-09-17",
      cutoff_date: "2024-08-15",
      amenities: ["Free WiFi", "Fitness Center", "Restaurant", "Shuttle Service"],
      is_primary: true
    },
    {
      id: "2",
      hotel_name: "Hilton Pentagon City",
      address: "2399 Jefferson Davis Hwy",
      city: "Arlington",
      state: "VA",
      phone: "(703) 418-6800",
      website: "https://hilton.com",
      booking_link: "https://hilton.com/book",
      booking_code: "VETPOD24",
      rate_per_night: 179,
      block_size: 30,
      rooms_booked: 18,
      check_in_date: "2024-09-14",
      check_out_date: "2024-09-17",
      cutoff_date: "2024-08-15",
      amenities: ["Free WiFi", "Pool", "Fitness Center", "Business Center"],
      is_primary: false
    }
  ]);

  const [airports] = useState<AirportInfo[]>([
    {
      id: "1",
      airport_code: "DCA",
      airport_name: "Ronald Reagan Washington National Airport",
      distance_miles: 3.2,
      drive_time_minutes: 10,
      rideshare_estimate: "$15-25",
      shuttle_info: "Complimentary hotel shuttle available every 30 minutes",
      rental_car_info: "All major rental agencies available on-site",
      is_primary: true
    },
    {
      id: "2",
      airport_code: "IAD",
      airport_name: "Washington Dulles International Airport",
      distance_miles: 28,
      drive_time_minutes: 45,
      rideshare_estimate: "$55-75",
      shuttle_info: "Super Shuttle available, book in advance",
      rental_car_info: "Rental car center accessible via AeroTrain",
      is_primary: false
    }
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleAddHotel = () => {
    toast.success("Hotel room block added successfully");
    setIsHotelDialogOpen(false);
  };

  const handleAddAirport = () => {
    toast.success("Airport information added successfully");
    setIsAirportDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Travel Add-ons</h1>
              <p className="text-muted-foreground">Manage hotels, room blocks, and airport information</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="hotels" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="hotels" className="flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              Hotels & Room Blocks
            </TabsTrigger>
            <TabsTrigger value="airports" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Airport Info
            </TabsTrigger>
          </TabsList>

          {/* Hotels Tab */}
          <TabsContent value="hotels" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Hotel Room Blocks</h2>
                <p className="text-sm text-muted-foreground">Manage negotiated hotel rates for your attendees</p>
              </div>
              <Dialog open={isHotelDialogOpen} onOpenChange={setIsHotelDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hotel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Hotel Room Block</DialogTitle>
                    <DialogDescription>
                      Create a new hotel partnership with negotiated rates for attendees
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hotel_name">Hotel Name</Label>
                        <Input id="hotel_name" placeholder="Marriott Crystal City" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="booking_code">Booking Code</Label>
                        <Input id="booking_code" placeholder="EVENTCODE24" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" placeholder="123 Main Street" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" placeholder="Arlington" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" placeholder="VA" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" placeholder="(703) 555-0100" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" placeholder="https://marriott.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="booking_link">Booking Link</Label>
                        <Input id="booking_link" placeholder="https://marriott.com/book" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rate">Rate/Night ($)</Label>
                        <Input id="rate" type="number" placeholder="159" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="block_size">Block Size</Label>
                        <Input id="block_size" type="number" placeholder="50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cutoff">Cutoff Date</Label>
                        <Input id="cutoff" type="date" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="check_in">Check-in Date</Label>
                        <Input id="check_in" type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="check_out">Check-out Date</Label>
                        <Input id="check_out" type="date" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                      <Input id="amenities" placeholder="Free WiFi, Pool, Fitness Center" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea id="notes" placeholder="Additional information for attendees..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsHotelDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddHotel}>Add Hotel</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {hotels.map((hotel) => (
                <Card key={hotel.id} className={hotel.is_primary ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Hotel className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{hotel.hotel_name}</CardTitle>
                        {hotel.is_primary && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {hotel.address}, {hotel.city}, {hotel.state}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">${hotel.rate_per_night}</span>
                        <span className="text-muted-foreground">/night</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{hotel.rooms_booked}/{hotel.block_size} rooms</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{hotel.check_in_date} - {hotel.check_out_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{hotel.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {hotel.amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Code: </span>
                        <code className="bg-muted px-2 py-0.5 rounded font-mono">{hotel.booking_code}</code>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={hotel.booking_link} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Book Now
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </div>

                    {/* Room block progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Block utilization</span>
                        <span>{Math.round((hotel.rooms_booked / hotel.block_size) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(hotel.rooms_booked / hotel.block_size) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Airports Tab */}
          <TabsContent value="airports" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Airport Information</h2>
                <p className="text-sm text-muted-foreground">Provide travel logistics for your attendees</p>
              </div>
              <Dialog open={isAirportDialogOpen} onOpenChange={setIsAirportDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Airport
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Add Airport Information</DialogTitle>
                    <DialogDescription>
                      Add nearby airport details and transportation options
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="airport_code">Airport Code</Label>
                        <Input id="airport_code" placeholder="DCA" maxLength={3} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="airport_name">Airport Name</Label>
                        <Input id="airport_name" placeholder="Reagan National" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="distance">Distance (miles)</Label>
                        <Input id="distance" type="number" placeholder="5" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="drive_time">Drive Time (minutes)</Label>
                        <Input id="drive_time" type="number" placeholder="15" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rideshare">Rideshare Estimate</Label>
                      <Input id="rideshare" placeholder="$15-25" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shuttle">Shuttle Information</Label>
                      <Textarea id="shuttle" placeholder="Hotel shuttle available..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rental">Rental Car Information</Label>
                      <Textarea id="rental" placeholder="Rental agencies on-site..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAirportDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddAirport}>Add Airport</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {airports.map((airport) => (
                <Card key={airport.id} className={airport.is_primary ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                          <Plane className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{airport.airport_code}</CardTitle>
                            {airport.is_primary && (
                              <Badge variant="default" className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{airport.airport_name}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{airport.distance_miles} miles away</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>~{airport.drive_time_minutes} min drive</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <Car className="h-4 w-4" />
                          Rideshare
                        </div>
                        <p className="text-muted-foreground">{airport.rideshare_estimate} estimated</p>
                      </div>

                      {airport.shuttle_info && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 font-medium mb-1">
                            <Users className="h-4 w-4" />
                            Shuttle
                          </div>
                          <p className="text-muted-foreground">{airport.shuttle_info}</p>
                        </div>
                      )}

                      {airport.rental_car_info && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 font-medium mb-1">
                            <Car className="h-4 w-4" />
                            Rental Cars
                          </div>
                          <p className="text-muted-foreground">{airport.rental_car_info}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TravelAddons;