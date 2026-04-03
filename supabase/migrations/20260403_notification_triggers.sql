-- ─────────────────────────────────────────────────────────────────────────────
-- Notification Triggers for Cattory
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Trigger: task_assigned notification ────────────────────────────────────
-- Fires when responsible_id or secondary_responsible_id changes on a task.
-- Inserts a notification for the newly assigned user.

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Primary responsible changed
  IF (TG_OP = 'UPDATE' AND NEW.responsible_id IS DISTINCT FROM OLD.responsible_id)
     OR (TG_OP = 'INSERT' AND NEW.responsible_id IS NOT NULL) THEN
    INSERT INTO notifications (user_id, type, task_id, data, is_read)
    VALUES (
      NEW.responsible_id,
      'task_assigned',
      NEW.id,
      jsonb_build_object(
        'task_title', NEW.title,
        'assigned_by', NEW.created_by
      ),
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Secondary responsible changed
  IF TG_OP = 'UPDATE'
     AND NEW.secondary_responsible_id IS DISTINCT FROM OLD.secondary_responsible_id
     AND NEW.secondary_responsible_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, task_id, data, is_read)
    VALUES (
      NEW.secondary_responsible_id,
      'task_assigned',
      NEW.id,
      jsonb_build_object(
        'task_title', NEW.title,
        'assigned_by', NEW.created_by
      ),
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Task completed — notify responsible
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'done'
     AND OLD.status IS DISTINCT FROM 'done'
     AND NEW.responsible_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, task_id, data, is_read)
    VALUES (
      NEW.responsible_id,
      'task_completed',
      NEW.id,
      jsonb_build_object('task_title', NEW.title),
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present, then recreate
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON tasks;
CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT OR UPDATE OF responsible_id, secondary_responsible_id, status
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();


-- ── 2. Function: check_overdue_notifications (RPC) ───────────────────────────
-- Called from the client on login. Creates overdue + deadline_approaching
-- notifications for the user's tasks. Safe to call multiple times — deduplicates.

CREATE OR REPLACE FUNCTION check_overdue_notifications(
  p_user_id UUID,
  p_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
DECLARE
  task_rec RECORD;
BEGIN
  -- Loop through non-completed tasks where user is responsible or secondary
  FOR task_rec IN
    SELECT id, title, deadline
    FROM tasks
    WHERE status != 'done'
      AND deadline IS NOT NULL
      AND (
        responsible_id = p_user_id
        OR secondary_responsible_id = p_user_id
        OR (p_is_admin = TRUE)
      )
  LOOP
    -- Overdue: deadline < today
    IF task_rec.deadline < CURRENT_DATE THEN
      INSERT INTO notifications (user_id, type, task_id, data, is_read)
      VALUES (
        p_user_id,
        'overdue',
        task_rec.id,
        jsonb_build_object('task_title', task_rec.title, 'deadline', task_rec.deadline),
        false
      )
      ON CONFLICT (user_id, type, task_id) DO NOTHING;

    -- Deadline approaching: due in next 2 days
    ELSIF task_rec.deadline <= CURRENT_DATE + INTERVAL '2 days' THEN
      INSERT INTO notifications (user_id, type, task_id, data, is_read)
      VALUES (
        p_user_id,
        'deadline_approaching',
        task_rec.id,
        jsonb_build_object('task_title', task_rec.title, 'deadline', task_rec.deadline),
        false
      )
      ON CONFLICT (user_id, type, task_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 3. Function: generate_daily_digest ───────────────────────────────────────
-- Called by pg_cron at 8am daily. Creates a daily_digest notification per user
-- with a summary of their pending tasks.
-- Schedule with: SELECT cron.schedule('daily-digest', '0 8 * * *', 'SELECT generate_daily_digest()');

CREATE OR REPLACE FUNCTION generate_daily_digest()
RETURNS void AS $$
DECLARE
  user_rec RECORD;
  pending_count INT;
  overdue_count INT;
  due_today_count INT;
BEGIN
  FOR user_rec IN SELECT DISTINCT id FROM profiles WHERE id IS NOT NULL
  LOOP
    -- Count pending tasks
    SELECT COUNT(*) INTO pending_count
    FROM tasks
    WHERE status != 'done'
      AND (responsible_id = user_rec.id OR secondary_responsible_id = user_rec.id);

    -- Count overdue
    SELECT COUNT(*) INTO overdue_count
    FROM tasks
    WHERE status != 'done'
      AND deadline < CURRENT_DATE
      AND (responsible_id = user_rec.id OR secondary_responsible_id = user_rec.id);

    -- Count due today
    SELECT COUNT(*) INTO due_today_count
    FROM tasks
    WHERE status != 'done'
      AND deadline = CURRENT_DATE
      AND (responsible_id = user_rec.id OR secondary_responsible_id = user_rec.id);

    -- Only create digest if user has pending tasks
    IF pending_count > 0 THEN
      INSERT INTO notifications (user_id, type, task_id, data, is_read)
      VALUES (
        user_rec.id,
        'daily_digest',
        NULL,
        jsonb_build_object(
          'pending', pending_count,
          'overdue', overdue_count,
          'due_today', due_today_count,
          'date', CURRENT_DATE
        ),
        false
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 4. Unique constraint to prevent duplicate notifications ───────────────────
-- Only for task-specific notifications (not daily_digest which has task_id NULL)
-- Run only if constraint doesn't already exist:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_type_task_unique'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_user_type_task_unique
      UNIQUE (user_id, type, task_id);
  END IF;
END $$;
