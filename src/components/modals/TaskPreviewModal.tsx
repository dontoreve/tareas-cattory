"use client";

import { useEffect } from "react";
import type { Task } from "@/lib/types";
import { getPriorityConfig, PRIORITY_BG } from "@/lib/utils/priority";
import { formatDate, isOverdue } from "@/lib/utils/dates";

interface TaskPreviewModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const STATUS_LABELS: Record<string, { label: string; dotClass: string }> = {
  "to-do": { label: "Por Hacer", dotClass: "bg-slate-400" },
  "in-progress": { label: "En Progreso", dotClass: "bg-primary" },
  done: { label: "Completada", dotClass: "bg-emerald-500" },
};

export default function TaskPreviewModal({
  open,
  task,
  onClose,
  onEdit,
  onComplete,
  onDelete,
}: TaskPreviewModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !task) return null;

  const priorityConfig = getPriorityConfig(task.priority);
  const priorityBg = PRIORITY_BG[task.priority] ?? "";
  const statusConfig = STATUS_LABELS[task.status] ?? STATUS_LABELS["to-do"];
  const isDone = task.status === "done";
  const deadlineOverdue = !isDone && isOverdue(task.deadline);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/40 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${priorityBg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
              {priorityConfig.label}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {task.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-3 mt-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scroll">
          {/* Meta tags */}
          <div className="flex flex-wrap gap-2">
            {/* Status */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              {statusConfig.label}
            </span>

            {/* Project */}
            {task.projects?.name && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                {task.projects.name}
              </span>
            )}

            {/* Deadline */}
            {task.deadline && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  deadlineOverdue
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  calendar_month
                </span>
                {formatDate(task.deadline)}
              </span>
            )}

            {/* Assignee */}
            {task.profiles?.full_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-[14px]">person</span>
                {task.profiles.full_name}
              </span>
            )}

            {/* Secondary assignee */}
            {task.secondary_profile?.full_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-[14px]">
                  person_add
                </span>
                {task.secondary_profile.full_name}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Descripcion
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Links */}
          {task.links && task.links.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Links
              </h4>
              <div className="space-y-1.5">
                {task.links.map((link, i) => (
                  <a
                    key={i}
                    href={/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">
                      link
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {link.label || link.url}
                      </p>
                      {link.label && (
                        <p className="text-xs text-slate-400 truncate">
                          {link.url}
                        </p>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[14px]">
                      open_in_new
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onComplete?.(task);
                onClose();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDone
                  ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDone ? "undo" : "check_circle"}
              </span>
              {isDone ? "Reabrir" : "Completar"}
            </button>
            <button
              onClick={() => {
                onDelete?.(task);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                delete
              </span>
              Eliminar
            </button>
          </div>
          <button
            onClick={() => {
              onEdit?.(task);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
