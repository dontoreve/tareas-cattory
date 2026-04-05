"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  mode?: "click" | "hover";
  placeholder?: string;
  variant?: "input" | "inline";
  overdue?: boolean;
  showEditIcon?: boolean;
  preferUp?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  mode = "hover",
  placeholder = "Sin fecha",
  variant = "input",
  overdue = false,
  showEditIcon = true,
  preferUp = false,
}: DatePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(
    value ? parseInt(value.slice(0, 4)) : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    value ? parseInt(value.slice(5, 7)) - 1 : today.getMonth()
  );
  const [isOpen, setIsOpen] = useState(false);

  // Sync viewMonth/viewYear when value changes externally (e.g. different task selected)
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0, 4)));
      setViewMonth(parseInt(value.slice(5, 7)) - 1);
    }
  }, [value]);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  const todayIso = dateToIso(today);
  const displayText = value ? formatDisplay(value) : placeholder;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        calRef.current?.contains(e.target as Node)
      )
        return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 140);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  function selectDate(iso: string) {
    onChange(iso);
    setIsOpen(false);
  }

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

  // Build day grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; iso: string; current: boolean }[] = [];
  // Previous month trailing
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({
      day: d,
      iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      current: false,
    });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      iso: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      current: true,
    });
  }
  // Next month leading
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        day: d,
        iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        current: false,
      });
    }
  }

  // Year range for dropdown
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 1 + i);

  const hoverHandlers =
    mode === "hover"
      ? {
          onMouseEnter: () => {
            cancelClose();
            setIsOpen(true);
          },
          onMouseLeave: scheduleClose,
        }
      : {};

  return (
    <div className="relative">
      {variant === "inline" ? (
        /* Inline trigger — minimal badge for table cells */
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1 text-sm font-medium cursor-pointer hover:ring-2 hover:ring-slate-200 px-2 py-1 rounded transition-all ${
            overdue ? "text-red-600 bg-red-50" : "text-slate-600 hover:bg-slate-100"
          }`}
          {...hoverHandlers}
        >
          {overdue && <span className="material-symbols-outlined text-[12px] text-red-500">warning</span>}
          <span>{displayText}</span>
          {showEditIcon && <span className="material-symbols-outlined text-[10px] opacity-60">edit_calendar</span>}
        </button>
      ) : (
        <>
          {/* Desktop trigger — full input style */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="hidden sm:flex w-full items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            {...hoverHandlers}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">
                calendar_month
              </span>
              <span className={value ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                {displayText}
              </span>
            </div>
            <span
              className="material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-200"
              style={isOpen ? { transform: "rotate(180deg)" } : undefined}
            >
              expand_more
            </span>
          </button>

          {/* Mobile: native date input */}
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sm:hidden w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </>
      )}

      {/* Calendar popover (desktop) — rendered via portal to escape overflow containers */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={calRef}
          className="hidden sm:block fixed z-[9999] w-[276px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3"
          style={(() => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return { top: 0, left: 0 };
            const calHeight = 320;
            const calWidth = 276;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUp = preferUp || (spaceBelow < calHeight && rect.top > calHeight);
            const top = openUp ? rect.top - calHeight - 4 : rect.bottom + 4;
            const left = Math.max(8, Math.min(rect.right - calWidth, window.innerWidth - calWidth - 8));
            return { top, left };
          })()}
          onMouseEnter={mode === "hover" ? cancelClose : undefined}
          onMouseLeave={mode === "hover" ? scheduleClose : undefined}
        >
          {/* Navigation header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
            </button>
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-sm font-semibold bg-transparent border-none cursor-pointer focus:ring-0 pr-0"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-sm font-semibold bg-transparent border-none cursor-pointer focus:ring-0 pr-0"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_right
              </span>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-semibold text-slate-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso;

              let cellClass =
                "w-full aspect-square flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors ";

              if (!cell.current) {
                cellClass += "text-slate-300 dark:text-slate-600";
              } else if (isSelected) {
                cellClass +=
                  "bg-[#2b7cee] text-white font-semibold shadow-sm";
              } else if (isToday) {
                cellClass +=
                  "text-[#2b7cee] font-semibold ring-1 ring-[#2b7cee]/40 hover:bg-[#2b7cee]/10";
              } else {
                cellClass +=
                  "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
              }

              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectDate(cell.iso);
                  }}
                  className={cellClass}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
