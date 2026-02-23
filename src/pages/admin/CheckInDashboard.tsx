import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  QrCode, 
  Search, 
  Users, 
  CheckCircle2, 
  Clock, 
  UserCheck,
  Camera,
  RefreshCw,
  Download,
  Filter,
  MoreHorizontal,
  Mail,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_type_id: string;
  checked_in_at: string | null;
  order_id: string;
  qr_code: string | null;
  ticket_type?: {
    name: string;
  };
}

interface CheckInStats {
  total: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
}

const CheckInDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "checked-in" | "pending">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<CheckInStats>({ total: 0, checkedIn: 0, pending: 0, checkInRate: 0 });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [recentCheckIns, setRecentCheckIns] = useState<Attendee[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchAttendees();
      setupRealtimeSubscription();
    }
  }, [eventId]);

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchQuery, filter]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('attendee-checkins')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
          const updated = payload.new as Attendee;
          setAttendees(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
          
          if (updated.checked_in_at) {
            setRecentCheckIns(prev => [updated, ...prev.slice(0, 4)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAttendees = async () => {
    setIsLoading(true);
    try {
      // Get orders for this event
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "completed");

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setAttendees([]);
        setStats({ total: 0, checkedIn: 0, pending: 0, checkInRate: 0 });
        setIsLoading(false);
        return;
      }

      const orderIds = orders.map(o => o.id);

      // Get attendees for these orders
      const { data: attendeesData, error: attendeesError } = await supabase
        .from("attendees")
        .select(`
          *,
          ticket_type:ticket_types(name)
        `)
        .in("order_id", orderIds);

      if (attendeesError) throw attendeesError;

      const attendeesList = (attendeesData || []).map(a => ({
        ...a,
        ticket_type: a.ticket_type as { name: string } | undefined
      }));

      setAttendees(attendeesList);

      // Calculate stats
      const total = attendeesList.length;
      const checkedIn = attendeesList.filter(a => a.checked_in_at).length;
      setStats({
        total,
        checkedIn,
        pending: total - checkedIn,
        checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0
      });

      // Set recent check-ins
      const recent = attendeesList
        .filter(a => a.checked_in_at)
        .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
        .slice(0, 5);
      setRecentCheckIns(recent);

    } catch (error: any) {
      toast({ title: "Failed to fetch attendees", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.first_name.toLowerCase().includes(query) ||
        a.last_name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.qr_code?.toLowerCase().includes(query)
      );
    }

    if (filter === "checked-in") {
      filtered = filtered.filter(a => a.checked_in_at);
    } else if (filter === "pending") {
      filtered = filtered.filter(a => !a.checked_in_at);
    }

    setFilteredAttendees(filtered);
  };

  const handleCheckIn = async (attendeeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("attendees")
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.id
        })
        .eq("id", attendeeId);

      if (error) throw error;

      toast({ title: "Check-in successful!" });
      fetchAttendees();
    } catch (error: any) {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
    }
  };

  const handleUndoCheckIn = async (attendeeId: string) => {
    try {
      const { error } = await supabase
        .from("attendees")
        .update({
          checked_in_at: null,
          checked_in_by: null
        })
        .eq("id", attendeeId);

      if (error) throw error;

      toast({ title: "Check-in undone" });
      fetchAttendees();
    } catch (error: any) {
      toast({ title: "Failed to undo check-in", description: error.message, variant: "destructive" });
    }
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) return;

    const attendee = attendees.find(a => 
      a.qr_code?.toLowerCase() === manualCode.toLowerCase() ||
      a.email.toLowerCase() === manualCode.toLowerCase()
    );

    if (attendee) {
      if (attendee.checked_in_at) {
        toast({ title: "Already checked in", description: `${attendee.first_name} ${attendee.last_name} was checked in at ${new Date(attendee.checked_in_at).toLocaleTimeString()}`, variant: "destructive" });
      } else {
        await handleCheckIn(attendee.id);
      }
    } else {
      toast({ title: "Attendee not found", description: "No matching attendee found for this code or email", variant: "destructive" });
    }

    setManualCode("");
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({ title: "Camera access denied", description: "Please allow camera access to scan QR codes", variant: "destructive" });
      setScanning(false);
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const exportAttendees = () => {
    const csv = [
      ["First Name", "Last Name", "Email", "Ticket Type", "Checked In", "Check-in Time"].join(","),
      ...attendees.map(a => [
        a.first_name,
        a.last_name,
        a.email,
        a.ticket_type?.name || "N/A",
        a.checked_in_at ? "Yes" : "No",
        a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendees-${eventId}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/events")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Check-in Dashboard</h1>
                <p className="text-muted-foreground">Real-time attendee management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchAttendees}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button variant="outline" onClick={exportAttendees}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <QrCode className="h-4 w-4 mr-2" /> Scan QR
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>QR Code Scanner</DialogTitle>
                    <DialogDescription>Scan an attendee's QR code or enter manually</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {scanning ? (
                      <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-2 border-primary m-8 rounded-lg" />
                        <Button 
                          variant="secondary" 
                          className="absolute bottom-4 left-1/2 -translate-x-1/2"
                          onClick={stopScanner}
                        >
                          Stop Scanner
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full h-32" variant="outline" onClick={startScanner}>
                        <Camera className="h-8 w-8 mr-2" /> Start Camera
                      </Button>
                    )}
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input 
                        placeholder="QR code or email address"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                      />
                      <Button onClick={handleManualLookup}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Attendees</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                  <p className="text-3xl font-bold">{stats.checkedIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <UserCheck className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in Rate</p>
                  <p className="text-3xl font-bold">{stats.checkInRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Attendee List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Attendees</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by name or email..."
                        className="pl-10 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as typeof filter)}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                    <TabsTrigger value="checked-in">Checked In ({stats.checkedIn})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-0">
                    <AttendeeTable 
                      attendees={filteredAttendees} 
                      onCheckIn={handleCheckIn}
                      onUndoCheckIn={handleUndoCheckIn}
                      isLoading={isLoading}
                    />
                  </TabsContent>
                  <TabsContent value="checked-in" className="mt-0">
                    <AttendeeTable 
                      attendees={filteredAttendees} 
                      onCheckIn={handleCheckIn}
                      onUndoCheckIn={handleUndoCheckIn}
                      isLoading={isLoading}
                    />
                  </TabsContent>
                  <TabsContent value="pending" className="mt-0">
                    <AttendeeTable 
                      attendees={filteredAttendees} 
                      onCheckIn={handleCheckIn}
                      onUndoCheckIn={handleUndoCheckIn}
                      isLoading={isLoading}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Check-in */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Check-in</CardTitle>
                <CardDescription>Enter QR code or email to check in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    placeholder="QR code or email"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                  />
                  <Button onClick={handleManualLookup}>
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Check-ins</CardTitle>
                <CardDescription>Live activity feed</CardDescription>
              </CardHeader>
              <CardContent>
                {recentCheckIns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No check-ins yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentCheckIns.map((attendee) => (
                      <div key={attendee.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{attendee.first_name} {attendee.last_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {attendee.checked_in_at && new Date(attendee.checked_in_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {attendee.ticket_type?.name || "Standard"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AttendeeTableProps {
  attendees: Attendee[];
  onCheckIn: (id: string) => void;
  onUndoCheckIn: (id: string) => void;
  isLoading: boolean;
}

const AttendeeTable = ({ attendees, onCheckIn, onUndoCheckIn, isLoading }: AttendeeTableProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading attendees...</p>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No attendees found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Ticket</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attendees.map((attendee) => (
          <TableRow key={attendee.id}>
            <TableCell className="font-medium">
              {attendee.first_name} {attendee.last_name}
            </TableCell>
            <TableCell>{attendee.email}</TableCell>
            <TableCell>
              <Badge variant="outline">{attendee.ticket_type?.name || "Standard"}</Badge>
            </TableCell>
            <TableCell>
              {attendee.checked_in_at ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Checked In
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {attendee.checked_in_at ? (
                <Button variant="ghost" size="sm" onClick={() => onUndoCheckIn(attendee.id)}>
                  <XCircle className="h-4 w-4 mr-1" /> Undo
                </Button>
              ) : (
                <Button size="sm" onClick={() => onCheckIn(attendee.id)}>
                  <UserCheck className="h-4 w-4 mr-1" /> Check In
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default CheckInDashboard;
