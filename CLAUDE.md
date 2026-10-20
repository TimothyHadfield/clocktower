# Clocktower: project rules

Blood on the Clocktower companion: town notebook with Demon odds, a full Trouble Brewing game against computers (or friends online), a Storyteller grimoire, and a role list for all three base scripts. Static GitHub Pages site: https://timothyhadfield.github.io/clocktower/ (repo TimothyHadfield/clocktower).

- Read `progress.md` first. Tim's global rules (`~/.claude/CLAUDE.md`) apply.
- **No copied official text or art.** Role abilities are in our own words (`js/roles.js`) and icons are original line art (`js/art.js`).
- Plain JS, no build step. Each `js/*.js` works in the browser (adds to `window.CT`) and in node (`module.exports`). The only exception is `js/online.js`: a copy of `../_online/online.js` (ES module). Don't edit it; re-copy it instead.
- The engine is pure: `apply(state, action)` / `view(state, seat)`. State must survive JSON, and randomness comes from `state.seed`.
- Bump `?v=N` on every script/style tag in `index.html` (and in `js/worker.js` importScripts) when shipping JS/CSS changes.
- Tests: `node tests/solver.test.js && node tests/engine.test.js && node tests/art.test.js && node tests/online.test.mjs`. On a busy machine, set `CT_SLOW=1` for the solver speed test.
- Strength numbers: `node tests/measure.js 200 8` (about 3 min). Record them in progress.md and in the "How strong?" text (`HELP.strong` in `js/app.js`).
