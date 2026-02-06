import { getEnv, json } from "./_util";

export async function onRequestPost(ctx) {
  try {
    const GAS_URL = getEnv(ctx, "GAS_URL");
    const SECRET = getEnv(ctx, "SECRET");

    const body = await ctx.request.json().catch(() => ({}));
    // ส่งไป doPost ของ GAS (submit)
    const payload = { ...body, secret: SECRET };

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const out = await res.json().catch(() => ({}));
    return json(out, res.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
