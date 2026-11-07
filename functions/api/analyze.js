// Runs the full Hedgehog analysis.
import { json, handle, readBody, cleanLists, cleanCtx, claudeJSON, ORDER, HttpError } from "../../lib/shared.js";
import { SYSTEM, analyzePrompt, ANALYZE_SCHEMA } from "../../lib/prompts.js";
import { mockAnalyze } from "../../lib/mock.js";

const str = (v, n) => String(v ?? "").slice(0, n);

// Claude sometimes sends nested objects/arrays as JSON text inside the tool input. Undo that, recursively.
function unstring(v, depth = 0) {
  if (depth > 6) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try { return unstring(JSON.parse(t), depth + 1); } catch { return v; }
    }
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => unstring(x, depth + 1));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unstring(x, depth + 1)]));
  return v;
}

// Look up a field under any of several names (case/space/hyphen-insensitive).
const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
function pick(obj, names) {
  if (!obj || typeof obj !== "object") return undefined;
  const want = names.map(norm);
  for (const [k, v] of Object.entries(obj)) if (want.includes(norm(k))) return v;
  return undefined;
}

const toArray = (v) => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];

function items(arr, max) {
  return toArray(arr).slice(0, max).map((i) => {
    if (typeof i === "string") return { title: str(i, 120), why: "", steps: [] };
    let steps = pick(i, ["steps", "first_steps", "firststeps", "next_steps"]);
    if (typeof steps === "string") steps = steps.split(/\n|\s(?=\d+[.)]\s)/);
    steps = toArray(steps).map((s) => String(s).replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim()).filter(Boolean);
    return {
      title: str(pick(i, ["title", "name", "idea", "role"]), 120),
      why: str(pick(i, ["why", "reason", "fit", "why_it_fits"]), 500),
      steps: toArray(steps).slice(0, 4).map((s) => str(s, 300)),
    };
  }).filter((i) => i.title);
}

const CAT_NAMES = {
  careers: ["careers", "career", "jobs"],
  side_hustles: ["side_hustles", "sidehustles", "side_hustle", "businesses"],
  volunteering: ["volunteering", "volunteer", "purpose", "purpose_and_service", "service"],
  hobbies: ["hobbies", "hobby", "things_to_try", "thingstotry"],
};
const CAT_MAX = { careers: 4, side_hustles: 4, volunteering: 3, hobbies: 3 };

function categories(out) {
  const c = pick(out, ["categories", "ideas", "paths"]) || out; // some replies put the lists at the top level
  return Object.fromEntries(Object.keys(CAT_NAMES).map((id) => [id, items(pick(c, CAT_NAMES[id]), CAT_MAX[id])]));
}

// Claude sometimes skips key_items or uses other key names; fall back to the person's own answers.
const KEY_NAMES = { like: ["like", "love", "love_doing", "loves"], good: ["good", "good_at", "skills"], need: ["need", "needs", "world_needs"] };
function keyItems(k, circle, own) {
  let v = pick(k, KEY_NAMES[circle]);
  if (typeof v === "string") v = v.split(/[;,•]/);
  const picked = toArray(v).map((s) => str(s, 80).trim()).filter(Boolean).slice(0, 3);
  return picked.length ? picked : own.slice(0, 3);
}

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request);
  const input = { name: body.name, lists: cleanLists(body.lists), ctx: cleanCtx(body.ctx) };
  if (ORDER.some((k) => input.lists[k].length < 1)) throw new HttpError(400, "Each circle needs at least one item.");

  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = env.MOCK_AI === "1"
      ? mockAnalyze(input)
      : await claudeJSON(env, { system: SYSTEM, prompt: analyzePrompt(input), maxTokens: 8000, schema: ANALYZE_SCHEMA });
    const out = unstring(raw);
    const statement = pick(out, ["hedgehog_statement", "statement", "hedgehog"]);
    if (!statement) { console.error("No statement; keys:", Object.keys(out || {})); continue; }

    result = {
      hedgehog_statement: str(statement, 300),
      explanation: str(pick(out, ["explanation", "why"]), 1000),
      first_move: str(pick(out, ["first_move", "firstmove", "next_move"]), 400),
      key_items: Object.fromEntries(ORDER.map((x) => [x, keyItems(pick(out, ["key_items", "keyitems"]), x, input.lists[x])])),
      categories: categories(out),
    };
    const ideaCount = Object.values(result.categories).reduce((n, a) => n + a.length, 0);
    if (ideaCount > 0) return json(result);
    console.error("No ideas parsed; raw shape:", JSON.stringify(raw).slice(0, 1500));
  }
  if (result) return json(result); // statement but no ideas after two tries: still show what we have
  throw new HttpError(502, "Claude's answer was incomplete. Try again.");
});
