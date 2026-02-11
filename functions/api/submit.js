// submit.js (Cloudflare Pages/Functions) - strict "today only" + drift check
// Accepts logDate from UI but normalizes/overrides to prevent backdating by changing device date.
// Assumes tzOffsetMin is from JS Date.getTimezoneOffset() (e.g. Thailand = -420).
// DRIFT tolerance: 10 minutes.

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      logDate,     // UI date (can be D/M/YYYY or YYYY-MM-DD); we will normalize/override
      session,
      duration,
      weekday,
      clientNow,   // client timestamp ISO string
      tzOffsetMin  // from new Date().getTimezoneOffset()
    } = body || {};

    // ===== Required fields =====
    if (!name || !session || !duration || !clientNow || typeof tzOffsetMin === "undefined") {
      return json({ ok: false, error: "missing_fields" }, 400);
    }

    // ===== Validate tzOffsetMin (getTimezoneOffset range) =====
    const tz = Number(tzOffsetMin);
    if (!Number.isFinite(tz) || !Number.isInteger(tz) || tz < -720 || tz > 840) {
      return json({ ok: false, error: "bad_tzOffsetMin" }, 400);
    }

    // ===== Validate clientNow =====
    const clientDt = new Date(String(clientNow));
    if (Number.isNaN(clientDt.getTime())) {
      return json({ ok: false, error: "bad_clientNow" }, 400);
    }

    // ===== Server time (Cloudflare edge) =====
    const serverDt = new Date();

    // ===== Clock drift check (protect against device time change) =====
    const DRIFT_MS = 10 * 60 * 1000; // 10 minutes
    const drift = Math.abs(serverDt.getTime() - clientDt.getTime());
    if (drift > DRIFT_MS) {
      return json(
        {
          ok: false,
          error: "clock_drift_too_large",
          detail: { driftSeconds: Math.round(drift / 1000) }
        },
        400
      );
    }

    // ===== Strict: must be "today" in user's local day =====
    // tzOffsetMin is getTimezoneOffset (UTC - Local) in minutes.
    const clientLocalISO = toLocalISODate(clientDt, tz);
    const serverLocalISO = toLocalISODate(serverDt, tz);

    // Normalize logDate from UI (optional; used only for extra sanity/debug)
    const uiISO = normalizeToISODate(logDate);

    // If UI sends a date and it doesn't match client's derived local day -> reject (prevents UI tricks)
    if (uiISO && uiISO !== clientLocalISO) {
      return json(
        {
          ok: false,
          error: "logDate_mismatch_client_local_day",
          detail: { uiISO, clientLocalISO }
        },
        400
      );
    }

    // Final authority: serverLocalISO must match (prevents backdating by changing device date)
    if (clientLocalISO !== serverLocalISO) {
      // This usually only happens near midnight + network delay; but you've chosen strict.
      return json(
        {
          ok: false,
          error: "client_day_not_match_server_day",
          detail: { clientLocalISO, serverLocalISO }
        },
        400
      );
    }

    // Overwrite logDate to a stable "local day" format for GAS (keeps Sheet consistent).
    // If your GAS expects a different format, change this ONE line.
    const finalLogDate = isoToDMY(serverLocalISO); // e.g. "10/2/2026" (D/M/YYYY)

    // ===== Optional: basic session sanity =====
    const sess = String(session).trim();
    if (!sess) return json({ ok: false, error: "bad_session" }, 400);

    const payload = {
      secret: env.SECRET,
      name,
      logDate: finalLogDate,
      weekday: weekday || "",
      session: sess,
      duration,
      clientNow: clientDt.toISOString(),
      tzOffsetMin: tz,
      serverNow: serverDt.toISOString(),     // audit
      logDateISO: serverLocalISO             // audit (safe extra field; GAS can ignore)
    };

    const res = await fetch(env.GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const out = await res.json().catch(() => ({}));
    return json(out, res.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

/**
 * Convert UTC Date to "local day" ISO YYYY-MM-DD using getTimezoneOffset sign convention.
 * tzOffsetMin = Date.getTimezoneOffset() = (UTC - Local) minutes
 * Local = UTC - tzOffsetMin
 */
function toLocalISODate(dt, tzOffsetMin) {
  const msLocal = dt.getTime() - tzOffsetMin * 60 * 1000;
  const d = new Date(msLocal);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/**
 * Accepts:
 * - YYYY-MM-DD
 * - D/M/YYYY or DD/MM/YYYY
 * Returns ISO YYYY-MM-DD or "" if unknown/empty.
 */
function normalizeToISODate(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // D/M/YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = String(Number(m[1])).padStart(2, "0");
    const mo = String(Number(m[2])).padStart(2, "0");
    const y = String(Number(m[3]));
    return `${y}-${mo}-${d}`;
  }
  return "";
}

function isoToDMY(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return `${d}/${mo}/${y}`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
