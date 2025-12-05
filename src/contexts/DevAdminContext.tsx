import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Dev admin email for testing role switcher
const DEV_ADMIN_EMAIL = "super@eventcrunch.dev";

export type SimulatedRole = 
  | "super_admin" 
  | "org_admin" 
  | "brand_admin" 
  | "event_planner" 
  | "sponsor" 
  | "judge" 
  | "attendee"
  | null;

// Role hierarchy - higher index = higher privilege
const ROLE_HIERARCHY: SimulatedRole[] = [
  "attendee",
  "judge", 
  "sponsor",
  "event_planner",
  "brand_admin",
  "org_admin",
  "super_admin"
];

interface DevAdminContextType {
  isDevAdmin: boolean;
  simulatedRole: SimulatedRole;
  setSimulatedRole: (role: SimulatedRole) => void;
  effectiveRole: SimulatedRole;
  loadingRole: boolean;
}

const DevAdminContext = createContext<DevAdminContextType | undefined>(undefined);

export const DevAdminProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [simulatedRole, setSimulatedRole] = useState<SimulatedRole>(null);
  const [dbRole, setDbRole] = useState<SimulatedRole>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const isDevAdmin = user?.email === DEV_ADMIN_EMAIL;

  // Fetch user's highest privilege role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setDbRole(null);
        setLoadingRole(false);
        return;
      }

      try {
        // Fetch ALL roles for this user
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setDbRole(null);
        } else if (data && data.length > 0) {
          // Find the highest privilege role
          let highestRole: SimulatedRole = null;
          let highestIndex = -1;
          
          for (const row of data) {
            const role = row.role as SimulatedRole;
            const index = ROLE_HIERARCHY.indexOf(role);
            if (index > highestIndex) {
              highestIndex = index;
              highestRole = role;
            }
          }
          
          setDbRole(highestRole);
        } else {
          setDbRole(null);
        }
      } catch (err) {
        console.error('Error fetching user roles:', err);
        setDbRole(null);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [user?.id]);
  
  // Priority: simulated role (for dev testing) > database role > null
  const effectiveRole = simulatedRole || dbRole;

  return (
    <DevAdminContext.Provider value={{ 
      isDevAdmin, 
      simulatedRole, 
      setSimulatedRole,
      effectiveRole,
      loadingRole
    }}>
      {children}
    </DevAdminContext.Provider>
  );
};

export const useDevAdmin = () => {
  const context = useContext(DevAdminContext);
  if (context === undefined) {
    throw new Error("useDevAdmin must be used within a DevAdminProvider");
  }
  return context;
};
