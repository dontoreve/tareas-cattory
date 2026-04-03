import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// web-push: install with `npm install web-push`
// VAPID keys come from environment variables (set in .env.local)
// Generate keys once with: npx web-push generate-vapid-keys
// NEXT_PUBLIC_VAPID_PUBLIC_KEY — same as client-side
// VAPID_PRIVATE_KEY — server-only secret
// VAPID_SUBJECT — "mailto:your@email.com" or your app URL

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@cattory.app";

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  task_id?: string | null;
  url?: string;
}

export async function POST(req: NextRequest) {
  // Only allow internal calls (check secret header or service role)
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.PUSH_API_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID_PRIVATE_KEY not set — push disabled");
    return NextResponse.json({ sent: 0, reason: "push_disabled" });
  }

  // Dynamically import web-push (only available server-side)
  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    return NextResponse.json({ error: "web-push not installed. Run: npm install web-push" }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Fetch all push subscriptions for this user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // service role needed to read push_subscriptions
  );

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", payload.user_id);

  if (error || !subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no_subscriptions" });
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    type: payload.type,
    task_id: payload.task_id ?? null,
    url: payload.url ?? "/",
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
      // 410 Gone = subscription expired, clean it up
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
