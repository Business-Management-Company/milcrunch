import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ArrowLeft, TrendingUp, TrendingDown, Users, DollarSign,
  Ticket, Eye, MousePointer, Calendar, Download, RefreshCw,
  BarChart3, PieChart, Activity, Target, Globe, Clock
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from "recharts";

const registrationData = [
  { date: "Jan 1", registrations: 45, revenue: 2250 },
  { date: "Jan 8", registrations: 78, revenue: 3900 },
  { date: "Jan 15", registrations: 132, revenue: 6600 },
  { date: "Jan 22", registrations: 89, revenue: 4450 },
  { date: "Jan 29", registrations: 167, revenue: 8350 },
  { date: "Feb 5", registrations: 234, revenue: 11700 },
  { date: "Feb 12", registrations: 189, revenue: 9450 },
];

const trafficSourceData = [
  { name: "Direct", value: 35, color: "hsl(var(--primary))" },
  { name: "Social Media", value: 28, color: "hsl(var(--accent))" },
  { name: "Email", value: 22, color: "#10B981" },
  { name: "Referral", value: 10, color: "#F59E0B" },
  { name: "Organic", value: 5, color: "#6366F1" },
];

const ticketTypeData = [
  { type: "General Admission", sold: 423, revenue: 12690 },
  { type: "VIP", sold: 87, revenue: 8700 },
  { type: "Early Bird", sold: 156, revenue: 3900 },
  { type: "Group (5+)", sold: 45, revenue: 1800 },
];

const hourlyEngagement = [
  { hour: "6am", views: 12 },
  { hour: "9am", views: 89 },
  { hour: "12pm", views: 145 },
  { hour: "3pm", views: 178 },
  { hour: "6pm", views: 234 },
  { hour: "9pm", views: 167 },
  { hour: "12am", views: 45 },
];

const conversionFunnel = [
  { stage: "Page Views", count: 12450, rate: 100 },
  { stage: "Ticket Selection", count: 4230, rate: 34 },
  { stage: "Started Checkout", count: 1890, rate: 15.2 },
  { stage: "Completed Purchase", count: 711, rate: 5.7 },
];

const Analytics = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [selectedEvent, setSelectedEvent] = useState("all");

  const stats = {
    totalRevenue: 27090,
    revenueChange: 12.5,
    totalRegistrations: 711,
    registrationChange: 8.3,
    avgTicketPrice: 38.10,
    conversionRate: 5.7,
    conversionChange: -0.3,
    pageViews: 12450,
    viewsChange: 23.1
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
                <h1 className="text-2xl font-headline font-bold text-foreground">Analytics & Reporting</h1>
                <p className="text-sm text-muted-foreground">Track performance, conversions & revenue</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="vpa-2024">Veteran Podcast Awards 2024</SelectItem>
                  <SelectItem value="nmpd">National Military Podcast Day</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+{stats.revenueChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Registrations</p>
                <p className="text-2xl font-bold">{stats.totalRegistrations}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+{stats.registrationChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-500">{stats.conversionChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Page Views</p>
                <p className="text-2xl font-bold">{stats.pageViews.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+{stats.viewsChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registration Trend */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Registration Trend</h3>
                  <Badge variant="outline">
                    <Activity className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={registrationData}>
                    <defs>
                      <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        background: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Area
                      type="monotone"
                      dataKey="registrations"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorReg)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Traffic Sources */}
              <Card className="p-6">
                <h3 className="font-medium mb-4">Traffic Sources</h3>
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width={180} height={180}>
                    <RechartsPie>
                      <Pie
                        data={trafficSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {trafficSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {trafficSourceData.map((source) => (
                      <div key={source.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: source.color }}
                          />
                          <span className="text-sm">{source.name}</span>
                        </div>
                        <span className="text-sm font-medium">{source.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Ticket Sales by Type */}
            <Card className="p-6">
              <h3 className="font-medium mb-4">Ticket Sales by Type</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 text-sm font-medium text-muted-foreground">Ticket Type</th>
                      <th className="text-right py-3 text-sm font-medium text-muted-foreground">Sold</th>
                      <th className="text-right py-3 text-sm font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-3 text-sm font-medium text-muted-foreground">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketTypeData.map((ticket) => (
                      <tr key={ticket.type} className="border-b border-border">
                        <td className="py-3 font-medium">{ticket.type}</td>
                        <td className="py-3 text-right">{ticket.sold}</td>
                        <td className="py-3 text-right">${ticket.revenue.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(ticket.revenue / stats.totalRevenue) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm">
                              {((ticket.revenue / stats.totalRevenue) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-4">Revenue Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={registrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-4">Engagement by Hour</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyEngagement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Peak engagement: <span className="font-medium text-foreground">6pm - 9pm</span>
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-6">Conversion Funnel</h3>
              <div className="space-y-4">
                {conversionFunnel.map((stage, index) => (
                  <div key={stage.stage} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {stage.count.toLocaleString()}
                        </span>
                        <Badge variant="outline">{stage.rate}%</Badge>
                      </div>
                    </div>
                    <div className="h-10 bg-secondary rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                        style={{ width: `${stage.rate}%` }}
                      />
                    </div>
                    {index < conversionFunnel.length - 1 && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                        ↓ {((conversionFunnel[index + 1].count / stage.count) * 100).toFixed(1)}% proceed
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 bg-secondary/50 rounded-lg">
                <h4 className="font-medium mb-2">Funnel Insights</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 34% of visitors reach ticket selection - above industry average (28%)</li>
                  <li>• Drop-off at checkout: 55% - consider simplifying checkout flow</li>
                  <li>• Final conversion rate of 5.7% is healthy for event ticketing</li>
                </ul>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;
