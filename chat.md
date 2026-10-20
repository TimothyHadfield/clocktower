# Clocktower: session log

## 2026-10-19: first build (builder agent, Games wave)
- **Asked:** "could you also explore blood on the clocktower?", then phase 2 (exact-rules play, online, art, design, rules check, ideas).
- **Built:**
  - roles for TB/BMR/S&V in our own words;
  - an enumerating solver (Drunk, poison, Spy/Recluse, Scarlet Woman, starpass);
  - the TB engine with a computer Storyteller, and Easy/Hard bots;
  - the UI: Town, Odds, Play, Grimoire, Roles;
  - practice puzzles;
  - the online adapter on the shared `_online` layer;
  - 72 original icons.
- **Verified:**
  - Tests: solver 11, engine 19, art 365 checks, online adapter 48 games plus a real local room.
  - 5/5 deliberate code breaks were caught by the tests.
  - Full games played through the UI in WebKit at 393 px and at 1440 px.
  - A two-browser online game was played on the live Firebase project.
  - Night order and counts were compared with bra1n/townsquare data (0 differences).
- **Open:** real-iPhone check, and 3+ person online games.

## 2026-10-20: visual design pass (builder)
- **Asked (Tim, via manager):** "review them again for design improvements especially visually".
- **Built:**
  - Text on the circle (names, claims, odds badges, centre) now scales with the circle.
  - Team-tinted token rims, and clean dead seats.
  - Night and day tint on the table; living seats glow when it's your pick.
  - Claim labels have a backing pill (off at 11+ seats).
  - Odds: thin bars with the number beside them, and row dividers.
  - The disabled Confirm is readable.
  - The log fades in at the top.
  - The Play tab label is aligned.
  - Phone Grimoire setup shows 4 tiles per row.
  - Tighter steppers.
- **Verified:**
  - 11 states at 393 px and 1440 px, before and after: no overflow, no console errors.
  - 12-seat Play at both widths.
  - Tests: solver 12, engine 19, art 365, online 148.
- **Open:** see NOT verified (glow motion, real iPhone).

## 2026-10-20: QA pass fixes
- **Asked:** fix what the fresh QA agent found.
- **Built:**
  - The Drunk/Lunatic now get a night-order step for the role they think they are.
  - The solver no longer lets the Demon die or pass the star on night 1.
  - Odds badges moved to the right side of each token, so they no longer cover role names.
  - The Drunk's label wraps to two lines.
  - Log wording for your own seat ("You nominate").
  - On a tie, no Demon suspect is named ("No one stands out").
- **Verified:**
  - New solver test, seen failing on the old solver (90 vs 75 line-ups). Results: solver 12, engine 19, art 365, online 148.
  - Badge overlap measured in WebKit at 393 px and 1440 px (Play 5/8/12, Town 15, 16 hard practice puzzles): 0 overlaps, 0 errors.
  - Main thread: no app call over 100 ms. Headless WebKit showed ~300 ms frame gaps that Chromium didn't (an engine artefact; the solver already runs in a Worker).

## 2026-10-20: sounds, celebrations, animations (builder, fx wave)
- **Asked (Tim):** "add opptional sounds … win celebrations, and other fun annimations … everything customizable in the settings". Manager: atmospheric, never loud (bell for night/day, vote ticks, execution, dawn deaths, good/evil win).
- **Built:** `js/fx.js` (copy of `_fx`), `js/ctfx.js` (event → sound/animation map, see progress.md), hooks in `renderPlay` (view diff, so computer and online moves sound too), error sound on rejected actions, "Sound & effects" section in the Settings sheet, `.fx-set` CSS to match the app's switches/segments. `?v=6`.
- **Verified:** `tests/fx.test.js` 6/6 (scripted games through engine + bots, FX.play spy, fake AudioContext: Sound off = 0 audio sources, Animations off = 0 animate calls, win/lose kind right over 30 games); seen failing on the old code (no module) and on 3 deliberate breaks (win/lose swapped, NO votes ticking, dawn unmapped). Full suite green. WebKit 393 px + 1440 px: Settings, night pick, day vote ("Yes" float visible), win with confetti (also Chrome): 0 console errors, no overflow, no page scroll. Shots in manager scratchpad `design/clocktower-fx/`.
- **Open:** sounds never heard (no Web Audio in headless WebKit); real iPhone; real online game.

## 2026-10-20: real-table look (builder, table wave)
- **Asked (Tim):** games should look "almost identical to how the board or card layout looks like in real life ... like you're looking through a camera that is connected to a user's glasses".
- **Researched:** official wiki Setup page + box contents (real.md in the manager's scratchpad `table/clocktower/`): Town Square board with life tokens in seat order (parchment = alive, black = dead), vote tokens, Grimoire box with character tokens, shrouds and reminder tokens, night sheet, character sheets.
- **Built:** `_table` kit copied in (`css/table.css`, `js/table.js`), `_fx/fx.js` 1.0.3 re-copied; wood table under Play; round Town Square board with gold rim + clock ticks; parchment tokens with team ink (blue good, red evil) and cardboard edge; dead = black side + white vote token; your seat at the bottom (Play and Town); your character sheet (token + ability on cream paper) under the circle; log as note paper; clock hand to the nominee and raised hands on yes votes; death flips the life token, the deal turns your token; phone-landscape layout side by side; Grimoire as a felt-lined box with shroud tokens, round reminder tokens inside each seat and the 3 bluffs as tokens; night sheet and town log on paper. `?v=7`.
- **Verified:** all tests green (solver 12, engine 19, art 365, online 148, fx 6). WebKit at 393, 320, 659x393, 1280 and 1440: 8 states, 0 console errors, no page scroll, no overflow. Scripted full game through the UI: life-token flips on deaths, your token turns on deal. One read-only reviewer round + fixes + a second round.
- **Open:** real iPhone; 12-seat phone labels still overlap a little (as before).
