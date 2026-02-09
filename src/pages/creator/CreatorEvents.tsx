import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Ticket } from "lucide-react";

export default function CreatorEvents() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Events</h1>
        <p className="text-muted-foreground">Invitations, events you&apos;re attending, and past events.</p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Events</CardTitle>
          <CardDescription>Invitations | Attending | Past</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="invitations">
            <TabsList>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="attending">Attending</TabsTrigger>
              <TabsTrigger value="past">Past Events</TabsTrigger>
            </TabsList>
            <TabsContent value="invitations" className="py-6">
              <p className="text-muted-foreground">Event invites will appear here.</p>
            </TabsContent>
            <TabsContent value="attending" className="py-6">
              <p className="text-muted-foreground">Events you&apos;ve RSVP&apos;d to will appear here.</p>
            </TabsContent>
            <TabsContent value="past" className="py-6">
              <p className="text-muted-foreground">Past events you attended.</p>
            </TabsContent>
          </Tabs>
          <Button variant="outline" className="mt-4"><Ticket className="h-4 w-4 mr-2" /> Browse events</Button>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
