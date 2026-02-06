export async function onRequestGet({ request, env }) {
  try {
    const reqUrl = new URL(request.url);
    const name = reqUrl.searchParams.get("name") || "";
    const logDate = reqUrl.searchParams.get("logDate") || "";

    const url = new URL(env.GAS_URL);
    url.searchParams.set("action", "checkStatus");
    url.searchParams.set("secret", env.SECRET);
    url.searchParams.set("name", name);
    url.searchParams.set("logDate", logDate);

    const res = await fetch(url.toString(), { method: "GET" });
    const out = await res.json().catch(() => ({}));

    return new Response(JSON.stringify(out), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
