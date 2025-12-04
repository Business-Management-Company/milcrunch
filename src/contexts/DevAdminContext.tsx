import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

// Dev admin email for testing
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
}

const DevAdminContext = createContext<DevAdminContextType | undefined>(undefined);

export const DevAdminProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [simulatedRole, setSimulatedRole] = useState<SimulatedRole>(null);

  const isDevAdmin = user?.email === DEV_ADMIN_EMAIL;
  
  // If simulating a role, use that; otherwise default to super_admin for dev admin
  const effectiveRole = simulatedRole || (isDevAdmin ? "super_admin" : null);

  return (
    <DevAdminContext.Provider value={{ 
      isDevAdmin, 
      simulatedRole, 
      setSimulatedRole,
      effectiveRole 
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
