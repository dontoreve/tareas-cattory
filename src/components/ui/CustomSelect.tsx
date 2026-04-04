"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional left-side dot/badge color class */
  dotClass?: string;
  /** Optional extra classes on the option button */
  className?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Compact chip style (mobile) vs full-width input style (desktop) */
  variant?: "chip" | "input";
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  variant = "input",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const isChip = variant === "chip";

  const triggerClass = isChip
    ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
    : "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";

  return (
    <div ref={containerRef} className="relative modal-custom-select">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClass}
      >
        {selected?.dotClass && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${selected.dotClass}`}
          />
        )}
        <span className="truncate">{displayLabel}</span>
        <span
          className="material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-200"
          style={open ? { transform: "rotate(180deg)" } : undefined}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scroll">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-slate-100 dark:bg-slate-700 font-semibold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              } ${opt.className ?? ""}`}
            >
              {opt.dotClass && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`}
                />
              )}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
