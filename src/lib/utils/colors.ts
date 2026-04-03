export const TAG_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-500" },
  { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-500" },
  { bg: "bg-pink-100", text: "text-pink-700", ring: "ring-pink-500" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-500" },
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-500" },
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-500" },
  { bg: "bg-cyan-100", text: "text-cyan-700", ring: "ring-cyan-500" },
] as const;

/**
 * Deterministic color index for a project/user by ID.
 */
export function getColorIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % TAG_COLORS.length;
}
