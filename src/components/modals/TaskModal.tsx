"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import { TAG_COLORS } from "@/lib/utils/colors";
import type { Task, TaskLink, Profile, Project } from "@/lib/types";

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
  const [projectError, setProjectError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const linkUrlRef = useRef<HTMLInputElement>(null);
  const teamSectionRef = useRef<HTMLDivElement>(null);
  const projectRowRef = useRef<HTMLDivElement>(null);
  const dateRowRef = useRef<HTMLDivElement>(null);

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
    // Validate project
    if (!projectId) {
      setProjectError(true);
      projectRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setProjectError(false), 2000);
      return;
    }
    // Validate deadline
    if (!deadline) {
      setDateError(true);
      dateRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setDateError(false), 2000);
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
    { value: "", label: "Elegir proyecto..." },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const selectedPriority = PRIORITY_OPTIONS.find((o) => o.value === priority);

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
              className={`${isSecondary ? "size-7 text-[10px]" : "size-9 text-[12px]"} rounded-full flex items-center justify-center font-bold cursor-pointer transition-all duration-200 active:scale-90 shadow-sm ${color.bg} ${color.text} ${ringClass} ${!isSelected ? "opacity-50 hover:opacity-100" : ""}`}
              onClick={() => {
                setTeamError(false);
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
                <img src={m.avatar_url} className={`${isSecondary ? "size-7" : "size-9"} rounded-full object-cover`} alt="" />
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
          {/* Header */}
          <div className="shrink-0" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
            {/* Handle bar — tap to close */}
            <div className="flex justify-center pb-1">
              <button type="button" onClick={onClose} className="px-10 py-1.5">
                <div className="w-9 h-[5px] rounded-full bg-slate-300" />
              </button>
            </div>

            {/* Header buttons + title */}
            <div className="flex items-center justify-between px-4 py-2">
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
                  autoFocus={!isEdit}
                  autoComplete="off"
                  enterKeyHint="done"
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
              <div
                ref={projectRowRef}
                className={`transition-all duration-300 ${projectError ? "ring-2 ring-red-400 rounded-t-2xl animate-[shake_0.4s_ease-in-out]" : ""}`}
              >
                <label className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                  <span className={`material-symbols-outlined text-[18px] ${projectError ? "text-red-400" : "text-slate-400"}`}>folder</span>
                  <span className={`text-[15px] flex-1 ${projectError ? "text-red-500" : "text-slate-700"}`}>
                    {projectError ? "Elige un proyecto" : "Proyecto"}
                  </span>
                  <select
                    value={projectId}
                    onChange={(e) => { setProjectId(e.target.value); setProjectError(false); }}
                    className={`bg-transparent border-none outline-none ring-0 focus:ring-0 text-[15px] font-medium text-right appearance-none pr-0 max-w-[50%] ${projectId ? "text-primary" : "text-slate-400"}`}
                  >
                    {projectOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-slate-300 text-[16px] -ml-1">chevron_right</span>
                </label>
              </div>
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
              <div
                ref={dateRowRef}
                className={`transition-all duration-300 ${dateError ? "ring-2 ring-red-400 rounded-b-2xl animate-[shake_0.4s_ease-in-out]" : ""}`}
              >
                <label className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                  <span className={`material-symbols-outlined text-[18px] ${dateError ? "text-red-400" : "text-slate-400"}`}>calendar_today</span>
                  <span className={`text-[15px] flex-1 ${dateError ? "text-red-500" : "text-slate-700"}`}>
                    {dateError ? "Elige una fecha" : "Fecha"}
                  </span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => { setDeadline(e.target.value); setDateError(false); }}
                    className="bg-transparent border-none outline-none ring-0 focus:ring-0 text-[15px] text-primary font-medium text-right appearance-none"
                  />
                </label>
              </div>
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

      {/* ─── DESKTOP (sm+) — Card-based minimalist design ─────── */}
      <div className="relative hidden sm:flex w-full max-w-lg mx-4 bg-slate-100 dark:bg-slate-950 rounded-2xl shadow-2xl max-h-[85vh] flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <button type="button" onClick={onClose} className="size-8 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">close</span>
            </button>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{isEdit ? "Editar Tarea" : "Nueva Tarea"}</h2>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="size-8 flex items-center justify-center rounded-full bg-primary hover:bg-primary/80 transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px] text-white">check</span>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scroll px-4 pb-4 space-y-3">

            {/* ── Card 1: Title + Description + Links ──────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-4 pb-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nombre de la tarea"
                  required
                  autoComplete="off"
                  autoFocus={!isEdit}
                  className="w-full text-[20px] font-bold bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100 caret-primary"
                />
              </div>
              <div className="px-4 pb-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas..."
                  rows={2}
                  className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[14px] text-slate-500 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none caret-primary max-h-[120px] overflow-y-auto custom-scroll"
                />
              </div>
              {hasUnmigratedUrls && (
                <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-[16px]">link</span>
                  <span className="text-xs text-primary flex-1">URL detectada</span>
                  <button type="button" onClick={migrateUrls} className="text-xs font-bold text-primary hover:underline">Mover a Links</button>
                </div>
              )}
              {/* Link inputs */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px]">link</span>
                  <input
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="Nombre del enlace"
                    className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[14px] text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 caret-primary"
                  />
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px]">public</span>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onBlur={autoSaveLink}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                    placeholder="https://..."
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[14px] text-primary placeholder:text-slate-300 dark:placeholder:text-slate-600 caret-primary"
                  />
                </div>
              </div>
            </div>

            {/* Saved links */}
            {links.length > 0 && linksDisplay}

            {/* ── Card 2: Team ────────────────────────────────── */}
            <div
              ref={teamSectionRef}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm transition-all duration-300 ${teamError ? "ring-2 ring-red-400 animate-[shake_0.4s_ease-in-out]" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">group</span>
                <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">Equipo</span>
                {teamError && (
                  <span className="text-[12px] text-red-500 font-medium ml-auto">Elige un responsable</span>
                )}
              </div>
              {teamPicker}
            </div>

            {/* ── Card 3: Details — 2-column grid ────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <div className="grid grid-cols-2">
                {/* Project — full width */}
                <div
                  ref={projectRowRef}
                  className={`col-span-2 transition-all duration-300 ${projectError ? "ring-2 ring-red-400 rounded-t-2xl animate-[shake_0.4s_ease-in-out]" : ""}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`material-symbols-outlined text-[18px] ${projectError ? "text-red-400" : "text-slate-400"}`}>folder</span>
                    <span className={`text-[14px] shrink-0 ${projectError ? "text-red-500 font-medium" : "text-slate-500"}`}>
                      {projectError ? "Elige un proyecto" : "Proyecto"}
                    </span>
                    <div className="flex-1 flex justify-end">
                      <CustomSelect value={projectId} onChange={(v) => { setProjectId(v); setProjectError(false); }} options={projectOptions} placeholder="Elegir..." variant="chip" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2 h-px bg-slate-100 dark:bg-slate-800 ml-12" />

                {/* Priority — full width */}
                <div className="col-span-2">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">flag</span>
                    <span className="text-[14px] text-slate-500 shrink-0">Prioridad</span>
                    <div className="flex-1 flex justify-end">
                      <CustomSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} variant="chip" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2 h-px bg-slate-100 dark:bg-slate-800 ml-12" />

                {/* Deadline */}
                <div
                  ref={dateRowRef}
                  className={`col-span-2 transition-all duration-300 ${dateError ? "ring-2 ring-red-400 rounded-b-2xl animate-[shake_0.4s_ease-in-out]" : ""}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`material-symbols-outlined text-[18px] ${dateError ? "text-red-400" : "text-slate-400"}`}>calendar_today</span>
                    <span className={`text-[14px] flex-1 ${dateError ? "text-red-500 font-medium" : "text-slate-500"}`}>
                      {dateError ? "Elige una fecha" : "Fecha"}
                    </span>
                    <DatePicker
                      value={deadline}
                      onChange={(v) => { setDeadline(v); setDateError(false); }}
                      mode="click"
                      variant="inline"
                      showEditIcon={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Delete (edit mode) ──────────────────────────── */}
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 text-[14px] text-red-500 font-medium bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar tarea"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
