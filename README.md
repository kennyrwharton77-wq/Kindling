# Kindling

A small web app built on Jim Collins's Hedgehog Concept. It asks three questions:

1. What do you love doing?
2. What are you good at?
3. What does the world want or need?

Claude helps fill thin lists ("Help me dig deeper"), then finds the overlap and suggests careers, side hustles, ways to serve, and things to try, each with first steps. Results can be emailed via Resend.

## How it's built

- `public/`: the front end (plain HTML/CSS/JS, no build step)
- `functions/api/`: Cloudflare Pages Functions
  - `_middleware.js`: POST only, checks the shared access code
  - `check.js`: validates the access code
  - `suggest.js`: reframed question + tap-to-add suggestions
  - `analyze.js`: the full Hedgehog analysis
  - `email.js`: sends results via Resend
- `lib/prompts.js`: **the prompts. Edit these to tune voice and output.**
- `lib/shared.js`: Anthropic call, input cleaning, helpers
- `lib/mock.js`: canned replies for testing without API keys

The Anthropic and Resend keys stay on the server. The browser never sees them, and the prompts live server-side, so the endpoints can't be used as a general Claude proxy.

## Deploy on Cloudflare Pages (one time)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick this repo.
2. Build settings: framework **None**, build command **empty**, output directory **`public`**.
3. **Settings → Variables and Secrets**, add (as *Secret*):
   - `ANTHROPIC_API_KEY`: from console.anthropic.com
   - `ACCESS_CODE`: the word you'll give friends (not case-sensitive)
   - `RESEND_API_KEY`: from resend.com
   - `RESEND_FROM`: e.g. `Kindling <kindling@forgeskillsapp.com>`. The domain must be verified in Resend.
4. Redeploy. Every push to `main` deploys automatically after that.

Optional: `MODEL` (defaults to `claude-sonnet-5-5`).

There's deliberately no `wrangler.toml`: with one, Cloudflare locks the dashboard's variable settings. All settings live in the dashboard.

Email is optional. If `RESEND_API_KEY`/`RESEND_FROM` are missing, the app hides the email box and offers Copy instead.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in keys
npm run dev                      # http://localhost:8788
npm run dev:mock                 # no keys needed, canned answers
```

## Cost guardrails

- Shared access code on every API call
- Input caps: 25 items per circle, 80 chars each, 500-char notes
- `max_tokens`: 600 for suggestions, 3000 for analysis

For extra protection, add a Cloudflare rate-limiting rule on `/api/*` (Security → WAF → Rate limiting rules), e.g. 30 requests per minute per IP.
