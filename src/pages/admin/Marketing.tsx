import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail, Send, Clock, Users, Plus, Sparkles, FileText,
  Calendar, TrendingUp, Eye, MousePointer, ArrowLeft,
  BarChart3, Target, Zap, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sent" | "active";
  type: "email" | "reminder" | "announcement";
  recipients: number;
  openRate?: number;
  clickRate?: number;
  scheduledFor?: string;
  sentAt?: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Early Bird Reminder",
    subject: "Don't miss early bird pricing - ends tomorrow!",
    status: "sent",
    type: "reminder",
    recipients: 1250,
    openRate: 42.5,
    clickRate: 12.3,
    sentAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    name: "Speaker Announcement",
    subject: "Announcing our keynote speaker!",
    status: "scheduled",
    type: "announcement",
    recipients: 3200,
    scheduledFor: "2024-01-20T09:00:00Z"
  },
  {
    id: "3",
    name: "Registration Confirmation",
    subject: "Your registration is confirmed!",
    status: "active",
    type: "email",
    recipients: 847,
    openRate: 89.2,
    clickRate: 34.1
  },
  {
    id: "4",
    name: "Post-Event Survey",
    subject: "How was your experience?",
    status: "draft",
    type: "email",
    recipients: 0
  }
];

const emailTemplates = [
  { id: "welcome", name: "Welcome Email", description: "New registrant welcome" },
  { id: "reminder", name: "Event Reminder", description: "Countdown reminder" },
  { id: "announcement", name: "Announcement", description: "News and updates" },
  { id: "survey", name: "Post-Event Survey", description: "Feedback collection" },
  { id: "sponsor", name: "Sponsor Outreach", description: "Sponsor prospecting" },
];

const Marketing = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    content: "",
    type: "email" as "email" | "reminder" | "announcement",
    template: ""
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const stats = {
    totalSent: campaigns.filter(c => c.status === "sent").reduce((acc, c) => acc + c.recipients, 0),
    avgOpenRate: 43.8,
    avgClickRate: 15.2,
    scheduledCount: campaigns.filter(c => c.status === "scheduled").length
  };

  const handleGenerateAI = async (type: "subject" | "content") => {
    setIsGeneratingAI(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (type === "subject") {
      const subjects = [
        "🎉 You're Invited: Exclusive Event Access Inside",
        "Don't Miss Out - Limited Seats Available!",
        "Your VIP Pass Awaits - Register Today",
        "Exciting News: New Speakers Announced!"
      ];
      setNewCampaign(prev => ({
        ...prev,
        subject: subjects[Math.floor(Math.random() * subjects.length)]
      }));
    } else {
      setNewCampaign(prev => ({
        ...prev,
        content: `Dear [First Name],

We're thrilled to invite you to an extraordinary event that promises to inspire, connect, and transform.

**What You'll Experience:**
• Keynote sessions from industry leaders
• Interactive workshops and networking opportunities
• Exclusive access to resources and materials

**Event Details:**
📅 Date: [Event Date]
📍 Location: [Venue Name]
🕐 Time: [Start Time] - [End Time]

Space is limited, and we want to ensure you have a spot. Register now to secure your place and join hundreds of passionate attendees.

[Register Now Button]

We can't wait to see you there!

Best regards,
The Event Team`
      }));
    }
    
    setIsGeneratingAI(false);
    toast.success(`AI-generated ${type} created!`);
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.subject) {
      toast.error("Please fill in campaign name and subject");
      return;
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      subject: newCampaign.subject,
      status: "draft",
      type: newCampaign.type,
      recipients: 0
    };

    setCampaigns([campaign, ...campaigns]);
    setNewCampaign({ name: "", subject: "", content: "", type: "email", template: "" });
    setIsCreating(false);
    toast.success("Campaign created!");
  };

  const getStatusBadge = (status: Campaign["status"]) => {
    const config = {
      draft: { variant: "outline" as const, className: "text-muted-foreground" },
      scheduled: { variant: "secondary" as const, className: "text-blue-600 bg-blue-100" },
      sent: { variant: "secondary" as const, className: "text-green-600 bg-green-100" },
      active: { variant: "secondary" as const, className: "text-primary bg-primary/10" }
    };
    return config[status];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-headline font-bold text-foreground">Marketing Suite</h1>
                <p className="text-sm text-muted-foreground">Email campaigns, reminders & AI content</p>
              </div>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Email Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Campaign Name</label>
                      <Input
                        placeholder="e.g., Early Bird Reminder"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Campaign Type</label>
                      <Select
                        value={newCampaign.type}
                        onValueChange={(v) => setNewCampaign({ ...newCampaign, type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Campaign</SelectItem>
                          <SelectItem value="reminder">Automated Reminder</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Template (Optional)</label>
                    <Select
                      value={newCampaign.template}
                      onValueChange={(v) => setNewCampaign({ ...newCampaign, template: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Start from scratch or choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex flex-col">
                              <span>{t.name}</span>
                              <span className="text-xs text-muted-foreground">{t.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Subject Line</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateAI("subject")}
                        disabled={isGeneratingAI}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {isGeneratingAI ? "Generating..." : "AI Generate"}
                      </Button>
                    </div>
                    <Input
                      placeholder="Enter email subject..."
                      value={newCampaign.subject}
                      onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Email Content</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateAI("content")}
                        disabled={isGeneratingAI}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {isGeneratingAI ? "Generating..." : "AI Generate"}
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Write your email content..."
                      rows={10}
                      value={newCampaign.content}
                      onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 bg-gradient-primary" onClick={handleCreateCampaign}>
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold">{stats.avgOpenRate}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                <p className="text-2xl font-bold">{stats.avgClickRate}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{stats.scheduledCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      {campaign.type === "reminder" ? (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      ) : campaign.type === "announcement" ? (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Mail className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{campaign.name}</h3>
                        <Badge {...getStatusBadge(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Recipients</p>
                      <p className="font-medium">{campaign.recipients.toLocaleString()}</p>
                    </div>
                    {campaign.openRate !== undefined && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Open Rate</p>
                        <p className="font-medium text-green-600">{campaign.openRate}%</p>
                      </div>
                    )}
                    {campaign.clickRate !== undefined && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Click Rate</p>
                        <p className="font-medium text-blue-600">{campaign.clickRate}%</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="automations" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Registration Confirmation</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatically sends when someone registers for an event
                  </p>
                  <Badge className="bg-green-100 text-green-600">Active</Badge>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Event Reminder Sequence</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sends reminders at 7 days, 1 day, and 1 hour before event
                  </p>
                  <Badge className="bg-green-100 text-green-600">Active</Badge>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Post-Event Follow-up</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sends thank you email and survey 24 hours after event
                  </p>
                  <Badge variant="outline">Inactive</Badge>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emailTemplates.map((template) => (
              <Card key={template.id} className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <Button variant="outline" size="sm" className="w-full">Use Template</Button>
              </Card>
            ))}
            <Card className="p-4 border-dashed hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center">
              <Plus className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="font-medium">Create Template</p>
              <p className="text-sm text-muted-foreground">Build a reusable email template</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Marketing;
