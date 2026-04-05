"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Task, TaskLink } from "@/lib/types";

const TASK_SELECT =
  "*, projects(name), profiles!tasks_responsible_id_fkey(full_name, avatar_url), secondary_profile:profiles!tasks_secondary_responsible_id_fkey(full_name, avatar_url)";

interface UseTasksOptions {
  userId: string | null;
  role: "admin" | "member";
}

export function useTasks({ userId }: UseTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const suppressUntil = useRef(0);
  const fetchInFlight = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (!userId || fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT);

      if (error) throw error;
      // RLS handles access control — admin sees all, member sees assigned + project tasks
      setTasks((data ?? []) as Task[]);
    } finally {
      fetchInFlight.current = false;
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) fetchTasks();
  }, [userId, fetchTasks]);

  // Realtime: broadcast + postgres_changes
  useEffect(() => {
    if (!userId) return;

    const broadcastChannel = supabase
      .channel("task-global-updates")
      .on("broadcast", { event: "tasks_changed" }, () => {
        if (Date.now() < suppressUntil.current) return;
        fetchTasks();
      })
      .on("broadcast", { event: "projects_changed" }, () => {
        // Projects changed — pages that care can listen separately
      })
      .subscribe();

    const pgChannel = supabase
      .channel("priority-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          if (Date.now() < suppressUntil.current) return;
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(pgChannel);
    };
  }, [userId, fetchTasks]);

  // Suppress realtime refreshes briefly after a local mutation
  const suppressRealtime = useCallback(() => {
    suppressUntil.current = Date.now() + 2000;
  }, []);

  // ── Mutations ──────────────────────────────────────────────────

  const createTask = useCallback(
    async (taskData: {
      title: string;
      description: string;
      responsible_id: string;
      secondary_responsible_id: string | null;
      project_id: string | null;
      status: string;
      priority: number;
      deadline: string | null;
      links: TaskLink[];
    }) => {
      suppressRealtime();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...taskData,
          created_by: userId!,
        })
        .select(TASK_SELECT)
        .single();

      if (error) throw error;
      const newTask = data as Task;
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    },
    [userId, suppressRealtime]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<{
        title: string;
        description: string;
        responsible_id: string;
        secondary_responsible_id: string | null;
        project_id: string | null;
        status: string;
        priority: number;
        deadline: string | null;
        links: TaskLink[];
        completed_at: string | null;
      }>
    ) => {
      suppressRealtime();

      // Capture original from current state (functional updater avoids stale closure)
      let original: Task | undefined;
      setTasks((prev) => {
        original = prev.find((t) => t.id === taskId);
        return prev.map((t) =>
          t.id === taskId ? ({ ...t, ...updates } as Task) : t
        );
      });

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .select(TASK_SELECT)
        .single();

      if (error) {
        // Rollback on failure using functional updater to avoid stale state
        if (original) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? original! : t)));
        }
        throw error;
      }

      // Merge full data (with joins like secondary_profile) from Supabase
      const updated = data as Task;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return updated;
    },
    [suppressRealtime]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      suppressRealtime();
      // Capture original from current state (functional updater avoids stale closure)
      let original: Task | undefined;
      setTasks((prev) => {
        original = prev.find((t) => t.id === taskId);
        return prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "done" as const, completed_at: new Date().toISOString() }
            : t
        );
      });

      const { error } = await supabase
        .from("tasks")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error && original) {
        // Rollback using functional updater
        setTasks((prev) => prev.map((t) => (t.id === taskId ? original! : t)));
        throw error;
      }
    },
    [suppressRealtime]
  );

  const reopenTask = useCallback(
    async (taskId: string) => {
      suppressRealtime();
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: "to-do", completed_at: null })
        .eq("id", taskId)
        .select(TASK_SELECT)
        .single();

      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? (data as Task) : t)));
    },
    [suppressRealtime]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      suppressRealtime();
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) {
        // Refetch to restore
        fetchTasks();
        throw error;
      }
    },
    [fetchTasks, suppressRealtime]
  );

  return {
    tasks,
    loading,
    refetch: fetchTasks,
    createTask,
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
  };
}
