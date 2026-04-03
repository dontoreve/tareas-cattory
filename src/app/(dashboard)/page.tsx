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

// Grid columns definition for the priority list
const GRID_COLS = "grid-cols-[40px_1fr_100px_100px_130px_120px_70px]";

// ── Priority Row (Desktop) ─────────────────────────────────────
function PriorityRow({
  task,
  rank,
  onPreview,
  onEdit,
  onComplete,
}: {
  task: Task;
  rank: number;
  onPreview: (t: Task) => void;
  onEdit: (t: Task) => void;
  onComplete: (t: Task, el?: HTMLElement) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const overdue = isOverdue(task.deadline);
  const color = task.project_id
    ? TAG_COLORS[getColorIndex(task.project_id)]
    : null;

  return (
    <div
      className={`group grid ${GRID_COLS} items-center py-3 px-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50`}
      style={{ animation: "rowSlideIn 0.3s ease-out" }}
      onClick={() => onPreview(task)}
    >
      {/* Rank */}
      <span
        className={`font-black text-center ${
          rank === 1
            ? "text-lg text-primary"
            : rank <= 3
              ? "text-base text-slate-700"
              : "text-sm text-slate-400"
        }`}
      >
        {rank}
      </span>
      {/* Title */}
      <p className="text-sm font-semibold text-slate-800 truncate pr-2">
        {task.title}
      </p>
      {/* Project */}
      <div className="truncate">
        {task.projects?.name && color ? (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
            {task.projects.name}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>
      {/* Priority */}
      <div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${pb}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          {pc.label}
        </span>
      </div>
      {/* Deadline */}
      <div>
        {task.deadline ? (
          <span
            className={`text-xs font-medium ${
              overdue ? "text-red-500" : "text-slate-500"
            }`}
          >
            {overdue && "⚠ "}
            {formatDate(task.deadline)}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>
      {/* Assignee */}
      <div className="flex items-center gap-1.5 min-w-0">
        {task.profiles?.avatar_url ? (
          <img src={task.profiles.avatar_url} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
            {task.profiles?.full_name?.charAt(0) ?? "?"}
          </div>
        )}
        <span className="text-xs text-slate-600 truncate">
          {task.profiles?.full_name ?? "—"}
        </span>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          title="Editar"
        >
          <span className="material-symbols-outlined text-slate-400 text-[18px]">edit</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(task, e.currentTarget); }}
          className="p-1 hover:bg-emerald-50 rounded-lg transition-colors"
          title="Completar"
        >
          <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
        </button>
      </div>
    </div>
  );
}

// ── Priority Card (Mobile) ─────────────────────────────────────
function PriorityCard({
  task,
  rank,
  onPreview,
  onComplete,
}: {
  task: Task;
  rank: number;
  onPreview: (t: Task) => void;
  onComplete: (t: Task, el?: HTMLElement) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const overdue = isOverdue(task.deadline);

  return (
    <div
      className="task-card bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => onPreview(task)}
    >
      <div className="flex items-start gap-3">
        <span
          className={`font-black mt-0.5 shrink-0 ${
            rank === 1
              ? "text-lg text-primary"
              : rank <= 3
                ? "text-base text-slate-700 dark:text-slate-300"
                : "text-sm text-slate-400"
          }`}
        >
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {task.title}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pb}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              {pc.label}
            </span>
            {task.projects?.name && (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {task.projects.name}
              </span>
            )}
            {task.deadline && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  overdue
                    ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                    : "text-slate-500 bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task, e.currentTarget);
          }}
          className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg shrink-0"
        >
          <span className="material-symbols-outlined text-emerald-500 text-[20px]">
            check_circle
          </span>
        </button>
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
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className={`grid ${GRID_COLS} items-center py-3 px-3 border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider`}>
          <span className="text-center">#</span>
          <span>Tarea</span>
          <span>Proyecto</span>
          <span>Prioridad</span>
          <span>Fecha Limite</span>
          <span>Responsable</span>
          <span className="text-center">Acciones</span>
        </div>

        {/* Rows */}
        {displayTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              task_alt
            </span>
            {searchQuery || priorityFilter || projectFilters.size > 0
              ? "No hay tareas con estos filtros"
              : "No hay tareas pendientes"}
          </div>
        ) : (
          displayTasks.map((task, i) => (
            <PriorityRow
              key={task.id}
              task={task}
              rank={i + 1}
              onPreview={openPreview}
              onEdit={openTaskModal}
              onComplete={handleComplete}
            />
          ))
        )}

        {/* View all toggle */}
        {sortedTasks.length > 10 && (
          <div className="border-t border-slate-100 px-4 py-3 text-center">
            <button
              onClick={() => setViewAll((prev) => !prev)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              {viewAll
                ? "Mostrar Top 10"
                : `Ver todas (${sortedTasks.length})`}
            </button>
          </div>
        )}
      </div>

      {/* ── Priority Cards (Mobile) ─────────────────────────── */}
      <div className="md:hidden space-y-3">
        {displayTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              task_alt
            </span>
            {searchQuery || priorityFilter || projectFilters.size > 0
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
              onComplete={handleComplete}
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
