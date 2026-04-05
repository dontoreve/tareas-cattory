"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import { getPriorityConfig, PRIORITY_BG } from "@/lib/utils/priority";
import { formatDate } from "@/lib/utils/dates";
import { TAG_COLORS, getColorIndex } from "@/lib/utils/colors";
import { matchesSearch } from "@/lib/utils/search";

export default function BacklogPage() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const { tasks, projects, teamMembers, reopenTask, deleteTask, openPreview, globalSearch } =
    useDashboard();
  const { showToast } = useToast();

  const [projectFilter, setProjectFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const searchQuery = globalSearch || localSearch;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter + sort completed tasks (must be above guards to respect rules of hooks)
  const backlogTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.status === "done");

    if (projectFilter) {
      filtered = filtered.filter((t) =>
        projectFilter === "__none__"
          ? !t.project_id
          : t.project_id === projectFilter
      );
    }

    if (priorityFilter !== null) {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
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

    // Sort: by project name A-Z, then by completion date newest first
    filtered.sort((a, b) => {
      const pa = a.projects?.name ?? "";
      const pb = b.projects?.name ?? "";
      if (pa !== pb) return pa.localeCompare(pb);
      return (b.completed_at ?? "").localeCompare(a.completed_at ?? "");
    });

    return filtered.slice(0, 50);
  }, [tasks, projectFilter, priorityFilter, responsibleFilter, searchQuery]);

  // Admin-only guard — redirect non-admins (in useEffect to respect rules of hooks)
  useEffect(() => {
    if (!authLoading && role !== "admin") {
      router.replace("/");
    }
  }, [authLoading, role, router]);

  if (authLoading || role !== "admin") return null;

  async function handleReopen(taskId: string) {
    try {
      await reopenTask(taskId);
      showToast("Tarea reabierta", "success");
    } catch {
      showToast("Error al reabrir la tarea");
    }
  }

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
        {/* Local search (visible when Header search is empty) */}
        {!globalSearch && (
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-52"
            />
          </div>
        )}

        {/* Project */}
        <div className="w-48">
          <CustomSelect
            value={projectFilter}
            onChange={setProjectFilter}
            options={[
              { value: "", label: "Todos los proyectos" },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
              { value: "__none__", label: "Sin proyecto" },
            ]}
            placeholder="Todos los proyectos"
          />
        </div>

        {/* Priority */}
        <div className="w-44">
          <CustomSelect
            value={String(priorityFilter ?? "")}
            onChange={(v) => setPriorityFilter(v ? Number(v) : null)}
            options={[
              { value: "", label: "Todas las prioridades" },
              ...([3, 2, 1] as const).map((p) => ({
                value: String(p),
                label: getPriorityConfig(p).label,
                dotClass: getPriorityConfig(p).dot,
              })),
            ]}
            placeholder="Todas las prioridades"
          />
        </div>

        {/* Responsible */}
        <div className="w-40">
          <CustomSelect
            value={responsibleFilter}
            onChange={setResponsibleFilter}
            options={[
              { value: "", label: "Todos" },
              ...teamMembers.map((m) => ({
                value: m.id,
                label: m.full_name ?? "Sin nombre",
              })),
            ]}
            placeholder="Todos"
          />
        </div>

        <span className="text-xs text-slate-400 ml-auto">
          {backlogTasks.length} tarea{backlogTasks.length !== 1 ? "s" : ""}
          {backlogTasks.length === 50 ? " (máx 50)" : ""}
        </span>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 text-left">Tarea</th>
              <th className="py-3 px-4 text-left">Proyecto</th>
              <th className="py-3 px-4 text-left">Prioridad</th>
              <th className="py-3 px-4 text-left">Completada</th>
              <th className="py-3 px-4 text-left">Responsable</th>
              <th className="py-3 px-4 text-center w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {backlogTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    inventory_2
                  </span>
                  No hay tareas completadas
                </td>
              </tr>
            ) : (
              backlogTasks.map((task) => {
                const pc = getPriorityConfig(task.priority);
                const pb = PRIORITY_BG[task.priority] ?? "";
                const color = task.project_id
                  ? TAG_COLORS[getColorIndex(task.project_id)]
                  : null;

                return (
                  <tr
                    key={task.id}
                    className="group border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openPreview(task)}
                        className="text-sm font-medium text-slate-500 line-through hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-left"
                      >
                        {task.title}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {task.projects?.name && color && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}
                        >
                          {task.projects.name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${pb}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                        {pc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-500">
                        {task.completed_at
                          ? formatDate(task.completed_at.slice(0, 10))
                          : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                            src={task.profiles?.avatar_url || "/logo.png"}
                            className="w-6 h-6 rounded-full object-cover"
                            alt=""
                          />
                        <span className="text-xs text-slate-500 truncate max-w-[100px]">
                          {task.profiles?.full_name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleReopen(task.id)}
                          title="Reabrir"
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            undo
                          </span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(task.id)}
                          title="Eliminar"
                          className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {backlogTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              inventory_2
            </span>
            No hay tareas completadas
          </div>
        ) : (
          backlogTasks.map((task) => {
            const pc = getPriorityConfig(task.priority);
            const pb = PRIORITY_BG[task.priority] ?? "";

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => openPreview(task)}
                    className="text-sm font-medium text-slate-500 line-through text-left flex-1"
                  >
                    {task.title}
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleReopen(task.id)}
                      className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">undo</span>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(task.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pb}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                    {pc.label}
                  </span>
                  {task.projects?.name && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
                      {task.projects.name}
                    </span>
                  )}
                  {task.completed_at && (
                    <span className="text-[10px] text-slate-400">
                      {formatDate(task.completed_at.slice(0, 10))}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Eliminar tarea</h3>
            <p className="text-sm text-slate-500 mb-6">
              Esta accion es permanente y no se puede deshacer.
            </p>
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
