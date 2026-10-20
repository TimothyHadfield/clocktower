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
