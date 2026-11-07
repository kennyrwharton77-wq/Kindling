// Emails a copy of the results to the address the user typed, via Resend.
import { json, handle, readBody, HttpError, esc, cleanLists, CIRCLES, ORDER } from "../../lib/shared.js";

const CATS = [["careers", "Careers"], ["side_hustles", "Side hustles"], ["volunteering", "Purpose & service"], ["hobbies", "Things to try"]];
const str = (v, n) => String(v ?? "").slice(0, n);

function render(name, r, lists) {
  const who = name ? `${esc(name)}'s` : "Your";
  const cats = CATS.map(([id, label]) => {
    const arr = Array.isArray(r.categories?.[id]) ? r.categories[id].slice(0, 4) : [];
    if (!arr.length) return "";
    return `<h3 style="font-family:Georgia,serif;color:#2a2420;margin:28px 0 8px">${label}</h3>` + arr.map((i) => `
      <div style="border:1px solid #eadfd2;border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fff">
        <div style="font-weight:600;font-size:16px;color:#2a2420">${esc(str(i.title, 120))}</div>
        <div style="color:#6f655c;font-size:14px;margin:4px 0 6px">${esc(str(i.why, 500))}</div>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:#2a2420">${(i.steps || []).slice(0, 4).map((s) => `<li style="margin-bottom:3px">${esc(str(s, 300))}</li>`).join("")}</ol>
      </div>`).join("");
  }).join("");
  const circles = ORDER.map((k) => `<div style="margin-bottom:4px"><b>${CIRCLES[k]}</b> ${esc(lists[k].join(", "))}</div>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#faf6ef;font-family:Arial,Helvetica,sans-serif;line-height:1.5">
  <div style="max-width:620px;margin:0 auto;padding:28px 20px">
    <div style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#b9502a;margin-bottom:16px">🔥 Kindling</div>
    <div style="background:#1f1a17;color:#fff;border-radius:16px;padding:24px">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#f6b27a">${who} Hedgehog</div>
      <div style="font-family:Georgia,serif;font-size:24px;line-height:1.3;margin:8px 0 12px">${esc(str(r.hedgehog_statement, 300))}</div>
      <div style="color:#e9dfd5;font-size:15px">${esc(str(r.explanation, 1000))}</div>
    </div>
    ${r.first_move ? `<div style="background:#f6e3d8;border-radius:12px;padding:14px 16px;margin-top:16px;color:#2a2420"><b style="color:#b9502a">Your first move (next 48 hours):</b> ${esc(str(r.first_move, 400))}</div>` : ""}
    ${cats}
    <h3 style="font-family:Georgia,serif;color:#2a2420;margin:28px 0 8px">Your circles</h3>
    <div style="font-size:14px;color:#2a2420">${circles}</div>
  </div></body></html>`;
}

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request, 60000);
  const to = str(body.to, 200).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new HttpError(400, "That email address doesn't look right.");
  const r = body.result || {};
  if (!r.hedgehog_statement) throw new HttpError(400, "No results to send.");
  const html = render(str(body.name, 40), r, cleanLists(body.lists));

  if (env.MOCK_AI === "1" && !env.RESEND_API_KEY) return json({ ok: true, mock: true });
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) throw new HttpError(500, "Email isn't set up on the server yet.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.RESEND_FROM, to: [to], subject: "Your Hedgehog — Kindling", html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend error", res.status, detail.slice(0, 500));
    let msg = "";
    try { msg = JSON.parse(detail)?.message || ""; } catch {}
    throw new HttpError(502, `Email failed (Resend ${res.status})${msg ? ": " + msg.slice(0, 250) : "."}`);
  }
  return json({ ok: true });
});
