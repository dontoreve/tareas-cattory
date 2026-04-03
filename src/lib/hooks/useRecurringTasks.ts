"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface RecurringTemplate {
  id: string;
  title: string;
  description: string | null;
  responsible_id: string;
  secondary_responsible_id: string | null;
  project_id: string | null;
  priority: number;
  links: { label: string; url: string }[];
  frequency: "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  week_of_month: number | null;
  repeat_until: string | null;
  is_active: boolean;
  created_by: string;
  last_generated_at: string | null;
  created_at: string;
  // Joined data
  profiles?: { full_name: string | null; avatar_url: string | null };
  projects?: { name: string };
}

const TEMPLATE_SELECT =
  "*, profiles!recurring_task_templates_responsible_id_fkey(full_name, avatar_url), projects(name)";

export function useRecurringTasks(userId: string | null, role: string) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (role !== "admin") {
      setTemplates([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("recurring_task_templates")
      .select(TEMPLATE_SELECT)
      .order("created_at", { ascending: false });

    if (!error && data) setTemplates(data as RecurringTemplate[]);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    if (userId) fetchTemplates();
  }, [userId, fetchTemplates]);

  // Realtime
  useEffect(() => {
    if (!userId || role !== "admin") return;
    const channel = supabase
      .channel("recurring-templates-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_task_templates" },
        () => fetchTemplates()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, role, fetchTemplates]);

  const createTemplate = useCallback(
    async (data: Omit<RecurringTemplate, "id" | "created_at" | "last_generated_at" | "profiles" | "projects">) => {
      const { data: result, error } = await supabase
        .from("recurring_task_templates")
        .insert(data)
        .select(TEMPLATE_SELECT)
        .single();
      if (error) throw error;
      setTemplates((prev) => [result as RecurringTemplate, ...prev]);
      return result as RecurringTemplate;
    },
    []
  );

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<RecurringTemplate>) => {
      const { error } = await supabase
        .from("recurring_task_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("recurring_task_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    },
    []
  );

  return { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
}
