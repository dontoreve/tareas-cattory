"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  href?: string;
  icon: string;
  label: string;
  /** Only show for these roles. undefined = show for all */
  roles?: ("admin" | "member")[];
  /** If true, renders a button instead of a link (e.g. "Equipo") */
  isButton?: boolean;
  onClick?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "auto_awesome", label: "Prioridades" },
  { href: "/kanban", icon: "view_kanban", label: "Kanban" },
  { href: "/calendar", icon: "calendar_month", label: "Calendario" },
  { isButton: true, icon: "group", label: "Equipo" },
  { href: "/backlog", icon: "history", label: "Backlog", roles: ["admin"] },
  {
    href: "/tareas-creadas",
    icon: "task_alt",
    label: "Tareas Creadas",
    roles: ["member"],
  },
];

interface RecurringChip {
  id: string;
  title: string;
  frequency: string;
  days_of_week: number[];
  week_of_month: number | null;
  is_active: boolean;
  priority: number;
  profiles?: { full_name: string | null };
}

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEK_LABELS = ["1ra", "2da", "3ra", "4ta"];

function getFreqSummary(t: RecurringChip): string {
  const dayStr = t.days_of_week.map((d) => DAY_SHORT[d]).join(", ");
  if (t.frequency === "weekly") return `Cada ${dayStr}`;
  if (t.frequency === "biweekly") return `Quincenal ${dayStr}`;
  if (t.frequency === "monthly") {
    const wl = WEEK_LABELS[(t.week_of_month ?? 1) - 1] ?? "";
    return `${wl} ${dayStr}/mes`;
  }
  return dayStr;
}

const PRIORITY_DOT: Record<number, string> = {
  5: "bg-red-500", 4: "bg-orange-500", 3: "bg-amber-500", 2: "bg-green-500", 1: "bg-slate-400",
};

export default function Sidebar({
  onTeamClick,
  onNewProjectClick,
  onManageProjectsClick,
  recurringTemplates = [],
  onNewRecurring,
  onEditRecurring,
}: {
  onTeamClick?: () => void;
  onNewProjectClick?: () => void;
  onManageProjectsClick?: () => void;
  recurringTemplates?: RecurringChip[];
  onNewRecurring?: () => void;
  onEditRecurring?: (template: RecurringChip) => void;
}) {
  const pathname = usePathname();
  const { profile, role } = useAuth();

  const greeting = profile?.full_name
    ? `Hola, ${profile.full_name.split(" ")[0]}`
    : "";

  return (
    <aside className="hidden md:flex w-64 flex-col fixed h-[calc(100vh-24px)] top-3 left-3 z-20 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/30 dark:border-slate-700/40 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
      {/* Logo + greeting */}
      <div className="p-8 flex items-center gap-3">
        <img src="/logo.png" className="h-10 object-contain" alt="Cattory Logo" />
        <div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            {greeting}
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          // Role-based filtering
          if (item.roles && !item.roles.includes(role)) return null;

          const isActive = item.href
            ? item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
            : false;

          const activeClasses =
            "mx-3 px-5 py-3 text-slate-900 dark:text-white font-bold bg-white/50 dark:bg-white/10 rounded-xl";
          const inactiveClasses =
            "px-8 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 hover:translate-x-1";

          const className = `flex items-center gap-4 transition-all duration-200 ${
            isActive ? activeClasses : inactiveClasses
          }`;

          if (item.isButton) {
            return (
              <button
                key={item.label}
                onClick={onTeamClick}
                className={`${className} w-full cursor-pointer`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.href} href={item.href!} className={className}>
              <span
                className={`material-symbols-outlined ${
                  isActive ? "text-slate-900 dark:text-white" : ""
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Recurring Tasks Panel (admin only) */}
      {role === "admin" && (
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Recurrentes
            </span>
            <button
              onClick={onNewRecurring}
              className="p-1 hover:bg-white/40 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Nueva tarea recurrente"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                add
              </span>
            </button>
          </div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scroll">
            {recurringTemplates.length === 0 ? (
              <p className="text-[10px] text-slate-300 px-2">Sin recurrentes</p>
            ) : (
              recurringTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onEditRecurring?.(t)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/40 dark:hover:bg-white/10 transition-colors ${
                    !t.is_active ? "opacity-40" : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] text-slate-400"
                    style={t.is_active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    repeat
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{t.title}</p>
                    <p className="text-[9px] text-slate-400 truncate">
                      {getFreqSummary(t)} · {t.profiles?.full_name?.split(" ")[0] ?? ""}
                    </p>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] ?? "bg-slate-400"}`} />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Project Actions (admin only) */}
      {role === "admin" && (
        <div className="p-4 border-t border-slate-50 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onNewProjectClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nuevo Proyecto
            </button>
            <button
              onClick={onManageProjectsClick}
              className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
              title="Gestionar Proyectos"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
