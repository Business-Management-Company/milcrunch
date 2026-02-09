import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Requires auth; redirects unauthenticated to /login. Does not enforce role. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** For creator routes: redirect brand/admin to /brand/dashboard, unauthenticated to /login. */
export function CreatorRoute({ children }: { children: ReactNode }) {
  const { user, loading, creatorProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const role = (user.user_metadata?.role ?? creatorProfile?.role) as string | undefined;
  if (role === "brand" || role === "admin") {
    return <Navigate to="/brand/dashboard" replace />;
  }
  return <>{children}</>;
}

/** For brand/admin routes: redirect creator to /creator/dashboard. */
export function BrandRoute({ children }: { children: ReactNode }) {
  const { user, loading, creatorProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const role = (user.user_metadata?.role ?? creatorProfile?.role) as string | undefined;
  if (role === "creator") {
    return <Navigate to="/creator/dashboard" replace />;
  }
  if (role === "brand" || role === "admin") {
    return <>{children}</>;
  }
  return <>{children}</>;
}

/** For super admin only: redirect non–super_admin to /brand/dashboard. */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isSuperAdmin) {
    return <Navigate to="/brand/dashboard" replace />;
  }
  return <>{children}</>;
}
