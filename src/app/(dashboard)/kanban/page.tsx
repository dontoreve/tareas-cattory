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
import { getPriorityConfig, PRIORITY_BG } from "@/lib/utils/priority";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import { TAG_COLORS, getColorIndex } from "@/lib/utils/colors";
import { matchesSearch } from "@/lib/utils/search";
import type { Task } from "@/lib/types";

type Status = "to-do" | "in-progress" | "done";

const COLUMNS: { id: Status; label: string; dotClass: string }[] = [
  { id: "to-do", label: "To Do", dotClass: "bg-slate-400" },
  { id: "in-progress", label: "En Progreso", dotClass: "bg-primary" },
  { id: "done", label: "Completadas", dotClass: "bg-emerald-500" },
];

const COUNT_CLASSES: Record<Status, string> = {
  "to-do": "bg-slate-200 dark:bg-slate-800 text-slate-500",
  "in-progress": "bg-primary/20 text-primary",
  done: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
};

// ── Task Card ──────────────────────────────────────────────────
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

  const prevStatus: Status | null =
    task.status === "in-progress"
      ? "to-do"
      : task.status === "done"
        ? "in-progress"
        : null;

  const nextStatus: Status | null =
    task.status === "to-do"
      ? "in-progress"
      : task.status === "in-progress"
        ? "done"
        : null;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""
          }`}
          onClick={() => onPreview(task)}
        >
          {/* Priority badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${pb}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
            {pc.label}
          </span>

          {/* Title */}
          <p
            className={`text-sm font-semibold leading-tight mb-2 ${
              isDone
                ? "line-through text-slate-400"
                : "text-slate-800 dark:text-slate-200"
            }`}
          >
            {task.title.length > 60
              ? task.title.slice(0, 60) + "..."
              : task.title}
          </p>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {task.projects?.name && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  TAG_COLORS[getColorIndex(task.project_id ?? "")].bg
                } ${TAG_COLORS[getColorIndex(task.project_id ?? "")].text}`}
              >
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

          {/* Footer: avatars + deadline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center -space-x-2">
              {task.profiles?.avatar_url ? (
                <img
                  src={task.profiles.avatar_url}
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                  alt=""
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {task.profiles?.full_name?.charAt(0) ?? "?"}
                </div>
              )}
              {task.secondary_profile?.full_name && (
                task.secondary_profile.avatar_url ? (
                  <img
                    src={task.secondary_profile.avatar_url}
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                    alt=""
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {task.secondary_profile.full_name.charAt(0)}
                  </div>
                )
              )}
            </div>
            {task.deadline && (
              <span
                className={`text-[11px] font-medium ${
                  overdue ? "text-red-500" : "text-slate-400"
                }`}
              >
                {formatDate(task.deadline)}
              </span>
            )}
          </div>

          {/* Mobile status buttons */}
          <div className="md:hidden flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {prevStatus ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task, prevStatus);
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                {COLUMNS.find((c) => c.id === prevStatus)?.label}
              </button>
            ) : (
              <span />
            )}
            {nextStatus ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task, nextStatus);
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                {COLUMNS.find((c) => c.id === nextStatus)?.label}
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ── Main Page ──────────────────────────────────────────────────
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

  const effectiveUserId = viewingMemberId ?? user?.id ?? "";

  // Filter tasks for this kanban view
  const kanbanTasks = useMemo(() => {
    let filtered = tasks.filter(
      (t) =>
        t.responsible_id === effectiveUserId ||
        t.secondary_responsible_id === effectiveUserId ||
        t.created_by === effectiveUserId
    );

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        matchesSearch(searchQuery, t.title, t.description, t.projects?.name)
      );
    }

    // Sort by deadline ascending, nulls last
    return filtered.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [tasks, effectiveUserId, searchQuery]);

  // Group by status
  const columns = useMemo(() => {
    const grouped: Record<Status, Task[]> = {
      "to-do": [],
      "in-progress": [],
      done: [],
    };
    for (const t of kanbanTasks) {
      if (grouped[t.status]) grouped[t.status].push(t);
    }
    return grouped;
  }, [kanbanTasks]);

  // Progress
  const totalTasks = kanbanTasks.length;
  const doneTasks = columns.done.length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Drag and drop handler
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;
      const newStatus = result.destination.droppableId as Status;
      const taskId = result.draggableId;
      const task = kanbanTasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      const updates: Partial<Task> = {
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      };

      try {
        await updateTask(taskId, updates);
        if (newStatus === "done") {
          celebrate(null, profile?.full_name?.split(" ")[0]);
        }
      } catch {
        showToast("Error al mover la tarea");
      }
    },
    [kanbanTasks, updateTask, celebrate, profile, showToast]
  );

  // Mobile status change
  async function handleStatusChange(task: Task, newStatus: Status) {
    const updates: Partial<Task> = {
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    };
    try {
      await updateTask(task.id, updates);
      if (newStatus === "done") {
        celebrate(null, profile?.full_name?.split(" ")[0]);
      }
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
    <div className="space-y-6">
      {/* Admin member filter + mobile search */}
      {role === "admin" && (
        <div className="flex items-center gap-3">
          <select
            value={viewingMemberId ?? ""}
            onChange={(e) => setViewingMemberId(e.target.value || null)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">Mis Tareas</option>
            {teamMembers
              .filter((m) => m.id !== user?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? "Sin nombre"}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Progress bar */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              Progreso General
            </h3>
            <p className="text-sm text-slate-500">
              {doneTasks} de {totalTasks} tareas completadas
            </p>
          </div>
          <span className="text-2xl font-black text-primary">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary progress-glow rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-6 pb-8">
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
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300">
                        {col.label}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${COUNT_CLASSES[col.id]}`}>
                        {columns[col.id].length}
                      </span>
                    </div>
                    {col.id === "to-do" && (
                      <button
                        onClick={() => openTaskModal()}
                        className="text-slate-400 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined">add_circle</span>
                      </button>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="kanban-cards flex flex-col gap-4 pb-2 min-h-[60px]">
                    {columns[col.id].map((task, i) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        index={i}
                        onPreview={openPreview}
                        onStatusChange={handleStatusChange}
                      />
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
