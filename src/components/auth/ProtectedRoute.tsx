import { ReactNode } from "react";
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

/** For creator routes: redirect brand/admin/super_admin to /brand/dashboard, unauthenticated to /login. */
export function CreatorRoute({ children }: { children: ReactNode }) {
  const { user, loading, role, profileLoaded } = useAuth();
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
  if (user.email === "demo@recurrentx.com") {
    return <Navigate to="/brand/dashboard" replace />;
  }
  // Wait for user_roles to resolve before making a routing decision
  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }
  if (role === "brand" || role === "admin") {
    return <Navigate to="/brand/dashboard" replace />;
  }
  return <>{children}</>;
}

/** For brand/admin routes: redirect creator to /creator/dashboard. */
export function BrandRoute({ children }: { children: ReactNode }) {
  const { user, loading, role, profileLoaded } = useAuth();
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
  if (user.email === "demo@recurrentx.com") return <>{children}</>;
  // Wait for user_roles to resolve before making a routing decision
  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  // super_admin and admin/brand can access brand routes
  if (role === "creator") {
    return <Navigate to="/creator/dashboard" replace />;
  }
  return <>{children}</>;
}

/** For super admin only: redirect non–super_admin to /brand/dashboard. */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading, isSuperAdmin, profileLoaded } = useAuth();
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
  // Wait for user_roles to resolve before making a routing decision
  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isSuperAdmin) {
    return <Navigate to="/brand/dashboard" replace />;
  }
  return <>{children}</>;
}
