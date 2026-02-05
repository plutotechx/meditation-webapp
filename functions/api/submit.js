export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));

    const payload = {
      action: "submit",
      secret: env.SECRET,
      ...body,
    };

    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
