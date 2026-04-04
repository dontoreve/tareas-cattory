"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import { TAG_COLORS } from "@/lib/utils/colors";
import type { Task, TaskLink, Profile, Project } from "@/lib/types";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "to-do", label: "Por Hacer", dotClass: "bg-slate-400" },
  { value: "in-progress", label: "En Progreso", dotClass: "bg-primary" },
  { value: "done", label: "Completada", dotClass: "bg-emerald-500" },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "5", label: "P5 Critical", dotClass: "bg-red-500" },
  { value: "4", label: "P4 High", dotClass: "bg-orange-500" },
  { value: "3", label: "P3 Medium", dotClass: "bg-amber-500" },
  { value: "2", label: "P2 Low", dotClass: "bg-green-500" },
  { value: "1", label: "P1 Routine", dotClass: "bg-slate-500" },
];

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  /** If provided, the modal is in edit mode */
  task?: Task | null;
  /** Team members for the responsible dropdown */
  teamMembers: Profile[];
  /** Projects for the project dropdown */
  projects: Project[];
  /** Current user ID — default responsible */
  currentUserId: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  responsible_id: string;
  secondary_responsible_id: string | null;
  project_id: string | null;
  status: "to-do" | "in-progress" | "done";
  priority: number;
  deadline: string | null;
  links: TaskLink[];
}

export default function TaskModal({
  open,
  onClose,
  onSave,
  onDelete,
  task,
  teamMembers,
  projects,
  currentUserId,
}: TaskModalProps) {
  const isEdit = !!task;
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsibleId, setResponsibleId] = useState(currentUserId);
  const [secondaryId, setSecondaryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("to-do");
  const [priority, setPriority] = useState("3");
  const [deadline, setDeadline] = useState("");
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setResponsibleId(task.responsible_id);
      setSecondaryId(task.secondary_responsible_id ?? "");
      setProjectId(task.project_id ?? "");
      setStatus(task.status);
      setPriority(String(task.priority));
      setDeadline(task.deadline ?? "");
      setLinks(task.links ?? []);
    } else {
      // Reset for creation
      setTitle("");
      setDescription("");
      setResponsibleId(currentUserId);
      setSecondaryId("");
      setProjectId("");
      setStatus("to-do");
      setPriority("3");
      setDeadline("");
      setLinks([]);
    }
    setLinkLabel("");
    setLinkUrl("");
  }, [task, currentUserId, open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "";
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Detect URLs in description
  const urlRegex = /https?:\/\/[^\s]+/g;
  const detectedUrls = description.match(urlRegex) ?? [];
  const hasUnmigratedUrls = detectedUrls.some(
    (url) => !links.some((l) => l.url === url)
  );

  function migrateUrls() {
    const newLinks = detectedUrls
      .filter((url) => !links.some((l) => l.url === url))
      .map((url) => ({ label: url, url }));
    if (newLinks.length === 0) return;
    setLinks((prev) => [...prev, ...newLinks]);
    // Remove URLs from description
    let cleaned = description;
    for (const url of detectedUrls) {
      cleaned = cleaned.replace(url, "").trim();
    }
    setDescription(cleaned);
  }

  const addLink = useCallback(() => {
    if (!linkUrl.trim()) return;
    setLinks((prev) => [...prev, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkLabel("");
    setLinkUrl("");
  }, [linkLabel, linkUrl]);

  const removeLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        responsible_id: responsibleId,
        secondary_responsible_id: secondaryId || null,
        project_id: projectId || null,
        status: status as TaskFormData["status"],
        priority: Number(priority),
        deadline: deadline || null,
        links,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // Build dropdown options
  const memberOptions: SelectOption[] = teamMembers.map((m) => ({
    value: m.id,
    label: m.full_name ?? "Sin nombre",
  }));

  const secondaryOptions: SelectOption[] = [
    { value: "", label: "Ninguna" },
    ...memberOptions,
  ];

  const projectOptions: SelectOption[] = [
    { value: "", label: "Sin proyecto" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  // Helpers for display
  const selectedPriority = PRIORITY_OPTIONS.find((o) => o.value === priority);
  const selectedStatus = STATUS_OPTIONS.find((o) => o.value === status);
  const selectedProject = projectOptions.find((o) => o.value === projectId);

  if (!open) return null;

  // ── Shared pieces ──────────────────────────────────────────────

  const titleInput = (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="Nombre de la tarea"
      required
      className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
    />
  );

  const descriptionInput = (
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder="Notas..."
      rows={2}
      className="w-full bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none custom-scroll max-h-[120px] overflow-y-auto"
    />
  );

  const urlBanner = hasUnmigratedUrls && (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="material-symbols-outlined text-primary text-[18px]">link</span>
      <span className="text-xs text-primary flex-1">URL detectada en la descripción</span>
      <button type="button" onClick={migrateUrls} className="text-xs font-bold text-primary hover:underline">
        Mover a Links
      </button>
    </div>
  );

  const teamPicker = (
    <div>
      <div className="flex items-center gap-2.5 flex-wrap">
        {teamMembers.map((m, idx) => {
          const name = m.full_name ?? "Usuario";
          const parts = name.split(" ");
          const initials = parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
          const color = TAG_COLORS[(idx + 3) % TAG_COLORS.length];
          const isPrimary = m.id === responsibleId;
          const isSecondary = m.id === secondaryId;
          const isSelected = isPrimary || isSecondary;

          const ringClass = isPrimary
            ? "ring-[3px] ring-primary ring-offset-2 dark:ring-offset-slate-900"
            : isSecondary
            ? "ring-[3px] ring-slate-400 dark:ring-slate-500 ring-offset-2 dark:ring-offset-slate-900"
            : "hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600 hover:ring-offset-1";

          return (
            <button
              key={m.id}
              type="button"
              title={name + (isPrimary ? " (Principal)" : isSecondary ? " (Apoyo)" : "")}
              className={`size-9 rounded-full flex items-center justify-center text-[12px] font-bold cursor-pointer transition-all duration-200 active:scale-90 shadow-sm ${color.bg} ${color.text} ${ringClass} ${!isSelected ? "opacity-50 hover:opacity-100" : ""}`}
              onClick={() => {
                if (m.id === responsibleId) {
                  setResponsibleId(secondaryId || "");
                  setSecondaryId("");
                } else if (m.id === secondaryId) {
                  setSecondaryId("");
                } else if (!responsibleId) {
                  setResponsibleId(m.id);
                } else if (!secondaryId) {
                  setSecondaryId(m.id);
                } else {
                  setSecondaryId(m.id);
                }
              }}
            >
              {m.avatar_url ? (
                <img src={m.avatar_url} className="size-9 rounded-full object-cover" alt="" />
              ) : initials}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-primary" /> Principal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-slate-400" /> Apoyo
        </span>
      </div>
    </div>
  );

  const linksSection = (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          placeholder="Nombre"
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <button
            type="button"
            onClick={addLink}
            className="shrink-0 size-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-xl transition-colors"
            title="Agregar link"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>
      {links.length > 0 && (
        <div className="mt-2 space-y-1">
          {links.map((link, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
            >
              <span className="material-symbols-outlined text-slate-400 text-[16px]">link</span>
              <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{link.label}</span>
              <button type="button" onClick={() => removeLink(i)} className="text-slate-400 hover:text-red-500">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* ─── MOBILE LAYOUT (< sm) ─────────────────────────────── */}
      <div className="relative w-full sm:hidden bg-white dark:bg-slate-900 rounded-t-[20px] shadow-2xl flex flex-col" style={{ maxHeight: "calc(100dvh - 2.5rem)" }}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-9 h-1 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <button type="button" onClick={onClose} className="text-[15px] text-primary font-medium min-w-[70px] text-left">
              Cancelar
            </button>
            <h2 className="text-[15px] font-bold">
              {isEdit ? "Editar Tarea" : "Nueva Tarea"}
            </h2>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="text-[15px] text-primary font-bold min-w-[70px] text-right disabled:opacity-40"
            >
              {saving ? "..." : isEdit ? "Guardar" : "Crear"}
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            {/* Title + Description section */}
            <div className="px-4 pb-4 space-y-2">
              {titleInput}
              {descriptionInput}
              {urlBanner}
            </div>

            {/* Team section */}
            <div className="px-4 py-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">group</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipo</span>
              </div>
              {teamPicker}
            </div>

            {/* Fields as iOS-style rows */}
            <div className="border-t border-slate-100">
              {/* Project row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">folder</span>
                <span className="text-sm text-slate-500 w-20 shrink-0">Proyecto</span>
                <div className="flex-1">
                  <CustomSelect value={projectId} onChange={setProjectId} options={projectOptions} placeholder="Sin proyecto" />
                </div>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">radio_button_checked</span>
                <span className="text-sm text-slate-500 w-20 shrink-0">Estado</span>
                <div className="flex-1">
                  <CustomSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
                </div>
              </div>

              {/* Priority row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">flag</span>
                <span className="text-sm text-slate-500 w-20 shrink-0">Prioridad</span>
                <div className="flex-1">
                  <CustomSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
                </div>
              </div>

              {/* Deadline row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                <span className="text-sm text-slate-500 w-20 shrink-0">Fecha</span>
                <div className="flex-1">
                  <DatePicker value={deadline} onChange={setDeadline} />
                </div>
              </div>
            </div>

            {/* Links section */}
            <div className="px-4 py-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">link</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Links</span>
              </div>
              {linksSection}
            </div>

            {/* Delete button — edit mode only, at the bottom */}
            {isEdit && onDelete && (
              <div className="px-4 pt-2 pb-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-3 text-sm text-red-500 font-semibold bg-red-50 rounded-xl active:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Eliminando..." : "Eliminar tarea"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ─── DESKTOP LAYOUT (sm+) ─────────────────────────────── */}
      <div className="relative hidden sm:flex w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/40 max-h-[85vh] flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold">
              {isEdit ? "Editar Tarea" : "Nueva Tarea"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4 custom-scroll">
            {titleInput}
            {descriptionInput}
            {urlBanner}

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Team — full width */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Equipo
                </label>
                {teamPicker}
              </div>

              {/* Project */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Proyecto
                </label>
                <CustomSelect value={projectId} onChange={setProjectId} options={projectOptions} placeholder="Sin proyecto" />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Estado
                </label>
                <CustomSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Prioridad
                </label>
                <CustomSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Fecha limite
                </label>
                <DatePicker value={deadline} onChange={setDeadline} />
              </div>
            </div>

            {/* Links */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Links
              </label>
              {linksSection}
            </div>
          </div>

          {/* Desktop footer */}
          <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar tarea"}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
