export interface PriorityConfig {
  color: string;
  label: string;
  dot: string;
}

export function getPriorityConfig(priority: number): PriorityConfig {
  switch (priority) {
    case 5: return { color: "red", label: "P5 Critical", dot: "bg-red-500" };
    case 4: return { color: "orange", label: "P4 High", dot: "bg-orange-500" };
    case 3: return { color: "amber", label: "P3 Medium", dot: "bg-amber-500" };
    case 2: return { color: "green", label: "P2 Low", dot: "bg-green-500" };
    case 1: return { color: "slate", label: "P1 Routine", dot: "bg-slate-500" };
    default: return { color: "slate", label: "NONE", dot: "bg-slate-400" };
  }
}

// Full class maps to avoid dynamic Tailwind class generation
export const PRIORITY_BG: Record<number, string> = {
  5: "text-red-600 bg-red-50",
  4: "text-orange-600 bg-orange-50",
  3: "text-amber-600 bg-amber-50",
  2: "text-green-600 bg-green-50",
  1: "text-slate-500 bg-slate-50",
};

export const PRIORITY_TAG: Record<string, { bg: string; text: string }> = {
  red:    { bg: "bg-red-100",    text: "text-red-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  amber:  { bg: "bg-amber-100",  text: "text-amber-600" },
  green:  { bg: "bg-green-100",  text: "text-green-600" },
  slate:  { bg: "bg-slate-100",  text: "text-slate-500" },
};
