"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/lib/hooks/useNotifications";
import type { Notification } from "@/lib/types";

const TYPE_CONFIG: Record<
  string,
  { icon: string; chipBg: string; chipText: string; iconColor: string }
> = {
  overdue: {
    icon: "schedule",
    chipBg: "bg-red-50 dark:bg-red-900/20",
    chipText: "text-red-600 dark:text-red-400",
    iconColor: "text-red-500",
  },
  task_completed: {
    icon: "task_alt",
    chipBg: "bg-emerald-50 dark:bg-emerald-900/20",
    chipText: "text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-500",
  },
  task_assigned: {
    icon: "person_add",
    chipBg: "bg-blue-50 dark:bg-blue-900/20",
    chipText: "text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-500",
  },
  daily_digest: {
    icon: "summarize",
    chipBg: "bg-amber-50 dark:bg-amber-900/20",
    chipText: "text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  deadline_approaching: {
    icon: "event_upcoming",
    chipBg: "bg-orange-50 dark:bg-orange-900/20",
    chipText: "text-orange-600 dark:text-orange-400",
    iconColor: "text-orange-500",
  },
};

function buildMessage(notif: Notification): string {
  const d = notif.data ?? {};
  const title = (d.task_title as string) ?? "una tarea";

  switch (notif.type) {
    case "task_assigned":
      return `Te asignaron "${title}"`;
    case "task_completed":
      return `"${title}" fue completada`;
    case "overdue":
      return `"${title}" está vencida`;
    case "deadline_approaching": {
      const dl = d.deadline as string | undefined;
      const when = dl
        ? new Date(dl).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
        : "pronto";
      return `"${title}" vence ${when}`;
    }
    case "daily_digest": {
      const pending = (d.pending as number) ?? 0;
      const overdue = (d.overdue as number) ?? 0;
      if (overdue > 0) return `Tienes ${pending} tareas pendientes, ${overdue} vencidas`;
      return `Tienes ${pending} tareas pendientes`;
    }
    default:
      return notif.message ?? "Nueva notificación";
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return "ayer";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell({
  onNotificationClick,
}: {
  onNotificationClick?: (notification: Notification) => void;
}) {
  const { user, role } = useAuth();
  const { notifications, count, dismiss, clearAll } = useNotifications({
    userId: user?.id ?? null,
    role,
  });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  function handleChipClick(notif: Notification) {
    dismiss(notif.id);
    if (notif.type === "daily_digest") {
      // Navigate to home
      window.location.href = "/";
    } else {
      onNotificationClick?.(notif);
    }
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative overflow-visible">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
      >
        <span
          className="material-symbols-outlined"
          style={
            count > 0
              ? { fontVariationSettings: "'FILL' 1" }
              : undefined
          }
        >
          notifications
        </span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-0 top-16 mx-3 sm:absolute sm:right-0 sm:left-auto sm:top-14 sm:mx-0 sm:w-96 z-[9999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[70vh] sm:max-h-[32rem]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-slate-500">
                notifications
              </span>
              <h3 className="font-bold text-sm">Notificaciones</h3>
              {count > 0 && (
                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={() => {
                  clearAll();
                  setIsOpen(false);
                }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">
                  notifications_off
                </span>
                <p className="text-sm font-medium">Todo al dia</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notif) => {
                  const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.task_assigned;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleChipClick(notif)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors ${config.chipBg} hover:opacity-80`}
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] mt-0.5 ${config.iconColor}`}
                      >
                        {config.icon}
                      </span>
                      <div className="flex-1 text-left min-w-0">
                        <p
                          className={`text-sm font-medium ${config.chipText}`}
                        >
                          {buildMessage(notif)}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
                        {timeAgo(notif.created_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
