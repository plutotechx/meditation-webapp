export async function onRequestGet({ env }) {
  try {
    const url = new URL(env.GAS_URL);
    url.searchParams.set("action", "names");
    url.searchParams.set("secret", env.SECRET);

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
