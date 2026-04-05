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
  archived_at?: string | null;
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
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

// RecurringTemplate is defined and exported from @/lib/hooks/useRecurringTasks
