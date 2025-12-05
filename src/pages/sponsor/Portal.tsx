import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  Mail,
  MousePointerClick,
  Building2,
  ExternalLink,
  LayoutDashboard,
  FolderUp,
  BarChart3,
  ClipboardList,
  LogOut,
  Home
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
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;
  
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

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", tab: "overview" },
    { icon: FolderUp, label: "Brand Assets", tab: "assets" },
    { icon: BarChart3, label: "Lead Analytics", tab: "leads" },
    { icon: ClipboardList, label: "Deliverables", tab: "deliverables" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-headline font-bold text-foreground">Sponsor Portal</span>
          </Link>
        </div>

        <div className="p-4 border-b border-border">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium text-foreground">{sponsorInfo.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs bg-gradient-to-r from-slate-200 to-slate-400 text-slate-800 border-0">
                {sponsorInfo.package}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{sponsorInfo.event}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.tab 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">
                {user.email?.[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <Badge variant="outline" className="text-xs mt-1">Sponsor</Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border bg-card/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">
                {navItems.find(n => n.tab === activeTab)?.label || "Overview"}
              </h1>
              <p className="text-muted-foreground mt-1">Manage your sponsorship assets and track performance</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Package Value</p>
              <p className="text-2xl font-bold text-primary">${sponsorInfo.value.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
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
            </div>
          )}

          {/* Brand Assets Tab */}
          {activeTab === "assets" && (
            <div className="space-y-6">
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

              {/* Asset Guidelines */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Asset Requirements</CardTitle>
                  <CardDescription>Guidelines for your brand assets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <ImageIcon className="w-6 h-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground mb-1">Logo (PNG)</h4>
                      <p className="text-sm text-muted-foreground">Minimum 1000x1000px, transparent background preferred</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <FileText className="w-6 h-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground mb-1">Logo (Vector)</h4>
                      <p className="text-sm text-muted-foreground">SVG, AI, or EPS format for print materials</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <FileText className="w-6 h-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground mb-1">Brand Guidelines</h4>
                      <p className="text-sm text-muted-foreground">PDF with color codes, fonts, and usage rules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Lead Analytics Tab */}
          {activeTab === "leads" && (
            <div className="space-y-6">
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
                    <Target className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-foreground">{leadAnalytics.converted}</p>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lead Funnel */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Lead Funnel</CardTitle>
                  <CardDescription>Track leads through your conversion funnel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground">Total Leads</span>
                        <span className="text-sm font-medium text-foreground">{leadAnalytics.totalLeads}</span>
                      </div>
                      <Progress value={100} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground">Qualified</span>
                        <span className="text-sm font-medium text-foreground">{leadAnalytics.qualifiedLeads} ({Math.round((leadAnalytics.qualifiedLeads / leadAnalytics.totalLeads) * 100)}%)</span>
                      </div>
                      <Progress value={(leadAnalytics.qualifiedLeads / leadAnalytics.totalLeads) * 100} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground">Contacted</span>
                        <span className="text-sm font-medium text-foreground">{leadAnalytics.contacted} ({Math.round((leadAnalytics.contacted / leadAnalytics.totalLeads) * 100)}%)</span>
                      </div>
                      <Progress value={(leadAnalytics.contacted / leadAnalytics.totalLeads) * 100} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground">Converted</span>
                        <span className="text-sm font-medium text-foreground">{leadAnalytics.converted} ({Math.round((leadAnalytics.converted / leadAnalytics.totalLeads) * 100)}%)</span>
                      </div>
                      <Progress value={(leadAnalytics.converted / leadAnalytics.totalLeads) * 100} className="h-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leads Table */}
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">All Leads</CardTitle>
                    <CardDescription>Full list of leads from your sponsorship</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
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
                          <div className="hidden md:block">
                            <p className="text-sm text-foreground">{lead.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-foreground">Score: {lead.score}</p>
                            <p className="text-xs text-muted-foreground">{lead.date}</p>
                          </div>
                          {getLeadScoreBadge(lead.status)}
                          <Button variant="ghost" size="sm">
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Deliverables Tab */}
          {activeTab === "deliverables" && (
            <div className="space-y-6">
              {/* Progress Overview */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Overall Progress</CardTitle>
                  <CardDescription>Track all sponsorship deliverables</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{completedDeliverables} of {deliverables.length} completed</span>
                      <span className="font-medium text-foreground">{Math.round(deliverableProgress)}%</span>
                    </div>
                    <Progress value={deliverableProgress} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              {/* Deliverables List */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">All Deliverables</CardTitle>
                  <CardDescription>Complete list of sponsorship requirements</CardDescription>
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
                          {deliverable.type === "upload" && deliverable.status !== "completed" && (
                            <Button variant="outline" size="sm" onClick={() => setActiveTab("assets")}>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </Button>
                          )}
                          {deliverable.status === "completed" && (
                            <Button variant="ghost" size="sm">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SponsorPortal;
