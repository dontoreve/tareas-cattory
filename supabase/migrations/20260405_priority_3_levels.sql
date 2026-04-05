-- Migration: Remap 5-level priority system → 3-level system
-- Old: 5 (Critical), 4 (High), 3 (Medium), 2 (Low), 1 (Routine)
-- New: 3 (Urgente), 2 (Normal), 1 (Puede esperar)
--
-- Mapping:
--   5 (Critical) → 3 (Urgente)
--   4 (High)     → 2 (Normal)
--   3 (Medium)   → 2 (Normal)
--   2 (Low)      → 1 (Puede esperar)
--   1 (Routine)  → 1 (Puede esperar)

-- ── Tasks (atomic CASE to avoid ordering issues) ──────────────
UPDATE tasks SET priority = CASE
  WHEN priority = 5 THEN 3
  WHEN priority = 4 THEN 2
  WHEN priority = 3 THEN 2
  WHEN priority = 2 THEN 1
  WHEN priority = 1 THEN 1
  ELSE 2
END;

-- Note: recurring_templates table does not exist yet — no migration needed.
