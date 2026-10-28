/* ctcoach.js: Clocktower's part of the shared coach kit (js/coach.js, never edit that one here):
 * the rules sheet and the guided first game.
 *   CTCoach.ID, CTCoach.ROLES, CTCoach.ME, CTCoach.SEED   the guided game's deal (always the same: you are the Empath, 7 players)
 *   (hold: true on a step = the computers wait while it is on screen, so the lesson isn't overtaken)
 *   CTCoach.steps(ctx)   ctx: { v() -> your view of the guided game or null, ui() -> { mode, sel } or null }
 *   CTCoach.rules()      COACH.rules() options (Trouble Brewing in our own words)
 * Plain script: window.CT.coach in the browser, module.exports in node. */
(function (root) {
  'use strict';
  const ID = 'clocktower-first';
  const SEED = 20261027;
  const ME = 2;
  // Ann Chef, Ben the Imp, you the Empath (Ben is your neighbour), Dev Soldier, Eli Scarlet Woman,
  // Fay Washerwoman, Gus Investigator. All Easy computers. No Poisoner, so your first reading is true.
  const ROLES = ['chef', 'imp', 'empath', 'soldier', 'scarletwoman', 'washerwoman', 'investigator'];

  function steps(ctx) {
    const v = () => ctx.v();
    const ui = () => ctx.ui() || {};
    const stage = () => { const g = v(); return g ? g.stage : ''; };
    const over = () => { const g = v(); return !g || !!g.winner; };
    const day1 = () => { const g = v(); return !!g && g.t === 2; };
    const vote = () => { const g = v(); return !!(g && g.day && g.day.vote); };
    const claimed = () => { const g = v(); return !!(g && g.claims[ME]); };
    const nominated = () => { const g = v(); return !!(g && g.day && g.day.nominators.includes(ME)); };
    const voted = () => { const g = v(); return !!(g && g.day && g.day.vote && g.day.vote.votes[ME] !== undefined); };
    const past1 = () => { const g = v(); return !g || g.t > 2; };
    return [
      { hold: true, title: 'Your first game of Clocktower', html: 'Seven players sit round the town square. <b>One is the Imp</b> (the Demon), helped by one Minion. Everyone else is good. Good wins by <b>executing the Demon</b>; evil wins when only two players are left alive.', when: () => !!v(), skipIf: over },
      { hold: true, target: '#pCard', title: 'Your character', html: 'You are the <b>Empath</b>, on the good team. Each night you learn how many of your two living neighbours are evil. Tap this sheet any time to read your ability.', next: true, skipIf: over },
      { hold: true, target: '#feed', title: 'Your information', html: 'Morning. The Storyteller whispered your reading: the shaded line in your notes is <b>only for you</b>. One evil neighbour means Ben or Dev is evil.', when: () => stage() === 'day', next: true, skipIf: () => over() || past1() },
      { hold: true, target: '#pRing .tok .badge', title: 'Demon odds', html: 'Each number is that player\'s <b>chance of being the Demon</b>, worked out from everything said so far. It updates as people claim and share.', when: () => stage() === 'day', next: true, skipIf: () => over() || past1() },
      { hold: true, target: '[data-act="play-claim"]', title: 'Claim', html: 'Tell the town who you are. Tap <b>Claim</b>, keep Empath picked and <b>Share my info too</b> on, then Claim. (Evil players lie here too.)', when: () => day1() && !vote() && !claimed(), until: claimed, skipIf: () => over() || past1() || claimed() },
      { hold: true, target: '[data-act="play-mode"][data-m="nominate"]', title: 'Nominate', html: 'Now put someone up for execution. Tap <b>Nominate</b>, then tap the player you suspect most (the odds help).', when: () => day1() && !vote() && !ui().mode && claimed(), until: () => !!ui().mode || nominated() || vote(), skipIf: () => over() || past1() || nominated() },
      { hold: true, target: '#pRing', title: 'Pick a player', html: 'Tap the player you want to nominate.', when: () => day1() && ui().mode === 'nominate', until: () => nominated() || vote() || !ui().mode, skipIf: () => over() || past1() || nominated() },
      { target: '#pAct .votebox', title: 'Vote', html: 'Everyone votes. A player needs <b>at least half the living players</b> voting yes to go on the block. At the end of the day, whoever is on the block is executed.', when: () => day1() && vote() && !voted(), until: voted, skipIf: () => over() || past1() },
      { hold: true, target: '[data-act="play-end"]', title: 'End the day', html: 'When the talking is done, tap <b>End day</b>. The player on the block (if any) is executed, and night falls.', when: () => day1() && !vote() && !ui().mode, until: past1, skipIf: () => over() || past1() },
      { target: '#pRing .center', title: 'Night', html: 'Night falls. The Storyteller wakes each character in turn, and from now on the Imp picks someone to kill. Wait for dawn: you will see who died.', when: () => stage() === 'night', until: () => stage() !== 'night', skipIf: over },
      { hold: true, title: 'You\'ve got it', html: 'Days and nights take turns until the Demon dies or only two are left. Dead players keep <b>one vote</b> for the rest of the game. <b>Undo</b> (top) takes back your last move, but that game then counts as "with help". The full rules are in <b>Settings</b> → Rules.' },
    ];
  }

  /** The rules sheet: Trouble Brewing, in our own words. */
  function rules() {
    return {
      title: 'How to play',
      intro: 'Blood on the Clocktower: Trouble Brewing, the starter script. Here the computer is the Storyteller.',
      sections: [
        { id: 'goal', short: 'Goal', title: 'Goal', html: '<p>Everyone gets a secret <b>character</b>. Most are <b>good</b>: Townsfolk and Outsiders. A few are <b>evil</b>: one <b>Demon</b> (the Imp) and its Minions.</p><ul><li><b>Good wins</b> when the Demon dies.</li><li><b>Evil wins</b> when only two players are left alive.</li></ul><p class="tip">Dead players are still in the game: they talk, and they keep one last vote.</p>' },
        { id: 'setup', short: 'Setup', title: 'Characters in play', html: '<table><tr><th>Players</th><th>Townsfolk</th><th>Outsiders</th><th>Minions</th><th>Demon</th></tr><tr><td>5</td><td>3</td><td>0</td><td>1</td><td>1</td></tr><tr><td>6</td><td>3</td><td>1</td><td>1</td><td>1</td></tr><tr><td>7</td><td>5</td><td>0</td><td>1</td><td>1</td></tr><tr><td>8</td><td>5</td><td>1</td><td>1</td><td>1</td></tr><tr><td>9</td><td>5</td><td>2</td><td>1</td><td>1</td></tr><tr><td>10</td><td>7</td><td>0</td><td>2</td><td>1</td></tr><tr><td>11</td><td>7</td><td>1</td><td>2</td><td>1</td></tr><tr><td>12</td><td>7</td><td>2</td><td>2</td><td>1</td></tr><tr><td>13</td><td>9</td><td>0</td><td>3</td><td>1</td></tr><tr><td>14</td><td>9</td><td>1</td><td>3</td><td>1</td></tr><tr><td>15</td><td>9</td><td>2</td><td>3</td><td>1</td></tr></table><p>The Baron adds two Outsiders (in place of Townsfolk). With 7 or more players the evil team learn who each other are, and the Demon learns three good characters that are not in play, to bluff as.</p><p class="tip">The Drunk thinks they are a Townsfolk. Their ability doesn\'t work, and their info may be wrong.</p>' },
        { id: 'night', short: 'Night', title: 'Night', html: '<ul><li>Everyone closes their eyes. The Storyteller wakes characters one at a time, in a fixed order.</li><li>Some <b>choose</b> players (Poisoner, Monk, Fortune Teller, Butler, Imp); others are <b>told</b> something (Washerwoman, Chef, Empath, Undertaker …).</li><li>From the second night the Imp picks a player to kill.</li><li>A poisoned or drunk player\'s ability fails, and the Storyteller may give them false info.</li></ul>' },
        { id: 'day', short: 'Day', title: 'Day', html: '<ul><li>Dawn: the Storyteller says who died in the night (not their character).</li><li>Players talk, <b>claim</b> characters and share what they learned. Anyone may lie; evil players do.</li><li>Any living player may <b>nominate</b> once a day, and each player may be nominated once a day.</li></ul>' },
        { id: 'vote', short: 'Votes', title: 'Voting and execution', html: '<ul><li>Everyone votes on each nomination. A player goes <b>on the block</b> with at least half the living players voting yes (rounded up) and more votes than anyone else today.</li><li>A tie with the player on the block takes both off.</li><li>At the end of the day the player on the block is <b>executed</b>. There may be no execution.</li><li>A dead player has <b>one vote</b> left for the rest of the game.</li></ul>' },
        { id: 'end', short: 'Winning', title: 'Winning', html: '<ul><li>The Demon dies (executed, or shot by the Slayer): <b>good wins</b>, unless the Scarlet Woman takes over as the new Imp (5 or more players alive).</li><li>Only two players alive: <b>evil wins</b>.</li><li>The Saint executed: evil wins. Three alive, no execution and the Mayor alive: good wins.</li></ul>' },
        { id: 'app', short: 'This app', title: 'Helpers in this app', html: '<ul><li><b>Demon odds</b> on each token: every possible line-up is checked against what was said, and each player gets their share.</li><li><b>Undo</b> (vs computers): takes back your last move. That game counts as "with help" in My stats.</li><li><b>Town</b> tab: a notebook for a real table. <b>Grimoire</b>: setup and night order for a Storyteller.</li></ul>' },
      ],
    };
  }

  const api = { ID, SEED, ME, ROLES, steps, rules };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { coach: api });
})(typeof window !== 'undefined' ? window : globalThis);
