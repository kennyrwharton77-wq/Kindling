// Runs the full Hedgehog analysis.
import { json, handle, readBody, cleanLists, cleanCtx, claudeJSON, ORDER, HttpError } from "../../lib/shared.js";
import { SYSTEM, analyzePrompt } from "../../lib/prompts.js";
import { mockAnalyze } from "../../lib/mock.js";

const str = (v, n) => String(v ?? "").slice(0, n);
const items = (arr, max) =>
  (Array.isArray(arr) ? arr : []).slice(0, max).map((i) => ({
    title: str(i?.title, 120),
    why: str(i?.why, 500),
    steps: (Array.isArray(i?.steps) ? i.steps : []).slice(0, 4).map((s) => str(s, 300)),
  })).filter((i) => i.title);

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request);
  const input = { name: body.name, lists: cleanLists(body.lists), ctx: cleanCtx(body.ctx) };
  if (ORDER.some((k) => input.lists[k].length < 1)) throw new HttpError(400, "Each circle needs at least one item.");

  const out = env.MOCK_AI === "1"
    ? mockAnalyze(input)
    : await claudeJSON(env, { system: SYSTEM, prompt: analyzePrompt(input), maxTokens: 3000 });
  if (!out?.hedgehog_statement) throw new HttpError(502, "Claude's answer was incomplete. Try again.");

  const k = out.key_items || {};
  const c = out.categories || {};
  return json({
    hedgehog_statement: str(out.hedgehog_statement, 300),
    explanation: str(out.explanation, 1000),
    first_move: str(out.first_move, 400),
    key_items: Object.fromEntries(ORDER.map((x) => [x, (Array.isArray(k[x]) ? k[x] : []).slice(0, 3).map((s) => str(s, 80))])),
    categories: {
      careers: items(c.careers, 4),
      side_hustles: items(c.side_hustles, 4),
      volunteering: items(c.volunteering, 3),
      hobbies: items(c.hobbies, 3),
    },
  });
});
