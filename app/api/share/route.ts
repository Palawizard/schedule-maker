import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "";

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return new Response("Missing Supabase config", { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let scheduleId: string | null = null;
  try {
    const body = (await request.json()) as { scheduleId?: string };
    scheduleId = body.scheduleId ?? null;
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (!scheduleId) {
    return new Response("Missing scheduleId", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("create_schedule_share", {
    schedule_id: scheduleId,
  });

  if (error) {
    return new Response(error.message, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  const shareToken = row?.share_token ?? null;
  if (!shareToken) {
    return new Response("Share token missing", { status: 500 });
  }

  return Response.json({ shareToken });
}
