import { useDevAdmin, SimulatedRole } from "@/contexts/DevAdminContext";

export interface RolePermissions {
  canViewDashboard: boolean;
  canManageEvents: boolean;
  canManageAwards: boolean;
  canManageSponsors: boolean;
  canManageMarketing: boolean;
  canViewAnalytics: boolean;
  canManageAIAgents: boolean;
  canManageSettings: boolean;
  canManageTeam: boolean;
  canCreateEvents: boolean;
  canCreateAwards: boolean;
  canCheckInAttendees: boolean;
  canJudgeNominations: boolean;
  canViewSponsorPortal: boolean;
  canViewAttendeePortal: boolean;
  dashboardLabel: string;
}

const rolePermissionsMap: Record<NonNullable<SimulatedRole>, RolePermissions> = {
  super_admin: {
    canViewDashboard: true,
    canManageEvents: true,
    canManageAwards: true,
    canManageSponsors: true,
    canManageMarketing: true,
    canViewAnalytics: true,
    canManageAIAgents: true,
    canManageSettings: true,
    canManageTeam: true,
    canCreateEvents: true,
    canCreateAwards: true,
    canCheckInAttendees: true,
    canJudgeNominations: true,
    canViewSponsorPortal: true,
    canViewAttendeePortal: true,
    dashboardLabel: "Super Admin",
  },
  org_admin: {
    canViewDashboard: true,
    canManageEvents: true,
    canManageAwards: true,
    canManageSponsors: true,
    canManageMarketing: true,
    canViewAnalytics: true,
    canManageAIAgents: true,
    canManageSettings: true,
    canManageTeam: true,
    canCreateEvents: true,
    canCreateAwards: true,
    canCheckInAttendees: true,
    canJudgeNominations: false,
    canViewSponsorPortal: false,
    canViewAttendeePortal: false,
    dashboardLabel: "Organization Admin",
  },
  brand_admin: {
    canViewDashboard: true,
    canManageEvents: true,
    canManageAwards: true,
    canManageSponsors: true,
    canManageMarketing: true,
    canViewAnalytics: true,
    canManageAIAgents: false,
    canManageSettings: false,
    canManageTeam: true,
    canCreateEvents: true,
    canCreateAwards: true,
    canCheckInAttendees: true,
    canJudgeNominations: false,
    canViewSponsorPortal: false,
    canViewAttendeePortal: false,
    dashboardLabel: "Brand Admin",
  },
  event_planner: {
    canViewDashboard: true,
    canManageEvents: true,
    canManageAwards: false,
    canManageSponsors: false,
    canManageMarketing: true,
    canViewAnalytics: true,
    canManageAIAgents: false,
    canManageSettings: false,
    canManageTeam: false,
    canCreateEvents: true,
    canCreateAwards: false,
    canCheckInAttendees: true,
    canJudgeNominations: false,
    canViewSponsorPortal: false,
    canViewAttendeePortal: false,
    dashboardLabel: "Event Planner",
  },
  sponsor: {
    canViewDashboard: false,
    canManageEvents: false,
    canManageAwards: false,
    canManageSponsors: false,
    canManageMarketing: false,
    canViewAnalytics: false,
    canManageAIAgents: false,
    canManageSettings: false,
    canManageTeam: false,
    canCreateEvents: false,
    canCreateAwards: false,
    canCheckInAttendees: false,
    canJudgeNominations: false,
    canViewSponsorPortal: true,
    canViewAttendeePortal: false,
    dashboardLabel: "Sponsor",
  },
  judge: {
    canViewDashboard: false,
    canManageEvents: false,
    canManageAwards: false,
    canManageSponsors: false,
    canManageMarketing: false,
    canViewAnalytics: false,
    canManageAIAgents: false,
    canManageSettings: false,
    canManageTeam: false,
    canCreateEvents: false,
    canCreateAwards: false,
    canCheckInAttendees: false,
    canJudgeNominations: true,
    canViewSponsorPortal: false,
    canViewAttendeePortal: false,
    dashboardLabel: "Judge",
  },
  attendee: {
    canViewDashboard: false,
    canManageEvents: false,
    canManageAwards: false,
    canManageSponsors: false,
    canManageMarketing: false,
    canViewAnalytics: false,
    canManageAIAgents: false,
    canManageSettings: false,
    canManageTeam: false,
    canCreateEvents: false,
    canCreateAwards: false,
    canCheckInAttendees: false,
    canJudgeNominations: false,
    canViewSponsorPortal: false,
    canViewAttendeePortal: true,
    dashboardLabel: "Attendee",
  },
};

const defaultPermissions: RolePermissions = {
  canViewDashboard: true,
  canManageEvents: false,
  canManageAwards: false,
  canManageSponsors: false,
  canManageMarketing: false,
  canViewAnalytics: false,
  canManageAIAgents: false,
  canManageSettings: false,
  canManageTeam: false,
  canCreateEvents: false,
  canCreateAwards: false,
  canCheckInAttendees: false,
  canJudgeNominations: false,
  canViewSponsorPortal: false,
  canViewAttendeePortal: true,
  dashboardLabel: "Member",
};

export const useRolePermissions = (): RolePermissions => {
  const { effectiveRole } = useDevAdmin();
  
  if (!effectiveRole) {
    return defaultPermissions;
  }
  
  return rolePermissionsMap[effectiveRole] || defaultPermissions;
};

export const getPermissionsForRole = (role: SimulatedRole): RolePermissions => {
  if (!role) return defaultPermissions;
  return rolePermissionsMap[role] || defaultPermissions;
};
