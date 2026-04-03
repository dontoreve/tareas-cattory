"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

interface MemberAccess {
  member_id: string;
  project_id: string;
}

interface UseProjectsOptions {
  userId: string | null;
  role: "admin" | "member";
}

export function useProjects({ userId, role }: UseProjectsOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [memberAccess, setMemberAccess] = useState<MemberAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*");
    if (data) setProjects(data as Project[]);
  }, []);

  const fetchMemberAccess = useCallback(async () => {
    const { data } = await supabase
      .from("member_project_access")
      .select("member_id, project_id");
    if (data) setMemberAccess(data);
  }, []);

  useEffect(() => {
    if (!userId) return;
    Promise.all([fetchProjects(), fetchMemberAccess()]).finally(() =>
      setLoading(false)
    );
  }, [userId, fetchProjects, fetchMemberAccess]);

  // Realtime for project changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => fetchProjects()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_project_access" },
        () => fetchMemberAccess()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProjects, fetchMemberAccess]);

  /** Get projects visible to a specific member */
  const getProjectsForMember = useCallback(
    (memberId: string) => {
      if (role === "admin") return projects;
      const accessIds = new Set(
        memberAccess
          .filter((a) => a.member_id === memberId)
          .map((a) => a.project_id)
      );
      return projects.filter((p) => accessIds.has(p.id));
    },
    [projects, memberAccess, role]
  );

  /** Check if a member has access to a project */
  const hasMemberAccess = useCallback(
    (memberId: string, projectId: string) => {
      if (role === "admin") return true;
      return memberAccess.some(
        (a) => a.member_id === memberId && a.project_id === projectId
      );
    },
    [memberAccess, role]
  );

  const createProject = useCallback(
    async (name: string) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name, owner_id: userId! })
        .select("*")
        .single();
      if (error) throw error;
      setProjects((prev) => [...prev, data as Project]);
      return data as Project;
    },
    [userId]
  );

  const renameProject = useCallback(
    async (projectId: string, name: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ name })
        .eq("id", projectId);
      if (error) throw error;
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, name } : p))
      );
    },
    []
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      // Unassign tasks from this project
      await supabase
        .from("tasks")
        .update({ project_id: null })
        .eq("project_id", projectId);
      // Remove member access
      await supabase
        .from("member_project_access")
        .delete()
        .eq("project_id", projectId);
      // Delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    },
    []
  );

  return {
    projects,
    memberAccess,
    loading,
    refetch: fetchProjects,
    getProjectsForMember,
    hasMemberAccess,
    createProject,
    renameProject,
    deleteProject,
  };
}
