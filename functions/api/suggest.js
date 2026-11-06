// "Dig deeper": reframes the current circle's question and suggests items to add.
import { json, handle, readBody, cleanLists, cleanCtx, claudeJSON, ORDER, HttpError } from "../../lib/shared.js";
import { SYSTEM, suggestPrompt } from "../../lib/prompts.js";
import { mockSuggest } from "../../lib/mock.js";

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request);
  if (!ORDER.includes(body.circle)) throw new HttpError(400, "Unknown circle.");
  const input = {
    circle: body.circle,
    name: body.name,
    lists: cleanLists(body.lists),
    ctx: cleanCtx(body.ctx),
    shown: (Array.isArray(body.shown) ? body.shown : []).map((s) => String(s).slice(0, 80)).slice(0, 30),
  };
  if (env.MOCK_AI === "1") return json(mockSuggest(input));

  const out = await claudeJSON(env, { system: SYSTEM, prompt: suggestPrompt(input), maxTokens: 600 });
  const have = new Set(input.lists[input.circle].map((s) => s.toLowerCase()));
  return json({
    reframe: String(out.reframe || "").slice(0, 300),
    suggestions: (Array.isArray(out.suggestions) ? out.suggestions : [])
      .map((s) => String(s).trim().slice(0, 80))
      .filter((s) => s && !have.has(s.toLowerCase()))
      .slice(0, 8),
  });
});
