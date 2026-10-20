# Clocktower: progress

## START HERE
Read this file, then CLAUDE.md, then `docs/rules-check.md` and `docs/ideas.md`. Code map: `js/roles.js` (72 roles, counts, night order), `js/solver.js` (line-up enumerator → Demon/evil odds), `js/engine.js` (Trouble Brewing rules + computer Storyteller), `js/bots.js` (computer players), `js/ctonline.js` (game object for the shared online layer), `js/app.js` (all UI), `js/art.js` (icons), `js/worker.js` (solver off the main thread).
Last updated: 2026-10-19 (first build, phase 1 + phase 2).

## Goal right now
Tim: "could you also explore blood on the clocktower?" Phase 2: "build regular play online with a computer or other online players for all the games … that match exactly the play of the in-person game … Really work on the webdesign … art … make sure that everything works properlly without errors … get everything right like rules … specific numbers."

## Status
| Part | State |
|---|---|
| Town notebook (claims, votes, deaths, night info, notes) + Demon odds badges | Done |
| Odds tab (Demon % / evil %, likely teams, maybe-Drunk) | Done |
| Play: Trouble Brewing vs computers (5–12 players, Easy/Hard) | Done |
| Play online (shared `_online` layer, gameId `clocktower`) | Done. Two-browser game (WebKit + Chromium) played to "Game over" against the live Firebase project on 10-19 |
| Practice puzzles (easy/medium/hard) with Reveal | Done |
| Grimoire: setup counts (Baron/Godfather/Fang Gu/Vigormortis), night order, grimoire circle with reminders | Done, all 3 scripts |
| Roles list, 3 scripts, search | Done |
| docs/rules-check.md, docs/ideas.md | Done |

## Measured strength (tests/measure.js, 8 players, 200 games per pairing, 2026-10-19)
- Hard good vs hard evil: good wins 59.0%. Easy good vs hard evil: 3.0%. Hard good vs easy evil: 59.5%. Easy vs easy: 9.5%.
- Solver at each day's end, public info only: average chance on the real Demon is 19.1%, against 16.4% for a random guess. The top pick is right 13.2% of the time. In 335 day-ends, the real world was never ruled out.
- Earlier, before evil bots faked info: 63.5 / 3.0 / 74.0 / 10.5%, and the solver averaged 23.3% vs 16.2%.

## Standing instructions (Tim's words, via the manager)
- "Write each role's ability in your own words (no copied official text or art)."
- Phone-first dark look with the Hub tokens. No page scroll on main screens. Labels 1–3 words, with explanations behind a "?". $0.

## Traps
- `js/online.js` is a copy. Re-copy it from `../_online/online.js`; never edit it.
- The solver can take 1–3 s at 15 players, and runs in a Web Worker. The speed test fails when the machine is busy: use `CT_SLOW=1`.
- `.view` must not animate (phone-view screenshots caught a blank frame, and Tim's rule is "nothing jumps").
- The Play view updates its parts (`#pCard`, `#pRing`, `#pAct`, `#feed`) separately, so a tap isn't lost to a re-render. Keep that.
- Time encoding: night k = 2k−1, day k = 2k.

## Decisions
- The computer is always the Storyteller in Play. Made-up info for Drunk/poisoned players is random but believable.
- Play covers Trouble Brewing only. BMR/S&V appear in the Grimoire and the role list.
- Online day ends when every seat has tapped End day (computers are done once they have nothing to say).
- Odds model: a matching reading counts for more than a made-up one; each needed poisoning ×¼; the Drunk prior is split over Townsfolk claimers.

## NOT verified
- On a real iPhone (only WebKit at 393 px). Solver time on an iPhone at 12+ players.
- BMR/S&V wording of abilities against the official almanac (order checked, text is ours).
- Online with 3+ people, host dropping mid-game, rejoin by name.

## Rejected / parked
- ~~Computer play for BMR/S&V~~: too large for now (see docs/ideas.md).
- ~~Travellers, Fabled, custom script import, chat~~: low value (docs/ideas.md).
