export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, logDate, session, duration, weekday, clientNow, tzOffsetMin } = body || {};

    if (!name || !logDate || !session || !duration) {
      return json({ ok:false, error:"missing_fields" }, 400);
    }

    const payload = {
      secret: env.SECRET,
      name,
      logDate,         // YYYY-MM-DD (จากเครื่องผู้ใช้)
      weekday: weekday || "",
      session,
      duration,
      clientNow: clientNow || "",
      tzOffsetMin: (tzOffsetMin !== undefined && tzOffsetMin !== null) ? Number(tzOffsetMin) : null
    };

    const res = await fetch(env.GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const out = await res.json().catch(() => ({}));
    return json(out, res.ok ? 200 : 500);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
