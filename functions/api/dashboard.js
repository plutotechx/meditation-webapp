export async function onRequest({ env }) {
  try {
    if (!env.GAS_URL || !env.SECRET) {
      return new Response(JSON.stringify({ ok:false, error:"missing_env(GAS_URL/SECRET)" }), {
        headers: { "Content-Type":"application/json" }, status: 500
      });
    }

    const url = new URL(env.GAS_URL);
    url.searchParams.set("action", "dashboard");
    url.searchParams.set("secret", env.SECRET);

    const r = await fetch(url.toString(), { method: "GET" });
    const text = await r.text();

    return new Response(text, {
      headers: { "Content-Type":"application/json" },
      status: r.status
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      headers: { "Content-Type":"application/json" }, status: 500
    });
  }
}
