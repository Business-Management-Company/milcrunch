import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link2, ExternalLink } from "lucide-react";

export default function CreatorBioEditor() {
  const { creatorProfile } = useAuth();
  const navigate = useNavigate();
  const handle = creatorProfile?.handle ?? "";
  const bioUrl = handle ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${handle}` : "";

  useEffect(() => {
    if (!handle) {
      navigate("/creator/profile");
    }
  }, [handle, navigate]);

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">My Bio Page</h1>
        <p className="text-muted-foreground">
          Preview and share your bio page. Edit layout and links in Profile.
        </p>
      </div>
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bio page preview
          </CardTitle>
          <CardDescription>
            {bioUrl ? "Your page is live at the link below." : "Set your handle in Profile to get a bio page link."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bioUrl && (
            <>
              <p className="text-sm font-mono text-muted-foreground break-all">{bioUrl}</p>
              <div className="flex gap-2">
                <Button asChild>
                  <a href={bioUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open bio page
                  </a>
                </Button>
                <Button variant="outline" onClick={() => navigate("/creator/profile")}>
                  Edit profile & layout
                </Button>
              </div>
            </>
          )}
          {!handle && (
            <Button onClick={() => navigate("/creator/profile")}>Go to Profile to set handle</Button>
          )}
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
