export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, logDate, session, duration, weekday, clientNow, tzOffsetMin } = body || {};

    // ===== Basic required fields =====
    if (!name || !logDate || !session || !duration) {
      return json({ ok: false, error: "missing_fields" }, 400);
    }

    // ===== Validate logDate format (YYYY-MM-DD) =====
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(logDate))) {
      return json({ ok: false, error: "bad_logDate_format" }, 400);
    }

    // ===== Validate tzOffsetMin =====
    const tz = Number(tzOffsetMin);
    if (!Number.isFinite(tz) || !Number.isInteger(tz) || tz < -720 || tz > 840) {
      return json({ ok: false, error: "bad_tzOffsetMin" }, 400);
    }

    // ===== Validate clientNow =====
    const clientDt = new Date(String(clientNow || ""));
    if (isNaN(clientDt.getTime())) {
      return json({ ok: false, error: "bad_clientNow" }, 400);
    }

    // ===== Server time (Cloudflare edge) =====
    const serverDt = new Date();

    // ===== Clock drift check (protect against device time change) =====
    const DRIFT_MS = 10 * 60 * 1000; // 10 minutes
    const drift = Math.abs(serverDt.getTime() - clientDt.getTime());
    if (drift > DRIFT_MS) {
      return json({
        ok: false,
        error: "clock_drift_too_large",
        detail: { driftSeconds: Math.round(drift / 1000) }
      }, 400);
    }

    // ===== Strict: logDate must be "today" in user's local day =====
    // We derive user's "local day" from tzOffsetMin and compare against BOTH:
    // (1) client's own timestamp, and (2) server timestamp (prevents backdating via UI).
    const clientLocalISO = toLocalISODate(clientDt, tz);
    const serverLocalISO = toLocalISODate(serverDt, tz);

    if (String(logDate) !== clientLocalISO) {
      return json({
        ok: false,
        error: "logDate_mismatch_client_local_day",
        detail: { logDate, clientLocalISO }
      }, 400);
    }

    if (String(logDate) !== serverLocalISO) {
      return json({
        ok: false,
        error: "logDate_not_today_local",
        detail: { logDate, serverLocalISO }
      }, 400);
    }

    // ===== Optional: basic session sanity (keep permissive) =====
    const sess = String(session).trim();
    if (!sess) {
      return json({ ok: false, error: "bad_session" }, 400);
    }

    const payload = {
      secret: env.SECRET,
      name,
      logDate,               // YYYY-MM-DD (วันท้องถิ่นผู้ใช้)
      weekday: weekday || "", // ยังส่งไปได้ แต่ไม่ใช้เป็นตัวตัดสินความถูกต้อง
      session: sess,
      duration,
      clientNow: clientDt.toISOString(), // normalize
      tzOffsetMin: tz,
      serverNow: serverDt.toISOString(), // audit
    };

    const res = await fetch(env.GAS_URL, {
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

function toLocalISODate(dt, tzOffsetMin) {
  // dt is UTC-based Date; tzOffsetMin is minutes offset from UTC (e.g. Thailand +420)
  const ms = dt.getTime() + (tzOffsetMin * 60 * 1000);
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
