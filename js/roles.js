// Role data for the three base scripts. Every ability is written in our own words
// (no official text or art). Facts only: names, teams, setup changes, night order.
(function (root) {
  'use strict';

  // type: T = Townsfolk, O = Outsider, M = Minion, D = Demon
  // setup: change to the Outsider count this role makes ('pm1' = either +1 or -1)
  // remind: reminder tokens the Storyteller may place for this role
  const R = (id, name, type, script, ability, extra) => Object.assign({ id, name, type, script, ability, remind: [] }, extra || {});

  const LIST = [
    // ---------------- Trouble Brewing ----------------
    R('washerwoman', 'Washerwoman', 'T', 'tb', 'Night 1: learn two players and a Townsfolk role. One of them has it.', { remind: ['Townsfolk', 'Wrong'], first: 'Point to two players and show the Townsfolk one of them is.' }),
    R('librarian', 'Librarian', 'T', 'tb', 'Night 1: learn two players and an Outsider role one of them has, or that no Outsiders are in play.', { remind: ['Outsider', 'Wrong'], first: 'Point to two players and show an Outsider one of them is (or show zero).' }),
    R('investigator', 'Investigator', 'T', 'tb', 'Night 1: learn two players and a Minion role. One of them has it.', { remind: ['Minion', 'Wrong'], first: 'Point to two players and show the Minion one of them is.' }),
    R('chef', 'Chef', 'T', 'tb', 'Night 1: learn how many pairs of evil players sit side by side.', { first: 'Show the number of adjacent evil pairs.' }),
    R('empath', 'Empath', 'T', 'tb', 'Each night: learn how many of your two nearest living neighbours are evil (0, 1 or 2).', { first: 'Show how many living neighbours are evil.', other: 'Show how many living neighbours are evil.' }),
    R('fortuneteller', 'Fortune Teller', 'T', 'tb', 'Each night: pick two players and learn "yes" if either is the Demon. One good player always reads "yes" for you.', { remind: ['Red herring'], first: 'They point at two players; nod if either is the Demon or the red herring.', other: 'They point at two players; nod if either is the Demon or the red herring.' }),
    R('undertaker', 'Undertaker', 'T', 'tb', 'Each night after an execution: learn the role of the player executed today.', { remind: ['Executed'], other: 'If someone was executed today, show their role.' }),
    R('monk', 'Monk', 'T', 'tb', 'Each night after the first: pick another player. The Demon cannot kill them tonight.', { remind: ['Safe'], other: 'They pick a player to keep safe tonight.' }),
    R('ravenkeeper', 'Ravenkeeper', 'T', 'tb', 'If the Demon kills you at night, you wake, pick a player and learn their role.', { other: 'If killed tonight: they pick a player; show that role.' }),
    R('virgin', 'Virgin', 'T', 'tb', 'The first time you are nominated, if the nominator is a Townsfolk, they are executed at once.', { remind: ['No ability'] }),
    R('slayer', 'Slayer', 'T', 'tb', 'Once per game, by day, publicly pick a player. If they are the Demon, they die.', { remind: ['No ability'] }),
    R('soldier', 'Soldier', 'T', 'tb', 'The Demon cannot kill you.'),
    R('mayor', 'Mayor', 'T', 'tb', 'If only 3 players live and nobody is executed, good wins. If you would die at night, someone else might die instead.'),
    R('butler', 'Butler', 'O', 'tb', 'Each night pick a player (your master). Tomorrow you may vote only if they vote too.', { remind: ['Master'], first: 'They pick their master.', other: 'They pick their master.' }),
    R('drunk', 'Drunk', 'O', 'tb', 'You think you are a Townsfolk, but you are not. Your ability does nothing and your info can be wrong.', { remind: ['Drunk'], thinks: 'T' }),
    R('recluse', 'Recluse', 'O', 'tb', 'You might show up as evil, or as a Minion or Demon, even though you are good.'),
    R('saint', 'Saint', 'O', 'tb', 'If you are executed, your team loses.'),
    R('poisoner', 'Poisoner', 'M', 'tb', 'Each night pick a player. They are poisoned tonight and tomorrow: their ability fails and their info can be wrong.', { remind: ['Poisoned'], first: 'They pick a player to poison.', other: 'They pick a player to poison.' }),
    R('spy', 'Spy', 'M', 'tb', 'Each night you see the whole grimoire. You might show up as good, or as a Townsfolk or Outsider.', { first: 'Show them the grimoire.', other: 'Show them the grimoire.' }),
    R('scarletwoman', 'Scarlet Woman', 'M', 'tb', 'If 5 or more players are alive and the Demon dies, you become the Demon.', { remind: ['Demon'], other: 'If the Demon died today with 5+ alive, wake them: they are now the Demon.' }),
    R('baron', 'Baron', 'M', 'tb', 'Two extra Outsiders are in play, in place of Townsfolk.', { setup: 2 }),
    R('imp', 'Imp', 'D', 'tb', 'Each night after the first, pick a player to kill. If you pick yourself, a Minion becomes the Imp.', { remind: ['Dead'], other: 'They pick a player to kill. Self-kill: wake a Minion as the new Imp.' }),

    // ---------------- Bad Moon Rising ----------------
    R('grandmother', 'Grandmother', 'T', 'bmr', 'Night 1: learn a good player and their role. If the Demon kills them, you die too.', { remind: ['Grandchild'], first: 'Point to their grandchild and show that role.', other: 'If the grandchild was killed by the Demon, they die too.' }),
    R('sailor', 'Sailor', 'T', 'bmr', 'Each night pick a living player: one of you is drunk until dusk tomorrow. You cannot die.', { remind: ['Drunk'], first: 'They pick a player; one of them is drunk.', other: 'They pick a player; one of them is drunk.' }),
    R('chambermaid', 'Chambermaid', 'T', 'bmr', 'Each night pick two other living players: learn how many of them woke tonight for their ability.', { first: 'They pick two players; show how many woke tonight.', other: 'They pick two players; show how many woke tonight.' }),
    R('exorcist', 'Exorcist', 'T', 'bmr', 'Each night after the first, pick a player (not last night\'s). If it is the Demon, they learn who you are and do not act tonight.', { remind: ['Chosen'], other: 'They pick a player; if it is the Demon, the Demon learns them and sleeps.' }),
    R('innkeeper', 'Innkeeper', 'T', 'bmr', 'Each night after the first, pick two players. They cannot die tonight, but one is drunk until dusk.', { remind: ['Safe', 'Drunk'], other: 'They pick two players to protect; one is drunk.' }),
    R('gambler', 'Gambler', 'T', 'bmr', 'Each night after the first, pick a player and guess their role. If wrong, you die.', { remind: ['Dead'], other: 'They pick a player and a role; wrong guess = they die.' }),
    R('gossip', 'Gossip', 'T', 'bmr', 'Each day you may make a public statement. Tonight, if it was true, a player dies.', { remind: ['Dead'], other: 'If today\'s statement was true, pick a player to die.' }),
    R('courtier', 'Courtier', 'T', 'bmr', 'Once per game at night, pick a role. That player is drunk for 3 nights and 3 days.', { remind: ['Drunk 3', 'Drunk 2', 'Drunk 1', 'No ability'], first: 'They may pick a role to make drunk.', other: 'They may pick a role to make drunk.' }),
    R('professor', 'Professor', 'T', 'bmr', 'Once per game at night after the first, pick a dead player. If they are a Townsfolk, they come back to life.', { remind: ['Alive', 'No ability'], other: 'They may pick a dead player to revive.' }),
    R('minstrel', 'Minstrel', 'T', 'bmr', 'When a Minion dies by execution, everyone else is drunk until dusk tomorrow.', { remind: ['Everyone drunk'] }),
    R('tealady', 'Tea Lady', 'T', 'bmr', 'If both your living neighbours are good, they cannot die.', { remind: ['Cannot die'] }),
    R('pacifist', 'Pacifist', 'T', 'bmr', 'Executed good players might not die.'),
    R('fool', 'Fool', 'T', 'bmr', 'The first time you would die, you do not.', { remind: ['No ability'] }),
    R('tinker', 'Tinker', 'O', 'bmr', 'You might die at any time.', { remind: ['Dead'], other: 'You may kill them.' }),
    R('moonchild', 'Moonchild', 'O', 'bmr', 'When you learn you died, publicly pick a living player. If they are good, they die tonight.', { remind: ['Kill'], other: 'If their pick is good, that player dies.' }),
    R('goon', 'Goon', 'O', 'bmr', 'Each night, the first player to pick you with their ability is drunk until dusk. You join their team.', { remind: ['Drunk'] }),
    R('lunatic', 'Lunatic', 'O', 'bmr', 'You think you are the Demon, but you are not. The Demon knows who you are and whom you pick at night.', { remind: ['Attack 1', 'Attack 2', 'Attack 3'], thinks: 'D', first: 'Show them fake Minions and bluffs; they act as the Demon.', other: 'They pick as the Demon would; tell the Demon.' }),
    R('godfather', 'Godfather', 'M', 'bmr', 'Night 1: learn which Outsiders are in play. If an Outsider died today, pick a player tonight: they die. (One more or one fewer Outsider.)', { setup: 'pm1', remind: ['Died today', 'Dead'], first: 'Show the Outsiders in play.', other: 'If an Outsider died today, they pick a player to die.' }),
    R('devilsadvocate', 'Devil\'s Advocate', 'M', 'bmr', 'Each night pick a living player (not last night\'s). If they are executed tomorrow, they do not die.', { remind: ['Survives execution'], first: 'They pick a player to protect from execution.', other: 'They pick a player to protect from execution.' }),
    R('assassin', 'Assassin', 'M', 'bmr', 'Once per game at night after the first, pick a player: they die, even if something protects them.', { remind: ['Dead', 'No ability'], other: 'They may pick a player to kill.' }),
    R('mastermind', 'Mastermind', 'M', 'bmr', 'If the Demon dies by execution, play one more day. If a player is executed then, their team loses.'),
    R('zombuul', 'Zombuul', 'D', 'bmr', 'Each night after the first, if nobody died today, pick a player to kill. The first time you die, you live on but seem dead.', { remind: ['Died today', 'Dead'], other: 'If no one died today, they pick a player to kill.' }),
    R('pukka', 'Pukka', 'D', 'bmr', 'Each night pick a player: they are poisoned. Last night\'s poisoned player dies and becomes healthy.', { remind: ['Poisoned', 'Dead'], first: 'They pick a player to poison.', other: 'They pick a player to poison; last pick dies.' }),
    R('shabaloth', 'Shabaloth', 'D', 'bmr', 'Each night after the first, pick 2 players to kill. A player you killed last night might come back.', { remind: ['Dead', 'Alive'], other: 'They pick two players to kill; maybe revive one from last night.' }),
    R('po', 'Po', 'D', 'bmr', 'Each night after the first, you may pick a player to kill. If you picked nobody last night, pick 3 tonight.', { remind: ['Dead', '3 attacks'], other: 'They may pick 1 player, or 3 if they skipped last night.' }),

    // ---------------- Sects & Violets ----------------
    R('clockmaker', 'Clockmaker', 'T', 'snv', 'Night 1: learn how many steps apart the Demon sits from its nearest Minion.', { first: 'Show the step count from Demon to nearest Minion.' }),
    R('dreamer', 'Dreamer', 'T', 'snv', 'Each night pick a player: learn one good and one evil role, one of which is theirs.', { first: 'They pick a player; show one good and one evil role.', other: 'They pick a player; show one good and one evil role.' }),
    R('snakecharmer', 'Snake Charmer', 'T', 'snv', 'Each night pick a living player. If it is the Demon, you swap roles and teams, and the new Snake Charmer is poisoned.', { remind: ['Poisoned'], first: 'They pick a player; swap if it is the Demon.', other: 'They pick a player; swap if it is the Demon.' }),
    R('mathematician', 'Mathematician', 'T', 'snv', 'Each night learn how many players\' abilities worked wrongly since dawn because of another role.', { remind: ['Abnormal'], first: 'Show the number of abnormal abilities.', other: 'Show the number of abnormal abilities.' }),
    R('flowergirl', 'Flowergirl', 'T', 'snv', 'Each night after the first, learn whether the Demon voted today.', { remind: ['Demon voted', 'Demon not voted'], other: 'Show whether the Demon voted today.' }),
    R('towncrier', 'Town Crier', 'T', 'snv', 'Each night after the first, learn whether a Minion nominated today.', { remind: ['Minion nominated', 'No Minion nominated'], other: 'Show whether a Minion nominated today.' }),
    R('oracle', 'Oracle', 'T', 'snv', 'Each night after the first, learn how many dead players are evil.', { other: 'Show how many dead players are evil.' }),
    R('savant', 'Savant', 'T', 'snv', 'Each day you may visit the Storyteller and learn two things privately: one true, one false.'),
    R('seamstress', 'Seamstress', 'T', 'snv', 'Once per game at night, pick two other players: learn whether they are on the same team.', { remind: ['No ability'], first: 'They may pick two players; show same team or not.', other: 'They may pick two players; show same team or not.' }),
    R('philosopher', 'Philosopher', 'T', 'snv', 'Once per game at night, pick a good role: you gain its ability. If that role is in play, its player is drunk.', { remind: ['Drunk', 'Is the Philosopher'], first: 'They may pick a good role to gain.', other: 'They may pick a good role to gain.' }),
    R('artist', 'Artist', 'T', 'snv', 'Once per game, by day, privately ask the Storyteller any yes/no question.', { remind: ['No ability'] }),
    R('juggler', 'Juggler', 'T', 'snv', 'On your first day, publicly guess up to 5 players\' roles. That night, learn how many you got right.', { remind: ['Correct'], other: 'After their first day: show how many guesses were right.' }),
    R('sage', 'Sage', 'T', 'snv', 'If the Demon kills you, learn two players. One of them is the Demon.', { other: 'If the Demon killed them, point to two players, one the Demon.' }),
    R('mutant', 'Mutant', 'O', 'snv', 'If you are "mad" about being an Outsider, you might be executed.'),
    R('sweetheart', 'Sweetheart', 'O', 'snv', 'When you die, one player is drunk from then on.', { remind: ['Drunk'], other: 'If they died today or tonight, make one player drunk.' }),
    R('barber', 'Barber', 'O', 'snv', 'If you died today or tonight, the Demon may pick 2 players (not another Demon) to swap roles.', { remind: ['Haircuts tonight'], other: 'If they died, the Demon may swap two players\' roles.' }),
    R('klutz', 'Klutz', 'O', 'snv', 'When you learn you died, publicly pick a living player. If they are evil, your team loses.'),
    R('eviltwin', 'Evil Twin', 'M', 'snv', 'You and a player on the other team know each other. If the good twin is executed, evil wins. Good cannot win while you both live.', { remind: ['Twin'], first: 'Wake both twins and show them each other\'s roles.' }),
    R('witch', 'Witch', 'M', 'snv', 'Each night pick a player. If they nominate tomorrow, they die. With only 3 alive, you lose this ability.', { remind: ['Cursed'], first: 'They pick a player to curse.', other: 'They pick a player to curse.' }),
    R('cerenovus', 'Cerenovus', 'M', 'snv', 'Each night pick a player and a good role. Tomorrow they must be "mad" they are that role, or might be executed.', { remind: ['Mad'], first: 'They pick a player and a role; wake that player to tell them.', other: 'They pick a player and a role; wake that player to tell them.' }),
    R('pithag', 'Pit-Hag', 'M', 'snv', 'Each night after the first, pick a player and a role not in play: they become it. If a Demon is made, tonight\'s deaths are up to the Storyteller.', { other: 'They pick a player and a role; change it.' }),
    R('fanggu', 'Fang Gu', 'D', 'snv', 'Each night after the first, pick a player to kill. The first time you pick an Outsider, they become an evil Fang Gu and you die instead. (One more Outsider.)', { setup: 1, remind: ['Dead', 'Once'], other: 'They pick a player to kill (Outsider jump once).' }),
    R('vigormortis', 'Vigormortis', 'D', 'snv', 'Each night after the first, pick a player to kill. Minions you kill keep their ability and poison a Townsfolk neighbour. (One fewer Outsider.)', { setup: -1, remind: ['Dead', 'Has ability', 'Poisoned'], other: 'They pick a player to kill.' }),
    R('nodashii', 'No Dashii', 'D', 'snv', 'Each night after the first, pick a player to kill. Your two nearest Townsfolk neighbours are poisoned.', { remind: ['Dead', 'Poisoned'], other: 'They pick a player to kill.' }),
    R('vortox', 'Vortox', 'D', 'snv', 'Each night after the first, pick a player to kill. Townsfolk abilities give false info. Each day, if nobody is executed, evil wins.', { remind: ['Dead'], other: 'They pick a player to kill.' }),
  ];

  const ROLES = {};
  for (const r of LIST) ROLES[r.id] = r;

  const SCRIPTS = {
    tb: { id: 'tb', name: 'Trouble Brewing', short: 'TB' },
    bmr: { id: 'bmr', name: 'Bad Moon Rising', short: 'BMR' },
    snv: { id: 'snv', name: 'Sects & Violets', short: 'S&V' },
  };

  const TYPE_NAME = { T: 'Townsfolk', O: 'Outsider', M: 'Minion', D: 'Demon' };

  function rolesOf(script, type) {
    return LIST.filter(r => r.script === script && (!type || r.type === type));
  }

  // Base counts by player count (5..15): [Townsfolk, Outsiders, Minions, Demons]
  const COUNTS = {
    5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1], 9: [5, 2, 1, 1],
    10: [7, 0, 2, 1], 11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1], 14: [9, 1, 3, 1], 15: [9, 2, 3, 1],
  };

  function baseCounts(n) {
    const c = COUNTS[Math.max(5, Math.min(15, n))];
    return { T: c[0], O: c[1], M: c[2], D: c[3] };
  }

  // Counts after setup roles. godfatherSign picks +1 or -1 for the Godfather.
  // Returns {T,O,M,D, notes:[...]}; Outsiders never go below 0 and Townsfolk fill the rest.
  function adjustedCounts(n, chosenIds, godfatherSign) {
    const c = baseCounts(n);
    const notes = [];
    let dO = 0;
    for (const id of chosenIds) {
      const r = ROLES[id];
      if (!r || r.setup === undefined) continue;
      if (r.setup === 'pm1') { const s = godfatherSign === 1 ? 1 : -1; dO += s; notes.push(r.name + ' ' + (s > 0 ? '+1' : '−1') + ' Outsider'); }
      else { dO += r.setup; notes.push(r.name + ' ' + (r.setup > 0 ? '+' : '−') + Math.abs(r.setup) + ' Outsider' + (Math.abs(r.setup) > 1 ? 's' : '')); }
    }
    let O = Math.max(0, c.O + dO);
    O = Math.min(O, c.T + c.O);
    return { T: c.T + c.O - O, O, M: c.M, D: c.D, notes };
  }

  // Night order (one shared order; each script uses its own subset).
  // Markers: minioninfo / demoninfo are the setup steps on night 1 (7+ players).
  const FIRST_NIGHT = ['philosopher', 'minioninfo', 'lunatic', 'demoninfo', 'sailor', 'poisoner', 'courtier', 'snakecharmer', 'godfather', 'devilsadvocate', 'eviltwin', 'witch', 'cerenovus', 'pukka', 'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'butler', 'grandmother', 'clockmaker', 'dreamer', 'seamstress', 'spy', 'chambermaid', 'mathematician'];
  const OTHER_NIGHTS = ['philosopher', 'sailor', 'poisoner', 'courtier', 'innkeeper', 'gambler', 'snakecharmer', 'monk', 'devilsadvocate', 'witch', 'cerenovus', 'pithag', 'scarletwoman', 'lunatic', 'exorcist', 'imp', 'zombuul', 'pukka', 'shabaloth', 'po', 'fanggu', 'nodashii', 'vortox', 'vigormortis', 'assassin', 'godfather', 'gossip', 'barber', 'sweetheart', 'sage', 'professor', 'tinker', 'moonchild', 'grandmother', 'ravenkeeper', 'empath', 'fortuneteller', 'undertaker', 'dreamer', 'flowergirl', 'towncrier', 'oracle', 'seamstress', 'juggler', 'butler', 'spy', 'chambermaid', 'mathematician'];

  const MARKERS = {
    minioninfo: { name: 'Minion info', text: 'Wake the Minions together: show them the Demon and each other.' },
    demoninfo: { name: 'Demon info', text: 'Wake the Demon: show the Minions and 3 good roles not in play (bluffs).' },
  };

  // Steps for the chosen roles, in order. small games (<7) skip minion/demon info.
  function nightOrder(chosenIds, first, n) {
    const set = new Set(chosenIds);
    const order = first ? FIRST_NIGHT : OTHER_NIGHTS;
    const out = [];
    for (const id of order) {
      if (MARKERS[id]) { if (first && (n || 7) >= 7) out.push({ id, name: MARKERS[id].name, text: MARKERS[id].text, marker: true }); continue; }
      if (!set.has(id)) continue;
      const r = ROLES[id];
      const text = first ? r.first : r.other;
      if (text) out.push({ id, name: r.name, type: r.type, text });
    }
    return out;
  }

  const api = { ROLES, LIST, SCRIPTS, TYPE_NAME, COUNTS, rolesOf, baseCounts, adjustedCounts, nightOrder, FIRST_NIGHT, OTHER_NIGHTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
