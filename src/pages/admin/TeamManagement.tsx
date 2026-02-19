import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Plus, MoreHorizontal, Trash2, Mail, Shield,
  User, Users, Crown, Settings, Eye, Edit, DollarSign,
  Calendar, Megaphone, UserCheck, Store, Loader2, Check,
  Copy, Clock, AlertCircle, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  invited_at: string;
  accepted_at: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email?: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
}

const ROLES = [
  { 
    id: "owner", 
    label: "Owner", 
    icon: Crown, 
    color: "text-amber-500",
    description: "Full access to everything",
    defaultPermissions: ["all"]
  },
  { 
    id: "admin", 
    label: "Admin", 
    icon: Shield, 
    color: "text-purple-500",
    description: "Manage event, team, finances",
    defaultPermissions: ["edit_event", "manage_team", "manage_finances", "manage_attendees", "manage_marketing", "manage_sponsors", "view_analytics"]
  },
  { 
    id: "event_manager", 
    label: "Event Manager", 
    icon: Calendar, 
    color: "text-blue-500",
    description: "Edit event + manage attendees",
    defaultPermissions: ["edit_event", "manage_attendees", "view_analytics"]
  },
  { 
    id: "marketing_manager", 
    label: "Marketing Manager", 
    icon: Megaphone, 
    color: "text-pink-500",
    description: "Email, social, SEO, promo",
    defaultPermissions: ["manage_marketing", "view_analytics"]
  },
  { 
    id: "registration_manager", 
    label: "Registration Manager", 
    icon: UserCheck, 
    color: "text-green-500",
    description: "Check-in, attendee handling",
    defaultPermissions: ["manage_attendees", "checkin"]
  },
  { 
    id: "vendor_manager", 
    label: "Vendor Manager", 
    icon: Store, 
    color: "text-orange-500",
    description: "Sponsors, booths, exhibitors",
    defaultPermissions: ["manage_sponsors"]
  },
  { 
    id: "finance_manager", 
    label: "Finance Manager", 
    icon: DollarSign, 
    color: "text-purple-500",
    description: "Payments, payouts, refunds",
    defaultPermissions: ["manage_finances", "view_analytics"]
  },
  { 
    id: "staff", 
    label: "Staff / Volunteer", 
    icon: User, 
    color: "text-slate-500",
    description: "Check-in only",
    defaultPermissions: ["checkin"]
  },
  { 
    id: "view_only", 
    label: "View Only", 
    icon: Eye, 
    color: "text-gray-400",
    description: "Read-only access",
    defaultPermissions: ["view_analytics"]
  },
];

const PERMISSIONS = [
  { id: "edit_event", label: "Edit Event Details", category: "Event" },
  { id: "edit_landing_page", label: "Edit Landing Page", category: "Event" },
  { id: "manage_tickets", label: "Manage Tickets", category: "Event" },
  { id: "manage_attendees", label: "View/Export Attendees", category: "Attendees" },
  { id: "checkin", label: "Check-in Attendees", category: "Attendees" },
  { id: "send_communications", label: "Send Emails/SMS", category: "Communications" },
  { id: "manage_marketing", label: "Marketing Tools", category: "Marketing" },
  { id: "manage_sponsors", label: "Manage Sponsors", category: "Sponsors" },
  { id: "manage_finances", label: "View/Manage Payments", category: "Finance" },
  { id: "issue_refunds", label: "Issue Refunds", category: "Finance" },
  { id: "view_analytics", label: "View Analytics", category: "Reports" },
  { id: "export_data", label: "Export Data", category: "Reports" },
  { id: "manage_team", label: "Manage Team Members", category: "Team" },
  { id: "delete_event", label: "Delete Event", category: "Danger" },
];

const TeamManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [event, setEvent] = useState<Event | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>({});
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from("event_team_members")
        .select("id, user_id, role, permissions, invited_at, accepted_at")
        .eq("event_id", eventId);

      if (membersError) throw membersError;
      
      // Build basic profile info from member data (no profiles table)
      const userIds = (membersData || []).map(m => m.user_id);
      const profilesMap: Record<string, { user_id: string; full_name: string | null; avatar_url: string | null }> = {};
      // Profiles are sourced from auth metadata — no separate table to query
      for (const uid of userIds) {
        profilesMap[uid] = { user_id: uid, full_name: null, avatar_url: null };
      }

      const membersWithProfiles = (membersData || []).map(m => ({
        ...m,
        permissions: (m.permissions as Record<string, boolean>) || {},
        profile: profilesMap[m.user_id] || null,
      }));
      setTeamMembers(membersWithProfiles);

      // Fetch pending invitations
      const { data: invitesData, error: invitesError } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("event_id", eventId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString());

      if (invitesError) throw invitesError;
      setInvitations(invitesData || []);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!eventId || !inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);
    try {
      // Check if already a member or invited
      const existingMember = teamMembers.find(m => m.profile?.email === inviteEmail);
      if (existingMember) {
        toast.error("User is already a team member");
        return;
      }

      const existingInvite = invitations.find(i => i.email === inviteEmail);
      if (existingInvite) {
        toast.error("Invitation already sent to this email");
        return;
      }

      // Create invitation
      const { data, error } = await supabase
        .from("team_invitations")
        .insert({
          event_id: eventId,
          email: inviteEmail.toLowerCase(),
          role: inviteRole as any,
          permissions: invitePermissions,
          invited_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setInvitations([...invitations, data]);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
      setInvitePermissions({});
      toast.success("Invitation sent!");
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("event_team_members")
        .update({ role: newRole as any })
        .eq("id", memberId);

      if (error) throw error;

      setTeamMembers(teamMembers.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success("Role updated");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from("event_team_members")
        .update({ permissions: selectedMember.permissions })
        .eq("id", selectedMember.id);

      if (error) throw error;

      setTeamMembers(teamMembers.map(m => 
        m.id === selectedMember.id ? selectedMember : m
      ));
      setPermissionsDialogOpen(false);
      toast.success("Permissions updated");
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permissions");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("event_team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
      toast.success("Team member removed");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleCancelInvitation = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      setInvitations(invitations.filter(i => i.id !== inviteId));
      toast.success("Invitation cancelled");
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const getRoleConfig = (roleId: string) => {
    return ROLES.find(r => r.id === roleId) || ROLES[ROLES.length - 1];
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !event) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/events">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="font-headline font-bold text-foreground">Team Management</h1>
                <p className="text-sm text-muted-foreground">{event.title}</p>
              </div>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your event team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter(r => r.id !== "owner").map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <role.icon className={cn("w-4 h-4", role.color)} />
                              <span>{role.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {getRoleConfig(inviteRole).description}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Members */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Team Members ({teamMembers.length})
                </h2>
              </div>

              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No team members yet</p>
                  <p className="text-sm text-muted-foreground">Invite your first team member to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => {
                    const roleConfig = getRoleConfig(member.role);
                    const RoleIcon = roleConfig.icon;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile?.avatar_url || ""} />
                            <AvatarFallback>
                              {member.profile?.full_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.profile?.full_name || "Unknown User"}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={cn("text-xs", roleConfig.color)}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {roleConfig.label}
                              </Badge>
                              {!member.accepted_at && (
                                <Badge variant="outline" className="text-xs text-orange-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setPermissionsDialogOpen(true);
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {ROLES.filter(r => r.id !== "owner").map((role) => (
                              <DropdownMenuItem
                                key={role.id}
                                onClick={() => handleUpdateRole(member.id, role.id)}
                                disabled={member.role === role.id}
                              >
                                <role.icon className={cn("w-4 h-4 mr-2", role.color)} />
                                Set as {role.label}
                                {member.role === role.id && (
                                  <Check className="w-4 h-4 ml-auto" />
                                )}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove from Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card className="p-6 bg-gradient-card border-border">
                <h2 className="font-headline font-bold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Pending Invitations ({invitations.length})
                </h2>

                <div className="space-y-3">
                  {invitations.map((invite) => {
                    const roleConfig = getRoleConfig(invite.role);
                    const RoleIcon = roleConfig.icon;

                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-dashed border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{invite.email}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className={cn("text-xs", roleConfig.color)}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {roleConfig.label}
                              </Badge>
                              <span>•</span>
                              <span>Expires {format(new Date(invite.expires_at), "MMM d")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(invite.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Role Guide */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-card border-border sticky top-4">
              <h3 className="font-headline font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Role Guide
              </h3>

              <div className="space-y-3">
                {ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-background", role.color.replace("text-", "bg-").replace("500", "100"))}>
                      <role.icon className={cn("w-4 h-4", role.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Customize permissions for {selectedMember?.profile?.full_name || "this team member"}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6 py-4">
              {Object.entries(
                PERMISSIONS.reduce((acc, perm) => {
                  if (!acc[perm.category]) acc[perm.category] = [];
                  acc[perm.category].push(perm);
                  return acc;
                }, {} as Record<string, typeof PERMISSIONS>)
              ).map(([category, perms]) => (
                <div key={category}>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    {category}
                  </Label>
                  <div className="mt-2 space-y-2">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-center gap-3">
                        <Checkbox
                          id={perm.id}
                          checked={selectedMember.permissions[perm.id] || false}
                          onCheckedChange={(checked) => {
                            setSelectedMember({
                              ...selectedMember,
                              permissions: {
                                ...selectedMember.permissions,
                                [perm.id]: !!checked
                              }
                            });
                          }}
                          disabled={selectedMember.role === "owner" || selectedMember.role === "admin"}
                        />
                        <label
                          htmlFor={perm.id}
                          className={cn(
                            "text-sm cursor-pointer",
                            perm.category === "Danger" ? "text-destructive" : "text-foreground"
                          )}
                        >
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(selectedMember.role === "owner" || selectedMember.role === "admin") && (
                <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.role === "owner" ? "Owners" : "Admins"} have full access to all permissions by default.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions}>
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
