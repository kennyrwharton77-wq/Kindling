// The two prompts Kindling sends to Claude. Edit these to tune the voice and the output.
import { CIRCLES, profileText } from "./shared.js";

export const SYSTEM = `You are Kindling, a warm, direct coach who applies Jim Collins's Hedgehog Concept to one person's life and work. Plain words, short sentences, no hype, no exclamation points. You always answer by calling the respond tool.`;

// What a good item looks like in each circle. Suggestions must stay in their circle's lane.
const CIRCLE_GUIDE = {
  like: {
    what: "a specific ACTIVITY they'd happily spend a free Saturday on. Verb + concrete object, something you could picture them doing.",
    good: ["Smoking brisket for a crowd", "Restoring old trucks", "Coaching my kid's wrestling team", "Planning group camping trips", "Fly fishing at dawn"],
    bad: ["Solving problems", "Helping people", "Learning new things", "Being creative", "Organizing chaos"],
    angles: "a free Saturday with nothing planned; what they spend money on without guilt; what they did as a kid before anyone paid them; what they read or watch about for fun; what they'd do with an extra paid day off",
  },
  good: {
    what: "a concrete SKILL or strength other people notice, rely on, or would pay for. Ideally something with proof behind it (a role, a result, a thing people ask them for).",
    good: ["Running a crew of 10", "Diagnosing engine problems", "Calming down angry customers", "Writing clear step-by-step guides", "Teaching beginners to shoot"],
    bad: ["Hard worker", "Good with people", "Problem solving", "Staying positive", "Thoughtful conversation"],
    angles: "what coworkers or friends call them for; what they've been praised or promoted for; what's easy for them but hard for others; what they've taught someone; a time they were the one who fixed it",
  },
  need: {
    what: "a specific GROUP of people with a specific PROBLEM or unmet need (who + what). Something real people struggle with or would pay to have solved.",
    good: ["Veterans translating military skills to civilian jobs", "Small contractors losing bids to bad paperwork", "Teens with no male mentor", "Seniors who can't keep up with home repairs", "New coaches with no playbook"],
    bad: ["Calm guidance", "Clear thinking in a crisis", "Better communication", "More kindness", "Patient teachers"],
    angles: "problems they see at work that nobody owns; what people in their community complain about; who they wish had helped them earlier in life; what local businesses or groups struggle with; a cause that makes them angry",
  },
};

export function suggestPrompt({ circle, name, lists, ctx, shown }) {
  const g = CIRCLE_GUIDE[circle];
  const total = lists.like.length + lists.good.length + lists.need.length;
  const basis = total === 0
    ? `They haven't entered anything yet, so you know nothing about them. Don't pretend to. Give a spread across different parts of life (work, home, outdoors, people, making things, competition, service, money), each one concrete enough that someone instantly thinks "yes, that's me" or "no, not me".`
    : `Build on what they've already entered. Go more specific and adjacent, not broader. Example: if they love "Fishing", suggest "Teaching kids to fish" or "Tying custom flies", not "Being outdoors". Use their other circles too: a skill in one circle hints at an activity or a need in another.`;
  return `The person is filling in the three circles of the Hedgehog Concept.
They're working on this circle: "${CIRCLES[circle]}"

Everything they've entered so far:
${profileText(name, lists)}${ctx.notes ? `Extra context: ${ctx.notes}\n` : ""}${shown.length ? `Suggestions already shown (do not repeat or rephrase): ${shown.join("; ")}\n` : ""}
In this circle, a good item is ${g.what}
Right level of specificity (examples only, don't reuse them): ${g.good.join("; ")}
Too vague (never write items like these): ${g.bad.join("; ")}
Every suggestion must belong in THIS circle. No personality traits or abstractions, and nothing that belongs in a different circle.

${basis}

Do two things:
1. "reframe": ask this circle's question a different way that jogs a specific memory or moment, so they think of things they'd never list on their own. One sentence, second person, concrete. Pick a fresh angle each time, e.g. ${g.angles}.
2. "suggestions": 6 items, 3–7 words each, written the way a real person would type them about themselves. Plain words. Never duplicate items they already have.

Answer with the respond tool: a "reframe" string and a "suggestions" list of 6.`;
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

Answer with the respond tool, filling in this shape:
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

// JSON schemas Claude must answer with (enforced through a forced tool call).
const idea = {
  type: "object",
  properties: {
    title: { type: "string" },
    why: { type: "string", description: "1–2 sentences naming the specific items from their circles this draws on" },
    steps: { type: "array", items: { type: "string" }, description: "2–3 small, concrete first steps" },
  },
  required: ["title", "why", "steps"],
};
const strList = { type: "array", items: { type: "string" } };

export const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    reframe: { type: "string", description: "The circle's question asked a fresh, concrete way" },
    suggestions: { ...strList, description: "6 specific items for this circle" },
  },
  required: ["reframe", "suggestions"],
};

export const ANALYZE_SCHEMA = {
  type: "object",
  properties: {
    hedgehog_statement: { type: "string" },
    explanation: { type: "string" },
    key_items: {
      type: "object",
      description: "The 1–3 items from EACH of their three lists that matter most to the overlap, copied word for word. All three lists must be filled.",
      properties: {
        like: { ...strList, description: "From 'What do you love doing?'" },
        good: { ...strList, description: "From 'What are you good at?'" },
        need: { ...strList, description: "From 'What does the world want or need?'" },
      },
      required: ["like", "good", "need"],
    },
    first_move: { type: "string" },
    categories: {
      type: "object",
      properties: {
        careers: { type: "array", items: idea },
        side_hustles: { type: "array", items: idea },
        volunteering: { type: "array", items: idea },
        hobbies: { type: "array", items: idea },
      },
      required: ["careers", "side_hustles", "volunteering", "hobbies"],
    },
  },
  required: ["hedgehog_statement", "explanation", "key_items", "first_move", "categories"],
};
