"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

interface UseNotificationsOptions {
  userId: string | null;
  role: "admin" | "member";
}

export function useNotifications({ userId, role }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) { console.error("[notifications] fetch failed:", error.message); }
    if (data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }, [userId]);

  // Check overdue notifications then fetch
  useEffect(() => {
    if (!userId) return;

    async function init() {
      // Server-side overdue check
      const { error: rpcErr } = await supabase.rpc("check_overdue_notifications", {
        p_user_id: userId,
        p_is_admin: role === "admin",
      });
      if (rpcErr) console.warn("[notifications] check_overdue RPC failed:", rpcErr.message);
      await fetchNotifications();
    }
    init();
  }, [userId, role, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            // Deduplicate
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((cur) => cur.filter((n) => n.id !== id));
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) {
        console.error("[notifications] dismiss failed:", error.message);
        setNotifications(prev); // rollback
      }
    },
    [notifications]
  );

  const clearAll = useCallback(async () => {
    if (!userId) return;
    const prev = notifications;
    setNotifications([]);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) {
      console.error("[notifications] clearAll failed:", error.message);
      setNotifications(prev); // rollback
    }
  }, [userId, notifications]);

  return {
    notifications,
    loading,
    count: notifications.length,
    dismiss,
    clearAll,
    refetch: fetchNotifications,
  };
}
