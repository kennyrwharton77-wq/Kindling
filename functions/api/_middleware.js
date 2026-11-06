// Runs before every /api/* route: POST only, and the shared access code must match.
import { json } from "../../lib/shared.js";

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequest(ctx) {
  if (ctx.request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const required = ctx.env.ACCESS_CODE || "";
  if (required) {
    const given = (ctx.request.headers.get("x-access-code") || "").trim().toLowerCase();
    if (!sameString(given, required.trim().toLowerCase())) return json({ error: "That access code didn't work." }, 401);
  }
  return ctx.next();
}
