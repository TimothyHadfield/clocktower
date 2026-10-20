# Rules check: Blood on the Clocktower (Trouble Brewing play, all three base scripts as reference)

Checked 2026-10-19. Sources:
- **A. Official wiki:** https://wiki.bloodontheclocktower.com/Rules_Explanation and /Setup, plus the per-role pages.
- **B. bra1n/townsquare** (the widely used open-source online grimoire): `src/roles.json` and `src/game.json` (develop branch), downloaded and compared by script.
- **C. Memory** of the printed Trouble Brewing rulebook and night sheet. Used only where A and B are silent.

Status: **OK** = matches two sources. **1-src** = one source only. **NV** = not verified.

| Rule / number | In the app | A | B | Status |
|---|---|---|---|---|
| Setup table, 5–15 players (T/O/M/D): 5 3/0/1/1 · 6 3/1/1/1 · 7 5/0/1/1 · 8 5/1/1/1 · 9 5/2/1/1 · 10 7/0/2/1 · 11 7/1/2/1 · 12 7/2/2/1 · 13 9/0/3/1 · 14 9/1/3/1 · 15 9/2/3/1 | `roles.js COUNTS`; pinned in `tests/engine.test.js` | setup sheet (C) | `game.json`, exact match | OK |
| Baron: +2 Outsiders (−2 Townsfolk) | `adjustedCounts` | Baron page | `setup: true` | OK |
| Godfather ±1 Outsider, Fang Gu +1, Vigormortis −1 | `adjustedCounts` (Storyteller picks ± for Godfather) | role pages (C) | `setup: true` for all three | OK |
| Drunk: counts as an Outsider, thinks it is a Townsfolk not in play | engine `thinks`, grimoire deal | Drunk page | `setup: true` (token handling only, no count change) | OK |
| First-night order (26 roles across the 3 scripts, incl. Minion info, Demon info) | `roles.js FIRST_NIGHT` | night sheet (C) | `firstNight` numbers: 0 order inversions | OK |
| Other-night order (48 roles) | `roles.js OTHER_NIGHTS` | night sheet (C) | `otherNight` numbers: 0 order inversions | OK |
| Minion and Demon info only with 7+ players | `nightOrder` and engine | (C) | Lunatic reminder: "If 7 or more players…" | OK |
| Demon learns 3 good roles not in play (bluffs) | engine `bluffs` | Imp/Demon info (C) | `demoninfo` reminder | OK |
| Execution needs votes ≥ half the living players (rounded up) | engine `threshold` = ceil(alive/2) | "at least 50% of the living players" | townsquare vote UI | OK |
| Must beat the highest tally so far today; a tie means nobody is on the block | engine `closeVote` | "On a tie, neither player is executed." | (C) | OK |
| One execution per day, at the end of the day | engine `endDay` | (C) | (C) | 1-src |
| Each player nominates once per day and is nominated once per day; dead players can't nominate | engine nomination checks | "dead players may no longer nominate" | (C) | OK (dead) / 1-src (once per day) |
| Dead players keep one vote for the rest of the game | engine `ghost` | "only one vote for the rest of the game" | townsquare vote token | OK |
| Good wins when the Demon dies; evil wins with 2 players alive | engine win checks | both quoted on the wiki | (C) | OK |
| Saint executed → evil wins | engine | Saint page | `saint` ability | OK |
| Mayor: 3 alive and no execution → good wins; night kill may bounce | engine | Mayor page | `mayor` ability | OK |
| Scarlet Woman becomes the Demon if 5+ alive when the Demon dies | engine + solver | Scarlet Woman page | ability text | OK |
| Imp self-kill passes the Demon to a Minion | engine + solver | Imp page | ability text | OK |
| Virgin: first nomination by a Townsfolk executes the nominator at once | engine | Virgin page | ability text | OK |
| Slayer: once per game, by day; the Demon dies | engine | Slayer page | ability text | OK |
| Butler votes only if their master votes | engine | Butler page | ability text | OK |
| Spy / Recluse may register as the other team | solver (either way per check), engine Storyteller (random) | role pages | ability text | OK |
| Fortune Teller red herring (one good player reads "yes") | engine + solver | FT page | `Red herring` reminder | OK |
| Poisoner: poisoned until dusk of the next day | engine `poisonedT` | Poisoner page | ability text | OK |
| Role counts per script: TB 13/4/4/1, BMR 13/4/4/4, S&V 13/4/4/4 | `roles.js`; `tests/art.test.js` | script pages | edition/team of all 72 ids match | OK |

## Things simplified on purpose (computer Storyteller)
- The computer Storyteller chooses wrong info for Drunk or poisoned players at random, but keeps it believable (e.g. a Chef count never higher than the number of evil players could make). A human Storyteller would steer the game, which the app doesn't try to do.
- Play mode is Trouble Brewing only. Bad Moon Rising and Sects & Violets are in the Grimoire (setup, night order, reminders) and the role list, not in computer play.
- No Travellers or Fabled.

## NOT verified
- The exact wording on the printed night sheet for BMR/S&V roles (we wrote our own text). Only the order was checked, against source B.
- "Each player may be nominated once per day" and "one execution per day" are from memory of the rulebook (C). The wiki page doesn't state them.
