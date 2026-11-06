// The two prompts Kindling sends to Claude. Edit these to tune the voice and the output.
import { CIRCLES, profileText } from "./shared.js";

export const SYSTEM = `You are Kindling, a warm, direct coach who applies Jim Collins's Hedgehog Concept to one person's life and work. Plain words, short sentences, no hype, no exclamation points. You always answer with a single JSON object and nothing else.`;

export function suggestPrompt({ circle, name, lists, ctx, shown }) {
  return `The person is filling in the three circles of the Hedgehog Concept.
They're working on this circle: "${CIRCLES[circle]}"

Everything they've entered so far:
${profileText(name, lists)}${ctx.notes ? `Extra context: ${ctx.notes}\n` : ""}${shown.length ? `Suggestions already shown (do not repeat): ${shown.join("; ")}\n` : ""}
Do two things:
1. "reframe": ask this circle's question a different way so they think of new items. One sentence, second person, concrete (for example "What do friends text you for help with?"). Use a fresh angle each time.
2. "suggestions": 6 short items (2–5 words each) this person might add to THIS circle. Infer them from what they've said in any circle so they feel personal. Mix obvious and less obvious. Never duplicate items they already have. If they've entered almost nothing, give a varied, everyday starter set.

Return only JSON: {"reframe": string, "suggestions": [string, string, string, string, string, string]}`;
}

export function analyzePrompt({ name, lists, ctx }) {
  const extra = [ctx.time && `Time available: ${ctx.time}`, ctx.money && `Money goal: ${ctx.money}`, ctx.notes && `Notes: ${ctx.notes}`]
    .filter(Boolean).join("\n");
  return `A Hedgehog Concept is not a goal or bravado. It's a clear understanding of where three circles overlap: what someone is deeply passionate about, what they can be the best at, and what the world wants or needs (what can drive an economic or resource engine). Find that overlap with egoless clarity and point it at concrete paths.

Their answers:
${profileText(name, lists)}${extra || "No extra context given."}

Rules:
- Ground everything in their actual words. In each "why", name the specific items from their circles that the idea draws on.
- Be specific. "Youth wrestling coach at a local club" beats "coaching". Use real job titles, real kinds of businesses, real kinds of organizations.
- First steps must be small, concrete, and doable within about a week: who to message, what to search, what to try once. No "do research" or "network more".
- Respect the time and money context if given (under 5 hrs/week means side-sized steps).
- Talk to them as "you".

Return only JSON in exactly this shape:
{
  "hedgehog_statement": "one sentence, max 25 words, starting with 'You' — the overlap stated plainly, like a fact",
  "explanation": "2–3 sentences on why these circles meet here, referencing their answers",
  "key_items": {"like": [up to 3 items from their list], "good": [up to 3], "need": [up to 3]},
  "first_move": "one specific action for the next 48 hours",
  "categories": {
    "careers": [3 items],
    "side_hustles": [3 items],
    "volunteering": [2 items],
    "hobbies": [2 items]
  }
}
Each category item is {"title": string, "why": "1–2 sentences", "steps": [2–3 short first steps]}.`;
}
