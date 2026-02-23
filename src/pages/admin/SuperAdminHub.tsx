import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  Users,
  UserCheck,
  DollarSign,
  Briefcase,
  FileText,
  ShieldCheck,
  KanbanSquare,
  ExternalLink,
} from "lucide-react";

const ALLOWED_EMAIL = "andrew@recurrentx.com";

const stats = [
  { label: "Total Events", value: "12", icon: Calendar, color: "from-blue-600 to-indigo-600" },
  { label: "Total Creators", value: "847", icon: UserCheck, color: "from-blue-500 to-cyan-600" },
  { label: "Total Users", value: "1,204", icon: Users, color: "from-emerald-500 to-teal-600" },
  { label: "Platform Revenue", value: "$0", icon: DollarSign, color: "from-amber-500 to-orange-600" },
];

const quickLinks = [
  { to: "/admin/business-overview", label: "Business Overview", description: "Revenue, growth, and KPI tracking", icon: Briefcase, external: false },
  { to: "/prospectus", label: "View Prospectus", description: "Investor-facing prospectus document", icon: FileText, external: true },
  { to: "/admin/prospectus-access", label: "Prospectus Access", description: "Manage who can view the prospectus", icon: ShieldCheck, external: false },
  { to: "/brand/task-board", label: "Task Board", description: "Kanban board for project management", icon: KanbanSquare, external: false },
];

export default function SuperAdminHub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.email !== ALLOWED_EMAIL) {
      navigate("/brand/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;
  if (user.email !== ALLOWED_EMAIL) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      {/* Header */}
      <header className="px-8 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight">
            MilCrunch<span className="text-[#3b82f6] font-extrabold">X</span>
          </span>
          <span className="text-gray-500 text-lg">/</span>
          <h1 className="text-2xl font-bold">Super Admin</h1>
        </div>
        <p className="text-gray-400 mt-1">Command center for platform operations</p>
      </header>

      {/* Stat Cards */}
      <section className="px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5"
            >
              <div className={`absolute top-0 right-0 h-20 w-20 rounded-bl-[60px] bg-gradient-to-br ${color} opacity-20`} />
              <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-lg bg-gradient-to-br ${color} p-2`}>
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm text-gray-400 font-medium">{label}</span>
              </div>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-8 pb-12">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {quickLinks.map(({ to, label, description, icon: Icon, external }) => {
            const inner = (
              <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm p-6 transition-all duration-200 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-[#1e3a5f]/20 p-3">
                      <Icon className="h-6 w-6 text-[#1e3a5f]" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-[#1e3a5f] transition-colors">
                        {label}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">{description}</p>
                    </div>
                  </div>
                  {external && (
                    <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-[#1e3a5f] transition-colors mt-1" />
                  )}
                </div>
              </div>
            );

            if (external) {
              return (
                <a key={to} href={to} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              );
            }
            return (
              <Link key={to} to={to}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
