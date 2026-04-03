"use client";

import { useState, useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useCelebration } from "@/components/ui/CelebrationAnimation";
import { getPriorityConfig, PRIORITY_BG } from "@/lib/utils/priority";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import { matchesSearch } from "@/lib/utils/search";
import { TAG_COLORS, getColorIndex } from "@/lib/utils/colors";
import type { Task } from "@/lib/types";

// ── Sorting: 4-tier by deadline ────────────────────────────────
function sortTasksDynamic(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  function deadlineMs(t: Task): number | null {
    if (!t.deadline) return null;
    const [y, m, d] = t.deadline.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  function tier(t: Task): number {
    const ms = deadlineMs(t);
    if (ms === null) return 3; // No deadline
    if (ms < todayMs) return 0; // Overdue
    if (ms === todayMs) return 1; // Due today
    return 2; // Future
  }

  return [...tasks].sort((a, b) => {
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;

    const msA = deadlineMs(a);
    const msB = deadlineMs(b);

    if (ta === 0) {
      // Overdue: most overdue first
      if (msA !== msB) return (msA ?? 0) - (msB ?? 0);
    } else if (ta === 2) {
      // Future: soonest first
      if (msA !== msB) return (msA ?? 0) - (msB ?? 0);
    }

    // Within same tier/date: higher priority first
    return b.priority - a.priority;
  });
}

// ── Project Overview Card ──────────────────────────────────────
function ProjectCard({
  name,
  tasks,
  colorIdx,
  isActive,
  hasActiveFilters,
  onClick,
}: {
  name: string;
  tasks: Task[];
  colorIdx: number;
  isActive: boolean;
  hasActiveFilters: boolean;
  onClick?: () => void;
}) {
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const active = tasks.filter((t) => t.status !== "done");
  const nextDeadline = active
    .map((t) => t.deadline)
    .filter(Boolean)
    .sort()[0];

  const color = TAG_COLORS[colorIdx % TAG_COLORS.length];

  const cardClass = isActive
    ? "ring-2 ring-primary ring-offset-2 border-primary shadow-md"
    : hasActiveFilters
      ? "border border-slate-100 shadow-sm opacity-50 hover:opacity-100 scale-[0.98]"
      : "border border-slate-100 shadow-sm";

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-56 p-4 bg-white rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left ${cardClass}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-2.5 h-2.5 rounded-full ${color.bg} ring-2 ${color.ring}`}
        />
        <span className="text-sm font-bold text-slate-800 truncate">
          {name}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">
          {done}/{total} completadas
        </span>
        <span className={`text-sm font-bold ${color.text}`}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.bg} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextDeadline && (
        <p className="mt-2 text-[11px] text-slate-400 truncate">
          Prox: {formatDate(nextDeadline)}
        </p>
      )}
    </button>
  );
}

// ── Priority Row (Desktop) ─────────────────────────────────────
function PriorityRow({
  task,
  rank,
  onPreview,
  onEdit,
  onComplete,
  onDelete,
}: {
  task: Task;
  rank: number;
  onPreview: (t: Task) => void;
  onEdit: (t: Task) => void;
  onComplete: (t: Task, el?: HTMLElement) => void;
  onDelete: (t: Task) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const overdue = isOverdue(task.deadline);
  const color = task.project_id
    ? TAG_COLORS[getColorIndex(task.project_id)]
    : null;
  const isTop = rank === 1;
  const isTop3 = rank <= 3;
  const statusDot = task.status === "in-progress" ? "bg-blue-500" : "bg-slate-400";

  return (
    <tr
      className={`group hover:bg-slate-50/50 transition-colors cursor-pointer ${isTop ? "border-l-4 border-primary bg-primary/5" : ""}`}
      style={{ animation: `rowSlideIn 200ms ease-out both`, animationDelay: `${Math.min((rank - 1) * 30, 300)}ms` }}
      onClick={() => onPreview(task)}
    >
      {/* Rank */}
      <td className={`px-2 py-4 w-12 text-center select-none ${
        isTop ? "text-2xl font-black text-primary/40"
        : isTop3 ? "text-lg font-bold text-slate-300"
        : "text-sm font-bold text-slate-300"
      }`}>
        {rank}
      </td>
      {/* Title */}
      <td className="px-3 py-4 max-w-[280px]">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`size-2 rounded-full ${statusDot} shrink-0`} />
          <span className="font-medium text-sm text-slate-800 truncate">
            {task.title}
          </span>
        </div>
      </td>
      {/* Project */}
      <td className="px-3 py-4">
        {task.projects?.name && color ? (
          <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${color.bg} ${color.text}`}>
            {task.projects.name}
          </span>
        ) : (
          <span className="text-xs text-slate-300">Sin asignar</span>
        )}
      </td>
      {/* Priority */}
      <td className="px-3 py-4">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${pb}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          {pc.label}
        </span>
      </td>
      {/* Deadline */}
      <td className="px-3 py-4">
        {task.deadline ? (
          <span className={`inline-flex items-center gap-1 text-sm font-medium ${
            overdue ? "text-red-600 bg-red-50 px-2 py-1 rounded" : "text-slate-600"
          }`}>
            {overdue && <span className="material-symbols-outlined text-[12px] text-red-500">warning</span>}
            {formatDate(task.deadline)}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      {/* Assignee */}
      <td className="px-3 py-4">
        <div className="flex items-center gap-1">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-2 py-1 rounded-full pr-3 border border-slate-100/50">
            {task.profiles?.avatar_url ? (
              <img src={task.profiles.avatar_url} className="size-5 rounded-full object-cover" alt="" />
            ) : (
              <div className="size-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                {(task.profiles?.full_name ?? "?").substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold whitespace-nowrap">
              {task.profiles?.full_name ?? "—"}
            </span>
          </div>
        </div>
      </td>
      {/* Actions */}
      <td className="px-3 py-4 text-right">
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 hover:scale-110 transition-all duration-200"
            title="Editar"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(task, e.currentTarget); }}
            className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 hover:scale-110 transition-all duration-200"
            title="Completar"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 hover:scale-110 transition-all duration-200"
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Priority Card (Mobile) ─────────────────────────────────────
function PriorityCard({
  task,
  rank,
  onPreview,
  onEdit,
  onComplete,
  onDelete,
}: {
  task: Task;
  rank: number;
  onPreview: (t: Task) => void;
  onEdit: (t: Task) => void;
  onComplete: (t: Task, el?: HTMLElement) => void;
  onDelete: (t: Task) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const overdue = isOverdue(task.deadline);
  const statusDot = task.status === "in-progress" ? "bg-blue-500" : "bg-slate-400";
  const color = task.project_id
    ? TAG_COLORS[getColorIndex(task.project_id)]
    : null;

  return (
    <div
      className="p-4 flex flex-col gap-2 bg-white border-b border-slate-100 cursor-pointer active:bg-slate-50 transition-colors"
      onClick={() => onPreview(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`size-2 rounded-full shrink-0 ${statusDot}`} />
          <span className="font-semibold text-sm truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 active:scale-90 transition-all duration-200"
            title="Editar"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(task, e.currentTarget); }}
            className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 active:scale-90 transition-all duration-200"
            title="Completar"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all duration-200"
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {task.projects?.name && color ? (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${color.bg} ${color.text}`}>
            {task.projects.name}
          </span>
        ) : null}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${pb}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          {pc.label}
        </span>
        {task.deadline && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            overdue ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100"
          }`}>
            {formatDate(task.deadline)}
          </span>
        )}
        {task.profiles?.full_name && (
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {task.profiles?.avatar_url ? (
              <img src={task.profiles.avatar_url} className="size-4 rounded-full object-cover" alt="" />
            ) : (
              <div className="size-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold shadow-sm">
                {task.profiles.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            {task.profiles.full_name}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function PriorityPage() {
  const { user, profile, role } = useAuth();
  const {
    tasks,
    tasksLoading,
    projects,
    completeTask,
    deleteTask,
    openTaskModal,
    openPreview,
    globalSearch: searchQuery,
  } = useDashboard();
  const { showToast } = useToast();
  const celebrate = useCelebration();

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [projectFilters, setProjectFilters] = useState<Set<string>>(new Set());
  const [userFilters, setUserFilters] = useState<Set<string>>(new Set());
  const [viewAll, setViewAll] = useState(false);

  // Filter + sort tasks
  const sortedTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.status !== "done");

    // Members always see only their own tasks (not configurable)
    if (role === "member" && user?.id) {
      filtered = filtered.filter(
        (t) =>
          t.responsible_id === user.id ||
          t.secondary_responsible_id === user.id
      );
    }

    // Project filter
    if (projectFilters.size > 0) {
      filtered = filtered.filter((t) =>
        t.project_id ? projectFilters.has(t.project_id) : false
      );
    }

    // Priority filter
    if (priorityFilter !== null) {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    // User filter (admin only — optional on top of seeing all tasks)
    if (userFilters.size > 0 && role === "admin") {
      filtered = filtered.filter(
        (t) =>
          userFilters.has(t.responsible_id) ||
          (t.secondary_responsible_id &&
            userFilters.has(t.secondary_responsible_id))
      );
    }

    // Search
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        matchesSearch(
          searchQuery,
          t.title,
          t.description,
          t.projects?.name
        )
      );
    }

    // Deduplicate
    const deduped = [...new Map(filtered.map((t) => [t.id, t])).values()];

    return sortTasksDynamic(deduped);
  }, [tasks, projectFilters, priorityFilter, userFilters, role, searchQuery]);

  const displayTasks = viewAll ? sortedTasks : sortedTasks.slice(0, 10);

  // Project overview data
  const projectOverview = useMemo(() => {
    const byProject = new Map<string, { name: string; tasks: Task[] }>();

    for (const p of projects) {
      const projectTasks = tasks.filter((t) => t.project_id === p.id);
      if (projectTasks.length === 0) continue; // Skip projects with no tasks for this user
      byProject.set(p.id, { name: p.name, tasks: projectTasks });
    }

    // Unassigned
    const unassigned = tasks.filter((t) => !t.project_id);
    if (unassigned.length > 0) {
      byProject.set("__none__", { name: "Sin Proyecto", tasks: unassigned });
    }

    return [...byProject.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [tasks, projects]);

  // Team members for filter
  const { teamMembers } = useDashboard();

  async function handleComplete(task: Task, el?: HTMLElement) {
    try {
      await completeTask(task.id);
      const firstName = profile?.full_name?.split(" ")[0];
      celebrate(el, firstName);
    } catch {
      showToast("Error al completar la tarea");
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`¿Eliminar "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      showToast("Tarea eliminada", "success");
    } catch {
      showToast("Error al eliminar la tarea");
    }
  }

  function toggleProjectFilter(id: string) {
    setProjectFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleUserFilter(id: string) {
    setUserFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Project Overview ────────────────────────────────── */}
      {projectOverview.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            Proyectos
          </h3>
          <div className="flex gap-4 overflow-x-auto pt-2 pb-4 -mx-1 px-1 custom-scroll">
            {projectOverview.map((p) => (
              <ProjectCard
                key={p.id}
                name={p.name}
                tasks={p.tasks}
                colorIdx={getColorIndex(p.id)}
                isActive={projectFilters.has(p.id)}
                hasActiveFilters={projectFilters.size > 0}
                onClick={() => toggleProjectFilter(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Filters Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setPriorityFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              priorityFilter === null
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Todas
          </button>
          {[5, 4, 3, 2, 1].map((p) => {
            const cfg = getPriorityConfig(p);
            const active = priorityFilter === p;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(active ? null : p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? PRIORITY_BG[p]
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Project filter uses the cards above — no duplicate chips needed */}

        {/* User filter (admin only) */}
        {role === "admin" && teamMembers.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {teamMembers.map((m) => {
              const active = userFilters.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleUserFilter(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <img
                    src={m.avatar_url || "/logo.png"}
                    className="w-4 h-4 rounded-full object-cover"
                    alt=""
                  />
                  {m.full_name?.split(" ")[0] ?? "?"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Priority List (Desktop) ────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100">
        {/* Section header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h3 className="font-bold text-lg">Lista de Prioridades</h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Deadline + Prioridad</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="px-2 py-4 w-12">#</th>
                <th className="px-3 py-4 max-w-[280px]">Tarea</th>
                <th className="px-3 py-4">Proyecto</th>
                <th className="px-3 py-4">Prioridad</th>
                <th className="px-3 py-4">Fecha Limite</th>
                <th className="px-3 py-4">Responsable</th>
                <th className="px-3 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">task_alt</span>
                      <h4 className="font-semibold text-slate-500 mb-1">No se encontraron tareas</h4>
                      <p className="text-sm text-slate-400 max-w-xs">
                        {searchQuery || priorityFilter !== null || projectFilters.size > 0
                          ? "No hay tareas con estos filtros"
                          : "No hay tareas pendientes"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayTasks.map((task, i) => (
                  <PriorityRow
                    key={task.id}
                    task={task}
                    rank={i + 1}
                    onPreview={openPreview}
                    onEdit={openTaskModal}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View all toggle */}
        {sortedTasks.length > 10 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-center">
            <button
              onClick={() => setViewAll((prev) => !prev)}
              className="text-primary text-sm font-semibold hover:underline px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
            >
              {viewAll
                ? "Ver top 10 tareas prioritarias"
                : `Ver todas las ${sortedTasks.length} tareas`}
            </button>
          </div>
        )}
      </div>

      {/* ── Priority Cards (Mobile) ─────────────────────────── */}
      <div className="md:hidden bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Mobile header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
          <h3 className="font-bold text-base">Lista de Prioridades</h3>
        </div>
        {displayTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              task_alt
            </span>
            {searchQuery || priorityFilter !== null || projectFilters.size > 0
              ? "No hay tareas con estos filtros"
              : "No hay tareas pendientes"}
          </div>
        ) : (
          displayTasks.map((task, i) => (
            <PriorityCard
              key={task.id}
              task={task}
              rank={i + 1}
              onPreview={openPreview}
              onEdit={openTaskModal}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))
        )}

        {sortedTasks.length > 10 && (
          <button
            onClick={() => setViewAll((prev) => !prev)}
            className="w-full py-3 text-sm text-primary font-semibold hover:underline"
          >
            {viewAll
              ? "Mostrar Top 10"
              : `Ver todas (${sortedTasks.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
