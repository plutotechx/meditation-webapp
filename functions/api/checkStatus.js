export async function onRequestGet({ request, env }) {
  try {
    const GAS_URL = env.GAS_URL;
    const SECRET  = env.SECRET;

    if (!GAS_URL) return json({ ok:false, error:"missing_env_GAS_URL" }, 500);
    if (!SECRET)  return json({ ok:false, error:"missing_env_SECRET" }, 500);

    const u = new URL(request.url);

    // ✅ ต้องมี 2 ตัวนี้
    const name = (u.searchParams.get("name") || "").trim();
    const logDate = (u.searchParams.get("logDate") || "").trim(); // YYYY-MM-DD

    if (!name || !logDate) {
      return json({ ok:false, error:"missing_fields", need:["name","logDate"] }, 400);
    }

    // ยิงไปที่ Apps Script ให้ถูก action
    const gas = new URL(GAS_URL);
    gas.searchParams.set("action", "checkStatus");
    gas.searchParams.set("secret", SECRET);
    gas.searchParams.set("name", name);
    gas.searchParams.set("logDate", logDate);

    const r = await fetch(gas.toString(), { method:"GET" });
    const t = await r.text();

    let out;
    try { out = JSON.parse(t); }
    catch { out = { ok:false, error:"bad_json_from_gas", raw:t }; }

    return json(out, r.ok ? 200 : 500);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}
