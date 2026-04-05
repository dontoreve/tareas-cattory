export interface PriorityConfig {
  color: string;
  label: string;
  dot: string;
}

/**
 * 3-level priority system:
 *   3 = Urgente    (red)
 *   2 = Normal     (amber)  ← default
 *   1 = Puede esperar (slate)
 */
export function getPriorityConfig(priority: number): PriorityConfig {
  switch (priority) {
    case 3: return { color: "red", label: "Urgente", dot: "bg-red-500" };
    case 2: return { color: "amber", label: "Normal", dot: "bg-amber-500" };
    case 1: return { color: "slate", label: "Puede esperar", dot: "bg-slate-400" };
    default: return { color: "amber", label: "Normal", dot: "bg-amber-500" };
  }
}

// Full class maps to avoid dynamic Tailwind class generation
export const PRIORITY_BG: Record<number, string> = {
  3: "text-red-600 bg-red-50",
  2: "text-amber-600 bg-amber-50",
  1: "text-slate-500 bg-slate-50",
};

// Hover classes for filter chips (idle state → colored on hover)
export const PRIORITY_HOVER: Record<number, string> = {
  3: "hover:text-red-600 hover:bg-red-50",
  2: "hover:text-amber-600 hover:bg-amber-50",
  1: "hover:text-slate-600 hover:bg-slate-100",
};

export const PRIORITY_TAG: Record<string, { bg: string; text: string }> = {
  red:    { bg: "bg-red-100",    text: "text-red-600" },
  amber:  { bg: "bg-amber-100",  text: "text-amber-600" },
  slate:  { bg: "bg-slate-100",  text: "text-slate-500" },
};

// ── Urgency Score ──────────────────────────────────────────────
// Combines priority weight × deadline multiplier into a single
// sortable number. Higher score = do it first.

const PRIORITY_WEIGHT: Record<number, number> = {
  3: 30,  // Urgente
  2: 15,  // Normal
  1: 5,   // Puede esperar
};

function deadlineMultiplier(deadline: string | null): number {
  if (!deadline) return 0.7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = deadline.split("-").map(Number);
  const dl = new Date(y, m - 1, d);
  const diffDays = Math.round((dl.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < -3) return 4.0;   // Overdue > 3 days
  if (diffDays < 0) return 3.0;    // Overdue 1-3 days
  if (diffDays === 0) return 2.5;  // Due today
  if (diffDays === 1) return 2.0;  // Tomorrow
  if (diffDays <= 3) return 1.5;   // 2-3 days
  if (diffDays <= 7) return 1.2;   // 4-7 days
  if (diffDays <= 14) return 1.0;  // 8-14 days
  if (diffDays <= 30) return 0.8;  // 15-30 days
  return 0.6;                      // 30+ days
}

export function getUrgencyScore(priority: number, deadline: string | null): number {
  const weight = PRIORITY_WEIGHT[priority] ?? 15;
  return weight * deadlineMultiplier(deadline);
}
