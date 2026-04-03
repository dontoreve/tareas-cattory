/**
 * Format an ISO date string (YYYY-MM-DD) to localized display.
 * Example: "2026-01-15" → "15 ene 2026"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Sin fecha";
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Check if a deadline date is in the past.
 */
export function isOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateString.split("-").map(Number);
  const deadline = new Date(year, month - 1, day);
  return deadline < today;
}
