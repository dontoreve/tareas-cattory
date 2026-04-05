"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { getPriorityConfig, PRIORITY_BG } from "@/lib/utils/priority";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import { TAG_COLORS, getColorIndex } from "@/lib/utils/colors";
import { matchesSearch } from "@/lib/utils/search";
import type { Task } from "@/lib/types";

type Status = "to-do" | "in-progress" | "done";

const COLUMNS: { id: Status; label: string; dotClass: string; countClass: string }[] = [
  {
    id: "to-do",
    label: "To Do",
    dotClass: "bg-slate-400",
    countClass: "bg-slate-200 dark:bg-slate-800 text-slate-500",
  },
  {
    id: "in-progress",
    label: "En Progreso",
    dotClass: "bg-primary",
    countClass: "bg-primary/20 text-primary",
  },
  {
    id: "done",
    label: "Completadas",
    dotClass: "bg-emerald-500",
    countClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
];

function DelegatedCard({
  task,
  onPreview,
  onEdit,
  onDelete,
}: {
  task: Task;
  onPreview: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const pc = getPriorityConfig(task.priority);
  const pb = PRIORITY_BG[task.priority] ?? "";
  const isDone = task.status === "done";
  const overdue = !isDone && isOverdue(task.deadline);
  const color = task.project_id
    ? TAG_COLORS[getColorIndex(task.project_id)]
    : null;

  return (
    <div
      className="task-card bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => onPreview(task)}
    >
      {/* Priority badge */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${pb}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
        {pc.label}
      </span>

      {/* Title */}
      <p className={`text-sm font-semibold leading-tight mb-2 ${isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
        {task.title}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {color && task.projects?.name && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
            {task.projects.name}
          </span>
        )}
        {task.deadline && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${overdue ? "text-red-500 bg-red-50 dark:bg-red-900/20" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
            {formatDate(task.deadline)}
          </span>
        )}
      </div>

      {/* Assignee row */}
      {task.profiles?.full_name && (
        <div className="flex items-center gap-1.5 mb-3">
          <img src={task.profiles.avatar_url || "/logo.png"} className="w-5 h-5 rounded-full object-cover" alt="" />
          <span className="text-xs text-slate-500">{task.profiles.full_name}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">edit</span>
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default function TareasCreadasPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const { tasks, projects, teamMembers, deleteTask, openPreview, openTaskModal } = useDashboard();
  const { showToast } = useToast();

  const [projectFilter, setProjectFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const userId = user?.id ?? "";

  // Tasks created by this user but assigned to someone else
  const delegatedTasks = useMemo(() => {
    let filtered = tasks.filter(
      (t) =>
        t.created_by === userId &&
        t.responsible_id !== userId &&
        t.secondary_responsible_id !== userId
    );

    if (projectFilter) {
      filtered = filtered.filter((t) =>
        projectFilter === "__none__" ? !t.project_id : t.project_id === projectFilter
      );
    }

    if (responsibleFilter) {
      filtered = filtered.filter(
        (t) =>
          t.responsible_id === responsibleFilter ||
          t.secondary_responsible_id === responsibleFilter
      );
    }

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        matchesSearch(searchQuery, t.title, t.description, t.projects?.name)
      );
    }

    return filtered;
  }, [tasks, userId, projectFilter, responsibleFilter, searchQuery]);

  // Group by status
  const columns = useMemo(() => {
    const grouped: Record<Status, Task[]> = { "to-do": [], "in-progress": [], done: [] };
    for (const t of delegatedTasks) {
      if (grouped[t.status]) grouped[t.status].push(t);
    }
    return grouped;
  }, [delegatedTasks]);

  // Member-only guard — redirect admins who navigate here directly
  useEffect(() => {
    if (!authLoading && role === "admin") {
      router.replace("/");
    }
  }, [authLoading, role, router]);

  if (authLoading || role === "admin") return null;

  async function handleDelete(taskId: string) {
    try {
      await deleteTask(taskId);
      showToast("Tarea eliminada", "success");
    } catch {
      showToast("Error al eliminar la tarea");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-48"
          />
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm cursor-pointer"
        >
          <option value="">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="__none__">Sin proyecto</option>
        </select>

        <select
          value={responsibleFilter}
          onChange={(e) => setResponsibleFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm cursor-pointer"
        >
          <option value="">Todos los responsables</option>
          {teamMembers
            .filter((m) => m.id !== userId)
            .map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? "Sin nombre"}</option>
            ))}
        </select>

        <span className="text-xs text-slate-400 ml-auto">
          {delegatedTasks.length} tarea{delegatedTasks.length !== 1 ? "s" : ""} delegada{delegatedTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {delegatedTasks.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">task_alt</span>
          <p className="font-medium">No has delegado ninguna tarea</p>
          <p className="text-sm mt-1">Las tareas que crees y asignes a otros aparecen aqui</p>
        </div>
      )}

      {/* Mini Kanban */}
      {delegatedTasks.length > 0 && (
        <div className="flex flex-col md:flex-row gap-6 pb-8">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="flex flex-col bg-slate-100/70 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 rounded-xl p-4 flex-1 min-w-0"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-4 px-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">{col.label}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${col.countClass}`}>
                  {columns[col.id].length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 min-h-[60px]">
                {columns[col.id].length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin tareas...</p>
                ) : (
                  columns[col.id].map((task) => (
                    <DelegatedCard
                      key={task.id}
                      task={task}
                      onPreview={openPreview}
                      onEdit={openTaskModal}
                      onDelete={setConfirmDeleteId}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Eliminar tarea</h3>
            <p className="text-sm text-slate-500 mb-6">Esta accion es permanente y no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
