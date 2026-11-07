// Shared helpers for Kindling's Pages Functions.

export const CIRCLES = {
  like: "What do you love doing?",
  good: "What are you good at?",
  need: "What does the world want or need?",
};
export const ORDER = ["like", "good", "need"];

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function readBody(request, maxBytes = 30000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large.");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "Invalid JSON."); }
}

const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function cleanLists(lists) {
  const out = {};
  for (const k of ORDER) {
    const arr = Array.isArray(lists?.[k]) ? lists[k] : [];
    out[k] = arr.map((x) => clip(x, 80)).filter(Boolean).slice(0, 25);
  }
  return out;
}

export function cleanCtx(ctx) {
  return { time: clip(ctx?.time, 60), money: clip(ctx?.money, 60), notes: clip(ctx?.notes, 500) };
}

export function profileText(name, lists) {
  let t = name ? `Name: ${clip(name, 40)}\n` : "";
  for (const k of ORDER) t += `${CIRCLES[k]} -> ${lists[k].length ? lists[k].join("; ") : "(nothing yet)"}\n`;
  return t;
}

// Calls the Anthropic Messages API and returns a structured object.
// Claude is forced to answer through a tool whose input_schema describes the shape,
// so the API hands back parsed JSON instead of text we have to parse ourselves.
export async function claudeJSON(env, { system, prompt, maxTokens = 1500, schema, toolName = "respond" }) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(500, "Server is missing ANTHROPIC_API_KEY.");
  const body = {
    model: (env.MODEL || "").trim() || "claude-sonnet-5-5",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  };
  if (schema) {
    body.tools = [{ name: toolName, description: "Return your answer in this exact structure.", input_schema: schema }];
    body.tool_choice = { type: "tool", name: toolName };
  }

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status === 529) throw new HttpError(429, "Claude is busy right now. Try again in a minute.");
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Anthropic error", res.status, detail.slice(0, 800));
      if (res.status === 404 || /model/i.test(detail)) throw new HttpError(502, "The MODEL setting isn't a valid Claude model. Check it in Cloudflare.");
      if (res.status === 401) throw new HttpError(502, "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Cloudflare.");
      throw new HttpError(502, "Claude request failed. Try again.");
    }
    const data = await res.json();
    if (data.stop_reason === "max_tokens") console.error("Claude hit max_tokens", maxTokens);

    const tool = (data.content || []).find((b) => b.type === "tool_use");
    if (tool && tool.input && typeof tool.input === "object" && data.stop_reason !== "max_tokens") return tool.input;

    // Fallback: pull JSON out of plain text.
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    try { if (match) return JSON.parse(match[0]); } catch {}
    lastErr = `stop_reason=${data.stop_reason}; text=${text.slice(0, 300)}`;
    console.error("Unusable reply, attempt", attempt + 1, lastErr);
  }
  throw new HttpError(502, "Claude's answer came back incomplete. Try again.");
}

export function handle(fn) {
  return async (ctx) => {
    try { return await fn(ctx); }
    catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong." }, 500);
    }
  };
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
