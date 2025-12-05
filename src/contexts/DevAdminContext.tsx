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

  // Fetch user role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setDbRole(null);
        setLoadingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setDbRole(null);
        } else if (data) {
          setDbRole(data.role as SimulatedRole);
        } else {
          setDbRole(null);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
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
