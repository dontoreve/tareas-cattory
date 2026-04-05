import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

interface PushNotificationsState {
  supported: boolean;
  permission: PushPermission;
  subscribed: boolean;
  loading: boolean;
}

interface UsePushNotificationsReturn extends PushNotificationsState {
  subscribe: (userId: string) => Promise<{ success: boolean; error?: string }>;
  unsubscribe: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationsState>({
    supported: false,
    permission: "unsupported",
    subscribed: false,
    loading: true,
  });

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      setState({ supported: false, permission: "unsupported", subscribed: false, loading: false });
      return;
    }

    const permission = Notification.permission as PushPermission;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState({ supported: true, permission, subscribed: !!sub, loading: false });
      })
      .catch(() => {
        setState({ supported: true, permission, subscribed: false, loading: false });
      });
  }, []);

  const subscribe = useCallback(async (userId: string) => {
    if (!state.supported) {
      return { success: false, error: "Push notifications not supported on this browser" };
    }
    if (!VAPID_PUBLIC_KEY) {
      return { success: false, error: "VAPID public key not configured" };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission: permission as PushPermission }));
        return { success: false, error: "Permission denied" };
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const rawKey = subscription.getKey("p256dh");
      const rawAuth = subscription.getKey("auth");

      if (!rawKey || !rawAuth) {
        return { success: false, error: "Failed to get subscription keys" };
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (dbError) {
        console.error("Error saving push subscription:", dbError);
        return { success: false, error: "Failed to save subscription" };
      }

      setState((s) => ({ ...s, permission: "granted", subscribed: true }));
      return { success: true };
    } catch (err) {
      console.error("Push subscription error:", err);
      return { success: false, error: String(err) };
    }
  }, [state.supported]);

  const unsubscribe = useCallback(async (userId: string) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", subscription.endpoint);

        await subscription.unsubscribe();
      }

      setState((s) => ({ ...s, subscribed: false }));
      return { success: true };
    } catch (err) {
      console.error("Push unsubscribe error:", err);
      return { success: false, error: String(err) };
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
}
