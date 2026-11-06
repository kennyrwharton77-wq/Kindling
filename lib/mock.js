// Canned replies used when MOCK_AI=1, so the app can be run and tested without an API key.

export function mockSuggest({ circle, shown }) {
  const pool = {
    like: ["Teaching someone a skill", "Being outdoors", "Fixing broken things", "Planning trips", "Coaching a team", "Cooking for friends", "Telling stories"],
    good: ["Staying calm under pressure", "Explaining complex things", "Organizing people", "Spotting problems early", "Building trust fast", "Following through"],
    need: ["Mentors for young men", "Reliable local tradespeople", "Help for veterans changing careers", "Small-business marketing", "Youth sports coaches", "Financial basics for families"],
  }[circle];
  const left = pool.filter((s) => !shown.includes(s));
  return { reframe: "What do people come to you for when they're stuck?", suggestions: (left.length ? left : pool).slice(0, 6) };
}

export function mockAnalyze({ lists }) {
  const step = (t) => ({ title: t, why: `Draws on "${lists.like[0]}" and "${lists.good[0]}" to meet "${lists.need[0]}".`, steps: ["Message one person already doing this and ask for 15 minutes.", "Block two hours this weekend to try a small version.", "Write down what energized you and what didn't."] });
  return {
    hedgehog_statement: `You help people get unstuck by combining ${lists.like[0].toLowerCase()} with ${lists.good[0].toLowerCase()}.`,
    explanation: "This is mock output so the app can be tested without an API key. Set MOCK_AI to 0 and add ANTHROPIC_API_KEY for real results.",
    key_items: { like: lists.like.slice(0, 3), good: lists.good.slice(0, 3), need: lists.need.slice(0, 3) },
    first_move: "Text two friends and ask what they'd pay you to help with.",
    categories: {
      careers: [step("Program coordinator at a local nonprofit"), step("Corporate trainer"), step("Operations lead at a small company")],
      side_hustles: [step("Weekend workshop series"), step("One-on-one coaching"), step("Local service business")],
      volunteering: [step("Mentor at a youth program"), step("Veterans transition volunteer")],
      hobbies: [step("Join a local meetup"), step("Start a monthly skills night")],
    },
  };
}
