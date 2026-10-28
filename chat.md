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

## 2026-10-20: edge pass (builder, weird scenarios)
- **Asked (Tim):** "Could you focus on making each game perfect especially in scenarios that the game doesn't expect or are a little weird." Manager: fix the 12+ seat label overlap and the floating "Yes" covering a token.
- **Tested:** 46 scenarios (manager's scratchpad `edge/clocktower/scenarios.md`); 15 failed on the old build.
- **Built:** engine rules (dead Saint/Virgin no ability, Poisoner death ends poison, Monk-protected Mayor no bounce); crowd ring layout (`.lb` label column, `--lw`); yes vote pops the hand (`raise`) instead of floating "Yes"; Back button history for sheets/help/tabs; Settings "Quit this game" with Undo / "Leave room"; Monk self-pick message; background-tab pause; two-tab sync; worker-failure fallback; online name clean-up. `?v=8`.
- **Verified:** solver 12, engine 23 (4 new, failed first), art 365, fx 6 (new asserts failed first), online 151 (old adapter failed 2). WebKit e2e 15/15 on the new build, 6 failing on the live old build. overlap.mjs: 12 seats phone 14 → 0.
- **Open:** AFK online player stalls the day (shared layer); long names touch a badge slightly at 12–15 seats; SE/landscape small touches.

## 2026-10-21: visibility pass (builder)
- **Asked (Tim):** "Fix this so the view of what's happening and where everything is is very clear. Consider parts of the board that are dense in what's happening and if the user can reasonably see it."
- **Built:** circle fills the height on laptop/landscape (size-container grids); phone Play is one column (circle, slim character card that opens the full ability, vote box, log); ring sizes in cqmin; oval Grimoire; crowd marks placed by seat side (`lft`/`rgt`/`vt`); higher font floors; Grimoire reminders laid out in rows on diagonals; Storyteller tabs stacked left in landscape; feed sticks to the newest line. `?v=9`.
- **Verified:** scratchpad `vis/clocktower/check.mjs` 333 layout checks: old build 97 failed, new 8 (320 px / landscape / 15-seat Grimoire touches). `taps.mjs`: 528/528 seat centres hit their own seat in WebKit + Chrome; real taps open the seat sheet and the character sheet. Tests: solver 12, engine 23, art 365, online 151, fx 6. One read-only reviewer round, fixes for its high/medium items.
- **Open:** small touches at 320 px/landscape; 15-seat Grimoire in phone landscape still small (21 px tokens); real iPhone.

## 2026-10-27: improvement pass (builder, per-game brief vs botc.app / clocktower.online)
- **Built:** kits _coach/_profile/_pwa copied, fx re-copied; guided first game + rules sheet; My stats, 11 achievements, Daily; Undo vs computers; end-of-game "Story" from a new engine `grim` record; install + offline (worker scripts cached via `pwa:cache`); Play 5–15 players; hooded unclaimed tokens, tinted faces, town/fog/moon sky, execution + Demon-reveal moments. `?v=11`.
- **Verified:** tests solver 12, engine 23, art 365, fx 6, online 151, kits 11 (new; 8/10 failed on old code, art check failed on old art). pwa-check 18/18 WebKit. WebKit 393/320/659×393/1280/1440: Undo, Story, My stats, Rules (tabs wrap), 15 players, 0 errors, 0 overflow. Guided game walked end to end. Live at fd5470b.
- **Open:** solver time at 13–15 players on a real phone; animations seen only as stills.

## 2026-10-27: odds speed-up (builder)
- **Asked (manager):** odds badges took up to 4.3 s at 13–15 players on the laptop; make them never freeze a phone, numbers unchanged.
- **Built:** solver rewrite of the hot loop (same line-ups and weights; no per-line-up objects; red-herring, Drunk and Minion-line-up results reused where no reading can tell them apart; top teams kept as they come); `solver.start()` runs a job in steps; worker steps jobs and drops a stale job when a newer one with the same tag arrives; no-worker fallback in 12 ms slices; badges fade to 50% while odds take over 250 ms. `?v=13`.
- **Verified:** `tests/solver-match.test.js` (new; vs frozen old solver `tests/solver-ref.js`): 910 inputs in the suite, 3977 with CT_FULL=1, largest difference 1.4e-12; its step and speed checks failed on the old solver (no `start`, 2816 ms). Worst real records, Chrome: 5 / 10 / 13 / 15 players 2 / 34 / 1114 / 3568 ms → 1 / 11 / 319 / 521 ms; with 4× CPU throttle 19 / 149 / 8367 / 15630 → 8 / 44 / 2201 / 2875 ms, longest step 56 ms. Same seeded 15-player game with no worker at 4×: longest main-thread task 3153 → 288 ms. pwa-check 18/18 (offline play). WebKit 393 + 1280 shots: badges fade, nothing moves, no overflow, 0 errors. All suites green.
- **Open:** real iPhone timing; `renderPlay` re-render is now the bigger main-thread cost at 15 players (200–450 ms at 4×).

## 2026-10-28: wave 3 "just make the games better" (builder)
- **Asked (Tim):** "go through each project adding features or changing things that you think should be changed … links to youtube videos … variations … practical settings … Just make the games better."
- **Built:** Rules sheet "Videos" section (5 oEmbed-checked links, new tab); Play circle patched per token and notes appended instead of rebuilt; Settings → Play options: Computer speed (Slow/Normal/Fast) and Day timer (Off/2/4/6 min, vs computers only, End day button shows the time left). `?v=15`.
- **Verified:** per-move render at 15 seats, Chromium 4× throttle: median ~90 → ~20 ms, prompt-only tap ~60 → ~10 ms; patched DOM = full rebuild. Tests: solver 12, solver-match green, engine 23, art 365, fx 6, kits 13 (2 new, failed on the old build), options 3 (new; failed on the old build; 154 self-play games with 319 timer cuts), online 151. pwa-check 18/18. WebKit shots 393/320/659×393/1280/1440 of Settings, Play with the timer, Rules → Videos: 0 errors, no sideways or page scroll. Timer ended a day in WebKit.
- **Skipped:** Travellers (Rejected), Teensyville (a custom-script term, not a TB rule), unsourced dead-vote house rules, art (already done), remember setup (already saved).
- **Open:** real iPhone; Tim's calls: the option names and the 2/4/6-minute choices.

## 2026-10-28 — wave 3 kit sweep (builder A2): `_coach` 1.2.0 + `_pwa` 1.4.0 copied, build 17, offer `place:'auto'` avoiding "Play vs computers", local offer/link overrides dropped; all suites green, pwa-check 18/18, offer/settings rect checks pass at 393/320/659×393.
