import { getEnv, withAction, json } from "./_util";

export async function onRequestGet(ctx) {
  try {
    const GAS_URL = getEnv(ctx, "GAS_URL");
    const SECRET = getEnv(ctx, "SECRET");

    const urlIn = new URL(ctx.request.url);
    const name = urlIn.searchParams.get("name") || "";
    const dateISO = urlIn.searchParams.get("dateISO") || "";

    if (!name || !dateISO) return json({ ok:false, error:"missing_fields" }, 400);

    const gasUrl = new URL(withAction(GAS_URL, "checkStatus", SECRET));
    gasUrl.searchParams.set("name", name);
    gasUrl.searchParams.set("dateISO", dateISO);

    const res = await fetch(gasUrl.toString(), { method: "GET" });
    const out = await res.json().catch(() => ({}));

    return json(out, res.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
