// ── Database types ─────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
  email?: string;
}

export interface Project {
  id: string;
  name: string;
  created_by?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  deadline: string | null;
  status: "to-do" | "in-progress" | "done";
  project_id: string | null;
  responsible_id: string;
  secondary_responsible_id: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  links: TaskLink[] | null;
  // Joined fields
  projects?: { name: string } | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  secondary_profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export interface TaskLink {
  label: string;
  url: string;
}

export interface Notification {
  id: string;
  user_id: string;
  task_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task?: Task | null;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  project_id: string | null;
  responsible_id: string;
  secondary_responsible_id: string | null;
  frequency: "daily" | "weekly" | "monthly";
  day_of_week: number[] | null;
  week_of_month: number | null;
  repeat_until: string | null;
  is_active: boolean;
  last_generated_at: string | null;
  created_by: string;
  created_at: string;
  projects?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
}
