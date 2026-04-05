"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useCelebration } from "@/components/ui/CelebrationAnimation";
import { getPriorityConfig, PRIORITY_BG, getUrgencyScore } from "@/lib/utils/priority";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import { TAG_COLORS, getColorIndex } from "@/lib/utils/colors";
import { matchesSearch } from "@/lib/utils/search";
import SwipeableRow from "@/components/ui/SwipeableRow";
import type { Task } from "@/lib/types";

type Status = "to-do" | "in-progress" | "done";

const COLUMNS: { id: Status; label: string; dotClass: string; color: string }[] = [
  { id: "to-do", label: "To Do", dotClass: "bg-slate-400", color: "slate" },
  { id: "in-progress", label: "En Progreso", dotClass: "bg-primary", color: "primary" },
  { id: "done", label: "Completadas", dotClass: "bg-emerald-500", color: "emerald" },
];

const COUNT_CLASSES: Record<Status, string> = {
  "to-do": "bg-slate-200 dark:bg-slate-800 text-slate-500",
  "in-progress": "bg-primary/20 text-primary",
  done: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
};

// ── Desktop Drag & Drop Card ─────────────────────────────────────
function KanbanCard({
  task,
  index,
  onPreview,
  onStatusChange,
}: {
  task: Task;
  index: number;
  onPreview: (t: Task) => void;
  onStatusChange: (t: Task, newStatus: Status) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const isDone = task.status === "done";
  const overdue = !isDone && isOverdue(task.deadline);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer ${
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/30 rotate-1 scale-[1.02] opacity-90"
              : "transition-transform duration-200 ease-out"
          }`}
          onClick={() => onPreview(task)}
        >
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${pb}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
            {pc.label}
          </span>

          <p className={`text-sm font-semibold leading-tight mb-2 ${isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
            {task.title.length > 60 ? task.title.slice(0, 60) + "..." : task.title}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {task.projects?.name && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[getColorIndex(task.project_id ?? "")].bg} ${TAG_COLORS[getColorIndex(task.project_id ?? "")].text}`}>
                {task.projects.name}
              </span>
            )}
            {task.links && task.links.length > 0 && (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">link</span>
                {task.links.length}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center -space-x-2">
              <img src={task.profiles?.avatar_url || "/logo.png"} className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-900" alt="" />
              {task.secondary_profile?.full_name && (
                <img src={task.secondary_profile.avatar_url || "/logo.png"} className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-900" alt="" />
              )}
            </div>
            {task.deadline && (
              <span className={`text-[11px] font-medium ${overdue ? "text-red-500" : "text-slate-400"}`}>
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ── Mobile Swipeable Card ────────────────────────────────────────
function MobileKanbanCard({
  task,
  onPreview,
  onStatusChange,
}: {
  task: Task;
  onPreview: (t: Task) => void;
  onStatusChange: (t: Task, newStatus: Status) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const isDone = task.status === "done";
  const overdue = !isDone && isOverdue(task.deadline);
  const color = task.project_id ? TAG_COLORS[getColorIndex(task.project_id)] : null;

  // Build swipe actions based on current status
  const swipeActions: { icon: string; label: string; color: string; textColor: string; onClick: () => void }[] = [];

  if (task.status === "to-do") {
    swipeActions.push({
      icon: "arrow_forward",
      label: "Progreso",
      color: "bg-blue-100",
      textColor: "text-blue-600",
      onClick: () => onStatusChange(task, "in-progress"),
    });
  } else if (task.status === "in-progress") {
    swipeActions.push({
      icon: "arrow_back",
      label: "To Do",
      color: "bg-slate-100",
      textColor: "text-slate-600",
      onClick: () => onStatusChange(task, "to-do"),
    });
    swipeActions.push({
      icon: "check_circle",
      label: "Listo",
      color: "bg-emerald-100",
      textColor: "text-emerald-600",
      onClick: () => onStatusChange(task, "done"),
    });
  } else {
    swipeActions.push({
      icon: "arrow_back",
      label: "Progreso",
      color: "bg-blue-100",
      textColor: "text-blue-600",
      onClick: () => onStatusChange(task, "in-progress"),
    });
  }

  return (
    <SwipeableRow
      actions={swipeActions}
      onTap={() => onPreview(task)}
      className="border-b border-slate-100"
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Avatar */}
        <div className="shrink-0 relative" style={{ width: 36 }}>
          <img
            src={task.profiles?.avatar_url || "/logo.png"}
            className="size-9 rounded-full object-cover ring-2 ring-white shadow-sm"
            alt=""
          />
          {task.secondary_profile?.full_name && (
            <img
              src={task.secondary_profile.avatar_url || "/logo.png"}
              className="size-5 rounded-full object-cover ring-2 ring-white shadow-sm absolute -bottom-0.5 -right-1"
              alt=""
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className={`text-sm font-semibold leading-tight line-clamp-2 ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5">
            {task.projects?.name && color && (
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold leading-none max-w-[100px] truncate ${color.bg} ${color.text}`}>
                {task.projects.name}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold leading-none ${pb}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              {pc.label}
            </span>
          </div>
          {task.deadline && (
            <span className={`text-[11px] font-medium ${overdue ? "text-red-500" : "text-slate-400"}`}>
              {formatDate(task.deadline)}
            </span>
          )}
        </div>

        {/* Swipe hint */}
        <span className="material-symbols-outlined text-slate-300 text-[16px] shrink-0">chevron_left</span>
      </div>
    </SwipeableRow>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function KanbanPage() {
  const { user, profile, role } = useAuth();
  const {
    tasks,
    tasksLoading,
    teamMembers,
    updateTask,
    openPreview,
    openTaskModal,
  } = useDashboard();
  const { showToast } = useToast();
  const celebrate = useCelebration();

  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Status>("to-do");

  const effectiveUserId = viewingMemberId ?? user?.id ?? "";

  const kanbanTasks = useMemo(() => {
    let filtered = tasks.filter(
      (t) =>
        t.responsible_id === effectiveUserId ||
        t.secondary_responsible_id === effectiveUserId
    );
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        matchesSearch(searchQuery, t.title, t.description, t.projects?.name)
      );
    }
    return filtered.sort((a, b) => {
      const scoreA = getUrgencyScore(a.priority, a.deadline);
      const scoreB = getUrgencyScore(b.priority, b.deadline);
      return scoreB - scoreA;
    });
  }, [tasks, effectiveUserId, searchQuery]);

  const columns = useMemo(() => {
    const grouped: Record<Status, Task[]> = { "to-do": [], "in-progress": [], done: [] };
    for (const t of kanbanTasks) {
      if (grouped[t.status]) grouped[t.status].push(t);
    }
    return grouped;
  }, [kanbanTasks]);

  const totalTasks = kanbanTasks.length;
  const doneTasks = columns.done.length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Desktop drag handler
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newStatus = result.destination.droppableId as Status;
      const taskId = result.draggableId;
      const task = kanbanTasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      const updates: Partial<Task> = {
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      };
      updateTask(taskId, updates).then(() => {
        if (newStatus === "done") celebrate(null, profile?.full_name?.split(" ")[0]);
      }).catch(() => showToast("Error al mover la tarea"));
    },
    [kanbanTasks, updateTask, celebrate, profile, showToast]
  );

  // Status change (mobile + desktop fallback)
  async function handleStatusChange(task: Task, newStatus: Status) {
    const updates: Partial<Task> = {
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    };
    try {
      await updateTask(task.id, updates);
      if (newStatus === "done") celebrate(null, profile?.full_name?.split(" ")[0]);
    } catch {
      showToast("Error al mover la tarea");
    }
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Admin member filter — desktop: dropdown, mobile: avatar chips */}
      {role === "admin" && teamMembers.length > 0 && (
        <>
          {/* Desktop dropdown */}
          <div className="hidden md:flex items-center gap-3">
            <select
              value={viewingMemberId ?? ""}
              onChange={(e) => setViewingMemberId(e.target.value || null)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">Mis Tareas</option>
              {teamMembers
                .filter((m) => m.id !== user?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name ?? "Sin nombre"}</option>
                ))}
            </select>
          </div>
          {/* Mobile avatar chips */}
          <div className="flex md:hidden items-center gap-2 flex-wrap">
            {teamMembers.map((m) => {
              const isActive = effectiveUserId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setViewingMemberId(m.id === user?.id ? null : m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-slate-100 text-slate-500 active:bg-slate-200"
                  }`}
                >
                  <img src={m.avatar_url || "/logo.png"} className="size-5 rounded-full object-cover" alt="" />
                  {m.full_name?.split(" ")[0] ?? "?"}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Progress bar */}
      <div className="p-4 md:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">Progreso General</h3>
            <p className="text-xs md:text-sm text-slate-500">{doneTasks} de {totalTasks} completadas</p>
          </div>
          <span className="text-xl md:text-2xl font-black text-primary">{pct}%</span>
        </div>
        <div className="w-full h-2 md:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary progress-glow rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ═══ MOBILE KANBAN ═══════════════════════════════════════ */}
      <div className="md:hidden space-y-3">
        {/* Status filter chips */}
        <div className="flex items-center gap-2">
          {COLUMNS.map((col) => {
            const isActive = activeTab === col.id;
            const count = columns[col.id].length;
            return (
              <button
                key={col.id}
                onClick={() => setActiveTab(col.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? `${COUNT_CLASSES[col.id]} ring-1 ring-current/20 shadow-sm`
                    : "bg-slate-100 text-slate-400 active:bg-slate-200"
                }`}
              >
                <span className={`size-2 rounded-full ${col.dotClass} ${isActive ? "" : "opacity-40"}`} />
                {col.label}
                <span className={`text-[10px] font-bold ${isActive ? "" : "text-slate-300"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Card list */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {columns[activeTab].length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">
                {activeTab === "done" ? "task_alt" : "inbox"}
              </span>
              <p className="text-sm">
                {activeTab === "to-do" && "No hay tareas por hacer"}
                {activeTab === "in-progress" && "Nada en progreso"}
                {activeTab === "done" && "Sin tareas completadas"}
              </p>
            </div>
          ) : (
            columns[activeTab].map((task) => (
              <MobileKanbanCard
                key={task.id}
                task={task}
                onPreview={openPreview}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>

        <p className="text-center text-[11px] text-slate-300">
          Desliza las tarjetas para cambiar estado
        </p>
      </div>

      {/* ═══ DESKTOP KANBAN (DnD) ═══════════════════════════════ */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="hidden md:flex gap-6 pb-8">
          {COLUMNS.map((col) => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`kanban-column flex flex-col bg-slate-50 dark:bg-slate-800/40 border rounded-xl p-4 flex-1 min-w-0 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
                      : "border-slate-200/50 dark:border-slate-700/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300">{col.label}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${COUNT_CLASSES[col.id]}`}>
                        {columns[col.id].length}
                      </span>
                    </div>
                    {col.id === "to-do" && (
                      <button onClick={() => openTaskModal()} className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">add_circle</span>
                      </button>
                    )}
                  </div>
                  <div className="kanban-cards flex flex-col gap-4 pb-2 min-h-[60px]">
                    {columns[col.id].map((task, i) => (
                      <KanbanCard key={task.id} task={task} index={i} onPreview={openPreview} onStatusChange={handleStatusChange} />
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
