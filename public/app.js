"use strict";

const CIRCLES = {
  like: { label: "What do you love doing?", short: "Love doing", color: "var(--like)", soft: "var(--like-soft)",
          help: "Things that energize you, the stuff you'd do even if nobody paid you." },
  good: { label: "What are you good at?", short: "Good at", color: "var(--good)", soft: "var(--good-soft)",
          help: "Skills, strengths, things people come to you for. Be honest, not modest." },
  need: { label: "What does the world want or need?", short: "World needs", color: "var(--need)", soft: "var(--need-soft)",
          help: "Problems you notice, needs people will pay for, causes that matter to you." },
};
const ORDER = ["like", "good", "need"];
const ENOUGH = 4, MIN = 2;
const STEPS = ["gate", "intro", "like", "good", "need", "context", "results"];
const IDX = Object.fromEntries(STEPS.map((s, i) => [s, i]));
const STORE = "kindling-v1";

const blank = (code = "") => ({ step: IDX.intro, code, name: "", lists: { like: [], good: [], need: [] }, dig: {},
  ctx: { time: "", money: "", notes: "" }, result: null, tab: "careers", email: "" });
let S = load() || blank();
let busy = false;
let emailEnabled = true;

/* ---------- utils ---------- */
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }
function load() { try { const v = JSON.parse(localStorage.getItem(STORE)); return v && v.lists ? v : null; } catch { return null; } }
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2000); }
function go(step) { S.step = typeof step === "string" ? IDX[step] : step; save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

async function api(path, body = {}) {
  let res;
  try {
    res = await fetch("/api/" + path, { method: "POST", headers: { "content-type": "application/json", "x-access-code": S.code || "" }, body: JSON.stringify(body) });
  } catch { const e = new Error("Can't reach the server. Check your connection."); e.status = 0; throw e; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Something went wrong. Try again."); e.status = res.status; throw e; }
  return data;
}
function onAuthFail(e) { if (e.status === 401) { S.code = ""; save(); go("gate"); toast("Enter the access code again."); return true; } return false; }

const payload = () => ({ name: S.name, lists: S.lists, ctx: S.ctx });

/* ---------- the three circles ---------- */
function vennSVG({ small = false, busy = false } = {}) {
  return `<svg class="venn${small ? " sm" : ""}${busy ? " busy" : ""}" viewBox="0 0 320 300" role="img" aria-label="Three overlapping circles: love, good at, world needs, with a flame where they meet">
  <defs>
    <radialGradient id="gL" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#ffb39c" stop-opacity=".95"/><stop offset=".55" stop-color="#ff6a45" stop-opacity=".7"/><stop offset="1" stop-color="#ff4d2e" stop-opacity=".12"/></radialGradient>
    <radialGradient id="gG" cx=".62" cy=".35" r=".75"><stop offset="0" stop-color="#9af5e8" stop-opacity=".95"/><stop offset=".55" stop-color="#1fb3a1" stop-opacity=".7"/><stop offset="1" stop-color="#0f8d7f" stop-opacity=".12"/></radialGradient>
    <radialGradient id="gN" cx=".5" cy=".62" r=".75"><stop offset="0" stop-color="#ffe6a3" stop-opacity=".95"/><stop offset=".55" stop-color="#f5a32a" stop-opacity=".7"/><stop offset="1" stop-color="#e0861a" stop-opacity=".12"/></radialGradient>
    <radialGradient id="gHalo"><stop offset="0" stop-color="#fff1c9" stop-opacity=".95"/><stop offset=".45" stop-color="#ffb35c" stop-opacity=".45"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
    <linearGradient id="gFlame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset=".6" stop-color="#ff7a3a"/><stop offset="1" stop-color="#e2461f"/></linearGradient>
    <linearGradient id="gCore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset="1" stop-color="#ffd36b"/></linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>
  <g filter="url(#soft)">
    <circle class="orb o1" cx="116" cy="112" r="86" fill="url(#gL)"/>
    <circle class="orb o2" cx="204" cy="112" r="86" fill="url(#gG)"/>
    <circle class="orb o3" cx="160" cy="190" r="86" fill="url(#gN)"/>
  </g>
  <circle class="ring o1 orb" cx="116" cy="112" r="86"/>
  <circle class="ring o2 orb" cx="204" cy="112" r="86"/>
  <circle class="ring o3 orb" cx="160" cy="190" r="86"/>
  <text class="lbl" x="80" y="82" text-anchor="middle">Love doing</text>
  <text class="lbl" x="238" y="82" text-anchor="middle">Good at</text>
  <text class="lbl" x="160" y="250" text-anchor="middle">World needs</text>
  <circle class="halo" cx="160" cy="140" r="42" fill="url(#gHalo)"/>
  <g transform="translate(160 140) scale(2) translate(-12 -11)">
    <g class="flame">
      <path d="M12 1c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3-1-5 1-8z" fill="url(#gFlame)"/>
      <path d="M12 11c1 2 3.2 3.2 3.2 5.6a3.2 3.2 0 0 1-6.4 0c0-1.2.8-2.2 1.2-3 .8 1 1.8.4 2-2.6z" fill="url(#gCore)"/>
    </g>
  </g>
</svg>`;
}

/* ---------- views ---------- */
function render() {
  const visible = STEPS.slice(IDX.like); // progress shows circles → results
  document.getElementById("progress").innerHTML = visible.map((_, i) => `<span class="${S.step >= IDX.like + i ? "on" : ""}"></span>`).join("");
  const step = STEPS[S.step] || "intro";
  const app = document.getElementById("app");
  app.innerHTML = step === "gate" ? gateView() : step === "intro" ? introView() : CIRCLES[step] ? circleView(step)
    : step === "context" ? contextView() : resultsView();
  bind(step);
}

function gateView() {
  return `
  <div class="card dark">
    ${vennSVG({ small: true })}
    <h1 style="text-align:center">Kindling</h1>
    <p class="muted" style="text-align:center">This is a private tool. Enter the access code you were given.</p>
    <form id="gateform" class="row" style="max-width:420px;margin:16px auto 0" autocomplete="off">
      <input type="password" id="code" placeholder="Access code" aria-label="Access code" autocomplete="off">
      <button class="btn" type="submit" id="gatebtn">Enter</button>
    </form>
    <div id="gateerr"></div>
  </div>`;
}

function introView() {
  const resume = S.lists.like.length || S.lists.good.length || S.lists.need.length;
  return `
  <div class="card dark">
    ${vennSVG({ small: true })}
    <div class="eyebrow" style="text-align:center">Based on Jim Collins's Hedgehog Concept</div>
    <h1 style="text-align:center">Find the spark worth building a fire around.</h1>
    <p class="muted" style="text-align:center;max-width:560px;margin:0 auto 12px">The fox knows many things. The hedgehog knows one big thing. Yours sits where three circles overlap: what you love doing, what you're good at, and what the world needs.</p>
    <p class="muted small" style="text-align:center">Three questions, a few minutes. You'll get ideas for careers, side hustles, ways to serve, and things to try, each with first steps.</p>
    <div style="max-width:420px;margin:18px auto 0">
      <label for="name">First name <span class="muted">(optional)</span></label>
      <input type="text" id="name" value="${esc(S.name)}" placeholder="e.g. Kenny" autocomplete="given-name" maxlength="40">
      <div class="nav">
        ${resume ? `<button class="btn-ghost" id="reset">Start fresh</button>` : `<span></span>`}
        <button class="btn" id="next">${resume ? "Pick up where I left off" : "Let's go"}</button>
      </div>
    </div>
  </div>`;
}

function circleView(k) {
  const c = CIRCLES[k], list = S.lists[k], d = S.dig[k] || {};
  const n = list.length;
  const sugg = (d.suggestions || []).filter((s) => !list.some((x) => x.toLowerCase() === s.toLowerCase()));
  const nudge = n < MIN ? `Add at least ${MIN} to keep going. ${ENOUGH}+ works best.`
    : n < ENOUGH ? "Good start. A couple more will sharpen the results." : "Solid list. Add more or move on.";
  return `
  <div class="card" style="--c:${c.color};--soft:${c.soft}">
    <div class="eyebrow" style="color:${c.color}">Circle ${ORDER.indexOf(k) + 1} of 3 · ${c.short}</div>
    <h2>${c.label}</h2>
    <p class="muted">${c.help}</p>
    <form class="row" id="addform" autocomplete="off">
      <input type="text" id="item" placeholder="Type one thing, press Enter" maxlength="80" aria-label="Add an item">
      <button class="btn" type="submit">Add</button>
    </form>
    <div class="chips">
      ${list.map((x, i) => `<span class="chip">${esc(x)}<button aria-label="Remove ${esc(x)}" data-rm="${i}">×</button></span>`).join("")}
    </div>
    <div class="nav" style="margin-top:12px">
      <span class="count">${n} added · ${nudge}</span>
      <button class="btn-ghost btn-sm" id="dig" ${busy ? "disabled" : ""}>${busy ? '<span class="spinner"></span> Thinking…' : d.reframe ? "More ideas" : "Help me dig deeper"}</button>
    </div>
    ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}
    ${d.reframe || sugg.length ? `
      <div class="digbox">
        ${d.reframe ? `<div class="reframe">${esc(d.reframe)}</div>` : ""}
        ${sugg.length ? `<div class="small muted">Tap any that fit you:</div>
        <div class="chips" style="margin-top:8px">${sugg.map((s) => `<span class="chip sugg" data-add="${esc(s)}" role="button" tabindex="0">${esc(s)}</span>`).join("")}</div>` : ""}
      </div>` : ""}
    <div class="nav">
      <button class="btn-ghost" id="back">Back</button>
      <button class="btn" id="next" ${n < MIN ? "disabled" : ""}>${k === "need" ? "Almost done" : "Next circle"}</button>
    </div>
  </div>`;
}

function contextView() {
  const x = S.ctx;
  const opt = (v, l, cur) => `<option value="${v}" ${cur === v ? "selected" : ""}>${l}</option>`;
  return `
  <div class="card">
    <div class="eyebrow" style="color:var(--accent)">Optional</div>
    <h2>Anything we should factor in?</h2>
    <p class="muted">Skip this if you want. It helps make the first steps realistic.</p>
    <label for="time">Time you can put toward this</label>
    <select id="time">${opt("", "Not sure / skip", x.time)}${opt("under 5 hours a week", "Under 5 hrs/week", x.time)}${opt("5–10 hours a week", "5–10 hrs/week", x.time)}${opt("10–20 hours a week", "10–20 hrs/week", x.time)}${opt("full-time", "Full-time", x.time)}</select>
    <label for="money">Money goal</label>
    <select id="money">${opt("", "Not sure / skip", x.money)}${opt("not about money", "Not about money", x.money)}${opt("some side income", "Some side income", x.money)}${opt("replace my current income", "Replace my income", x.money)}${opt("build something big", "Build something big", x.money)}</select>
    <label for="notes">Anything else? <span class="muted">(location, constraints, what you've tried)</span></label>
    <textarea id="notes" rows="3" maxlength="500" placeholder="e.g. Phoenix area, two kids, already coach youth sports">${esc(x.notes)}</textarea>
    <div class="nav">
      <button class="btn-ghost" id="back">Back</button>
      <button class="btn" id="run">Find my hedgehog</button>
    </div>
  </div>`;
}

function resultsView() {
  const r = S.result;
  if (!r) return `<div class="card dark loading">${vennSVG({ busy: true })}<h3>Finding where your circles meet…</h3><p class="muted" id="loadmsg">Reading your answers</p></div>`;
  if (r.error) return `<div class="card"><h2>Hit a snag</h2><div class="err">${esc(r.error)}</div><div class="nav"><button class="btn-ghost" id="back">Back</button><button class="btn" id="retry">Try again</button></div></div>`;
  const cats = [["careers", "Careers"], ["side_hustles", "Side hustles"], ["volunteering", "Purpose & service"], ["hobbies", "Things to try"]];
  const cur = r.categories?.[S.tab] || [];
  const keys = r.key_items || {};
  const keyBox = (k) => `<div><b style="color:${CIRCLES[k].color}">${CIRCLES[k].short}</b>${(keys[k] || []).map(esc).join(" · ") || "—"}</div>`;
  return `
  <div class="card dark">
    <div class="eyebrow">${S.name ? esc(S.name) + "'s" : "Your"} Hedgehog</div>
    <div class="statement">${esc(r.hedgehog_statement)}</div>
    ${vennSVG()}
    <p class="muted">${esc(r.explanation)}</p>
    <div class="keys">${ORDER.map(keyBox).join("")}</div>
    <div class="actions" style="margin-top:16px"><button class="btn btn-sm" id="copystmt">Copy my Hedgehog statement</button></div>
  </div>

  ${r.first_move ? `<div class="card first-move"><b>Your first move (next 48 hours):</b> ${esc(r.first_move)}</div>` : ""}

  <div class="card">
    <h2>Where to point it</h2>
    <div class="tabs" role="tablist">${cats.map(([id, l]) => `<button class="tab ${S.tab === id ? "on" : ""}" role="tab" aria-selected="${S.tab === id}" data-tab="${id}">${l}</button>`).join("")}</div>
    ${cur.map((i) => `
      <div class="idea">
        <h3>${esc(i.title)}</h3>
        <div class="why">${esc(i.why)}</div>
        ${(i.steps || []).length ? `<ol>${i.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      </div>`).join("") || `<p class="muted">No ideas in this category. Tap “Edit my answers”, then run it again.</p>${r.debug ? `<details class="small muted"><summary>Details for Kenny</summary><code style="word-break:break-all">${esc(r.debug)}</code></details>` : ""}`}
  </div>

  <div class="card">
    <h3>Keep it</h3>
    ${emailEnabled ? `
    <p class="muted small">Send yourself a copy.</p>
    <form class="row" id="emailform">
      <input type="email" id="email" placeholder="you@example.com" value="${esc(S.email)}" aria-label="Email address" autocomplete="email" required>
      <button class="btn" type="submit" id="sendbtn">Email me</button>
    </form>` : `<p class="muted small">Email isn't set up yet. Copy your results instead.</p>`}
    <div class="actions" style="margin-top:12px"><button class="btn-ghost btn-sm" id="copyall">Copy full results</button></div>
    <div class="nav">
      <button class="btn-ghost" id="edit">Edit my answers</button>
      <button class="btn-ghost" id="reset">Start over</button>
    </div>
  </div>`;
}

/* ---------- results as text ---------- */
function resultsText() {
  const r = S.result; if (!r || r.error) return "";
  const names = { careers: "CAREERS", side_hustles: "SIDE HUSTLES", volunteering: "PURPOSE & SERVICE", hobbies: "THINGS TO TRY" };
  let t = `MY HEDGEHOG (Kindling)\n${r.hedgehog_statement}\n\n${r.explanation}\n\n`;
  if (r.first_move) t += `FIRST MOVE (next 48 hours): ${r.first_move}\n\n`;
  for (const k of Object.keys(names)) {
    const arr = r.categories?.[k] || []; if (!arr.length) continue;
    t += `${names[k]}\n`;
    arr.forEach((i) => { t += `• ${i.title}: ${i.why}\n`; (i.steps || []).forEach((s, n) => { t += `   ${n + 1}. ${s}\n`; }); });
    t += "\n";
  }
  t += "MY CIRCLES\n" + ORDER.map((k) => `${CIRCLES[k].label} ${S.lists[k].join(", ")}`).join("\n");
  return t;
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast("Couldn't copy. Select the text and copy it by hand."); }
}

/* ---------- actions ---------- */
async function digDeeper(k) {
  if (busy) return;
  busy = true; S.dig[k] = { ...S.dig[k], error: null }; render();
  try {
    const out = await api("suggest", { ...payload(), circle: k, shown: S.dig[k]?.suggestions || [] });
    S.dig[k] = { reframe: out.reframe, suggestions: out.suggestions || [], error: null };
  } catch (e) {
    busy = false;
    if (onAuthFail(e)) return;
    S.dig[k] = { ...S.dig[k], error: e.message };
  }
  busy = false; save(); if (STEPS[S.step] === k) render();
}

async function runAnalysis() {
  S.result = null; go("results");
  const msgs = ["Reading your answers", "Looking for the overlap", "Matching it to real paths", "Writing your first steps"];
  let mi = 0;
  const timer = setInterval(() => { const el = document.getElementById("loadmsg"); if (el) { mi = (mi + 1) % msgs.length; el.textContent = msgs[mi]; } }, 2500);
  try {
    S.result = await api("analyze", payload());
  } catch (e) {
    clearInterval(timer);
    if (onAuthFail(e)) return;
    S.result = { error: e.message };
  }
  clearInterval(timer); save(); if (STEPS[S.step] === "results") render();
}

function addItem(k, val) {
  val = (val || "").trim().replace(/\s+/g, " ");
  if (!val) return;
  if (S.lists[k].some((x) => x.toLowerCase() === val.toLowerCase())) { toast("Already on your list"); return; }
  if (S.lists[k].length >= 25) { toast("That's plenty for this circle"); return; }
  S.lists[k].push(val.slice(0, 80)); save(); render();
  document.getElementById("item")?.focus();
}

/* ---------- events ---------- */
function bind(step) {
  const $ = (id) => document.getElementById(id);
  const on = (id, fn) => $(id)?.addEventListener("click", fn);
  on("reset", () => { S = blank(S.code); save(); render(); });

  if (step === "gate") {
    $("code").focus();
    $("gateform").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("gatebtn"); btn.disabled = true;
      S.code = $("code").value.trim();
      try { const r = await api("check"); emailEnabled = r.email; S.step = IDX.intro; save(); render(); }
      catch (err) { btn.disabled = false; $("gateerr").innerHTML = `<div class="err" style="max-width:420px;margin:12px auto 0">${esc(err.message)}</div>`; }
    });
  }
  if (step === "intro") {
    on("next", () => {
      S.name = $("name").value.trim().slice(0, 40);
      if (S.result && !S.result.error) return go("results");
      go(S.lists.need.length ? "need" : S.lists.good.length ? "good" : "like");
    });
    $("name").addEventListener("keydown", (e) => { if (e.key === "Enter") $("next").click(); });
  }
  if (CIRCLES[step]) {
    $("addform").addEventListener("submit", (e) => { e.preventDefault(); addItem(step, $("item").value); });
    document.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { S.lists[step].splice(+b.dataset.rm, 1); save(); render(); }));
    document.querySelectorAll("[data-add]").forEach((b) => {
      const f = () => addItem(step, b.dataset.add);
      b.addEventListener("click", f);
      b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } });
    });
    on("dig", () => digDeeper(step));
    on("back", () => go(S.step - 1));
    on("next", () => {
      // Thin list: offer ideas once before moving on.
      if (S.lists[step].length < ENOUGH && !S.dig[step]?.reframe && !S.dig[step]?.nudged && !busy) {
        S.dig[step] = { ...S.dig[step], nudged: true };
        toast("Here are a few ideas first. Hit Next again to skip.");
        digDeeper(step);
        return;
      }
      go(S.step + 1);
    });
    if (!busy) $("item")?.focus({ preventScroll: true });
  }
  if (step === "context") {
    const sync = () => { S.ctx = { time: $("time").value, money: $("money").value, notes: $("notes").value.slice(0, 500) }; save(); };
    ["time", "money", "notes"].forEach((id) => $(id).addEventListener("input", sync));
    on("back", () => { sync(); go("need"); });
    on("run", () => { sync(); runAnalysis(); });
  }
  if (step === "results") {
    on("retry", runAnalysis);
    on("back", () => go("context"));
    on("edit", () => go("like"));
    on("copystmt", () => copy(S.result.hedgehog_statement, "Hedgehog statement copied"));
    on("copyall", () => copy(resultsText(), "Results copied"));
    document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { S.tab = b.dataset.tab; save(); render(); }));
    $("emailform")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("sendbtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending';
      S.email = $("email").value.trim(); save();
      try { await api("email", { to: S.email, name: S.name, result: S.result, lists: S.lists }); toast("Sent. Check your inbox."); }
      catch (err) { if (!onAuthFail(err)) toast(err.message); }
      btn.disabled = false; btn.textContent = "Email me";
    });
  }
}

/* ---------- start ---------- */
(async function start() {
  // Confirm the saved access code (or that none is needed) before showing anything else.
  try { const r = await api("check"); emailEnabled = r.email; if (STEPS[S.step] === "gate") S.step = IDX.intro; }
  catch (e) { if (e.status === 401) { S.code = ""; S.step = IDX.gate; } }
  save();
  if (STEPS[S.step] === "results" && !S.result) runAnalysis(); else render();
})();
