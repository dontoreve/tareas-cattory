"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function useTeamMembers(userId: string | null) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .order("full_name");
    if (error) { console.error("[team] fetch members failed:", error.message); }
    if (data) setMembers(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId) fetchMembers();
  }, [userId, fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}
