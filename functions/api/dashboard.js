export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const weekStartISO = (u.searchParams.get("weekStartISO") || "").trim();
  const weekEndISO = (u.searchParams.get("weekEndISO") || "").trim();

  const url = new URL(env.GAS_URL);
  url.searchParams.set("action", "dashboard");
  url.searchParams.set("secret", env.SECRET);

  // ส่งช่วงสัปดาห์ที่ “คำนวณจากเครื่องผู้ดู dashboard”
  if (weekStartISO) url.searchParams.set("weekStartISO", weekStartISO);
  if (weekEndISO) url.searchParams.set("weekEndISO", weekEndISO);

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
