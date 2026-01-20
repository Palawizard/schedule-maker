import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!supabaseUrl || !supabaseKey) {
    return new Response("Missing Supabase config", { status: 500 });
  }

  const { token } = await context.params;
  if (!isUuid(token)) {
    return new Response("Invalid token", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("get_shared_schedule", {
    share_token: token,
  });

  if (error) {
    return new Response("Not found", { status: 404 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ share: row });
}
