export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const name = (u.searchParams.get("name") || "").trim();
  const logDate = (u.searchParams.get("logDate") || "").trim(); // YYYY-MM-DD

  if (!name || !logDate) {
    return json({ ok:false, error:"missing_fields" }, 400);
  }

  const url = new URL(env.GAS_URL);
  url.searchParams.set("action", "checkStatus");
  url.searchParams.set("secret", env.SECRET);
  url.searchParams.set("name", name);
  url.searchParams.set("logDate", logDate);

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
