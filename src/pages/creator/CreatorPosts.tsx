import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { PenSquare, FileText, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function CreatorPosts() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Scheduled Posts</h1>
        <p className="text-muted-foreground">Drafts, scheduled, and published posts from Upload-Post.</p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Posts</CardTitle>
          <CardDescription>Tabs: Drafts | Scheduled | Published | Failed</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scheduled">
            <TabsList>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            <TabsContent value="drafts" className="py-6">
              <p className="text-muted-foreground">No drafts yet.</p>
              <Button asChild className="mt-4"><Link to="/creator/post/new"><PenSquare className="h-4 w-4 mr-2" /> Create post</Link></Button>
            </TabsContent>
            <TabsContent value="scheduled" className="py-6">
              <p className="text-muted-foreground">No scheduled posts. Schedule from <Link to="/creator/post/new" className="text-primary hover:underline">Create Post</Link>.</p>
            </TabsContent>
            <TabsContent value="published" className="py-6">
              <p className="text-muted-foreground">Published posts will appear here.</p>
            </TabsContent>
            <TabsContent value="failed" className="py-6">
              <p className="text-muted-foreground">Failed posts will appear here with retry option.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
