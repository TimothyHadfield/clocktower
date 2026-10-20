// Original role pictograms (drawn for this site; not the official art).
// Each is a 64x64 line drawing in currentColor, so the page colours it by team.
(function (root) {
  'use strict';
  const P = {
    // ---- Trouble Brewing
    washerwoman: '<path d="M12 30h40l-5 22H17z"/><path d="M12 30q20-12 40 0"/><circle cx="24" cy="16" r="4"/><circle cx="37" cy="11" r="3"/><circle cx="45" cy="20" r="2"/>',
    librarian: '<path d="M10 14h16a6 6 0 0 1 6 6v34a5 5 0 0 0-5-5H10z"/><path d="M54 14H38a6 6 0 0 0-6 6v34a5 5 0 0 1 5-5h17z"/>',
    investigator: '<circle cx="27" cy="27" r="14"/><path d="M37 37l15 15"/><path d="M21 23a7 7 0 0 1 7-5"/>',
    chef: '<path d="M18 38a10 10 0 0 1 3-19 11 11 0 0 1 22 0 10 10 0 0 1 3 19z"/><path d="M20 38v14h24V38"/><path d="M20 46h24"/>',
    empath: '<path d="M32 52 13 33a10 10 0 0 1 19-15 10 10 0 0 1 19 15z"/><path d="M4 32h6M54 32h6"/>',
    fortuneteller: '<circle cx="32" cy="28" r="16"/><path d="M20 46h24l4 8H16z"/><path d="M26 22a8 8 0 0 1 6-4"/>',
    undertaker: '<path d="M32 8v28"/><path d="M24 8h16"/><path d="M22 36h20l-3 18H25z"/>',
    monk: '<path d="M14 54c0-24 7-42 18-42s18 18 18 42z"/><path d="M24 34a8 8 0 0 0 16 0"/>',
    ravenkeeper: '<path d="M8 42c10-2 16-12 26-15l10-9 10 4-9 5c0 13-10 21-26 21z"/><circle cx="45" cy="21" r="1.5"/><path d="M26 48l-4 8M32 48l2 8"/>',
    virgin: '<circle cx="32" cy="22" r="10"/><path d="M32 32v24"/><path d="M32 46c-7 0-11-4-11-9M32 42c7 0 11-4 11-9"/>',
    slayer: '<path d="M12 52 50 14"/><path d="M38 12h14v14"/><path d="M12 42v10h10"/>',
    soldier: '<path d="M32 8 52 16v14c0 14-8 22-20 26-12-4-20-12-20-26V16z"/><path d="M32 18v28M22 28h20"/>',
    mayor: '<path d="M20 12h24v26H20z"/><path d="M10 38h44"/><path d="M20 30h24"/><circle cx="32" cy="50" r="5"/>',
    butler: '<path d="M10 22v20l20-10zM54 22v20L34 32z"/><circle cx="32" cy="32" r="3"/>',
    drunk: '<path d="M14 20h26v34H14z"/><path d="M40 27h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-6"/><path d="M14 20c1-8 25-8 26 0"/><path d="M22 28v18M32 28v18"/>',
    recluse: '<path d="M16 54c0-22 6-38 14-38s14 16 14 38z"/><path d="M50 18v36"/><path d="M46 24h8v8h-8z"/>',
    saint: '<ellipse cx="32" cy="12" rx="13" ry="4"/><circle cx="32" cy="30" r="9"/><path d="M14 56c2-10 9-15 18-15s16 5 18 15"/>',
    poisoner: '<path d="M27 8h10M28 8v12L18 32v22h28V32L36 20V8"/><path d="M18 38h28"/><path d="M32 44v4"/>',
    spy: '<path d="M6 32s11-15 26-15 26 15 26 15-11 15-26 15S6 32 6 32z"/><circle cx="32" cy="32" r="7"/>',
    scarletwoman: '<path d="M8 32c8-9 15-11 24-5 9-6 16-4 24 5-8 11-15 15-24 15S16 43 8 32z"/><path d="M8 32h48"/>',
    baron: '<ellipse cx="32" cy="48" rx="18" ry="6"/><path d="M14 48v-8M50 48v-8"/><ellipse cx="32" cy="40" rx="18" ry="6"/><path d="M14 40v-8M50 40v-8"/><ellipse cx="32" cy="32" rx="18" ry="6"/><path d="M28 30h8"/>',
    imp: '<path d="M18 10l7 15M46 10l-7 15"/><circle cx="32" cy="38" r="15"/><path d="M25 35l4 2M39 35l-4 2"/><path d="M26 45q6 4 12 0"/>',
    // ---- Bad Moon Rising
    grandmother: '<circle cx="20" cy="32" r="9"/><circle cx="44" cy="32" r="9"/><path d="M29 32h6M11 30 6 26M53 30l5-4"/>',
    sailor: '<circle cx="32" cy="12" r="4"/><path d="M32 16v38M21 26h22"/><path d="M12 40c3 9 11 14 20 14s17-5 20-14"/>',
    chambermaid: '<path d="M20 44V30a12 12 0 0 1 24 0v14l4 4H16z"/><circle cx="32" cy="53" r="3"/><path d="M32 14v4"/>',
    exorcist: '<path d="M32 6v52M18 20h28"/>',
    innkeeper: '<circle cx="18" cy="32" r="9"/><path d="M27 32h28M46 32v8M52 32v6"/>',
    gambler: '<rect x="12" y="12" width="40" height="40" rx="7"/><circle cx="22" cy="22" r="3"/><circle cx="32" cy="32" r="3"/><circle cx="42" cy="42" r="3"/>',
    gossip: '<path d="M8 12h48v28H28l-11 11V40H8z"/><path d="M18 22h28M18 30h18"/>',
    courtier: '<path d="M18 10h28c0 14-6 22-14 22s-14-8-14-22z"/><path d="M32 32v16M22 52h20"/>',
    professor: '<path d="M6 24 32 13l26 11-26 11z"/><path d="M17 29v11c8 6 22 6 30 0V29"/><path d="M54 25v14"/>',
    minstrel: '<path d="M24 46V14l20-5v31"/><circle cx="19" cy="46" r="6"/><circle cx="39" cy="41" r="6"/>',
    tealady: '<path d="M12 26h32v6a16 16 0 0 1-32 0z"/><path d="M44 28h4a5 5 0 0 1 0 10h-6"/><path d="M8 52h40"/><path d="M22 12c-2 4 2 6 0 10M32 12c-2 4 2 6 0 10"/>',
    pacifist: '<circle cx="32" cy="32" r="22"/><path d="M32 10v44M32 32 16 48M32 32l16 16"/>',
    fool: '<path d="M10 46c4-16 11-27 22-29 11 2 18 13 22 29z"/><circle cx="10" cy="49" r="4"/><circle cx="54" cy="49" r="4"/><circle cx="32" cy="12" r="4"/><path d="M10 46h44"/>',
    tinker: '<circle cx="32" cy="32" r="9"/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M15 49l6-6M43 21l6-6"/>',
    moonchild: '<path d="M40 8a24 24 0 1 0 16 34A19 19 0 0 1 40 8z"/>',
    goon: '<path d="M14 54l18-18"/><path d="M32 36c-5-9 5-26 15-26s9 19-7 27z"/><path d="M40 20l2 2M46 26l2 2"/>',
    lunatic: '<path d="M32 32c0-3 4-3 4 0 0 6-10 6-10 0 0-9 16-9 16 0 0 12-22 12-22 0 0-15 28-15 28 0 0 18-34 18-34 0"/>',
    godfather: '<path d="M6 40c12 7 40 7 52 0"/><path d="M17 40l5-21c5-5 15-5 20 0l5 21"/><path d="M19 31h26"/>',
    devilsadvocate: '<path d="M32 10v40M20 52h24M10 18h44"/><path d="M10 18 5 32h10zM54 18l-5 14h10z"/><path d="M5 32a5 4 0 0 0 10 0M49 32a5 4 0 0 0 10 0"/>',
    assassin: '<path d="M46 8 22 38l4 4L56 18z"/><path d="M14 38l12 12"/><path d="M10 56l9-9"/>',
    mastermind: '<path d="M10 46V20l12 10 10-15 10 15 12-10v26z"/><circle cx="32" cy="36" r="4"/>',
    zombuul: '<path d="M8 54h48"/><path d="M22 54V30m7 24V22m7 32V25m7 29V34"/><path d="M22 30a3 3 0 0 1 7 0M29 22a3 3 0 0 1 7 0"/>',
    pukka: '<path d="M8 46c8 0 8-10 16-10s8 10 16 10 8-10 16-10"/><circle cx="54" cy="31" r="3"/><path d="M57 36l4 2"/>',
    shabaloth: '<path d="M6 22c16 24 36 24 52 0"/><path d="M6 22c16-8 36-8 52 0"/><path d="M14 24l4 8 4-7 4 8 4-8 4 8 4-8 4 8 4-8 4 7"/>',
    po: '<path d="M32 6c6 12 18 18 18 31a18 18 0 0 1-36 0c0-8 6-12 8-18 2 6 4 8 8 10 0-8-2-15 2-23z"/>',
    // ---- Sects & Violets
    clockmaker: '<circle cx="32" cy="32" r="23"/><path d="M32 16v16l11 7"/><path d="M32 9v3M55 32h-3M32 55v-3M9 32h3"/>',
    dreamer: '<path d="M8 28c9 11 39 11 48 0"/><path d="M15 34l-5 6M32 38v8M49 34l5 6"/><path d="M44 8l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"/>',
    snakecharmer: '<path d="M10 54 38 26"/><path d="M38 26c4-4 10-2 10 4s-8 6-8 12 8 6 12 2"/><circle cx="47" cy="27" r="1.5"/>',
    mathematician: '<path d="M18 10v16M10 18h16M38 18h16M11 34l14 14M11 48l14-14M38 38h16M38 46h16"/>',
    flowergirl: '<circle cx="32" cy="26" r="5"/><circle cx="32" cy="14" r="6"/><circle cx="43" cy="22" r="6"/><circle cx="39" cy="35" r="6"/><circle cx="25" cy="35" r="6"/><circle cx="21" cy="22" r="6"/><path d="M32 41v17"/>',
    towncrier: '<path d="M14 46h36l-4-6V26a14 14 0 0 0-28 0v14z"/><path d="M27 52h10"/><path d="M32 8v4"/>',
    oracle: '<path d="M32 8 57 52H7z"/><path d="M20 38s5-7 12-7 12 7 12 7-5 7-12 7-12-7-12-7z"/><circle cx="32" cy="38" r="2"/>',
    savant: '<path d="M22 36a14 14 0 1 1 20 0c-2 2-4 5-4 8H26c0-3-2-6-4-8z"/><path d="M26 50h12M28 56h8"/>',
    seamstress: '<path d="M12 52 48 16"/><circle cx="46" cy="18" r="3"/><path d="M48 16c8 6 4 20-8 24s-22 4-26 14"/>',
    philosopher: '<circle cx="32" cy="32" r="23"/><path d="M24 24a8 8 0 1 1 12 7c-3 2-4 4-4 8"/><circle cx="32" cy="47" r="1.5"/>',
    artist: '<path d="M32 10C16 10 8 22 8 32s9 22 22 22c4 0 5-4 2-7s0-7 4-7h9c8 0 12-6 12-12 0-11-10-18-25-18z"/><circle cx="22" cy="26" r="3"/><circle cx="34" cy="20" r="3"/><circle cx="44" cy="28" r="3"/>',
    juggler: '<circle cx="14" cy="42" r="6"/><circle cx="32" cy="20" r="6"/><circle cx="50" cy="42" r="6"/><path d="M14 54c4-28 32-28 36 0" stroke-dasharray="3 5"/>',
    sage: '<path d="M12 52C12 24 28 12 52 12c0 25-13 40-40 40z"/><path d="M12 52 38 26"/>',
    mutant: '<path d="M22 8c0 16 20 16 20 24S22 40 22 56M42 8c0 16-20 16-20 24s20 8 20 24"/><path d="M25 16h14M25 48h14"/>',
    sweetheart: '<path d="M32 52 13 33a10 10 0 0 1 19-15 10 10 0 0 1 19 15z"/><path d="M8 52 52 10"/><path d="M44 10h8v8"/>',
    barber: '<circle cx="18" cy="46" r="7"/><circle cx="46" cy="46" r="7"/><path d="M23 41 46 10M41 41 18 10"/>',
    klutz: '<path d="M32 22c-8 6-16 20-20 32 8-6 14-14 20-20 6 6 12 14 20 20-4-12-12-26-20-32z"/><path d="M32 22v-12"/>',
    eviltwin: '<circle cx="24" cy="30" r="14"/><circle cx="40" cy="34" r="14"/><path d="M19 28h3M27 28h3M37 34h3M45 34h3"/>',
    witch: '<path d="M6 50h52"/><path d="M18 50 30 8l15 18-7 3 5 21"/>',
    cerenovus: '<path d="M32 32c0-4 6-4 6 0 0 7-12 7-12 0 0-10 18-10 18 0 0 13-24 13-24 0 0-17 30-17 30 0"/><path d="M14 54l6-6M50 54l-6-6"/>',
    pithag: '<path d="M10 26h44v6a22 22 0 0 1-44 0z"/><path d="M18 56l4-6M46 56l-4-6"/><circle cx="26" cy="16" r="3"/><circle cx="38" cy="12" r="4"/>',
    fanggu: '<path d="M10 16h44v8c0 11-9 19-22 19S10 35 10 24z"/><path d="M21 28l4 14 4-14M35 28l4 14 4-14"/>',
    vigormortis: '<path d="M14 30a18 18 0 0 1 36 0c0 8-4 12-8 14v8H22v-8c-4-2-8-6-8-14z"/><circle cx="25" cy="30" r="4"/><circle cx="39" cy="30" r="4"/><path d="M28 52v-6M36 52v-6"/>',
    nodashii: '<path d="M14 30a18 14 0 0 1 36 0"/><path d="M14 30c0 12 6 12 4 26M26 30c0 14 4 14 2 26M38 30c0 14-4 14-2 26M50 30c0 12-6 12-4 26"/>',
    vortox: '<path d="M32 32c4-2 6 4 2 6-6 3-11-4-8-9 4-8 16-6 18 2 3 11-8 18-17 15-14-4-15-22-5-29 13-9 32-1 32 15"/>',
  };
  const TYPE_PATH = {
    T: '<circle cx="32" cy="32" r="20"/>', O: '<path d="M32 12 52 32 32 52 12 32z"/>',
    M: '<path d="M32 10 54 50H10z"/>', D: '<path d="M18 12l7 14M46 12l-7 14"/><circle cx="32" cy="38" r="16"/>',
  };
  const MARK = {
    dead: '<path d="M14 56V26a18 18 0 0 1 36 0v30l-6-5-6 5-6-5-6 5-6-5z"/><circle cx="25" cy="28" r="3"/><circle cx="39" cy="28" r="3"/>',
    vote: '<path d="M18 30 30 42 50 18"/><circle cx="32" cy="32" r="24"/>',
    minioninfo: '<path d="M32 10 54 50H10z"/><path d="M32 26v12"/>',
    demoninfo: '<path d="M18 12l7 14M46 12l-7 14"/><circle cx="32" cy="38" r="16"/>',
    dusk: '<path d="M8 44h48"/><path d="M18 44a14 14 0 0 1 28 0"/>',
  };
  const wrap = body => '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  function roleIcon(id, type) { return wrap(P[id] || MARK[id] || TYPE_PATH[type] || TYPE_PATH.T); }
  function tokenIcon(type) { return wrap(TYPE_PATH[type] || TYPE_PATH.T); }
  const api = { roleIcon, tokenIcon, PATHS: P, MARK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { art: api });
})(typeof window !== 'undefined' ? window : globalThis);
