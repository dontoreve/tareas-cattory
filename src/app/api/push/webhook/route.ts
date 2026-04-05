import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Env ──────────────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@cattory.app";
const PUSH_API_SECRET = process.env.PUSH_API_SECRET;

// ── POST handler — receives Supabase Database Webhook payload ─────────────
// Supabase sends: { type: "INSERT", table: "notifications", record: { ... } }
export async function POST(req: NextRequest) {
  // Auth check — reject when secret is missing or mismatched
  const authHeader = req.headers.get("authorization");
  if (!PUSH_API_SECRET || authHeader !== `Bearer ${PUSH_API_SECRET}`) {
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
  const title = (record.title as string) || "Cattory";
  const body = (record.body as string) || "Tienes una nueva notificación";
  const notifType = (record.type as string) || "task_assigned";
  const taskId = (record.task_id as string) ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Import web-push
  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    return NextResponse.json({ error: "web-push not installed" }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Fetch push subscriptions for this user
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
