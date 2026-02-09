export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const weekOffset = (u.searchParams.get("weekOffset") || "0").trim(); // "0" / "-1"

  const url = new URL(env.GAS_URL);
  url.searchParams.set("action", "dashboard");
  url.searchParams.set("secret", env.SECRET);
  url.searchParams.set("weekOffset", weekOffset);

  const res = await fetch(url.toString(), { method: "GET" });
  const out = await res.json().catch(() => ({}));
  return json(out, res.ok ? 200 : 500);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
