# Clocktower: progress

## START HERE
Read this file, then CLAUDE.md, then `docs/rules-check.md` and `docs/ideas.md`. Code map: `js/roles.js` (72 roles, counts, night order), `js/solver.js` (line-up enumerator → Demon/evil odds), `js/engine.js` (Trouble Brewing rules + computer Storyteller), `js/bots.js` (computer players), `js/ctonline.js` (game object for the shared online layer), `js/app.js` (all UI), `js/art.js` (icons), `js/worker.js` (solver off the main thread).
Sounds/animations: `js/fx.js` (byte copy of `../_fx/fx.js`, never edit; re-copy), `js/ctfx.js` (game events → sounds/animations, pure `events(prev, cur)`).
Table look: `css/table.css` + `js/table.js` (byte copies of `../_table/`, never edit; re-copy). The game's own table styling is in `styles.css` ("the seat circle" and "Play: your place at the table" sections).
Kits (copies, never edit; re-copy): `js/coach.js`+`css/coach.css` (_coach 1.1.0), `js/profile.js`+`css/profile.css` (_profile 1.1.0), `js/pwa.js`+`sw.js`+`tools/pwa-check.mjs`+`tools/make-icons.mjs` (_pwa 1.3.0). Game side: `js/ctcoach.js` (guided game + rules sheet), `js/ctprofile.js` (levels, achievements, Daily, result).
Last updated: 2026-10-28 (wave 3: Rules → Videos, Play circle patched instead of rebuilt, Settings → Play options (Computer speed, Day timer); build `?v=16`).

## Goal right now
Tim: "could you also explore blood on the clocktower?" Phase 2: "build regular play online with a computer or other online players for all the games … that match exactly the play of the in-person game … Really work on the webdesign … art … make sure that everything works properlly without errors … get everything right like rules … specific numbers."

## Status
| Part | State |
|---|---|
| Town notebook (claims, votes, deaths, night info, notes) + Demon odds badges | Done |
| Odds tab (Demon % / evil %, likely teams, maybe-Drunk) | Done |
| Play: Trouble Brewing vs computers (5–15 players since 10-27, Easy/Hard) | Done |
| Improvement pass 10-27: guided first game (Empath, 7 Easy), Rules sheet, My stats + achievements + Daily (Hard, 8 players, no Undo), Undo vs computers (game becomes "with help", unrated), "Story" at game over (true roles + the Storyteller's night record, false info marked), install + offline, hooded unclaimed tokens, team-tinted faces, town/fog/moon behind the circle, execution + Demon-reveal moments | Done, live at fd5470b. Shots in the manager's scratchpad `improve/clocktower/` (tut/, ui/, art/) |
| Odds speed (10-27): same line-ups, no per-line-up allocation, red-herring/Drunk/Minion-line-up results reused where no reading can tell them apart; `solver.start()` steps (32 teams each); worker steps jobs and a newer job with the same tag replaces an older one; no-worker fallback runs in 12 ms slices; `.odds-busy` on `<html>` fades badges to 50% when odds take over 250 ms | Done. Worst real 15-player record: laptop Chrome 3.6 s → 0.52 s, Chrome 4× throttle 15.6 s → 2.9 s; 13 players 8.4 s → 2.2 s (4×). Longest main-thread step 56 ms (4×). `tests/solver-match.test.js`: 3977 inputs identical to the old solver (≤1.4e-12) with CT_FULL=1 |
| Play online (shared `_online` layer, gameId `clocktower`) | Done. Two-browser game (WebKit + Chromium) played to "Game over" against the live Firebase project on 10-19 |
| Practice puzzles (easy/medium/hard) with Reveal | Done |
| Grimoire: setup counts (Baron/Godfather/Fang Gu/Vigormortis), night order, grimoire circle with reminders | Done, all 3 scripts |
| Roles list, 3 scripts, search | Done |
| docs/rules-check.md, docs/ideas.md | Done |
| Visual design pass (circle text scales, night/day tint, pick glow, odds bars) | Done 10-20, before/after shots in the manager's scratchpad `design/clocktower/` |
| Optional sounds, win/lose celebration, small animations; "Sound & effects" in Settings | Done 10-20 (`tests/fx.test.js`) |
| Real-table look: wood table, Town Square board with clock ticks, parchment life/character tokens (black side = dead, white vote token), your seat at the bottom, your character sheet in front of you, log as note paper, clock hand + raised hands in votes, Grimoire box with shrouds, round reminder tokens, bluff tokens, night sheet on paper | Done 10-20, shots in the manager's scratchpad `table/clocktower/` (before/, after/, real.md) |
| Wave 3 (10-28): Rules sheet "Videos" (5 links), Play circle patched per token + notes appended (no full rebuild), Settings → Play options: Computer speed Slow/Normal/Fast, Day timer Off/2/4/6 min (vs computers only) | Done. Render cost below |

| Visibility pass: circle fills the screen, real phone + landscape layouts, readable 12–15-seat circles | Done 10-21, shots + audit in the manager's scratchpad `vis/clocktower/` (before/, after/, audit.md; `shoot.mjs` + `check.mjs` measure, `taps.mjs` checks taps) |

## Wave 3 (2026-10-28)
- **Render cost** (Chromium, 393×659, 4× CPU throttle, same seeded 15-player game, 40 successive moves on day 2, render + forced layout): per move median 77–108 → 17–23 ms, p90 120–141 → 57–90 ms; a tap that only changes the prompt (Nominate on/off) 49–73 → 8–12 ms. Worst single update (first one after a big jump) ~200–300 → ~160–210 ms. After 50 patched updates the DOM equals a full rebuild exactly. Script: `C:/Users/timha/AppData/Local/Temp/claude/wt/ct-w3-scratch/perf.mjs` (may be swept).
- **Videos** (each checked with YouTube oEmbed 2026-10-28, title + channel matched): `0aDt7n06dRM` Trouble Brewing – Explained in Detail (official channel); `LdPDOGtAppA` Quick Start Tutorial (Meeple University); `J78zBv1Dk9Y` How to play Every Character, TB (Mik Pick); `93ZOOpLuC0Q` How to Bluff as Every Character, TB (Mik Pick); `1Au_lSFPe-o` A Beginner's Guide to Storytelling (The Megavoid). List in `js/ctcoach.js` `VIDEOS`.
- **Day timer**: per day, counted only while the Play tab is on screen; at 0 the day ends (`endDay` as you) once no vote is open; Undo after the timeout gives 30 s. Not in the guided game, not online (online days end when all tap End day). `tests/options.test.js`: 154 self-play games 5–15 players with 319 days cut short at random, all finish. Computer speed only changes the pause after each computer move (`B.pause`: normal 260/520 ms unchanged); strength untouched.
- Skipped: Travellers (Rejected list), Teensyville (a script-design term for small custom scripts, not a Trouble Brewing setup rule), dead-vote house rules (no official/sourced variant), art (all 72 roles already have original icons; the night sky exists), remember last setup (already saved in `playSetup`).

## Visibility pass (2026-10-21)
Circle size before → after: Play phone 274–290 → 332–343 px; phone landscape 160–197 → 261; laptop 1280 572 → 684, 1440 728 → 812; Grimoire phone 355 square → 355×435 oval, landscape 195 → 247 tall. Layout checks: 97 of 333 failed on the old build, 8 now (all at 320 px / landscape / 15-seat Grimoire). Seat taps 528/528 hit in WebKit and Chrome.
- Phone Play is one column: circle, slim character card (tap it for the full ability), vote/action box, log filling the rest.
- Landscape and laptop: circle takes the full height on the left, everything else on the right. Storyteller in landscape stacks Setup/Night/Grimoire on the left.

## Edge pass (weird scenarios, 2026-10-20)
46 scenarios tested (list + evidence in the manager's scratchpad `edge/clocktower/scenarios.md`); 15 failed and are fixed:
- Rules: a dead Saint or dead Virgin has no ability; the Poisoner's poison ends when the Poisoner dies; a Monk-protected Mayor isn't attacked, so nobody dies (no bounce).
- Circle at 11+ seats: labels no longer overlap (12 seats on a phone: 14 overlaps → 0); a yes vote pops the voter's hand instead of a floating "Yes".
- Back goes where you just were (help → sheet → tab → previous tab); Settings has "Quit this game" (with Undo) or "Leave room".
- Monk can't pick themselves (message); computers pause in a background tab; two tabs stay in step; the game keeps going if the odds worker fails.
- Online names: blank → "Seat N", "You" not allowed, duplicates get the seat number.
Open: an online player who goes AFK still stalls the day (needs a timeout in shared online.js).

## Event → sound map (js/ctfx.js; all custom sounds are "Game sounds", soft and short)
| Game event | Sound | Animation |
|---|---|---|
| New game (night 1) | shuffle → cardDeal → bellNight | role icon pops, centre pulses |
| Night falls (dusk) | bellNight (one deep bell toll) | centre pulses |
| Dawn | bellDawn (two light chimes); then a knell per night death | dead token flashes red + shakes |
| Nomination | gavel (wood knock) | nominee pops |
| Each YES vote | hand (soft tick, pitch rises around the circle); NO votes are silent | the voter's raised hand pops (ctfx event `raise`; the old floating "Yes" covered the next seat at 12 players) |
| Tally: on the block | lower gavel | nominee pops (else centre pops) |
| Execution (incl. Virgin) | knell | token flashes red + shakes; Virgin = 'big' sparkle |
| Claim / Share info | cardFlip / cardSlide (quiet) | speaker pops |
| Slay attempt / kill / miss | whoosh / hit (half volume) + 'big' sparkle / miss | target pops / flash + shake |
| Storyteller info or star passed to you | whisper | role icon pops |
| Your move (night pick, or a vote waiting on you) | turn chime | Confirm / Yes button pulses |
| Illegal action (engine or online error) | error | action bar shakes |
| Game over | celebrate win (winner's colours: blue/green good, red/amber evil) or lose | confetti / dim |
Computer and online players' moves make the same sounds (driven by view diffs in `renderPlay`). Reload/rejoin mid-game is silent; coming back from another tab with 7+ new log lines plays only the ending.

## Measured strength (tests/measure.js, 8 players, 200 games per pairing, 2026-10-19)
- Hard good vs hard evil: good wins 59.0%. Easy good vs hard evil: 3.0%. Hard good vs easy evil: 59.5%. Easy vs easy: 9.5%.
- Solver at each day's end, public info only: average chance on the real Demon is 19.1%, against 16.4% for a random guess. The top pick is right 13.2% of the time. In 335 day-ends, the real world was never ruled out.
- Earlier, before evil bots faked info: 63.5 / 3.0 / 74.0 / 10.5%, and the solver averaged 23.3% vs 16.2%.

## Standing instructions (Tim's words, via the manager)
- "Write each role's ability in your own words (no copied official text or art)."
- "add opptional sounds you can add to the games that reflect what's happening in the game accurately as well as win celebrations, and other fun annimations to go along with everything. Just make sure everything is customizable in the settings so the user can play as preffered." (2026-10-20). Manager: keep Clocktower atmospheric, never loud.
- "could you also make sure that each of the games also have a look to them so that the game (either board or card layout) looks almost identical to how the board or card layout looks like in real life ... It should look kind of like you're looking through a camera that is connected to a user's glasses that is playing in real life" (2026-10-20). Keep every helper (odds, log, prompts); original art only.
- "I've noticed the games often have good user interfaces but could be improved especially when a scenario happens that the game might've not really thought about or whatnot. Could you focus on making each game perfect especially in scenarios that the game doesn't expect or are a little weird." (2026-10-20)
- "for a lot of the games the cards or board layout is too small to easily see what's going on. Some games just need small design imporvements like filling the screen with the board view and fitting the cards and other things in the empty space, some have severe errors like TTR. Fix this so the view of what's happening and where everything is is very clear. Consider parts of the board that are dense in what's happening and if the user can reasonably see it." (2026-10-21) Manager: keep the real-table look, make it bigger and clearer, not more app-like.
- Phone-first dark look with the Hub tokens. No page scroll on main screens. Labels 1–3 words, with explanations behind a "?". $0.

## Traps
- **Build stamp (10-27):** all `?v=` in index.html, pwa.js `data-version`, `WV` in app.js and the `importScripts` stamps in `js/worker.js` and the three `?v=` in the pwa.js tag's `data-extra` (worker.js, roles.js, solver.js: the odds worker's offline copy) must move together (now 14).
- **Solver changes:** `tests/solver-ref.js` is a frozen copy of the build-12 solver; `node tests/solver-match.test.js` (~75 s; `CT_FULL=1` ~10 min) must stay green after any solver edit, unless the odds model is meant to change (then refresh the ref copy on purpose and say so). The memo key in `start()` (Poisoner seat, Outsider count, Spy seat where `spySeen`, SW seat when deaths, Minion of `named` seats) must grow if a new reading looks at something else. Run it in the suite with the others.
- **Play circle is patched, not rebuilt (10-28):** `ringParts()` + `patchRing()` change only the tokens/centre/hand/ring class that differ; the feed (`#feed`) only appends while its old lines are a prefix (`fd._lines`). In Play each token must stay exactly one `<button>` (no reminders) and anything structural (seat count, sky, animations on/off, box) goes into the patch key to force a rebuild. `ring()` (Town, Grimoire) still builds whole. `kits.test.js` checks the wiring.
- **Build stamp is now 17** (all places listed above). Kit sweep 10-28: `_coach` 1.2.0 + `_pwa` 1.4.0 copied (the kit list above is older); the offer uses `place:'auto', avoid:['[data-act="play-start"]']`, and the local `--coach-offer-bottom` and `.coach-rules-body a` rules were removed (the kit does both now; link colour measured #2a4f9e).
- `B.pause(stage, speed)` / `B.timerDue(state, leftMs)` in bots.js are the Play options' logic; `P.timer`, `P.dayT`, `P.dayLeft` live in the saved game.
- `state.grim` (engine) is the Storyteller's record (poison, protect, attack + result, info with ok/drunk, star pass). `view()` shows it only to `st` or after game over. Never add `rnd()` calls around it (seeded replays).
- Guided game: steps with `hold: true` make `tick()` wait, but only while `tour.active` and the step's `when()` is true (`current()` still returns the last step after the tour ends). Night 1 resolves inside createGame, so the "Night" step comes after "End the day".
- `window.__ct = { state, src, H, tour, E }` is a test hook (tut/ui/pwa-check scripts drive the game through `H`). Keep it.
- `PWA.safeToReload` is false only on the Play tab mid-game (the game is saved and resumes); `tests/pwa-check.json` relies on this.
- `.sky` (behind the circle) keeps its HTML constant; the fog phase comes from `--fd` on `<html>`, so `put('pRing')` doesn't re-render for nothing.
- Recording: `recordPlay()` on win, `abandonPlay()` on New game / Quit (counts as a loss only after your first move, `P.moved`); tutorial never counts; legacy saves load with `recorded = true`.
- **online.js cache stamp (2026-10-27):** every import of `js/online.js` uses `?v=a3d0418b`, the `_online` content stamp. After a re-copy: put the new stamp from `node ../_online/tools/stamp.mjs` there, bump the importing file's `?v=` (and pwa.js `data-version`), then `node ../_online/tools/stamp.mjs --check .` must say OK.
- `js/online.js` is a copy. Re-copy it from `../_online/online.js`; never edit it.
- The solver takes up to ~0.5 s at 15 players on the laptop (was 1–4 s), and runs in a Web Worker. The speed tests fail when the machine is busy: use `CT_SLOW=1`.
- `.view` must not animate (phone-view screenshots caught a blank frame, and Tim's rule is "nothing jumps").
- The Play view updates its parts (`#pCard`, `#pRing`, `#pAct`, `#feed`) separately, so a tap isn't lost to a re-render. Keep that.
- Time encoding: night k = 2k−1, day k = 2k.
- The engine's `who()` helper fixes verbs for the seat named "You" ("You nominate"). Use it for any new log line that starts with a name.
- Ring sizes (tokens, `.nm`, `.cl`, `.badge`, `.center *`) are in `cqmin` of `.ring` with a px floor (floors: names 10.5, claims 10, badges 11–12, reminders 10). Don't go back to fixed px or cqw: the Grimoire ring is an oval (`.ring.oval`, fills its box), and cqmin sizes it by the short side.
- `#v-play` and `#v-town` are size containers; their grids use `min(100cqh, …)` so the circle takes the full height on laptop/landscape. On phone portrait `.ringcol` and `.playside` are `display: contents` (one flex column; the ringbox is `aspect-ratio: 1`, the feed takes the rest). Re-run the scratchpad `vis/clocktower/check.mjs` after any layout change.
- Seat classes from `ring()`: `lft` (left half), `rgt` (far right, badge kept on screen), `vt` (near top/bottom). Crowd mode places badge/shroud/hand/ghost by these. The hand is FX-popped, so place it with top/left, never transform.
- `ring()` adds `.crowd` at 11+ seats: smaller tokens, and claim + name sit in one `.lb` column under the token, width-capped by `--lw` (set per seat count in `ring()`). Badge, hand, shroud and ghost move to the token's top corners in crowd mode. Measure with the manager's scratchpad `edge/clocktower/overlap.mjs` after any ring change (12 seats on a phone: 0 overlaps on 10-20).
- Back button: every sheet (and help page over it) and every tab change is a history entry (`histPush`, `sheetDepth`, `skipPop`). Close sheets with `dismissSheet()`, not `closeSheet()`, or a dead history entry is left behind.
- `tick()` waits while `document.hidden`; a `storage` listener adopts saves from another tab. If the solver worker fails, pending jobs re-run on the main thread (`pending[tag].input`).
- `.tok` is positioned with `transform: translate(-50%,-50%)`: never FX.pop/shake the token itself (it would jump); ctfx animates its `.ic`. Same for `.center` (animate `.center .big`).
- The Settings sheet is redrawn as HTML; `drawSheet()` re-mounts `FX.renderSettings` into `#fxSlot` each time. fx.js's switch is a `<label class="switch">`, styled to match via `.fx-set` rules at the end of styles.css.
- Odds bar width is `calc((100% - 40px) * p)`, because the number sits in the bar's right 40px.
- `ring()` takes `me` (that seat is drawn at the bottom, order stays clockwise), `hand` (clock hand target) and `box` (surface class). Grimoire reminders are `t.rems`, drawn in the ring just inside the token (not inside the button). Don't go back to seat 0 at the top in Play/Town.
- Token look uses CSS vars `--parch*`, `--ink-T/O/M/D`, `--edge` (cardboard edge + shadow). Any box-shadow on `.tok` must end with `var(--edge)` or the token goes flat.
- A death flips the life token (`.tok.flipping`), and the new-game deal turns your character token (`#pCard .ctok`), timed off the ctfx event list in `fxDrive`. Both use `TABLE.animOn()` (respects Animations off / reduced motion).
- `#v-play` is the table (`tbl-surface tbl-wood-dark`, `.is-night` at night). `#pCard` sits at the top of `.playside` (under the circle on a phone, top of the right column on laptop) and opens the full ability on tap (`play-card`); `#pRing` is `display:contents`. The feed sticks to the newest line unless you scrolled up.
- The odds badge sits on the token's right side (`.tok .badge`). Corners covered the role/name labels; check overlaps with `scratchpad/ct/fix/overlap.mjs`-style measuring.

## Decisions
- The computer is always the Storyteller in Play. Made-up info for Drunk/poisoned players is random but believable.
- Play covers Trouble Brewing only. BMR/S&V appear in the Grimoire and the role list.
- Online day ends when every seat has tapped End day (computers are done once they have nothing to say).
- Odds model: a matching reading counts for more than a made-up one; each needed poisoning ×¼; the Drunk prior is split over Townsfolk claimers.
- 10-27 (Tim's calls, plainest default taken): new visitors land on Play; odds badges stay on in rated games; ratings Easy 1200 / Hard 1420 (from measured fair share 78%); computer strength unchanged (Hard clearly above Easy); achievement names; "Story" label.

## NOT verified
- Odds speed on a real iPhone: only estimated with Chrome 4× CPU throttle (worst 15-player odds job ~2.9 s, off the main thread; the computers wait for it). Whether CDP throttling also slows the worker thread is unclear, so in-game worker timings were not used as the phone figure. The 50% badge fade was seen in still shots only. Big-moment animations seen only as stills. Hood icon read as "unknown player" only by me. The Demon-reveal and execution moments were caught in screenshots at 393/320; at landscape/1280/1440 the scripted execution didn't land in the capture window.
- On a real iPhone (only WebKit at 393 px). Solver time on an iPhone at 12+ players.
- BMR/S&V wording of abilities against the official almanac (order checked, text is ours).
- Online with 3+ people, host dropping mid-game, rejoin by name. An AFK online player stalls the day (not fixed: needs the shared layer).
- Edge pass: 14-character names at 12–15 seats still touch a neighbour's odds badge slightly (1–3 spots); on iPhone SE width (320) and landscape the circle is so small that ~5–10 small touches remain.
- Visibility pass: at 320 px and phone landscape, 1–3 small touches remain per crowded screen (reminders of neighbouring Grimoire seats, a name against a claim label); a 15-seat Grimoire in phone landscape has 21 px tokens with shortened names; at 320 px the 12-seat circle is 237 px. The game-over circle still shows claims, not true roles (not changed; not a layout issue). Not seen on a real iPhone.
- The design pass's pick-glow animation was not seen moving: screenshots are stills. Also not checked on a real iPhone.
- Sounds were never heard: headless WebKit on Windows has no Web Audio. The sound list is tested in node with a fake AudioContext; loudness/feel of the bells on a real phone is unchecked. Confetti ran slowly in headless WebKit (same frame-gap artefact).
- Sounds in a real online game (only the shared view-diff path, tested locally).
- Real-table look: not seen on a real iPhone; the token flip was measured (class added on deaths, 0 errors) but not watched moving. Clocktower has no game Speed setting, so the old `data-speed` clash didn't apply.
- Wave 3: render timing only with Chromium CPU throttle (not a real iPhone, not WebKit timing); the day timer was seen ending a day in WebKit (2-second clock, 7 players) but a full 2–6 minute day wasn't watched; the video links' content was judged by title/channel only.
- Smoothness on a real iPhone. Headless WebKit showed ~300 ms frame gaps during computer turns, Chromium none; no app code ran over 100 ms on the main thread.

## Rejected / parked
- ~~Computer play for BMR/S&V~~: too large for now (see docs/ideas.md).
- ~~Travellers, Fabled, custom script import, chat~~: low value (docs/ideas.md).
