"use client";

import { useState, useEffect, type FormEvent } from "react";
import CustomSelect from "@/components/ui/CustomSelect";
import type { Profile, Project } from "@/lib/types";
import type { RecurringTemplate } from "@/lib/hooks/useRecurringTasks";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEK_LABELS = ["1ra", "2da", "3ra", "4ta"];

const FREQ_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
];

const PRIORITY_OPTIONS = [
  { value: "5", label: "P5 Critical", dotClass: "bg-red-500" },
  { value: "4", label: "P4 High", dotClass: "bg-orange-500" },
  { value: "3", label: "P3 Medium", dotClass: "bg-amber-500" },
  { value: "2", label: "P2 Low", dotClass: "bg-green-500" },
  { value: "1", label: "P1 Routine", dotClass: "bg-slate-500" },
];

interface RecurringModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<RecurringTemplate>) => Promise<void>;
  onDelete?: () => Promise<void>;
  template?: RecurringTemplate | null;
  teamMembers: Profile[];
  projects: Project[];
  currentUserId: string;
}

export default function RecurringModal({
  open,
  onClose,
  onSave,
  onDelete,
  template,
  teamMembers,
  projects,
  currentUserId,
}: RecurringModalProps) {
  const isEdit = !!template;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsibleId, setResponsibleId] = useState(currentUserId);
  const [secondaryId, setSecondaryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("3");
  const [frequency, setFrequency] = useState("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday default
  const [weekOfMonth, setWeekOfMonth] = useState("1");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDescription(template.description ?? "");
      setResponsibleId(template.responsible_id);
      setSecondaryId(template.secondary_responsible_id ?? "");
      setProjectId(template.project_id ?? "");
      setPriority(String(template.priority));
      setFrequency(template.frequency);
      setSelectedDays(template.days_of_week ?? [1]);
      setWeekOfMonth(String(template.week_of_month ?? 1));
      setRepeatUntil(template.repeat_until ?? "");
    } else {
      setTitle("");
      setDescription("");
      setResponsibleId(currentUserId);
      setSecondaryId("");
      setProjectId("");
      setPriority("3");
      setFrequency("weekly");
      setSelectedDays([1]);
      setWeekOfMonth("1");
      setRepeatUntil("");
    }
  }, [template, currentUserId, open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.length > 1 ? prev.filter((d) => d !== day) : prev
        : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        responsible_id: responsibleId,
        secondary_responsible_id: secondaryId || null,
        project_id: projectId || null,
        priority: Number(priority),
        frequency: frequency as RecurringTemplate["frequency"],
        days_of_week: selectedDays,
        week_of_month: frequency === "monthly" ? Number(weekOfMonth) : null,
        repeat_until: repeatUntil || null,
        is_active: true,
        created_by: currentUserId,
        links: [],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  }

  const memberOptions = teamMembers.map((m) => ({ value: m.id, label: m.full_name ?? "Sin nombre" }));
  const projectOptions = [
    { value: "", label: "Sin proyecto" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg sm:mx-4 bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-2xl shadow-2xl border border-white/20 max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <button type="button" onClick={onClose} className="text-sm text-primary font-semibold sm:hidden">Cancelar</button>
            <h2 className="text-base font-bold text-center flex-1 sm:text-left sm:flex-none">
              {isEdit ? "Editar Recurrente" : "Nueva Tarea Recurrente"}
            </h2>
            <button type="submit" disabled={saving || !title.trim()} className="text-sm text-primary font-bold sm:hidden disabled:opacity-50">
              {saving ? "..." : "Guardar"}
            </button>
            <button type="button" onClick={onClose} className="hidden sm:block text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scroll">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la tarea recurrente" required
              className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-slate-300" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas..." rows={2}
              className="w-full bg-transparent border-none outline-none text-sm text-slate-600 placeholder:text-slate-300 resize-none" />

            {/* Frequency + Days */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Frecuencia</label>
              <CustomSelect value={frequency} onChange={setFrequency} options={FREQ_OPTIONS} />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Días</label>
              <div className="flex gap-1.5">
                {DAY_NAMES.map((name, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                      selectedDays.includes(i)
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {frequency === "monthly" && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Semana del mes</label>
                <CustomSelect value={weekOfMonth} onChange={setWeekOfMonth}
                  options={WEEK_LABELS.map((l, i) => ({ value: String(i + 1), label: `${l} semana` }))} />
              </div>
            )}

            {/* Fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Responsable</label>
                <CustomSelect value={responsibleId} onChange={setResponsibleId} options={memberOptions} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Apoyo</label>
                <CustomSelect value={secondaryId} onChange={setSecondaryId} options={[{ value: "", label: "Ninguna" }, ...memberOptions]} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Proyecto</label>
                <CustomSelect value={projectId} onChange={setProjectId} options={projectOptions} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Prioridad</label>
                <CustomSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Repetir hasta (opcional)</label>
              <input type="date" value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" />
            </div>
          </div>

          {/* Desktop footer */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-3 border-t border-slate-100">
            {isEdit && onDelete && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50">
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
            <button type="submit" disabled={saving || !title.trim()}
              className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Recurrente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
