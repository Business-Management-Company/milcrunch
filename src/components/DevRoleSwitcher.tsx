import { useDevAdmin, SimulatedRole } from "@/contexts/DevAdminContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Users, Award, Briefcase, Star, UserCheck } from "lucide-react";

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

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[280px]">
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
        <p className="text-xs text-muted-foreground">
          Viewing as: <span className="font-medium text-foreground">{currentRole?.label}</span>
        </p>
      </div>
    </div>
  );
};

export default DevRoleSwitcher;
