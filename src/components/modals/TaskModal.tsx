"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
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
  task?: Task | null;
  teamMembers: Profile[];
  projects: Project[];
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
  const [teamError, setTeamError] = useState(false);

  const linkUrlRef = useRef<HTMLInputElement>(null);
  const teamSectionRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = "hidden";
      return () => { document.documentElement.style.overflow = ""; };
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
    let cleaned = description;
    for (const url of detectedUrls) {
      cleaned = cleaned.replace(url, "").trim();
    }
    setDescription(cleaned);
  }

  // Auto-save link when URL is filled and user moves away
  const autoSaveLink = useCallback(() => {
    if (!linkUrl.trim()) return;
    setLinks((prev) => [...prev, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkLabel("");
    setLinkUrl("");
  }, [linkLabel, linkUrl]);

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
    try { await onDelete(); } finally { setDeleting(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    // Validate responsible
    if (!responsibleId) {
      setTeamError(true);
      teamSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setTeamError(false), 2000);
      return;
    }
    // Auto-save any pending link
    const finalLinks = linkUrl.trim()
      ? [...links, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }]
      : links;
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
        links: finalLinks,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const projectOptions: SelectOption[] = [
    { value: "", label: "Sin proyecto" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const selectedPriority = PRIORITY_OPTIONS.find((o) => o.value === priority);
  const selectedStatus = STATUS_OPTIONS.find((o) => o.value === status);

  if (!open) return null;

  // ── Shared: Team Picker ─────────────────────────────────────────
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
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-primary" /> Principal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-slate-400" /> Apoyo
        </span>
      </div>
    </div>
  );

  // ── Shared: Links display ────────────────────────────────────────
  const linksDisplay = links.length > 0 && (
    <div className="space-y-1.5">
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
          <span className="material-symbols-outlined text-primary text-[16px]">link</span>
          <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{link.label}</span>
          <button type="button" onClick={() => removeLink(i)} className="text-slate-400 hover:text-red-500 active:scale-90 transition-all">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* ─── MOBILE — Apple Reminders inspired ──────────────────── */}
      <div className="relative w-full sm:hidden bg-slate-100 shadow-2xl flex flex-col h-dvh">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Drag handle — functional: swipe down to close */}
          <div
            className="flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.25rem" }}
            onPointerDown={(e: ReactPointerEvent) => {
              const startY = e.clientY;
              const el = e.currentTarget.parentElement?.parentElement;
              if (!el) return;
              const handleMove = (ev: globalThis.PointerEvent) => {
                const dy = ev.clientY - startY;
                if (dy > 0) el.style.transform = `translateY(${dy}px)`;
              };
              const handleUp = (ev: globalThis.PointerEvent) => {
                const dy = ev.clientY - startY;
                el.style.transform = "";
                if (dy > 100) onClose();
                document.removeEventListener("pointermove", handleMove);
                document.removeEventListener("pointerup", handleUp);
              };
              document.addEventListener("pointermove", handleMove);
              document.addEventListener("pointerup", handleUp);
            }}
          >
            <div className="w-9 h-[5px] rounded-full bg-slate-300" />
          </div>

          {/* Header — iOS style with pill buttons */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-full bg-slate-200/80 active:bg-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-500">close</span>
            </button>
            <h2 className="text-[17px] font-bold text-slate-900">
              {isEdit ? "Editar Tarea" : "Nueva Tarea"}
            </h2>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="size-8 flex items-center justify-center rounded-full bg-primary active:bg-primary/80 transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px] text-white">check</span>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scroll px-4" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>

            {/* ── Card 1: Title + Description + URL ──────────────── */}
            <div className="bg-white rounded-2xl overflow-hidden mb-3 shadow-sm">
              {/* Title — large like Reminders */}
              <div className="px-4 pt-4 pb-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nombre de la tarea"
                  required
                  autoFocus
                  name="task-title-field"
                  autoComplete="one-time-code"
                  data-form-type="other"
                  className="w-full text-[22px] font-bold bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none placeholder:text-slate-300 text-slate-900 caret-primary"
                />
              </div>
              {/* Description */}
              <div className="px-4 pb-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas..."
                  rows={2}
                  className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[15px] text-slate-500 placeholder:text-slate-300 resize-none caret-primary"
                />
              </div>
              {/* URL migration banner */}
              {hasUnmigratedUrls && (
                <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-[16px]">link</span>
                  <span className="text-xs text-primary flex-1">URL detectada</span>
                  <button type="button" onClick={migrateUrls} className="text-xs font-bold text-primary">Mover a Links</button>
                </div>
              )}
              {/* URL fields */}
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-300 text-[18px]">link</span>
                  <input
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="Nombre del enlace"
                    className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[15px] text-slate-700 placeholder:text-slate-300 caret-primary"
                  />
                </div>
              </div>
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-300 text-[18px]">public</span>
                  <input
                    ref={linkUrlRef}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onBlur={autoSaveLink}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                    placeholder="https://..."
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[15px] text-primary placeholder:text-slate-300 caret-primary"
                  />
                </div>
              </div>
            </div>

            {/* Saved links */}
            {links.length > 0 && (
              <div className="mb-3">{linksDisplay}</div>
            )}

            {/* ── Card 2: Team ────────────────────────────────────── */}
            <div
              ref={teamSectionRef}
              className={`bg-white rounded-2xl p-4 mb-3 shadow-sm transition-all duration-300 ${teamError ? "ring-2 ring-red-400 animate-[shake_0.4s_ease-in-out]" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">group</span>
                <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Equipo</span>
                {teamError && (
                  <span className="text-[12px] text-red-500 font-medium ml-auto">Elige un responsable</span>
                )}
              </div>
              {teamPicker}
            </div>

            {/* ── Card 3: Details — native <select> for iOS picker wheel ── */}
            <div className="bg-white rounded-2xl overflow-hidden mb-3 shadow-sm">
              {/* Project */}
              <label className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">folder</span>
                <span className="text-[15px] text-slate-700 flex-1">Proyecto</span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="bg-transparent border-none outline-none ring-0 focus:ring-0 text-[15px] text-primary font-medium text-right appearance-none pr-0 max-w-[50%]"
                >
                  {projectOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-slate-300 text-[16px] -ml-1">chevron_right</span>
              </label>
              <div className="h-px bg-slate-100 ml-12" />

              {/* Status */}
              <label className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">radio_button_checked</span>
                <span className="text-[15px] text-slate-700 flex-1">Estado</span>
                {selectedStatus?.dotClass && (
                  <span className={`size-2 rounded-full ${selectedStatus.dotClass}`} />
                )}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-transparent border-none outline-none ring-0 focus:ring-0 text-[15px] text-primary font-medium text-right appearance-none pr-0"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-slate-300 text-[16px] -ml-1">chevron_right</span>
              </label>
              <div className="h-px bg-slate-100 ml-12" />

              {/* Priority */}
              <label className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">flag</span>
                <span className="text-[15px] text-slate-700 flex-1">Prioridad</span>
                {selectedPriority?.dotClass && (
                  <span className={`size-2 rounded-full ${selectedPriority.dotClass}`} />
                )}
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="bg-transparent border-none outline-none ring-0 focus:ring-0 text-[15px] text-primary font-medium text-right appearance-none pr-0"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-slate-300 text-[16px] -ml-1">chevron_right</span>
              </label>
              <div className="h-px bg-slate-100 ml-12" />

              {/* Deadline — native date input */}
              <label className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                <span className="text-[15px] text-slate-700 flex-1">Fecha</span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-transparent border-none outline-none ring-0 focus:ring-0 text-[15px] text-primary font-medium text-right appearance-none"
                />
              </label>
            </div>

            {/* ── Delete (edit mode) ──────────────────────────────── */}
            {isEdit && onDelete && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-3.5 text-[15px] text-red-500 font-medium bg-white rounded-2xl shadow-sm active:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Eliminando..." : "Eliminar tarea"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ─── DESKTOP (sm+) ─────────────────────────────────────── */}
      <div className="relative hidden sm:flex w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/40 max-h-[85vh] flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold">{isEdit ? "Editar Tarea" : "Nueva Tarea"}</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4 custom-scroll">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la tarea"
              required
              name="task-title-field"
              autoComplete="one-time-code"
              data-form-type="other"
              className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas..."
              rows={2}
              className="w-full bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none custom-scroll max-h-[120px] overflow-y-auto"
            />

            {hasUnmigratedUrls && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="material-symbols-outlined text-primary text-[18px]">link</span>
                <span className="text-xs text-primary flex-1">URL detectada en la descripción</span>
                <button type="button" onClick={migrateUrls} className="text-xs font-bold text-primary hover:underline">Mover a Links</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div ref={teamSectionRef} className={`col-span-2 transition-all duration-300 ${teamError ? "ring-2 ring-red-400 rounded-xl p-2 animate-[shake_0.4s_ease-in-out]" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipo</label>
                  {teamError && <span className="text-[11px] text-red-500 font-medium">— Elige un responsable</span>}
                </div>
                {teamPicker}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Proyecto</label>
                <CustomSelect value={projectId} onChange={setProjectId} options={projectOptions} placeholder="Sin proyecto" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Estado</label>
                <CustomSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Prioridad</label>
                <CustomSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Fecha limite</label>
                <div className="relative">
                  <button
                    type="button"
                    className="hidden sm:flex w-full items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className={deadline ? "text-slate-700" : "text-slate-400"}>{deadline ? new Date(deadline + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha"}</span>
                  </button>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Links</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Nombre" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                <div className="flex gap-2">
                  <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoCapitalize="none" autoCorrect="off" spellCheck={false} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  <button type="button" onClick={addLink} className="shrink-0 size-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>
              {linksDisplay}
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            {isEdit && onDelete && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50">
                {deleting ? "Eliminando..." : "Eliminar tarea"}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">Cancelar</button>
            <button type="submit" disabled={saving || !title.trim()} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
