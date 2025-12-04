import { useDevAdmin, SimulatedRole } from "@/contexts/DevAdminContext";
import { getPermissionsForRole } from "@/hooks/useRolePermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Users, Award, Briefcase, Star, UserCheck, Check, X } from "lucide-react";

const roleConfig: { value: SimulatedRole; label: string; icon: React.ElementType; color: string }[] = [
  { value: "super_admin", label: "Super Admin", icon: Shield, color: "bg-red-500" },
  { value: "org_admin", label: "Org Admin", icon: Users, color: "bg-orange-500" },
  { value: "brand_admin", label: "Brand Admin", icon: Briefcase, color: "bg-yellow-500" },
  { value: "event_planner", label: "Event Planner", icon: Star, color: "bg-green-500" },
  { value: "sponsor", label: "Sponsor", icon: Award, color: "bg-blue-500" },
  { value: "judge", label: "Judge", icon: UserCheck, color: "bg-purple-500" },
  { value: "attendee", label: "Attendee", icon: User, color: "bg-gray-500" },
];

const DevRoleSwitcher = () => {
  const { isDevAdmin, simulatedRole, setSimulatedRole, effectiveRole } = useDevAdmin();

  if (!isDevAdmin) return null;

  const currentRole = roleConfig.find(r => r.value === effectiveRole);
  const permissions = getPermissionsForRole(effectiveRole);

  const permissionsList = [
    { key: "canViewDashboard", label: "Dashboard" },
    { key: "canManageEvents", label: "Events" },
    { key: "canManageAwards", label: "Awards" },
    { key: "canManageSponsors", label: "Sponsors" },
    { key: "canManageMarketing", label: "Marketing" },
    { key: "canViewAnalytics", label: "Analytics" },
    { key: "canManageAIAgents", label: "AI Agents" },
    { key: "canManageSettings", label: "Settings" },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[320px] max-h-[80vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-red-500" />
        <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Dev Mode</span>
        <Badge variant="outline" className="ml-auto text-xs">
          super@eventcrunch.dev
        </Badge>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Simulate Role:</label>
        <Select 
          value={simulatedRole || "super_admin"} 
          onValueChange={(value) => setSimulatedRole(value as SimulatedRole)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {currentRole && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentRole.color}`} />
                  <span>{currentRole.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roleConfig.map((role) => (
              <SelectItem key={role.value} value={role.value!}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${role.color}`} />
                  <role.icon className="w-4 h-4" />
                  <span>{role.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">
          Viewing as: <span className="font-medium text-foreground">{currentRole?.label}</span>
        </p>
        <div className="grid grid-cols-2 gap-1">
          {permissionsList.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              {permissions[key as keyof typeof permissions] ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <X className="w-3 h-3 text-muted-foreground/50" />
              )}
              <span className={permissions[key as keyof typeof permissions] ? "text-foreground" : "text-muted-foreground/50"}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevRoleSwitcher;
