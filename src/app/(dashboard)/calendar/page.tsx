"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDashboard } from "@/contexts/DashboardContext";
import { getPriorityConfig } from "@/lib/utils/priority";
import { TAG_COLORS, getColorIndex } from "@/lib/utils/colors";
import { formatDate } from "@/lib/utils/dates";
import type { Task } from "@/lib/types";

const PRIORITY_LABELS: Record<number, string> = {
  3: "URGENTE", 2: "NORMAL", 1: "PUEDE ESPERAR",
};

function CalendarTooltip({ task, anchorRect }: { task: Task; anchorRect: DOMRect }) {
  const pc = getPriorityConfig(task.priority);
  const isDone = task.status === "done";
  const completedDateStr = isDone && task.completed_at
    ? formatDate(task.completed_at.slice(0, 10))
    : null;

  // Position: prefer below, but flip above if near bottom of viewport
  const top = anchorRect.bottom + 4;
  const flipUp = top + 220 > window.innerHeight;
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(anchorRect.left, window.innerWidth - 260),
    top: flipUp ? anchorRect.top - 4 : top,
    transform: flipUp ? "translateY(-100%)" : undefined,
    zIndex: 9999,
  };

  return createPortal(
    <div
      style={style}
      className="w-60 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 p-4 pointer-events-none"
    >
      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3 line-clamp-2">
        {task.title}
      </h4>

      {isDone && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <span className="material-symbols-outlined text-emerald-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Completada {completedDateStr}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">Prioridad</span>
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold uppercase">
            {PRIORITY_LABELS[task.priority] ?? "MEDIA"}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">Proyecto</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[100px]">
            {task.projects?.name ?? "Sin proyecto"}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">Responsable</span>
          <div className="flex items-center gap-1.5">
            <img src={task.profiles?.avatar_url || "/logo.png"} className="w-4 h-4 rounded-full object-cover" alt="" />
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
              {task.profiles?.full_name ?? "Sin asignar"}
            </span>
          </div>
        </div>
        {task.secondary_profile?.full_name && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">2da Persona</span>
            <div className="flex items-center gap-1.5">
              <img src={task.secondary_profile.avatar_url || "/logo.png"} className="w-4 h-4 rounded-full object-cover" alt="" />
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                {task.secondary_profile.full_name}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">Fecha Limite</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {task.deadline ? formatDate(task.deadline) : "Sin fecha"}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_HEADERS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarPage() {
  const { tasks, tasksLoading, openPreview } = useDashboard();
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; rect: DOMRect } | null>(null);

  const [todayIso, setTodayIso] = useState(() => dateToIso(new Date()));
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Update todayIso on visibility change (catches midnight crossings)
  useEffect(() => {
    function checkDate() {
      if (document.visibilityState === "visible") {
        setTodayIso(dateToIso(new Date()));
      }
    }
    document.addEventListener("visibilitychange", checkDate);
    return () => document.removeEventListener("visibilitychange", checkDate);
  }, []);

  // Group tasks by deadline date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      const existing = map.get(t.deadline) ?? [];
      existing.push(t);
      map.set(t.deadline, existing);
    }
    return map;
  }, [tasks]);

  // Build calendar grid cells
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay(); // Sunday = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const result: { day: number; iso: string; current: boolean }[] = [];

    // Previous month trailing
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      result.push({
        day: d,
        iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        current: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        day: d,
        iso: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        current: true,
      });
    }

    // Next month to fill 35 or 42 cells
    const totalCells = result.length <= 35 ? 35 : 42;
    const remaining = totalCells - result.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      result.push({
        day: d,
        iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        current: false,
      });
    }

    return result;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <h3 className="text-lg font-bold min-w-[180px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-slate-400 uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const isToday = cell.iso === todayIso;
            const dayTasks = tasksByDate.get(cell.iso) ?? [];

            return (
              <div
                key={i}
                className={`border-b border-r border-slate-100 dark:border-slate-800 p-1 md:p-2 min-h-[2.5rem] md:min-h-[8rem] ${
                  !cell.current ? "bg-slate-50 dark:bg-slate-800/30" : ""
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-0.5 md:mb-1">
                  <span
                    className={`text-xs md:text-sm font-semibold inline-flex items-center justify-center ${
                      isToday
                        ? "w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary text-white"
                        : cell.current
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>

                {/* Task pills */}
                <div className="space-y-0.5 md:space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const isDone = task.status === "done";
                    const color =
                      TAG_COLORS[
                        getColorIndex(task.project_id ?? task.id)
                      ];

                    return (
                      <button
                        key={task.id}
                        onClick={() => openPreview(task)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTask({ task, rect });
                        }}
                        onMouseLeave={() => setHoveredTask(null)}
                        className={`hidden md:block w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-colors ${
                          isDone
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 line-through"
                            : `${color.bg} ${color.text} hover:ring-1 ${color.ring}`
                        }`}
                      >
                        {task.title}
                      </button>
                    );
                  })}
                  {/* Mobile pills (no hover) */}
                  {dayTasks.slice(0, 3).map((task) => {
                    const isDone = task.status === "done";
                    const color = TAG_COLORS[getColorIndex(task.project_id ?? task.id)];
                    return (
                      <button
                        key={`m-${task.id}`}
                        onClick={() => openPreview(task)}
                        className={`md:hidden w-full text-left px-1 py-0.5 rounded text-[8px] font-medium truncate ${
                          isDone
                            ? "bg-slate-100 text-slate-400 line-through"
                            : `${color.bg} ${color.text}`
                        }`}
                      >
                        {task.title}
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-slate-400 font-medium px-1">
                      +{dayTasks.length - 3} mas
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip via portal */}
      {hoveredTask && (
        <CalendarTooltip task={hoveredTask.task} anchorRect={hoveredTask.rect} />
      )}
    </div>
  );
}
