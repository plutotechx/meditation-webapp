async function forward(env) {
  const payload = { action: "names", secret: env.SECRET };

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
}

export async function onRequest({ request, env }) {
  // รองรับทั้ง GET และ POST กันพลาด
  if (request.method === "GET" || request.method === "POST") {
    return forward(env);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
