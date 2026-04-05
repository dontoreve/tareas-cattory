"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import type { Project } from "@/lib/types";

interface ProjectsModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  onCreate: (name: string) => Promise<Project>;
  onRename: (id: string, name: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ProjectsModal({
  open,
  onClose,
  projects,
  onCreate,
  onRename,
  onArchive,
  onRestore,
  onDelete,
}: ProjectsModalProps) {
  const { showToast } = useToast();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewName("");
      setEditingId(null);
      setConfirmDeleteId(null);
      setShowArchived(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
      showToast("Proyecto creado", "success");
    } catch {
      showToast("Error al crear proyecto");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      await onRename(id, editName.trim());
      setEditingId(null);
      showToast("Proyecto renombrado", "success");
    } catch {
      showToast("Error al renombrar");
    }
  }

  async function handleArchive(id: string) {
    try {
      await onArchive(id);
      showToast("Proyecto archivado", "success");
    } catch {
      showToast("Error al archivar");
    }
  }

  async function handleRestore(id: string) {
    try {
      await onRestore(id);
      showToast("Proyecto restaurado", "success");
    } catch {
      showToast("Error al restaurar");
    }
  }

  async function handleDelete(id: string) {
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
      showToast("Proyecto eliminado", "success");
    } catch {
      showToast("Error al eliminar");
    }
  }

  if (!open) return null;

  const activeProjects = projects.filter((p) => !p.archived_at);
  const archivedProjects = projects.filter((p) => !!p.archived_at);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold">Gestionar Proyectos</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Create new project */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="Nombre del nuevo proyecto"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? "..." : "Crear"}
            </button>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scroll">
          {activeProjects.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No hay proyectos activos
            </p>
          ) : (
            activeProjects.map((project) => {
              const isEditing = editingId === project.id;

              return (
                <div
                  key={project.id}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3">
                    {isEditing ? (
                      <>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(project.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-primary bg-white dark:bg-slate-800 text-sm font-medium"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(project.id)}
                          className="p-1.5 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Guardar"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Cancelar"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {project.name}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(project.id);
                            setEditName(project.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Renombrar"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleArchive(project.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Archivar"
                        >
                          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Archived section */}
          {archivedProjects.length > 0 && (
            <div className="pt-3">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showArchived ? "expand_less" : "expand_more"}
                </span>
                Archivados ({archivedProjects.length})
              </button>

              {showArchived && (
                <div className="space-y-2 mt-1">
                  {archivedProjects.map((project) => {
                    const isDeleting = confirmDeleteId === project.id;

                    return (
                      <div
                        key={project.id}
                        className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl overflow-hidden opacity-70"
                      >
                        <div className="flex items-center gap-3 p-3">
                          <span className="material-symbols-outlined text-slate-300 text-[18px]">inventory_2</span>
                          <span className="flex-1 text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                            {project.name}
                          </span>
                          <button
                            onClick={() => handleRestore(project.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restaurar"
                          >
                            <span className="material-symbols-outlined text-[18px]">unarchive</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(project.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar permanentemente"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                          </button>
                        </div>

                        {/* Delete confirmation */}
                        {isDeleting && (
                          <div className="px-4 pb-3 pt-2 border-t border-red-100 bg-red-50/50">
                            <p className="text-xs text-red-600 mb-2">
                              Se eliminarán permanentemente el proyecto y todas sus tareas.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-white transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleDelete(project.id)}
                                className="flex-1 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
