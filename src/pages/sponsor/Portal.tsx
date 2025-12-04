import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Users, 
  TrendingUp, 
  Eye, 
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  BarChart3,
  Mail,
  MousePointerClick,
  Calendar,
  Building2,
  ExternalLink
} from "lucide-react";

// Demo data for sponsor portal
const sponsorInfo = {
  name: "Demo Financial Services",
  package: "Platinum",
  event: "Veteran Podcast Awards 2025",
  value: 95000,
  contact: {
    name: "Emily Carter",
    email: "emily.carter@demo-sponsor.com"
  }
};

const leadAnalytics = {
  totalLeads: 487,
  qualifiedLeads: 312,
  contacted: 156,
  converted: 23,
  impressions: 45230,
  clicks: 2341,
  ctr: 5.2,
  emailOpens: 1847,
  emailClicks: 423
};

const leads = [
  { id: 1, name: "John Mitchell", email: "john.m@example.com", company: "VetTech Solutions", score: 92, status: "Hot", date: "2024-12-03" },
  { id: 2, name: "Sarah Williams", email: "sarah.w@example.com", company: "Military Families Inc", score: 87, status: "Hot", date: "2024-12-02" },
  { id: 3, name: "Mike Thompson", email: "mike.t@example.com", company: "Defense Contractors LLC", score: 78, status: "Warm", date: "2024-12-02" },
  { id: 4, name: "Lisa Chen", email: "lisa.c@example.com", company: "Veteran Services Group", score: 71, status: "Warm", date: "2024-12-01" },
  { id: 5, name: "David Brown", email: "david.b@example.com", company: "Armed Forces Foundation", score: 65, status: "Cold", date: "2024-11-30" },
];

const deliverables = [
  { id: 1, name: "Company Logo (High-res PNG)", status: "completed", dueDate: "2024-11-15", type: "upload" },
  { id: 2, name: "Company Logo (Vector SVG)", status: "completed", dueDate: "2024-11-15", type: "upload" },
  { id: 3, name: "Brand Guidelines PDF", status: "completed", dueDate: "2024-11-20", type: "upload" },
  { id: 4, name: "Sponsor Bio (200 words)", status: "completed", dueDate: "2024-11-20", type: "upload" },
  { id: 5, name: "Booth Graphics (Banner)", status: "pending", dueDate: "2024-12-10", type: "upload" },
  { id: 6, name: "Product Demo Video", status: "pending", dueDate: "2024-12-15", type: "upload" },
  { id: 7, name: "Swag Bag Insert Design", status: "overdue", dueDate: "2024-11-25", type: "upload" },
  { id: 8, name: "Lead Retrieval Setup", status: "completed", dueDate: "2024-11-30", type: "action" },
  { id: 9, name: "Sponsored Email Content", status: "pending", dueDate: "2024-12-05", type: "upload" },
  { id: 10, name: "Speaking Slot Confirmation", status: "completed", dueDate: "2024-11-10", type: "action" },
];

const uploadedAssets = [
  { id: 1, name: "company-logo.png", type: "image", size: "2.4 MB", uploadedAt: "2024-11-14" },
  { id: 2, name: "company-logo.svg", type: "vector", size: "124 KB", uploadedAt: "2024-11-14" },
  { id: 3, name: "brand-guidelines.pdf", type: "document", size: "8.7 MB", uploadedAt: "2024-11-18" },
  { id: 4, name: "sponsor-bio.docx", type: "document", size: "45 KB", uploadedAt: "2024-11-19" },
];

const SponsorPortal = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  const completedDeliverables = deliverables.filter(d => d.status === "completed").length;
  const deliverableProgress = (completedDeliverables / deliverables.length) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "overdue": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case "overdue": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Overdue</Badge>;
      default: return null;
    }
  };

  const getLeadScoreBadge = (status: string) => {
    switch (status) {
      case "Hot": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Hot</Badge>;
      case "Warm": return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Warm</Badge>;
      case "Cold": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Cold</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-gradient-to-r from-slate-300 to-slate-500 text-slate-900 border-0">
                  {sponsorInfo.package}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{sponsorInfo.event}</span>
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">{sponsorInfo.name}</h1>
              <p className="text-muted-foreground mt-1">Sponsor Portal</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Package Value</p>
              <p className="text-3xl font-bold text-primary">${sponsorInfo.value.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">Brand Assets</TabsTrigger>
            <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Leads</p>
                      <p className="text-2xl font-bold text-foreground">{leadAnalytics.totalLeads}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Qualified Leads</p>
                      <p className="text-2xl font-bold text-foreground">{leadAnalytics.qualifiedLeads}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Eye className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Impressions</p>
                      <p className="text-2xl font-bold text-foreground">{leadAnalytics.impressions.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Target className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Click Rate</p>
                      <p className="text-2xl font-bold text-foreground">{leadAnalytics.ctr}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Deliverables Progress */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Deliverables Progress</CardTitle>
                <CardDescription>Track your sponsorship deliverables completion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{completedDeliverables} of {deliverables.length} completed</span>
                    <span className="font-medium text-foreground">{Math.round(deliverableProgress)}%</span>
                  </div>
                  <Progress value={deliverableProgress} className="h-2" />
                  <div className="flex gap-4 text-sm pt-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-muted-foreground">{deliverables.filter(d => d.status === "completed").length} Completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">{deliverables.filter(d => d.status === "pending").length} Pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-muted-foreground">{deliverables.filter(d => d.status === "overdue").length} Overdue</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Leads Preview */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Leads</CardTitle>
                  <CardDescription>Latest leads from your sponsorship</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("leads")}>
                  View All
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">Score: {lead.score}</p>
                          <p className="text-xs text-muted-foreground">{lead.date}</p>
                        </div>
                        {getLeadScoreBadge(lead.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Section */}
              <Card className="lg:col-span-1 bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Upload Assets</CardTitle>
                  <CardDescription>Upload your brand assets for the event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">Drop files here or click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, SVG, PDF, DOCX up to 50MB</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-name">Asset Name</Label>
                    <Input id="asset-name" placeholder="e.g., Company Logo" />
                  </div>
                  <Button className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Asset
                  </Button>
                </CardContent>
              </Card>

              {/* Uploaded Assets */}
              <Card className="lg:col-span-2 bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Uploaded Assets</CardTitle>
                  <CardDescription>Your brand assets for this sponsorship</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploadedAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {asset.type === "image" ? (
                              <ImageIcon className="w-5 h-5 text-primary" />
                            ) : asset.type === "vector" ? (
                              <FileText className="w-5 h-5 text-primary" />
                            ) : (
                              <FileText className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{asset.name}</p>
                            <p className="text-sm text-muted-foreground">{asset.size} • Uploaded {asset.uploadedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Lead Analytics Tab */}
          <TabsContent value="leads" className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Eye className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold text-foreground">{leadAnalytics.impressions.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <MousePointerClick className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold text-foreground">{leadAnalytics.clicks.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Mail className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold text-foreground">{leadAnalytics.emailOpens.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Email Opens</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold text-foreground">{leadAnalytics.ctr}%</p>
                  <p className="text-sm text-muted-foreground">CTR</p>
                </CardContent>
              </Card>
            </div>

            {/* Lead Funnel */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Lead Funnel</CardTitle>
                <CardDescription>Track your lead conversion pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-center p-4 rounded-lg bg-blue-500/10">
                    <p className="text-3xl font-bold text-blue-500">{leadAnalytics.totalLeads}</p>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-4 rounded-lg bg-purple-500/10">
                    <p className="text-3xl font-bold text-purple-500">{leadAnalytics.qualifiedLeads}</p>
                    <p className="text-sm text-muted-foreground">Qualified</p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-4 rounded-lg bg-orange-500/10">
                    <p className="text-3xl font-bold text-orange-500">{leadAnalytics.contacted}</p>
                    <p className="text-sm text-muted-foreground">Contacted</p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-4 rounded-lg bg-green-500/10">
                    <p className="text-3xl font-bold text-green-500">{leadAnalytics.converted}</p>
                    <p className="text-sm text-muted-foreground">Converted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads Table */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All Leads</CardTitle>
                  <CardDescription>Download and manage your leads</CardDescription>
                </div>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <Building2 className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-sm text-foreground">{lead.company}</p>
                        </div>
                        <div className="text-center">
                          <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-sm font-medium text-foreground">{lead.score}</p>
                        </div>
                        <div className="text-center">
                          <Calendar className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-sm text-muted-foreground">{lead.date}</p>
                        </div>
                        {getLeadScoreBadge(lead.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliverables Tab */}
          <TabsContent value="deliverables" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Sponsorship Deliverables</CardTitle>
                <CardDescription>Track all required assets and actions for your sponsorship package</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliverables.map((deliverable) => (
                    <div key={deliverable.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deliverable.status)}
                        <div>
                          <p className="font-medium text-foreground">{deliverable.name}</p>
                          <p className="text-sm text-muted-foreground">Due: {deliverable.dueDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(deliverable.status)}
                        {deliverable.status !== "completed" && deliverable.type === "upload" && (
                          <Button size="sm" variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </Button>
                        )}
                        {deliverable.status === "completed" && (
                          <Button size="sm" variant="ghost">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SponsorPortal;
