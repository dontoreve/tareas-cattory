import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Env ──────────────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@cattory.app";
const PUSH_API_SECRET = process.env.PUSH_API_SECRET;

// ── Build human-readable message from notification type + data ────────────
function buildMessage(type: string, data: Record<string, unknown>): { title: string; body: string } {
  const taskTitle = (data?.task_title as string) || "una tarea";

  switch (type) {
    case "task_assigned":
      return { title: "Nueva asignación", body: `Te asignaron "${taskTitle}"` };
    case "task_completed":
      return { title: "Tarea completada", body: `"${taskTitle}" fue completada` };
    case "overdue":
      return { title: "Tarea vencida", body: `"${taskTitle}" está vencida` };
    case "deadline_approaching": {
      const dl = data?.deadline as string | undefined;
      const when = dl
        ? new Date(dl).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
        : "pronto";
      return { title: "Fecha límite cerca", body: `"${taskTitle}" vence ${when}` };
    }
    case "daily_digest": {
      const pending = (data?.pending as number) ?? 0;
      const overdue = (data?.overdue as number) ?? 0;
      const body = overdue > 0
        ? `Tienes ${pending} tareas pendientes, ${overdue} vencidas`
        : `Tienes ${pending} tareas pendientes`;
      return { title: "Resumen del día", body };
    }
    default:
      return { title: "Cattory", body: "Tienes una nueva notificación" };
  }
}

// ── POST handler — receives Supabase Database Webhook payload ─────────────
export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (PUSH_API_SECRET && authHeader !== `Bearer ${PUSH_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PRIVATE_KEY) {
    return NextResponse.json({ sent: 0, reason: "push_disabled" });
  }

  // Parse Supabase webhook payload
  let record: Record<string, unknown>;
  try {
    const payload = await req.json();
    record = payload.record ?? payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = record.user_id as string;
  const notifType = record.type as string;
  const notifData = (record.data as Record<string, unknown>) ?? {};
  const taskId = (record.task_id as string) ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Build message
  const { title, body } = buildMessage(notifType, notifData);

  // Import web-push
  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    return NextResponse.json({ error: "web-push not installed" }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Fetch push subscriptions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no_subscriptions" });
  }

  const message = JSON.stringify({
    title,
    body,
    type: notifType,
    task_id: taskId,
    url: taskId ? `/?task=${taskId}` : "/",
  });

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  // Cleanup stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ sent, total: subs.length });
}
