const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const FIELD_WORLD_WIDTH = 256;
let LOGICAL_WIDTH = FIELD_WORLD_WIDTH;
const LOGICAL_HEIGHT = 224;
let renderScale = 3;
ctx.imageSmoothingEnabled = false;

function syncCanvasResolution() {
  const rect = canvas.getBoundingClientRect();
  LOGICAL_WIDTH = rect.width && rect.height ? Math.max(FIELD_WORLD_WIDTH, Math.min(320, Math.round(LOGICAL_HEIGHT * rect.width / rect.height))) : FIELD_WORLD_WIDTH;
  const measuredScale = rect.width ? Math.ceil(rect.width / LOGICAL_WIDTH) : 3;
  const nextScale = Math.max(1, Math.min(5, measuredScale));
  const width = LOGICAL_WIDTH * nextScale;
  const height = LOGICAL_HEIGHT * nextScale;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  renderScale = nextScale;
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

syncCanvasResolution();
new ResizeObserver(syncCanvasResolution).observe(canvas);

const $ = id => document.getElementById(id);
const el = {
  chapter: $("chapter"),
  place: $("place"),
  questTitle: $("questTitle"),
  questText: $("questText"),
  beatTitle: $("beatTitle"),
  beatText: $("beatText"),
  resonanceBar: $("resonanceBar"),
  partyPanel: $("partyPanel"),
  dialogue: $("dialogue"),
  dialogueSkip: $("dialogueSkip"),
  dialoguePortraits: $("dialoguePortraits"),
  portraitLeft: $("portraitLeft"),
  portraitLeftImage: $("portraitLeftImage"),
  portraitLeftName: $("portraitLeftName"),
  portraitRight: $("portraitRight"),
  portraitRightImage: $("portraitRightImage"),
  portraitRightName: $("portraitRightName"),
  speaker: $("speaker"),
  line: $("line"),
  battle: $("battle"),
  battlePreview: $("battlePreview"),
  battleName: $("battleName"),
  battleLog: $("battleLog"),
  turnOrder: $("turnOrder"),
  battleResonance: $("battleResonance"),
  enemyBattleResonance: $("enemyBattleResonance"),
  partyRows: $("partyRows"),
  enemyRows: $("enemyRows"),
  actions: $("actions"),
  battleResult: $("battleResult"),
  battleResultCard: $("battleResultCard"),
  battleResultArt: $("battleResultArt"),
  battleResultRewards: $("battleResultRewards"),
  battleResultContinue: $("battleResultContinue"),
  menu: $("menu"),
  menuBody: $("menuBody"),
  codexImage: $("codexImage"),
  codexName: $("codexName"),
  codexPrev: $("codexPrev"),
  codexNext: $("codexNext"),
  musicToggle: $("musicToggle"),
  gold: $("gold"),
  hint: $("hint"),
  skillPointNotice: $("skillPointNotice"),
  skillPointNoticeDetail: $("skillPointNoticeDetail")
};

const TILE = 16;
const PLAYER_STEP_TICKS = 17;
const WALK_FRAME_TICKS = 3;
const defaultViewportContent = document.querySelector('meta[name="viewport"]')?.content || "width=device-width, initial-scale=1";
let tick = 0;
let mode = "title";
let menuTab = "status";
let selectedStatusHero = "Verseborn";
let selectedGearHero = "Verseborn";
let selectedShopHero = "Verseborn";
let selectedGearSlot = "weapon";
let selectedGearRef = null;
const temporaryGearStats = new Map();
const gearBrowser = {
  search: "",
  stats: [],
  statMatch: "any",
  affixes: [],
  affixMatch: "any",
  slot: "all",
  rarity: "all",
  usability: "all",
  equipped: "all",
  sort: "newest",
  direction: "desc",
  filterOpen: false,
  sortOpen: false
};
let autoEquipPool = "all";
let selectedItemCategory = "consumables";
let selectedItemRef = null;
let selectedSkillHero = "Verseborn";
let selectedPartySlot = 0;
let activePoint = null;
let talkQueue = [];
let talkPortraits = [];
let talkAfter = null;
let talkSkippable = false;
let activeRecruitScene = null;

function syncResponsiveDevice() {
  const root = document.documentElement;
  if (!root) return;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches === true;
  const noHover = window.matchMedia?.("(hover: none)")?.matches === true;
  const touchLayout = (navigator.maxTouchPoints || 0) > 0 && coarse && noHover;
  const phone = touchLayout && Math.min(window.innerWidth, window.innerHeight) <= 600;
  const portrait = window.innerHeight >= window.innerWidth;
  root.classList.toggle("touch-layout", touchLayout);
  root.classList.toggle("touch-phone", phone);
  root.classList.toggle("touch-portrait", touchLayout && portrait);
  root.classList.toggle("touch-landscape", touchLayout && !portrait);
  if (touchLayout || window.innerWidth < 794) {
    root.classList.remove("desktop-scaled");
    root.style.removeProperty("--desktop-game-scale");
    root.style.removeProperty("--desktop-shell-width");
  } else {
    const baseGameWidth = window.innerWidth >= 900 ? 967.5 : 774;
    root.style.setProperty("--desktop-base-width", `${baseGameWidth}px`);
    const baseGameHeight = 708;
    const shellGutter = 20;
    const widthScale = (window.innerWidth - shellGutter) / baseGameWidth;
    const heightScale = (window.innerHeight - shellGutter) / baseGameHeight;
    const desktopScale = Math.max(1, Math.min(5 / 3, widthScale, heightScale));
    root.classList.toggle("desktop-scaled", desktopScale > 1.001);
    root.style.setProperty("--desktop-game-scale", desktopScale.toFixed(4));
    root.style.setProperty("--desktop-shell-width", `${Math.ceil(baseGameWidth * desktopScale + shellGutter)}px`);
    requestAnimationFrame(syncCanvasResolution);
  }
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) viewport.content = touchLayout
    ? "width=device-width, initial-scale=1, viewport-fit=cover"
    : defaultViewportContent;
  root.classList.toggle("fullscreen-ready", touchLayout && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen));
}

function syncResponsiveMode() {
  if (document.body?.dataset.playMode !== mode) document.body.dataset.playMode = mode;
}
let battle = null;
let effect = null;
let battleFloaters = [];
let battleResultState = null;
const BATTLE_FLOATER_LIFETIME = 120;
let codexIndex = 0;
let battleActionIndex = 0;
let heldDirection = null;
let nextHeldMove = 0;
let fieldDestination = null;
let nextFieldMove = 0;
let activeVendor = null;
let vendorTab = "buy";
let gearInstances = {};
let audioContext = null;
let screenSlide = null;
let titleMenuIndex = 0;
let titleSubmenuIndex = 0;
let titleMenuState = "main";
let activeSaveSlot = 1;
let saveTimer = null;

const titleMenuEntries = ["Story Mode", "Ember Hall"];
const saveSlotEntries = ["Save Slot 1", "Save Slot 2", "Back"];
const titleSubmenuEntries = [
  ["New", "Continue", "Back"],
  ["New Run", "Continue Run", "Back"]
];
const SAVE_KEY = "verseborn-jrpg-save-v2";
const HALL_SAVE_KEY = "verseborn-hall-battles-save-v1";
const HALL_SCENE_HISTORY_KEY = "verseborn-hall-scene-history-v1";
const titleTwinkles = [
  { x: 135, y: 170, phase: 0, color: "#fff2b8" },
  { x: 1290, y: 118, phase: 110, color: "#d9c7ff" },
  { x: 1115, y: 344, phase: 220, color: "#c7e8ff" }
];
const TITLE_BACKGROUND_FRAME = 1;

const portraitSources = {
  Verseborn: "assets/portraits/verseborn.png",
  Mira: "assets/portraits/mira.png",
  Seerin: "assets/portraits/seerin.png",
  Kael: "assets/portraits/kael.png",
  Torren: "assets/portraits/torren.png",
  Sparky: "assets/portraits/sparky.png",
  Glimmer: "assets/portraits/glimmer.png",
  Marla: "assets/portraits/marla.png",
  Harl: "assets/portraits/harl.png",
  Nyx: "assets/portraits/nyx.png",
  Rava: "assets/portraits/rava.png",
  Jory: "assets/portraits/jory.png",
  Kaeldrin: "assets/portraits/kaeldrin.png",
  Lyrsa: "assets/portraits/lyrsa.png"
};
const menuPortraitSources = {
  Verseborn: "assets/menu/portrait-verseborn.webp",
  Mira: "assets/menu/portrait-mira.webp",
  Seerin: "assets/menu/portrait-seerin.webp",
  Kael: "assets/menu/portrait-kael.webp",
  Torren: "assets/menu/portrait-torren.webp",
  Glimmer: "assets/menu/portrait-glimmer.webp",
  Sparky: "assets/menu/portrait-sparky.webp"
};
function menuPortraitSource(id) {
  return menuPortraitSources[id] || portraitSources[id];
}
const bossPortraitSources = {
  "Archive Custodian": "assets/portraits/enemies/archive-custodian.png",
  "Dawn Gate Sentinel": "assets/portraits/enemies/dawn-gate-sentinel.png",
  "Dock Foreman": "assets/portraits/enemies/dock-foreman.png"
};
const enemyPortraitCache = new Map();

const music = {
  title: new Audio("assets/audio/verseborn-title.mp3"),
  inhouse: new Audio("assets/audio/inhouse-jrpg.mp3"),
  overworld: new Audio("assets/audio/overworld-jrpg.mp3"),
  battle: new Audio("assets/audio/battle-jrpg.mp3"),
  battleAlt: new Audio("assets/audio/battle-jrpg-2.mp3"),
  cutscene: new Audio("assets/audio/cutscenes.mp3"),
  hallBoss: new Audio("assets/audio/ember-hall-boss-battle.mp3")
};
Object.values(music).forEach(track => {
  track.loop = true;
  track.preload = "auto";
  track.volume = 0.46;
});
let musicUnlocked = false;
let activeMusic = null;
let musicMuted = false;
let normalBattleTrackIndex = 0;

function battleMusicForEncounter(hallBoss = false) {
  if (hallBoss) return "hallBoss";
  const track = normalBattleTrackIndex % 2 === 0 ? "battle" : "battleAlt";
  normalBattleTrackIndex++;
  return track;
}

function trackForScene() {
  if (mode === "title") return "title";
  if (mode === "battle" || mode === "battleResult") return battle?.musicTrack || (battle?.hallBoss ? "hallBoss" : "battle");
  if (mode === "talk" && activeRecruitScene) return "cutscene";
  return currentMap()?.music === "overworld" ? "overworld" : "inhouse";
}

function updateMusic(force) {
  if (!musicUnlocked || musicMuted || document.hidden) return;
  const wanted = force || trackForScene();
  if (activeMusic === wanted && !music[wanted].paused) return;
  Object.entries(music).forEach(([name, track]) => {
    if (name !== wanted) track.pause();
  });
  activeMusic = wanted;
  document.body.dataset.music = wanted;
  music[wanted].play().catch(() => {});
}

function unlockMusic() {
  if (!musicUnlocked) musicUnlocked = true;
  ensureAudioContext();
  updateMusic();
}

function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicMuted) Object.values(music).forEach(track => track.pause());
  else {
    musicUnlocked = true;
    updateMusic();
  }
  el.musicToggle.classList.toggle("is-muted", musicMuted);
  el.musicToggle.setAttribute("aria-pressed", String(musicMuted));
  el.musicToggle.setAttribute("aria-label", musicMuted ? "Muziek hervatten" : "Muziek pauzeren");
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioContext = new AudioContext();
  }
  if (audioContext && audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function playSfx(kind) {
  if (musicMuted) return;
  const ac = ensureAudioContext();
  if (!ac) return;
  const patterns = {
    melee: [[130, 72, .09, "square", 0], [92, 55, .08, "sawtooth", .04]],
    hit: [[90, 48, .1, "square", 0]],
    block: [[420, 620, .07, "square", 0], [610, 760, .09, "triangle", .035]],
    magic: [[260, 430, .12, "triangle", 0], [390, 690, .15, "sine", .07]],
    ultimate: [[110, 440, .28, "sawtooth", 0], [330, 880, .3, "triangle", .08]],
    item: [[440, 610, .09, "sine", 0], [610, 820, .11, "sine", .08]],
    boss: [[82, 44, .22, "sawtooth", 0], [130, 65, .18, "square", .04]],
    coin: [[660, 880, .06, "square", 0], [880, 1040, .07, "square", .07]]
  };
  (patterns[kind] || patterns.hit).forEach(([start, end, duration, type, delay]) => {
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    const when = ac.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), when + duration);
    gain.gain.setValueAtTime(.055, when);
    gain.gain.exponentialRampToValueAtTime(.001, when + duration);
    oscillator.connect(gain).connect(ac.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
  });
}

const spriteScale = {
  Verseborn: { field: [20, 25], battle: [45, 49] },
  Mira: { field: [20, 25], battle: [45, 49] },
  Seerin: { field: [21, 26], battle: [47, 50] },
  Kael: { field: [20, 25], battle: [45, 49] },
  Torren: { field: [27, 23], battle: [55, 46] },
  Glimmer: { field: [16, 18], battle: [33, 34] },
  Sparky: { field: [17, 16], battle: [31, 29] }
};
const spriteSheets = {};
const walkSpriteSheets = {};
const animationSheets = {};
const battleAnimationSheets = {};
const battleSpriteHeights = {
  Verseborn: 46, Mira: 48, Sparky: 34, Glimmer: 43, GlimmerMech: 52,
  Kael: 47, KaelShadow: 50, Torren: 49, Seerin: 48
};
const BATTLE_COMPOSITION_SCALE = .92;
const BATTLE_IDLE_FRAME_TICKS = 48;
const BATTLE_DEATH_FRAME_TICKS = 14;
const battleFrameSequences = {
  Verseborn: { idle: [0, 0, 0, 0] },
  Mira: {
    idle: [1, 1, 1, 1],
    melee: [0, 0, 1, 2, 3],
    block: [0, 0, 1, 3, 4],
    magic: [0, 0, 1, 3, 4],
    ultimate1: [0, 0, 1, 2, 3],
    ultimate2: [0, 0, 1, 2, 3]
  },
  Sparky: { idle: [1, 2, 1, 2] },
  Glimmer: { idle: [0, 0, 0, 0], ultimate1: [1, 1, 2, 3, 3], ultimate2: [1, 2, 3, 3, 3] },
  GlimmerMech: { idle: [1, 2, 1, 2] },
  KaelShadow: { idle: [1, 2, 1, 2] },
  Torren: { idle: [1, 2, 1, 2] },
  Seerin: { idle: [0, 0, 0, 0] },
  Kael: { idle: [1, 2, 1, 2], melee: [0, 1, 4, 1, 0], block: [0, 1, 4, 1, 0], ultimate2: [1, 1, 2, 3, 4] }
};
const calmBattleIdleHeroes = new Set(["Verseborn", "Mira", "Glimmer", "Seerin"]);
const battleIdleSourceCrops = {
  Glimmer: { x: 380, y: 94, width: 144, height: 178 },
  Seerin: { x: 248, y: 102, width: 144, height: 160 }
};
const npcBattleSheets = {};
const animatedNpcFiles = {
  Marla: "marla",
  Nyx: "nyx",
  Rava: "rava",
  Kaeldrin: "kaeldrin",
  Lyrsa: "lyrsa",
  Jory: "jory",
  Harl: "harl",
  Shade: "shade",
  Grumm: "grumm"
};
const animatedNpcHeights = {
  Marla: 26,
  Nyx: 23,
  Rava: 24,
  Kaeldrin: 29,
  Lyrsa: 29,
  Jory: 27,
  Harl: 26,
  Shade: 27,
  Grumm: 24
};
const enemyAnimationFiles = {
  "Inkbound Auditor": "Inkbound Auditor",
  "King Maeric": "King Maeric",
  Grumm: "Grumm",
  Kaeldrin: "Kaeldrin",
  Marla: "Marla",
  Lyrsa: "Lysra",
  Lysra: "Lysra",
  Nyx: "Nyx Vael",
  "Nyx Vael": "Nyx Vael",
  Rava: "Rava",
  Shade: "Shade",
  Tja: "Tja",
  "Archive Custodian": "Archive Custodian",
  "Red Dragon Lord": "Red Dragon Lord",
  "Cracked Pillar": "Cracked Pillar",
  "Corrupt Clergy": "Corrupt Clergy",
  "Dock Foreman": "Dock Foreman",
  "Dawn Gate Sentinel": "Dawn Gate Sentinel",
  Jory: "Jory Bellwick",
  "Jory Bellwick": "Jory Bellwick",
  Slobbo: "Slobbo",
  Brokk: "Brokk",
  "High Administrator Thaddeus": "High Administrator Thaddeus",
  Gorg: "Gorg",
  "Clock Goblin": "Clock Goblin",
  "Lord Sprocket": "Lord Sprocket",
  "Baron Revus Veln": "Baron Revus Veln",
  "Sir Reginald": "Sir Reginald",
  "Saint Justin": "Saint Justin",
  "Elder Plumpin": "Elder Plumpin",
  "Ash Quarter Thugg": "Ash Quarter Thugg",
  "Angry Gnome Mob": "Angry Gnome Mob",
  "Berend Blimpstone": "Berend Blimpstone",
  "Prince Lucan Cindralis": "Prince Lucan Cindralis",
  Tibby: "Tibby",
  Solinar: "Solinar",
  "Solinar Enraged": "Solinar Enraged",
  "Frostmile Wyrm": "Frostmile Wyrm",
  "Ember Leviathan": "Ember Leviathan"
};
const enemyAnimationHeights = {
  "Inkbound Auditor": 47,
  "King Maeric": 54,
  Grumm: 55,
  Kaeldrin: 55,
  Marla: 49,
  Lysra: 51,
  "Nyx Vael": 48,
  Rava: 51,
  Shade: 50,
  Tja: 50,
  "Archive Custodian": 49,
  "Red Dragon Lord": 62,
  "Cracked Pillar": 58,
  "Corrupt Clergy": 51,
  "Dock Foreman": 53,
  "Dawn Gate Sentinel": 58,
  "Jory Bellwick": 49,
  Slobbo: 48,
  Brokk: 54,
  "High Administrator Thaddeus": 51,
  Gorg: 58,
  "Clock Goblin": 48,
  "Lord Sprocket": 51,
  "Baron Revus Veln": 52,
  "Sir Reginald": 52,
  "Saint Justin": 51,
  "Elder Plumpin": 49,
  "Ash Quarter Thugg": 48,
  "Angry Gnome Mob": 49,
  "Berend Blimpstone": 49,
  "Prince Lucan Cindralis": 51,
  Tibby: 48,
  Solinar: 65,
  "Solinar Enraged": 65,
  "Frostmile Wyrm": 62,
  "Ember Leviathan": 63
};
const HALL_FINALE_SPRITES = new Set(["Frostmile Wyrm", "Ember Leviathan", "Solinar", "Solinar Enraged"]);

function enemyBattleScale(key) {
  return battle?.hallStage === 50 && HALL_FINALE_SPRITES.has(key) ? 1.25 : 1;
}
const magicNpcAnimations = new Set(["Lyrsa", "Nyx", "Jory"]);
function enemyMove(name, kind, element, mpCost = 0, options = {}) {
  return { name, kind, element, mpCost, ...options };
}

const ENEMY_ROLE_BASE_EVASION = {
  tank: .02,
  bruiser: .04,
  healer: .04,
  boss: .04,
  hybrid: .05,
  controller: .06,
  dps: .07,
  utility: .07,
  assassin: .12
};

function enemyCombatProfile(role, crit, identity, moves, pattern, options = {}) {
  return {
    role,
    crit,
    baseEvasion: options.baseEvasion ?? ENEMY_ROLE_BASE_EVASION[role] ?? .05,
    identity,
    maxMp: identity.mp,
    moves,
    pattern,
    melee: moves.melee?.name,
    magic: moves.magic?.name,
    heal: moves.heal?.name,
    ultimate: moves.ultimate?.name,
    ultimateHeal: Boolean(moves.ultimate?.healing),
    ...options
  };
}

const em = enemyMove;
const enemyAbilityProfiles = {
  Slobbo: enemyCombatProfile("utility", .12, { hp: 80, mp: 96, str: 78, mag: 118, stam: 78, agi: 124 }, {
    melee: em("Ledger Jab", "melee", "Physical", 0, { coefficient: .92, status: { type: "defenseDown", chance: .2, duration: 3, value: .2 } }),
    magic: em("Tech Pulse", "magic", "Tech", 18, { coefficient: .9, status: { type: "stun", chance: .28 } }),
    buff: em("Efficiency Protocol", "buff", "Tech", 20, { targetSide: "self", buffs: [{ type: "agilityUp", duration: 3, value: .25 }] }),
    ultimate: em("Resonant Rupture", "ultimate", "Tech", 0, { coefficient: 1.12, allTargets: true })
  }, ["magic", "buff", "melee"], { element: "Tech", affixes: { statusPotency: .15 } }),
  Brokk: enemyCombatProfile("bruiser", .12, { hp: 120, mp: 64, str: 132, mag: 62, stam: 128, agi: 76 }, {
    melee: em("Hammerfall", "melee", "Physical", 0, { coefficient: .95, breakPower: 1 }),
    magic: em("Holy Pulse", "magic", "Holy Fire", 18, { coefficient: .92, scaling: "hybrid" }),
    buff: em("Battle Temper", "buff", "Physical", 20, { targetSide: "self", buffs: [{ type: "strengthUp", duration: 3, value: .25 }] }),
    ultimate: em("Judgment Breaker", "ultimate", "Holy Fire", 0, { coefficient: 1.62, scaling: "str", breakPower: 3 })
  }, ["melee", "buff", "magic"], { element: "Holy Fire", affixes: { physicalDamage: .1, breakPower: 1 } }),
  "High Administrator Thaddeus": enemyCombatProfile("controller", .09, { hp: 92, mp: 126, str: 70, mag: 138, stam: 90, agi: 98 }, {
    melee: em("Audit Stamp", "melee", "Physical", 0, { coefficient: .8, status: { type: "disrupted", chance: .25, duration: 3, value: .15 } }),
    magic: em("Tech Pulse", "magic", "Tech", 20, { coefficient: .92, status: { type: "stun", chance: .35 } }),
    buff: em("Administrative Order", "buff", "Tech", 22, { targetRole: "caster", buffs: [{ type: "magicUp", duration: 3, value: .25 }] }),
    dispel: em("Null Mandate", "dispel", "Tech", 24, { dispel: true }),
    utility: em("Audit Lock", "utility", "Tech", 24, { status: { type: "silence", chance: .65, duration: 2 } }),
    ultimate: em("Final Audit", "ultimate", "Tech", 0, { coefficient: 1.16, allTargets: true, status: { type: "disrupted", chance: .7, duration: 3, value: .15 } })
  }, ["magic", "buff", "dispel", "utility", "melee"], { element: "Tech", affixes: { statusPotency: .18, buffDuration: 1 } }),
  "Inkbound Auditor": enemyCombatProfile("dps", .16, { hp: 94, mp: 106, str: 96, mag: 128, stam: 84, agi: 112 }, {
    melee: em("Quill Rend", "melee", "Physical", 0, { coefficient: .9, status: { type: "bleed", chance: .2, duration: 3 } }),
    magic: em("Red Ink Edict", "magic", "Shadow", 21, { coefficient: 1, status: { type: "poison", chance: .65, duration: 4 }, extraStatuses: [{ type: "marked", chance: .5, duration: 4, value: .12 }] }),
    buff: em("Red Ledger", "buff", "Shadow", 20, { targetSide: "self", buffs: [{ type: "critUp", duration: 3, value: .15 }] }),
    ultimate: em("Audit of the Nameless", "ultimate", "Shadow", 0, { coefficient: 1.7, payoff: "afflicted", payoffMultiplier: 1.25, critBonus: .15 })
  }, ["magic", "buff", "melee"], { element: "Shadow", affixes: { damageAfflicted: .12, statusPotency: .15 } }),
  "Dock Foreman": enemyCombatProfile("tank", .08, { hp: 138, mp: 70, str: 128, mag: 70, stam: 148, agi: 66 }, {
    melee: em("Hook Lash", "melee", "Physical", 0, { coefficient: .92, breakPower: 2 }),
    magic: em("Drowned Order", "magic", "Physical", 19, { coefficient: 1.02, scaling: "str", status: { type: "poison", chance: .45, duration: 4 } }),
    buff: em("Brace", "buff", "Earth", 20, { targetSide: "self", buffs: [{ type: "defenseUp", duration: 3, value: .25 }] }),
    ultimate: em("Anchor Below", "ultimate", "Earth", 0, { coefficient: 1.58, scaling: "str", payoff: "broken", payoffMultiplier: 1.25, breakPower: 2 })
  }, ["melee", "buff", "magic"], { element: "Earth", affixes: { physicalResistance: .12, breakPower: 1 } }),
  "Corrupt Clergy": enemyCombatProfile("healer", .06, { hp: 92, mp: 138, str: 68, mag: 142, stam: 96, agi: 82 }, {
    melee: em("Mace Seal", "melee", "Physical", 0, { coefficient: .75 }),
    magic: em("Binding Litany", "magic", "Holy Fire", 20, { coefficient: .94 }),
    heal: em("Clergy Ward", "heal", "Holy Fire", 25, { healing: true, healCoefficient: 1.65 }),
    cleanse: em("Purging Litany", "cleanse", "Holy Fire", 20, { cleanse: true }),
    buff: em("Dark Benediction", "buff", "Holy Fire", 29, { targetRole: "caster", buffs: [{ type: "magicUp", duration: 3, value: .25 }, { type: "defenseUp", duration: 2, value: .18 }] }),
    ultimate: em("Final Absolution", "ultimate", "Holy Fire", 0, { coefficient: 1.08, allTargets: true, teamBuffs: [{ type: "barrier", duration: 3, value: .22 }] })
  }, ["magic", "heal", "cleanse", "buff"], { element: "Holy Fire", affixes: { healPotency: .18 } }),
  "Saint Justin": enemyCombatProfile("hybrid", .1, { hp: 116, mp: 108, str: 112, mag: 112, stam: 126, agi: 86 }, {
    melee: em("Sanctified Strike", "melee", "Holy Fire", 0, { coefficient: .92, scaling: "hybrid" }),
    magic: em("Radiant Ward", "magic", "Holy Fire", 19, { coefficient: .88 }),
    heal: em("Merciful Seal", "heal", "Holy Fire", 25, { healing: true, healCoefficient: 1.35, cleanse: true }),
    buff: em("Radiant Oath", "buff", "Holy Fire", 27, { targetRole: "threatened", buffs: [{ type: "barrier", duration: 3, value: .25 }, { type: "damageUp", duration: 2, value: .12 }] }),
    ultimate: em("Saint's Judgment", "ultimate", "Holy Fire", 0, { coefficient: 1.62, scaling: "hybrid" })
  }, ["melee", "buff", "heal", "magic"], { element: "Holy Fire", affixes: { elementDamage: .12, barrierPotency: .15 } }),
  "Archive Custodian": enemyCombatProfile("healer", .06, { hp: 128, mp: 148, str: 72, mag: 136, stam: 132, agi: 72 }, {
    melee: em("Ledger Crush", "melee", "Physical", 0, { coefficient: .78 }),
    magic: em("Forbidden Index", "magic", "Arcane", 21, { coefficient: .96 }),
    heal: em("Restore Entry", "heal", "Arcane", 27, { healing: true, healCoefficient: 1.45, cleanse: true }),
    buff: em("Preservation Protocol", "buff", "Arcane", 28, { targetRole: "threatened", buffs: [{ type: "defenseUp", duration: 3, value: .25 }, { type: "barrier", duration: 2, value: .18 }] }),
    utility: em("Resonance Lock", "utility", "Arcane", 24, { partyResonanceDrain: 18, status: { type: "disrupted", chance: .6, duration: 3, value: .15 } }),
    ultimate: em("Archive Lock", "ultimate", "Arcane", 0, { coefficient: 1.08, allTargets: true, partyResonanceDrain: 30 })
  }, ["magic", "heal", "buff", "utility"], { element: "Arcane", affixes: { mpEfficiency: .12 } }),
  Gorg: enemyCombatProfile("bruiser", .12, { hp: 118, mp: 86, str: 118, mag: 112, stam: 116, agi: 78 }, {
    melee: em("Furnace Fist", "melee", "Physical", 0, { coefficient: .92, status: { type: "burn", chance: .2, duration: 4 } }),
    magic: em("Ancient Fire Pulse", "magic", "Ancient Fire", 20, { coefficient: 1.02, status: { type: "burn", chance: .55, duration: 4 } }),
    buff: em("Stoke the Furnace", "buff", "Ancient Fire", 20, { targetSide: "self", requiresEnemyStatus: "burn", buffs: [{ type: "damageUp", duration: 3, value: .18 }] }),
    ultimate: em("Magma Collapse", "ultimate", "Ancient Fire", 0, { coefficient: 1.16, allTargets: true, payoff: "burning", payoffMultiplier: 1.18 })
  }, ["magic", "buff", "melee"], { element: "Ancient Fire", affixes: { elementDamage: .12, statusPotency: .12 } }),
  "Cracked Pillar": enemyCombatProfile("tank", .06, { hp: 145, mp: 74, str: 112, mag: 74, stam: 158, agi: 54 }, {
    melee: em("Stonefall", "melee", "Earth", 0, { coefficient: .9, breakPower: 2 }),
    magic: em("Faultline", "magic", "Earth", 22, { coefficient: 1, scaling: "str", breakPower: 2, status: { type: "stun", chance: .32 } }),
    buff: em("Stone Guard", "buff", "Earth", 27, { targetSide: "self", buffs: [{ type: "defenseUp", duration: 3, value: .28 }, { type: "barrier", duration: 2, value: .18 }] }),
    ultimate: em("Armory Collapse", "ultimate", "Earth", 0, { coefficient: 1.04, allTargets: true, breakPower: 3 })
  }, ["melee", "buff", "magic"], { element: "Earth", baseEvasion: 0, affixes: { physicalResistance: .15, breakPower: 1 } }),
  Grumm: enemyCombatProfile("tank", .09, { hp: 150, mp: 78, str: 138, mag: 58, stam: 155, agi: 60 }, {
    melee: em("Granite Cleave", "melee", "Physical", 0, { coefficient: .94, breakPower: 2 }),
    magic: em("Boulder Toss", "magic", "Earth", 20, { coefficient: 1, scaling: "str", breakPower: 1 }),
    buff: em("Mountain Stance", "buff", "Earth", 28, { targetSide: "self", buffs: [{ type: "defenseUp", duration: 3, value: .28 }, { type: "barrier", duration: 2, value: .2 }] }),
    ultimate: em("Mountain Breaker", "ultimate", "Earth", 0, { coefficient: 1.68, scaling: "str", breakPower: 3, payoff: "broken", payoffMultiplier: 1.22 })
  }, ["melee", "buff", "magic"], { row: 3, element: "Earth", baseEvasion: .02, affixes: { physicalResistance: .15, breakPower: 1 } }),
  Lysra: enemyCombatProfile("healer", .08, { hp: 86, mp: 150, str: 58, mag: 152, stam: 82, agi: 100 }, {
    melee: em("Spellstaff Sweep", "melee", "Physical", 0, { coefficient: .72 }),
    magic: em("Arcane Missile", "magic", "Arcane", 18, { coefficient: 1 }),
    heal: em("Barrier Spell", "heal", "Arcane", 24, { healing: true, healCoefficient: 1.45, conditionalCleanse: true }),
    buff: em("Arcane Aegis", "buff", "Arcane", 28, { targetRole: "caster", buffs: [{ type: "magicUp", duration: 3, value: .25 }, { type: "barrier", duration: 3, value: .22 }] }),
    ultimate: em("Astral Convergence", "ultimate", "Arcane", 0, { coefficient: 1.08, allTargets: true, teamBuffs: [{ type: "magicUp", duration: 3, value: .25 }] })
  }, ["magic", "buff", "heal", "melee"], { row: 5, element: "Arcane", affixes: { elementDamage: .1, healPotency: .16 } }),
  Kaeldrin: enemyCombatProfile("hybrid", .14, { hp: 126, mp: 104, str: 136, mag: 112, stam: 122, agi: 98 }, {
    melee: em("Rankbreaker", "melee", "Physical", 0, { coefficient: .94, status: { type: "physicalVulnerability", chance: .2, duration: 3, value: .18 } }),
    magic: em("Radiant Lance", "magic", "Holy Fire", 20, { coefficient: 1.02, scaling: "hybrid" }),
    buff: em("Rally of Dawn", "buff", "Holy Fire", 28, { targetRole: "physical", buffs: [{ type: "strengthUp", duration: 3, value: .25 }, { type: "critUp", duration: 3, value: .15 }] }),
    heal: em("Divine Seal", "heal", "Holy Fire", 24, { healing: true, healCoefficient: 1.15 }),
    ultimate: em("Blade of Dawn", "ultimate", "Holy Fire", 0, { coefficient: 1.68, scaling: "hybrid" })
  }, ["melee", "buff", "magic", "heal"], { row: 4, element: "Holy Fire", affixes: { elementDamage: .12, buffDuration: 1 } }),
  "Elder Plumpin": enemyCombatProfile("utility", .12, { hp: 106, mp: 126, str: 82, mag: 132, stam: 96, agi: 108 }, {
    melee: em("Gourd Bonk", "melee", "Physical", 0, { coefficient: .8, randomMinorDebuff: true }),
    magic: em("Gourd Burst", "magic", "Shadow", 19, { coefficient: .96 }),
    utility: em("Fairy Spores", "utility", "Shadow", 24, { status: { type: "sleep", chance: .55, duration: 3 }, extraStatuses: [{ type: "poison", chance: .6, duration: 4 }] }),
    buff: em("Fairy Fortune", "buff", "Shadow", 21, { targetRole: "random", randomBuff: true }),
    ultimate: em("Harvest Moon", "ultimate", "Shadow", 0, { coefficient: 1.1, allTargets: true, status: { type: "poison", chance: .8, duration: 4 } })
  }, ["utility", "buff", "magic", "melee"], { element: "Shadow", affixes: { statusPotency: .2 } }),
  "Red Dragon Lord": enemyCombatProfile("dps", .18, { hp: 132, mp: 112, str: 132, mag: 140, stam: 118, agi: 100 }, {
    melee: em("Cinder Claw", "melee", "Ancient Fire", 0, { coefficient: .96, status: { type: "burn", chance: .35, duration: 4 } }),
    magic: em("Ash Breath", "magic", "Ancient Fire", 24, { coefficient: .82, allTargets: true, status: { type: "burn", chance: .45, duration: 4 } }),
    buff: em("Dragon Fury", "buff", "Ancient Fire", 27, { targetSide: "self", buffs: [{ type: "damageUp", duration: 3, value: .2 }, { type: "critUp", duration: 3, value: .15 }] }),
    ultimate: em("First Ember Eruption", "ultimate", "Ancient Fire", 0, { coefficient: 1.18, allTargets: true, status: { type: "burn", chance: .85, duration: 4 } })
  }, ["melee", "buff", "magic"], { element: "Ancient Fire", affixes: { elementDamage: .16, statusPotency: .15 } }),
  "Clock Goblin": enemyCombatProfile("utility", .1, { hp: 84, mp: 112, str: 72, mag: 105, stam: 78, agi: 152 }, {
    melee: em("Clock Jab", "melee", "Physical", 0, { coefficient: .78, status: { type: "disrupted", chance: .2, duration: 3, value: .15 } }),
    magic: em("Sound Pulse", "magic", "Sound", 18, { coefficient: .9 }),
    utility: em("Tempo Jam", "utility", "Sound", 21, { status: { type: "agilityDown", chance: .75, duration: 3, value: .15 } }),
    buff: em("Tempo Boost", "buff", "Sound", 20, { targetRole: "fast", buffs: [{ type: "agilityUp", duration: 3, value: .25 }] }),
    ultimate: em("Resonant Rupture", "ultimate", "Sound", 0, { coefficient: 1.08, allTargets: true })
  }, ["utility", "buff", "magic", "melee"], { element: "Sound", baseEvasion: .1, affixes: { resonanceGeneration: .25 } }),
  "Lord Sprocket": enemyCombatProfile("utility", .1, { hp: 100, mp: 124, str: 78, mag: 124, stam: 102, agi: 110 }, {
    melee: em("Gear Wrench", "melee", "Physical", 0, { coefficient: .8, status: { type: "defenseDown", chance: .2, duration: 3, value: .2 } }),
    magic: em("Boiler Bolt", "magic", "Tech", 19, { coefficient: .96, extraStatuses: [{ type: "burn", chance: .3, duration: 4 }] }),
    heal: em("Seal Mend", "heal", "Tech", 24, { healing: true, healCoefficient: 1.3 }),
    buff: em("Overclock", "buff", "Tech", 27, { targetRole: "tech", buffs: [{ type: "agilityUp", duration: 3, value: .25 }, { type: "damageUp", duration: 2, value: .15 }] }),
    ultimate: em("Clockwork Detonation", "ultimate", "Tech", 0, { coefficient: 1.12, allTargets: true, status: { type: "disrupted", chance: .7, duration: 3, value: .15 } })
  }, ["magic", "buff", "heal", "melee"], { element: "Tech", affixes: { buffDuration: 1 } }),
  "Baron Revus Veln": enemyCombatProfile("assassin", .2, { hp: 98, mp: 96, str: 138, mag: 90, stam: 86, agi: 148 }, {
    melee: em("Duelist's Cut", "melee", "Physical", 0, { coefficient: .98, status: { type: "critExposed", chance: .3, duration: 2, value: .12 } }),
    magic: em("Tech Lunge", "magic", "Tech", 18, { coefficient: 1.02, scaling: "str" }),
    utility: em("Duelist's Mark", "utility", "Physical", 18, { status: { type: "marked", chance: .9, duration: 4, value: .12 } }),
    buff: em("Duelist's Poise", "buff", "Physical", 25, { targetSide: "self", buffs: [{ type: "agilityUp", duration: 3, value: .25 }, { type: "critUp", duration: 3, value: .15 }] }),
    ultimate: em("Noble Execution", "ultimate", "Physical", 0, { coefficient: 1.72, scaling: "str", payoff: "marked", payoffMultiplier: 1.35, critBonus: .18 })
  }, ["utility", "buff", "melee", "magic"], { element: "Tech", affixes: { critDamage: .25 } }),
  "Dawn Gate Sentinel": enemyCombatProfile("tank", .07, { hp: 155, mp: 104, str: 118, mag: 104, stam: 160, agi: 60 }, {
    melee: em("Gate Halberd", "melee", "Physical", 0, { coefficient: .9, breakPower: 2 }),
    magic: em("Dawn Window", "magic", "Holy Fire", 20, { coefficient: .92 }),
    buff: em("Hold the Line", "buff", "Holy Fire", 36, { allAllies: true, buffs: [{ type: "defenseUp", duration: 3, value: .25 }, { type: "barrier", duration: 2, value: .2 }] }),
    heal: em("Sentinel Ward", "heal", "Holy Fire", 24, { healing: true, healCoefficient: 1.12 }),
    ultimate: em("Last Gate Protocol", "ultimate", "Holy Fire", 0, { coefficient: 1.08, allTargets: true, teamBuffs: [{ type: "barrier", duration: 3, value: .25 }] })
  }, ["melee", "buff", "magic", "heal"], { element: "Holy Fire", affixes: { physicalResistance: .14, barrierPotency: .18 } }),
  Shade: enemyCombatProfile("assassin", .23, { hp: 80, mp: 92, str: 142, mag: 92, stam: 72, agi: 158 }, {
    melee: em("Twin Fang", "melee", "Physical", 0, { coefficient: .98, status: { type: "bleed", chance: .2, duration: 3 } }),
    magic: em("Throwing Daggers", "magic", "Shadow", 20, { coefficient: 1.02, scaling: "str", status: { type: "poison", chance: .45, duration: 4 } }),
    buff: em("Predator's Focus", "buff", "Shadow", 25, { targetSide: "self", buffs: [{ type: "critUp", duration: 3, value: .15 }, { type: "agilityUp", duration: 3, value: .25 }] }),
    ultimate: em("Shadow Storm", "ultimate", "Shadow", 0, { coefficient: 1.65, payoff: "afflictedOrBroken", payoffMultiplier: 1.3, critBonus: .15 })
  }, ["buff", "magic", "melee"], { row: 6, element: "Shadow", baseEvasion: .15, affixes: { critDamage: .25, damageAfflicted: .15 } }),
  "Nyx Vael": enemyCombatProfile("controller", .12, { hp: 86, mp: 148, str: 64, mag: 148, stam: 78, agi: 138 }, {
    melee: em("Margin Snap", "melee", "Shadow", 0, { coefficient: .78, status: { type: "shadowExposed", chance: .3, duration: 2 } }),
    magic: em("Quiet Index", "magic", "Shadow", 22, { coefficient: .72, status: { type: "sleep", chance: .58, duration: 3 } }),
    utility: em("Gravebind", "utility", "Shadow", 24, { status: { type: "silence", chance: .7, duration: 2 }, extraStatuses: [{ type: "agilityDown", chance: .7, duration: 3, value: .15 }] }),
    dispel: em("Unwrite Boon", "dispel", "Shadow", 24, { dispel: true }),
    buff: em("Veil of Nyx", "buff", "Shadow", 25, { targetSide: "self", buffs: [{ type: "magicUp", duration: 3, value: .25 }, { type: "evasion", duration: 2, value: .2 }] }),
    ultimate: em("Final Index", "ultimate", "Shadow", 0, { coefficient: 1.08, allTargets: true, status: { type: "sleep", chance: .5, duration: 2 } })
  }, ["magic", "buff", "dispel", "utility", "melee"], { row: 1, element: "Shadow", baseEvasion: .09, affixes: { statusPotency: .2, buffDuration: 1 } }),
  "Jory Bellwick": enemyCombatProfile("utility", .1, { hp: 90, mp: 136, str: 68, mag: 134, stam: 88, agi: 112 }, {
    melee: em("Lute Crack", "melee", "Physical", 0, { coefficient: .76, status: { type: "disrupted", chance: .2, duration: 3, value: .15 } }),
    magic: em("Star Note", "magic", "Sound", 18, { coefficient: .96 }),
    utility: em("Discordant Chord", "utility", "Sound", 22, { status: { type: "magicVulnerability", chance: .75, duration: 3, value: .18 } }),
    dispel: em("Dissonant Purge", "dispel", "Sound", 22, { dispel: true }),
    buff: em("Battle Hymn", "buff", "Sound", 34, { allAllies: true, buffs: [{ type: "damageUp", duration: 3, value: .15 }] }),
    ultimate: em("Grand Chord", "ultimate", "Sound", 0, { coefficient: 1.1, allTargets: true, teamBuffs: [{ type: "damageUp", duration: 2, value: .15 }] })
  }, ["buff", "dispel", "magic", "utility", "melee"], { row: 0, element: "Sound", affixes: { elementDamage: .12, buffDuration: 1 } }),
  Rava: enemyCombatProfile("dps", .18, { hp: 104, mp: 112, str: 128, mag: 140, stam: 100, agi: 114 }, {
    melee: em("Cinder Spear", "melee", "Ancient Fire", 0, { coefficient: .94, status: { type: "burn", chance: .25, duration: 4 } }),
    magic: em("Ember Javelin", "magic", "Ancient Fire", 20, { coefficient: 1.04, status: { type: "burn", chance: .55, duration: 4 } }),
    heavy: em("Dragon Breath", "magic", "Ancient Fire", 28, { coefficient: .88, allTargets: true, status: { type: "burn", chance: .5, duration: 4 } }),
    buff: em("Kindled Fury", "buff", "Ancient Fire", 26, { targetSide: "self", buffs: [{ type: "magicUp", duration: 3, value: .25 }, { type: "damageUp", duration: 3, value: .15 }] }),
    ultimate: em("Cinderstorm", "ultimate", "Ancient Fire", 0, { coefficient: 1.16, allTargets: true, payoff: "burning", payoffMultiplier: 1.18 })
  }, ["magic", "buff", "heavy", "melee"], { row: 2, element: "Ancient Fire", affixes: { elementDamage: .15, damageAfflicted: .12 } }),
  Tja: enemyCombatProfile("controller", .11, { hp: 94, mp: 138, str: 68, mag: 144, stam: 86, agi: 132 }, {
    melee: em("Frost Flourish", "melee", "Physical", 0, { coefficient: .78, status: { type: "agilityDown", chance: .25, duration: 3, value: .15 } }),
    magic: em("Crystal Waltz", "magic", "Ice", 22, { coefficient: .92, status: { type: "sleep", chance: .42, duration: 3 } }),
    heavy: em("Ice Lance", "magic", "Ice", 25, { coefficient: 1.12, status: { type: "agilityDown", chance: .65, duration: 3, value: .15 } }),
    buff: em("Winter Rhythm", "buff", "Ice", 24, { targetSide: "self", buffs: [{ type: "magicUp", duration: 3, value: .25 }, { type: "critUp", duration: 2, value: .1 }] }),
    ultimate: em("Winter Encore", "ultimate", "Ice", 0, { coefficient: 1.12, allTargets: true, status: { type: "sleep", chance: .35, duration: 2 } })
  }, ["magic", "buff", "heavy", "melee"], { element: "Ice", baseEvasion: .09, affixes: { elementDamage: .12, statusPotency: .18 } }),
  "King Maeric": enemyCombatProfile("tank", .11, { hp: 158, mp: 118, str: 122, mag: 106, stam: 164, agi: 64 }, {
    melee: em("Sceptre Judgment", "melee", "Physical", 0, { coefficient: .9, status: { type: "marked", chance: .25, duration: 4, value: .12 } }),
    magic: em("Lion Seal", "magic", "Holy Fire", 21, { coefficient: .94 }),
    buff: em("Royal Command", "buff", "Holy Fire", 38, { allAllies: true, buffs: [{ type: "defenseUp", duration: 3, value: .25 }, { type: "strengthUp", duration: 3, value: .2 }] }),
    dispel: em("Royal Repeal", "dispel", "Holy Fire", 26, { dispel: true }),
    heal: em("Royal Bulwark", "heal", "Holy Fire", 26, { healing: true, healCoefficient: 1.15 }),
    ultimate: em("Crown of Cindervale", "ultimate", "Holy Fire", 0, { coefficient: 1.1, allTargets: true, teamBuffs: [{ type: "defenseUp", duration: 3, value: .25 }, { type: "strengthUp", duration: 3, value: .2 }] })
  }, ["buff", "dispel", "melee", "magic", "heal"], { element: "Holy Fire", affixes: { physicalResistance: .16, buffDuration: 1 } }),
  "Angry Gnome Mob": enemyCombatProfile("dps", .14, { hp: 112, mp: 84, str: 132, mag: 72, stam: 102, agi: 126 }, {
    melee: em("Mob Rush", "melee", "Physical", 0, { coefficient: 1, breakPower: 1, multiHit: 2 }),
    magic: em("Flying Crockery", "magic", "Physical", 19, { coefficient: 1, scaling: "str", status: { type: "stun", chance: .3 } }),
    buff: em("Mob Frenzy", "buff", "Physical", 24, { allAllies: true, requiresFallenAlly: true, buffs: [{ type: "agilityUp", duration: 3, value: .25 }] }),
    ultimate: em("Uprising", "ultimate", "Physical", 0, { coefficient: 1.1, scaling: "str", allTargets: true, breakPower: 1 })
  }, ["melee", "magic", "buff"], { element: "Physical", affixes: { resonanceGeneration: .12 } }),
  "Ash Quarter Thugg": enemyCombatProfile("bruiser", .14, { hp: 122, mp: 72, str: 142, mag: 64, stam: 118, agi: 84 }, {
    melee: em("Cinder Club", "melee", "Physical", 0, { coefficient: .96, breakPower: 2 }),
    magic: em("Ash Hurl", "magic", "Physical", 18, { coefficient: 1.02, scaling: "str", status: { type: "stun", chance: .32 } }),
    buff: em("Street Fury", "buff", "Physical", 20, { targetSide: "self", requiresFallenAlly: true, buffs: [{ type: "strengthUp", duration: 3, value: .3 }] }),
    ultimate: em("Quarterbreaker", "ultimate", "Physical", 0, { coefficient: 1.62, scaling: "str", payoff: "broken", payoffMultiplier: 1.3, breakPower: 2 })
  }, ["melee", "magic", "buff"], { element: "Physical", affixes: { breakPower: 1, damageBroken: .15 } }),
  Tibby: enemyCombatProfile("hybrid", .15, { hp: 102, mp: 104, str: 112, mag: 112, stam: 96, agi: 132 }, {
    melee: em("Trunk Bash", "melee", "Physical", 0, { coefficient: .9, breakPower: 1 }),
    magic: em("Starry Flourish", "magic", "Arcane", 19, { coefficient: 1, scaling: "hybrid" }),
    buff: em("Showtime", "buff", "Arcane", 20, { targetSide: "self", buffs: [{ type: "critUp", duration: 3, value: .15 }] }),
    ultimate: em("Grand Entrance", "ultimate", "Arcane", 0, { coefficient: 1.58, scaling: "hybrid", status: { type: "stun", chance: .55 } })
  }, ["melee", "buff", "magic"], { element: "Arcane", affixes: { critDamage: .12, statusPotency: .12 } }),
  "Berend Blimpstone": enemyCombatProfile("healer", .06, { hp: 106, mp: 144, str: 64, mag: 144, stam: 108, agi: 78 }, {
    melee: em("Whisk Strike", "melee", "Physical", 0, { coefficient: .72 }),
    magic: em("Crown Cake", "heal", "Heart", 23, { healing: true, healCoefficient: 1.32 }),
    heal: em("Kitchen Remedy", "heal", "Heart", 26, { healing: true, healCoefficient: 1.42, cleanse: true }),
    buff: em("Fortifying Feast", "heal", "Heart", 30, { healing: true, healCoefficient: 1.15, buffs: [{ type: "defenseUp", duration: 3, value: .22 }] }),
    ultimate: em("Royal Banquet", "ultimate", "Heart", 0, { healing: true, healCoefficient: 1.32, allAllies: true })
  }, ["magic", "buff", "heal", "melee"], { element: "Heart", affixes: { healPotency: .18, barrierPotency: .12 } }),
  Marla: enemyCombatProfile("healer", .08, { hp: 102, mp: 158, str: 72, mag: 154, stam: 104, agi: 82 }, {
    melee: em("Pan Swing", "melee", "Physical", 0, { coefficient: .75, status: { type: "burn", chance: .2, duration: 4 } }),
    magic: em("Soup Splash", "magic", "Ancient Fire", 18, { coefficient: .9, status: { type: "burn", chance: .35, duration: 4 } }),
    heal: em("Stamina Stew", "heal", "Heart", 28, { healing: true, healCoefficient: 1.72, cleanse: true }),
    buff: em("Hot Meal", "heal", "Heart", 27, { healing: true, healCoefficient: 1.1, buffs: [{ type: "strengthUp", duration: 3, value: .25 }] }),
    ultimate: em("Feast for All", "ultimate", "Heart", 0, { healing: true, healCoefficient: 1.42, allAllies: true })
  }, ["magic", "heal", "buff", "melee"], { row: 7, element: "Heart", affixes: { healPotency: .22, mpEfficiency: .12 } }),
  "Prince Lucan Cindralis": enemyCombatProfile("hybrid", .17, { hp: 112, mp: 112, str: 132, mag: 126, stam: 104, agi: 134 }, {
    melee: em("Prince's Blade", "melee", "Physical", 0, { coefficient: .94, status: { type: "critExposed", chance: .25, duration: 2, value: .12 } }),
    magic: em("Blue Edict", "magic", "Arcane", 20, { coefficient: 1.02, scaling: "hybrid" }),
    utility: em("Royal Pressure", "utility", "Arcane", 21, { status: { type: "marked", chance: .8, duration: 4, value: .12 } }),
    buff: em("Royal Momentum", "buff", "Arcane", 25, { targetSide: "self", buffs: [{ type: "agilityUp", duration: 3, value: .25 }, { type: "critUp", duration: 3, value: .15 }] }),
    ultimate: em("Cindralis Decree", "ultimate", "Arcane", 0, { coefficient: 1.68, scaling: "hybrid", payoff: "marked", payoffMultiplier: 1.22 })
  }, ["utility", "buff", "magic", "melee"], { element: "Arcane", affixes: { critDamage: .15 } }),
  "Sir Reginald": enemyCombatProfile("tank", .09, { hp: 142, mp: 98, str: 122, mag: 102, stam: 154, agi: 64 }, {
    melee: em("Knight's Blow", "melee", "Physical", 0, { coefficient: .9, breakPower: 2 }),
    magic: em("Earth Pulse", "magic", "Earth", 21, { coefficient: .96, scaling: "str", breakPower: 1, status: { type: "stun", chance: .3 } }),
    utility: em("Shadow Pulse", "utility", "Shadow", 22, { coefficient: .84, damaging: true, status: { type: "poison", chance: .55, duration: 4 } }),
    buff: em("Knight's Oath", "buff", "Earth", 24, { targetSide: "self", buffs: [{ type: "defenseUp", duration: 3, value: .28 }] }),
    ultimate: em("Oathbreaker", "ultimate", "Earth", 0, { coefficient: 1.62, scaling: "str", breakPower: 3, payoff: "broken", payoffMultiplier: 1.2 })
  }, ["melee", "buff", "magic", "utility"], { element: "Earth", affixes: { physicalResistance: .15, breakPower: 1 } }),
  Harl: enemyCombatProfile("bruiser", .11, { hp: 112, mp: 104, str: 124, mag: 100, stam: 112, agi: 96 }, {
    melee: em("Stage Hook", "melee", "Physical", 0, { coefficient: .9, status: { type: "disrupted", chance: .2, duration: 3, value: .15 } }),
    magic: em("Sound Pulse", "magic", "Sound", 18, { coefficient: .94 }),
    buff: em("Rally", "buff", "Sound", 34, { allAllies: true, buffs: [{ type: "strengthUp", duration: 3, value: .2 }, { type: "damageUp", duration: 3, value: .15 }] }),
    ultimate: em("Resonant Rupture", "ultimate", "Sound", 0, { coefficient: 1.12, allTargets: true })
  }, ["buff", "melee", "magic"], { element: "Sound", affixes: { physicalDamage: .1, buffDuration: 1 } }),
  "Frostmile Wyrm": enemyCombatProfile("boss", .15, { hp: 150, mp: 154, str: 118, mag: 154, stam: 158, agi: 88 }, {
    melee: em("Frost Talon", "melee", "Ice", 0, { coefficient: .94, breakPower: 2 }),
    magic: em("Glacial Breath", "magic", "Ice", 26, { coefficient: .86, allTargets: true, status: { type: "agilityDown", chance: .65, duration: 3, value: .15 }, extraStatuses: [{ type: "stun", chance: .25 }] }),
    buff: em("Frozen Majesty", "buff", "Ice", 26, { targetSide: "self", buffs: [{ type: "magicUp", duration: 3, value: .3 }, { type: "critUp", duration: 2, value: .1 }] }),
    ultimate: em("Winter's End", "ultimate", "Ice", 0, { coefficient: 1.14, allTargets: true, breakPower: 1, status: { type: "agilityDown", chance: .8, duration: 3, value: .2 } })
  }, ["magic", "buff", "melee"], { element: "Ice", affixes: { elementDamage: .16, statusPotency: .18, breakPower: 1, resonanceGeneration: .18 } }),
  "Ember Leviathan": enemyCombatProfile("boss", .17, { hp: 165, mp: 146, str: 148, mag: 146, stam: 164, agi: 74 }, {
    melee: em("Molten Fang", "melee", "Ancient Fire", 0, { coefficient: .98, breakPower: 2, status: { type: "burn", chance: .55, duration: 4 } }),
    magic: em("Ember Torrent", "magic", "Ancient Fire", 25, { coefficient: .9, allTargets: true, status: { type: "burn", chance: .5, duration: 4 } }),
    buff: em("Infernal Surge", "buff", "Ancient Fire", 28, { targetSide: "self", buffs: [{ type: "damageUp", duration: 3, value: .22 }, { type: "strengthUp", duration: 3, value: .25 }] }),
    ultimate: em("Leviathan Eruption", "ultimate", "Ancient Fire", 0, { coefficient: 1.18, allTargets: true, payoff: "burning", payoffMultiplier: 1.18, status: { type: "burn", chance: .9, duration: 4 } })
  }, ["melee", "buff", "magic"], { element: "Ancient Fire", affixes: { elementDamage: .18, statusPotency: .18, damageAfflicted: .12, resonanceGeneration: .18 } }),
  Solinar: enemyCombatProfile("boss", .18, { hp: 160, mp: 168, str: 138, mag: 160, stam: 152, agi: 92 }, {
    melee: em("Solar Blade", "melee", "Holy Fire", 0, { coefficient: .96, scaling: "hybrid", status: { type: "holyVulnerability", chance: .45, duration: 2, value: .2 } }),
    magic: em("Crown of Light", "magic", "Holy Fire", 24, { coefficient: 1.06 }),
    heal: em("Solar Renewal", "heal", "Holy Fire", 32, { healing: true, healCoefficient: 1.82, cleanse: true }),
    buff: em("Dawn Tyrant's Command", "buff", "Holy Fire", 38, { allAllies: true, buffs: [{ type: "magicUp", duration: 3, value: .25 }, { type: "damageUp", duration: 3, value: .16 }, { type: "barrier", duration: 2, value: .2 }] }),
    ultimate: em("Final Sunrise", "ultimate", "Holy Fire", 0, { coefficient: 1.2, allTargets: true, teamBuffs: [{ type: "barrier", duration: 2, value: .2 }] })
  }, ["magic", "buff", "melee", "heal"], { element: "Holy Fire", affixes: { elementDamage: .18, healPotency: .18, barrierPotency: .15, resonanceGeneration: .28 } }),
  "Solinar Enraged": enemyCombatProfile("boss", .2, { hp: 150, mp: 176, str: 150, mag: 166, stam: 138, agi: 128 }, {
    melee: em("Solar Blade", "melee", "Holy Fire", 0, { coefficient: 1, scaling: "hybrid", breakPower: 2 }),
    magic: em("Glacial Breath", "magic", "Ice", 25, { coefficient: .9, allTargets: true, status: { type: "agilityDown", chance: .65, duration: 3, value: .15 } }),
    heavy: em("Ember Torrent", "magic", "Ancient Fire", 25, { coefficient: .94, allTargets: true, status: { type: "burn", chance: .6, duration: 4 } }),
    buff: em("Frostfire Ascendance", "buff", "Holy Fire", 34, { targetSide: "self", buffs: [{ type: "magicUp", duration: 3, value: .3 }, { type: "critUp", duration: 3, value: .18 }, { type: "agilityUp", duration: 3, value: .25 }] }),
    ultimate: em("Frostfire Cataclysm", "ultimate", "Ancient Fire", 0, { coefficient: 1.3, allTargets: true, breakPower: 2, status: { type: "burn", chance: .8, duration: 4 }, extraStatuses: [{ type: "agilityDown", chance: .8, duration: 3, value: .2 }] })
  }, ["magic", "heavy", "buff", "melee"], { element: "Ancient Fire", affixes: { elementDamage: .2, breakPower: 1, critDamage: .25, resonanceGeneration: .3 } })
};
const animationLayouts = {
  Marla: { columns: 4, rows: 7, chromaBlack: true },
  Nyx: { columns: 4, rows: 7 },
  Rava: { columns: 4, rows: 7 },
  Jory: { columns: 4, rows: 7 },
  Harl: { columns: 6, rows: 4, chromaBlack: true },
  Kaeldrin: { columns: 4, rows: 7 },
  Lyrsa: { columns: 4, rows: 7 },
  Shade: { columns: 4, rows: 7, chromaBlack: true },
  Grumm: { columns: 4, rows: 7 }
};
const mapImages = {};
const battleImages = {};
const recruitSceneImages = {};
const STAGE_SELECTOR_ASSET = "assets/ui/stage-selector-sheet.webp";
const STAGE_SELECTOR_FRAMES = 4;
const battleImageFiles = {
  "ash-quarter": "ash-quarter.png",
  reverie: "reverie.png",
  guildspire: "guildspire.png",
  "ember-hall": "ember-hall.png",
  "false-dawn": "false-dawn.png",
  "cinder-terrace": "cinder-terrace.webp",
  "lantern-tavern": "lantern-tavern.webp",
  "reverie-garden": "reverie-garden.webp",
  "reverie-library": "reverie-library.webp",
  "guildspire-marble": "guildspire-marble.webp",
  "cinder-sunset": "cinder-sunset.webp",
  "fallen-dawn": "fallen-dawn.webp",
  "cinder-ruins": "cinder-ruins.webp",
  "cinder-cataclysm": "cinder-cataclysm.webp",
  "lantern-stage": "lantern-stage.webp"
};
const recruitSceneImageFiles = {
  "central-hall": "central-hall.webp",
  "torren-kitchen": "torren-kitchen.webp",
  "kael-library": "kael-library.webp",
  "glimmer-lab": "glimmer-lab.webp",
  "training-room": "training-room.webp",
  "music-studio": "music-studio.webp",
  "sparky-coop": "sparky-coop.webp",
  "relaxation-lounge": "relaxation-lounge.webp"
};
const enemyAnimationSheets = {};
const chestOpenTicks = {};
let enemySheet = null;
let enemyAttackSheet = null;
let worldEnemySheet = null;
let npcSheet = null;
let titleImage = null;
let titleIdleFrames = [];
let stageSelectorImage = null;
let chestSheet = null;
let echoProjectileSheet = null;
let breakIconSheet = null;
let combatRoleIconSheet = null;
let spriteLoadProgress = 0;
let runtimeAssetsReady = false;

function isCheckerPixel(data, offset) {
  const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
  return a > 0 && Math.min(r, g, b) >= 220 && Math.max(r, g, b) - Math.min(r, g, b) <= 4;
}

function removeConnectedCheckerboard(context, width, height) {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (seen[index] || !isCheckerPixel(data, index * 4)) return;
    seen[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width, y = Math.floor(index / width), offset = index * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = data[offset + 3] = 0;
    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
  }
  context.putImageData(image, 0, 0);
  return image;
}

function cellBounds(imageData, width, height, col, row, columns, rows) {
  const startX = Math.floor(col * width / columns);
  const startY = Math.floor(row * height / rows);
  const endX = Math.floor((col + 1) * width / columns);
  const endY = Math.floor((row + 1) * height / rows);
  const cellWidth = endX - startX;
  const cellHeight = endY - startY;
  let minX = endX, minY = endY, maxX = startX, maxY = startY;
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (imageData.data[(y * width + x) * 4 + 3] < 20) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (minX > maxX) return { x: startX, y: startY, w: cellWidth, h: cellHeight };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function loadBreakIconSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const paint = canvas.getContext("2d", { willReadFrequently: true });
      paint.drawImage(image, 0, 0);
      const pixels = paint.getImageData(0, 0, canvas.width, canvas.height);
      breakIconSheet = {
        image,
        cells: [0, 1, 2, 3].map(column => cellBounds(pixels, canvas.width, canvas.height, column, 0, 4, 1))
      };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/ui/break-icons.png";
  });
}

function loadCombatRoleIconSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      combatRoleIconSheet = { image, cellWidth: image.naturalWidth / 5, cellHeight: image.naturalHeight };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/ui/combat-role-icons.png";
  });
}

function loadSpriteSheet(id) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = removeConnectedCheckerboard(paint, cleaned.width, cleaned.height);
      const cells = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 4, 2));
      }
      const metrics = [0, 1].map(row => {
        const rowTop = Math.floor(row * cleaned.height / 2);
        const rowCells = cells.slice(row * 4, row * 4 + 4);
        const heights = rowCells.map(cell => cell.h).sort((a, b) => a - b);
        const baselines = rowCells.map(cell => cell.y + cell.h - rowTop).sort((a, b) => a - b);
        return {
          height: heights[Math.floor(heights.length / 2)],
          baseline: baselines[Math.floor(baselines.length / 2)]
        };
      });
      spriteSheets[id] = {
        image: cleaned,
        cells,
        metrics
      };
      spriteLoadProgress++;
      resolve();
    };
    image.onerror = () => { spriteLoadProgress++; resolve(); };
    image.src = `assets/sprites/${id.toLowerCase()}-runtime.png`;
  });
}

function loadWalkSpriteSheet(id) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = removeConnectedCheckerboard(paint, cleaned.width, cleaned.height);
      const cells = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 6; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 6, 2));
      }
      const metrics = [0, 1].map(row => {
        const rowTop = Math.floor(row * cleaned.height / 2);
        const rowCells = cells.slice(row * 6, row * 6 + 6);
        const baselines = rowCells.map(cell => cell.y + cell.h - rowTop).sort((a, b) => a - b);
        return { baseline: baselines[Math.floor(baselines.length / 2)] };
      });
      walkSpriteSheets[id] = { image: cleaned, cells, metrics };
      resolve();
    };
    image.onerror = resolve;
    image.src = `assets/sprites/${id.toLowerCase()}-walk-runtime.png`;
  });
}

function loadAnimationSheet(id, fileName = id.toLowerCase()) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = paint.getImageData(0, 0, cleaned.width, cleaned.height);
      const layout = animationLayouts[id] || { columns: 4, rows: 7 };
      if (layout.chromaBlack) {
        for (let index = 0; index < pixels.data.length; index += 4) {
          if (pixels.data[index] < 5 && pixels.data[index + 1] < 5 && pixels.data[index + 2] < 5) pixels.data[index + 3] = 0;
        }
        paint.putImageData(pixels, 0, 0);
      }
      const cells = [];
      for (let row = 0; row < layout.rows; row++) {
        for (let col = 0; col < layout.columns; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, layout.columns, layout.rows));
      }
      const fieldHeights = cells.slice(0, Math.min(cells.length, layout.columns * 4)).map(cell => cell.h).sort((a, b) => a - b);
      animationSheets[id] = {
        image: cleaned,
        cells,
        columns: layout.columns,
        rows: layout.rows,
        cellWidth: cleaned.width / layout.columns,
        cellHeight: cleaned.height / layout.rows,
        referenceHeight: fieldHeights[Math.floor(fieldHeights.length / 2)] || cleaned.height / layout.rows
      };
      if (spriteScale[id]) spriteLoadProgress++;
      resolve();
    };
    image.onerror = () => { if (spriteScale[id]) spriteLoadProgress++; resolve(); };
    image.src = `assets/sprites/animation/${fileName}.png`;
  });
}

async function loadBattleAnimationSheets() {
  try {
    const response = await fetch("assets/sprites/battle-v2/manifest.json?v=party-release-75");
    if (!response.ok) return;
    const manifest = await response.json();
    await Promise.all(Object.entries(manifest).map(([id, config]) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        battleAnimationSheets[id] = { ...config, image };
        resolve();
      };
      image.onerror = resolve;
      image.src = `assets/sprites/battle-v2/${config.file}?v=party-release-75`;
    })));
  } catch (_) {
    // Stable world sprites remain the fallback if a battle-only asset fails.
  }
}

function loadMarlaBattleSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const columns = 4;
      const rows = 2;
      const cellWidth = 180;
      const cellHeight = 220;
      const packed = document.createElement("canvas");
      packed.width = columns * cellWidth;
      packed.height = rows * cellHeight;
      const paint = packed.getContext("2d");
      paint.imageSmoothingEnabled = false;
      const frames = [
        [840, 37, 160, 184], [1010, 35, 160, 188], [1175, 35, 160, 188], [840, 37, 160, 184],
        [690, 815, 169, 185], [859, 815, 169, 185], [1197, 815, 169, 185], [1366, 815, 170, 185]
      ];
      frames.forEach(([sx, sy, sw, sh], index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const dx = col * cellWidth + Math.round((cellWidth - sw) / 2);
        const dy = row * cellHeight + cellHeight - sh;
        paint.drawImage(image, sx, sy, sw, sh, dx, dy, sw, sh);
      });
      npcBattleSheets.Marla = {
        image: packed,
        columns,
        rows,
        referenceHeight: 185,
        battleOnly: true
      };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/sprites/animation/marla-battle.png";
  });
}

async function loadEnemyAnimationSheets() {
  try {
    const response = await fetch("assets/sprites/enemies-battle/manifest.json?v=opponents-80");
    if (!response.ok) return;
    const manifest = await response.json();
    await Promise.all(Object.entries(manifest).map(([id, config]) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        enemyAnimationSheets[id] = { ...config, image, battleOnly: true };
        resolve();
      };
      image.onerror = resolve;
      image.src = `assets/sprites/enemies-battle/${config.file}?v=opponents-80`;
    })));
  } catch (_) {
    // The original compact battle sprites remain available if an opponent sheet fails.
  }
}

function loadChestSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = paint.getImageData(0, 0, cleaned.width, cleaned.height);
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 5, 3));
      }
      chestSheet = { image: cleaned, cells, cellWidth: cleaned.width / 5, cellHeight: cleaned.height / 3 };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/sprites/chests.png";
  });
}

function loadEnemySheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = removeConnectedCheckerboard(paint, cleaned.width, cleaned.height);
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 3, 3));
      }
      enemySheet = { image: cleaned, cells };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/sprites/enemies-runtime.png";
  });
}

function loadEnemyAttackSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = removeConnectedCheckerboard(paint, cleaned.width, cleaned.height);
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 3, 3));
      }
      enemyAttackSheet = { image: cleaned, cells };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/sprites/enemies-attack-runtime.png";
  });
}

function loadWorldEnemySheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = paint.getImageData(0, 0, cleaned.width, cleaned.height);
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 3, 3));
      }
      worldEnemySheet = { image: cleaned, cells };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/sprites/enemies-field-runtime.png";
  });
}

function loadNpcSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      const pixels = removeConnectedCheckerboard(paint, cleaned.width, cleaned.height);
      const cells = [];
      const metrics = [];
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 4; col++) cells.push(cellBounds(pixels, cleaned.width, cleaned.height, col, row, 4, 6));
        const rowTop = Math.floor(row * cleaned.height / 6);
        const rowCells = cells.slice(row * 4, row * 4 + 4);
        const heights = rowCells.map(cell => cell.h).sort((a, b) => a - b);
        const baselines = rowCells.map(cell => cell.y + cell.h - rowTop).sort((a, b) => a - b);
        metrics.push({ height: heights[2], baseline: baselines[2] });
      }
      npcSheet = { image: cleaned, cells, metrics };
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/sprites/npcs-runtime.png";
  });
}

function loadMapImage(id) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => { mapImages[id] = image; resolve(); };
    image.onerror = resolve;
    image.src = `assets/maps/runtime/${id}.png`;
  });
}

function loadBattleImage(id) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => { battleImages[id] = image; resolve(); };
    image.onerror = resolve;
    image.src = `assets/battles/${battleImageFiles[id]}`;
  });
}

function loadRecruitSceneImage(id) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => { recruitSceneImages[id] = image; resolve(); };
    image.onerror = resolve;
    image.src = `assets/scenes/${recruitSceneImageFiles[id]}`;
  });
}

function loadTitleImage() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => { titleImage = image; resolve(); };
    image.onerror = resolve;
    image.src = "assets/maps/runtime/title-screen.png";
  });
}

function loadTitleIdleFrames() {
  return Promise.all([TITLE_BACKGROUND_FRAME].map(frame => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `assets/maps/title-idle-${frame}.webp`;
  }))).then(images => { titleIdleFrames = images; });
}

function loadStageSelectorImage() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => { stageSelectorImage = image; resolve(); };
    image.onerror = resolve;
    image.src = STAGE_SELECTOR_ASSET;
  });
}

function loadEchoProjectileSheet() {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const cleaned = document.createElement("canvas");
      cleaned.width = image.naturalWidth;
      cleaned.height = image.naturalHeight;
      const paint = cleaned.getContext("2d", { willReadFrequently: true });
      paint.imageSmoothingEnabled = false;
      paint.drawImage(image, 0, 0);
      removeConnectedCheckerboard(paint, cleaned.width, cleaned.height);
      echoProjectileSheet = cleaned;
      resolve();
    };
    image.onerror = resolve;
    image.src = "assets/effects/echo-projectiles.png";
  });
}

const characterVfxSheets = {};
const statusIconImages = {};
let statusHoverAreas = [];
let statusPointer = null;
let statusTooltip = null;

function loadStatusIcons() {
  const types = ['strengthUp','magicUp','defenseUp','damageUp','agilityUp','critUp','shadowUp','echoPower','evasion','barrier','mechGuard','holyFollowUp','combatDrone','vampiric','stunFocus','poison','burn','bleed','marked','physicalVulnerability','magicVulnerability','holyVulnerability','critExposed','agilityDown','disrupted','defenseDown','magicDefenseDown','sleep','stun','silence','shadowExposed','resonanceLocked','overheated'];
  return Promise.all(types.map(type => new Promise(resolve => {
    const image = new Image();
    image.onload = () => { statusIconImages[type] = image; resolve(); };
    image.onerror = resolve;
    image.src = `assets/ui/status/${type}.webp`;
  })));
}

async function loadCharacterVfxSheets() {
  try {
    const response = await fetch("assets/effects/characters/manifest.json");
    if (!response.ok) return;
    const manifest = await response.json();
    await Promise.all(Object.entries(manifest).map(([id, config]) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => { characterVfxSheets[id] = { ...config, image }; resolve(); };
      image.onerror = resolve;
      image.src = `assets/effects/characters/${config.file}`;
    })));
  } catch (error) {
    console.warn("Character VFX unavailable; retaining fallback effects.", error);
  }
}

Promise.all([
  loadStatusIcons(),
  loadCharacterVfxSheets(),
  loadBreakIconSheet(),
  loadCombatRoleIconSheet(),
  loadBattleAnimationSheets(),
  ...Object.keys(spriteScale).map(id => loadAnimationSheet(id)),
  ...Object.entries(animatedNpcFiles).map(([id, fileName]) => loadAnimationSheet(id, fileName)),
  loadEnemyAnimationSheets(),
  loadChestSheet(),
  loadEnemySheet(),
  loadEnemyAttackSheet(),
  loadWorldEnemySheet(),
  loadNpcSheet(),
  loadTitleImage(),
  loadTitleIdleFrames(),
  loadStageSelectorImage(),
  loadMarlaBattleSheet(),
  loadEchoProjectileSheet(),
  ...Object.keys(battleImageFiles).map(loadBattleImage),
  ...Object.keys(recruitSceneImageFiles).map(loadRecruitSceneImage),
  ...["lantern", "ember-hall-battle", "ash", "reverie", "guildspire", "ember", "alarm", "ash-route", "reverie-route", "guildspire-route", "ember-route", "dawn-route"].map(loadMapImage)
]).then(() => {
  runtimeAssetsReady = true;
  el.hint.textContent = "Houd WASD/pijlen ingedrukt, Z/Enter kiezen, C menu, Tab party";
});

const codex = [
  ["Verseborn", "07_Verseborn_Clean_Quest_Manga_Sheet.png"],
  ["Mira Veln", "03_Mira_Veln_Clean_Quest_Manga_Sheet.png"],
  ["Seerin Vahl", "04_Seerin_Vahl_Clean_Quest_Manga_Sheet.png"],
  ["Kael Ironhand", "02_Kael_Ironhand_Clean_Quest_Manga_Sheet.png"],
  ["Torren Stonekin", "06_Torren_Stonekin_Clean_Quest_Manga_Sheet.png"],
  ["Glimmer", "01_Glimmer_Clean_Quest_Manga_Sheet.png"],
  ["Sparky", "05_Sparky_Clean_Quest_Manga_Sheet.png"],
  ["Kaeldrin", "18_Kaeldrin_Clean_Quest_Manga_Sheet.png"],
  ["Lyrsa", "19_Lysra_Clean_Quest_Manga_Sheet.png"],
  ["Shade", "20_Shade_Clean_Quest_Manga_Sheet.png"],
  ["Grumm", "17_Grumm_Clean_Quest_Manga_Sheet.png"],
  ["Ember Hall", "location_EmberHall_Manga_Sheet.png"],
  ["Guildspire", "location_Guildspire_Manga_Sheet.png"],
  ["The Drunk Lantern", "location_TheDrunkenLantern_Manga_Sheet.png"]
];

const gearDb = {
  weapon: [
    item("Voice of Verse", "weapon", { str: 1, mag: 5, agi: 1 }, "Lute that turns feeling into power."),
    item("Twin Voidthorns", "weapon", { str: 4, agi: 5 }, "Daggers for quiet conclusions."),
    item("Klik-Wrench 7", "weapon", { str: 2, mag: 4, agi: 2 }, "Repairs, disassembles, occasionally explodes."),
    item("Earth Shield", "weapon", { str: 3, stam: 6 }, "Stone protection made portable."),
    item("Staff & Sigil", "weapon", { mag: 5, stam: 2 }, "Faith, discipline, and useful silence.")
  ],
  armour: [
    item("Ashcloak", "armour", { agi: 2, stam: 2 }, "Ragged cloak, impossible stage presence."),
    item("Flameguard Plate", "armour", { stam: 7, str: 1 }, "Heavy enough to make a door nervous."),
    item("Workshop Coat", "armour", { mag: 2, agi: 2, stam: 1 }, "Pockets where physics goes to panic."),
    item("Stonewake Mantle", "armour", { stam: 4, str: 2 }, "Old rank, new meaning.")
  ],
  ring: [
    item("Promise Ring", "ring", { mag: 2, stam: 1 }, "Small vow, large consequence."),
    item("Red Ember Band", "ring", { str: 2, mag: 1 }, "Fire remembers."),
    item("Quiet Circuit", "ring", { agi: 3 }, "Moves before the room notices.")
  ],
  necklace: [
    item("Cinder Star", "necklace", { mag: 3, stam: 2 }, "Light, duty, chosen family."),
    item("Veln Crest Token", "necklace", { agi: 2, mag: 2 }, "Influence without asking for it."),
    item("Gearheart Charm", "necklace", { mag: 2, agi: 1, stam: 1 }, "A machine that stayed.")
  ],
  helmet: [
    item("Songweaver Hood", "helmet", { mag: 2, agi: 2 }, "A soot-dark hood that keeps the singer hidden until the first note."),
    item("Glimmer Goggles", "helmet", { mag: 2, agi: 2 }, "Sees the wrong part first, which is usually the right part."),
    item("Mira Top Hat", "helmet", { agi: 4 }, "Not stealthy. Somehow stealthy."),
    item("Stone Brow Guard", "helmet", { stam: 4 }, "Headbutt-compatible.")
  ]
};

const zoneStarterGear = [
  item("Ashrunner Knife", "weapon", { str: 2, agi: 2 }, "Affordable Ash Quarter steel for a first route.", { type: "statusOnHit", status: "poison", value: .1, label: "10% chance to Poison on hit" }),
  item("Sootweave Coat", "armour", { agi: 1, stam: 3 }, "Warm, patched and built for narrow streets.", { type: "statusOnHit", status: "poison", value: .05, label: "5% chance to Poison on hit" }),
  item("Shelter Staff", "weapon", { mag: 3, stam: 2 }, "A simple focus used by Reverie wardens.", { type: "statusOnHit", status: "sleep", value: .1, label: "10% chance to Sleep on hit" }),
  item("Reverie Mantle", "armour", { mag: 2, stam: 3 }, "Protective cloth made to outlast a bad night.", { type: "statusOnHit", status: "sleep", value: .05, label: "5% chance to Sleep on hit" }),
  item("Guildsteel Saber", "weapon", { str: 4, agi: 1 }, "Standard Guildspire field issue without ceremonial weight.", { type: "statusOnHit", status: "stun", value: .1, label: "10% chance to Stun on hit" }),
  item("Registry Coat", "armour", { agi: 2, stam: 3 }, "Officially practical and practically official.", { type: "statusChance", value: .08, label: "+8% status application chance" }),
  item("Ember Pike", "weapon", { str: 4, mag: 2 }, "Training-yard steel with a restrained ember channel.", { type: "statusOnHit", status: "stun", value: .12, label: "12% chance to Stun on hit" }),
  item("Flameguard Leathers", "armour", { str: 2, stam: 4 }, "Flexible field armour from Ember Hall stores.", { type: "statusChance", value: .1, label: "+10% status application chance" }),
  item("Calibration Rod", "weapon", { mag: 4, agi: 2 }, "A recovered False Dawn tool repurposed as a focus.", { type: "statusOnHit", status: "sleep", value: .12, label: "12% chance to Sleep on hit" }),
  item("Stormglass Vestment", "armour", { agi: 3, stam: 3 }, "Insulated cloth for the causeway's static winds.", { type: "statusOnHit", status: "stun", value: .07, label: "7% chance to Stun on hit" })
];
zoneStarterGear.forEach(gear => gearDb[gear.slot].push(gear));

const rareGear = [
  item("Echo-Thread Lute", "weapon", { mag: 7, agi: 2 }, "A stolen name still hums in its strings.", { type: "openingResonance", value: 12, label: "+12 Resonance at battle start" }),
  item("Sealbreak Vestment", "armour", { mag: 3, stam: 6 }, "Clergy cloth with the command burned out.", { type: "blockPower", value: .18, label: "18% stronger personal guard" }),
  item("Faultline Signet", "ring", { str: 4, stam: 3 }, "The crack points toward the weakest joint.", { type: "weaknessDamage", value: .12, label: "+12% weakness damage" }),
  item("Local Truth Lens", "helmet", { mag: 5, agi: 3 }, "Glimmer taught it to distrust central instructions.", { type: "weaknessDamage", value: .2, label: "+20% weakness damage" }),
  item("Wyrmheart Ember", "necklace", { mag: 5, stam: 4 }, "A warm memory the tower could not erase.", { type: "battleRegen", value: 12, label: "Restore 12 HP after victory" })
];
rareGear.forEach(gear => gearDb[gear.slot].push(gear));
const questGear = [
  item("Rava's Guard Ring", "ring", { str: 3, stam: 3 }, "A blunt promise to hold the line.", { type: "blockPower", value: .12, label: "12% stronger personal guard" }),
  item("Nyx's Margin Note", "necklace", { mag: 4, agi: 3 }, "One correction the archive cannot misfile.", { type: "weaknessDamage", value: .12, label: "+12% weakness damage" })
];
questGear.forEach(gear => gearDb[gear.slot].push(gear));

const chestGear = [
  item("Songbound Rosin", "ring", { mag: 4, agi: 2 }, "Turns a clean note into returning focus.", { type: "mpOnHit", value: 2, label: "Restore 2 MP after dealing damage" }),
  item("Nightneedle Harness", "armour", { agi: 5, stam: 3 }, "Void-thread catches a little life on every precise cut.", { type: "hpOnHit", value: 3, label: "Restore 3 HP after dealing damage" }),
  item("Hearthwall Crest", "necklace", { stam: 5, mag: 3 }, "A shield-shaped ember that answers every impact.", { type: "hpOnHit", value: 4, label: "Restore 4 HP after dealing damage" }),
  item("Silent Reliquary", "necklace", { mag: 5, stam: 2 }, "Stores the breath between one sigil and the next.", { type: "mpOnHit", value: 3, label: "Restore 3 MP after dealing damage" }),
  item("Stonefather Gauntlet", "ring", { str: 5, stam: 4 }, "Heavy enough to make every returning blow feel like supper.", { type: "hpOnHit", value: 5, label: "Restore 5 HP after dealing damage" }),
  item("Impossible Lens", "helmet", { mag: 5, agi: 4 }, "Glimmer calibrated it against sensible limits.", { type: "mpOnHit", value: 3, label: "Restore 3 MP after dealing damage" }),
  item("Elder Ember Bell", "necklace", { mag: 5, stam: 4 }, "Its tiny chime carries the warmth of a dragon memory.", { type: "hpOnHit", value: 4, label: "Restore 4 HP after dealing damage" }),
  item("Cinderbite Edge", "weapon", { str: 5, mag: 3 }, "A field blade that drinks sparks without choosing a wielder.", { type: "hpOnHit", value: 2, label: "Restore 2 HP after dealing damage" }),
  item("Echo Collector", "ring", { mag: 4, agi: 3 }, "A general-focus ring that catches loose spellwork.", { type: "mpOnHit", value: 2, label: "Restore 2 MP after dealing damage" }),
  item("Roadwarden Plate", "armour", { stam: 6, str: 2 }, "Reliable protection recovered from a forgotten route chest.", { type: "blockPower", value: .15, label: "15% stronger personal guard" }),
  item("Fleetglass Circlet", "helmet", { agi: 6, mag: 2 }, "Shows the next opening half a heartbeat early.", { type: "openingResonance", value: 8, label: "+8 Resonance at battle start" }),
  item("Emberwell Chain", "necklace", { mag: 4, stam: 4 }, "A warm reserve for every kind of adventurer.", { type: "battleRegen", value: 10, label: "Restore 10 HP after victory" })
];
chestGear.forEach(gear => gearDb[gear.slot].push(gear));

const postgameGear = [
  item("Crownless Edge", "weapon", { str: 10, mag: 10, agi: 5 }, "A general weapon forged from a completed False Dawn loop.", [
    { type: "openingResonance", value: 20, label: "+20 Resonance at battle start" },
    { type: "statusOnHit", status: "stun", value: .18, label: "18% chance to Stun on hit", echoUnique: true },
    { type: "afflictedDamage", value: .2, label: "+20% damage against afflicted targets" }
  ]),
  item("Dawnforged Aegis", "armour", { stam: 13, str: 5, mag: 3 }, "Armour tempered by battles that already happened once.", [
    { type: "blockPower", value: .25, label: "25% stronger personal guard" },
    { type: "allStatusResistance", value: .2, label: "+20% resistance to all statuses" },
    { type: "buffDuration", value: 1, label: "Buffs last +1 turn", echoUnique: true }
  ]),
  item("Loopbreaker Ring", "ring", { str: 8, agi: 8, stam: 4 }, "Its broken circle refuses to repeat a losing turn.", [
    { type: "critChance", value: .08, label: "+8% critical chance" },
    { type: "statusChance", value: .2, label: "+20% status application chance" },
    { type: "openingTurnProgress", value: .15, label: "+15% opening turn progress", echoUnique: true }
  ]),
  item("Memory Chain", "necklace", { mag: 10, stam: 8, agi: 3 }, "Carries a victory forward without erasing the road behind it.", [
    { type: "battleRegen", value: 18, label: "Restore 18 HP after victory" },
    { type: "buffDuration", value: 1, label: "Buffs last +1 turn" },
    { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn", echoUnique: true }
  ]),
  item("Starless Visor", "helmet", { mag: 9, agi: 9, stam: 3 }, "Sees the flaw inside a perfected system.", [
    { type: "weaknessDamage", value: .28, label: "+28% weakness damage" },
    { type: "statusOnHit", status: "sleep", value: .15, label: "15% chance to Sleep on hit", echoUnique: true },
    { type: "statusChance", value: .15, label: "+15% status application chance" }
  ]),
  item("Venomwake Sabre", "weapon", { str: 11, agi: 8, mag: 3 }, "A loop-forged blade whose green edge remembers every unfinished wound.", [
    { type: "statusOnHit", status: "poison", value: .2, label: "20% chance to Poison on hit", echoUnique: true },
    { type: "poisonDamage", value: .35, label: "+35% Poison damage" },
    { type: "afflictedDamage", value: .15, label: "+15% damage against afflicted targets" }
  ]),
  item("Astral Refrain", "weapon", { mag: 12, agi: 7, stam: 3 }, "A focus tuned to repeat one impossible note from the next turn.", [
    { type: "echoing", value: .1, label: "10% skill Echo turn progress", echoUnique: true },
    { type: "magicDamage", value: .18, label: "+18% magic damage" },
    { type: "openingResonance", value: 16, label: "+16 Resonance at battle start" }
  ]),
  item("Dreamwarden Mail", "armour", { stam: 12, mag: 8, agi: 3 }, "Silent plates that keep watch while their wearer crosses a dangerous dream.", [
    { type: "statusResistance", status: "sleep", value: .5, label: "+50% Sleep resistance", echoUnique: true },
    { type: "allStatusResistance", value: .12, label: "+12% resistance to all statuses" },
    { type: "buffDuration", value: 1, label: "Buffs last +1 turn" }
  ]),
  item("Faultline Carapace", "armour", { stam: 15, str: 6 }, "Mountain armour that turns a stopped blow into stored momentum.", [
    { type: "blockPower", value: .3, label: "30% stronger personal guard", echoUnique: true },
    { type: "statusResistance", status: "stun", value: .35, label: "+35% Stun resistance" },
    { type: "hpOnHit", value: 5, label: "Restore 5 HP after dealing damage" }
  ]),
  item("Cindercoil Band", "ring", { str: 7, mag: 6, agi: 7 }, "A hot metal coil that snaps shut around hesitation.", [
    { type: "statusOnHit", status: "stun", value: .18, label: "18% chance to Stun on hit", echoUnique: true },
    { type: "critChance", value: .1, label: "+10% critical chance" },
    { type: "statusChance", value: .12, label: "+12% status application chance" }
  ]),
  item("Nightglass Seal", "ring", { mag: 9, agi: 9, stam: 2 }, "Its dark face reflects the instant before an enemy wakes.", [
    { type: "statusOnHit", status: "sleep", value: .18, label: "18% chance to Sleep on hit", echoUnique: true },
    { type: "afflictedDamage", value: .2, label: "+20% damage against afflicted targets" },
    { type: "openingTurnProgress", value: .12, label: "+12% opening turn progress" }
  ]),
  item("Venom Psalm Pendant", "necklace", { mag: 8, agi: 7, stam: 6 }, "A forbidden refrain sealed beneath a green-glass hymn plate.", [
    { type: "poisonDamage", value: .5, label: "+50% Poison damage", echoUnique: true },
    { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn" },
    { type: "statusChance", value: .15, label: "+15% status application chance" }
  ]),
  item("Bastion Echo Chain", "necklace", { stam: 11, mag: 7, str: 3 }, "Every link repeats the promise to remain standing.", [
    { type: "battleRegen", value: 28, label: "Restore 28 HP after victory", echoUnique: true },
    { type: "allStatusResistance", value: .18, label: "+18% resistance to all statuses" },
    { type: "buffDuration", value: 1, label: "Buffs last +1 turn" }
  ]),
  item("Firstlight Crown", "helmet", { mag: 11, agi: 7, stam: 4 }, "A bright circlet recovered from the dawn before the False Dawn.", [
    { type: "openingResonance", value: 28, label: "+28 Resonance at battle start", echoUnique: true },
    { type: "magicDamage", value: .16, label: "+16% magic damage" },
    { type: "echoing", value: .07, label: "7% skill Echo turn progress" }
  ]),
  item("Silent Execution Hood", "helmet", { str: 9, agi: 10, stam: 3 }, "A hood that marks every weakness without announcing the verdict.", [
    { type: "afflictedDamage", value: .28, label: "+28% damage against afflicted targets", echoUnique: true },
    { type: "critChance", value: .12, label: "+12% critical chance" },
    { type: "statusChance", value: .12, label: "+12% status application chance" }
  ])
];
postgameGear.forEach(gear => gearDb[gear.slot].push(gear));

const ngPlusGear = [
  item("Stonewake Oathblade", "weapon", { str: 10, agi: 5, stam: 3 }, "A command blade that yields only to earned respect.", { type: "critChance", value: .1, label: "+10% critical chance" }),
  item("Orphanheart Coat", "armour", { stam: 12, mag: 5 }, "Reverie cloth strengthened by every child who refused to be moved.", { type: "battleRegen", value: 24, label: "Restore 24 HP after victory" }),
  item("Second-Loop Signet", "ring", { str: 7, agi: 7, mag: 4 }, "A ring that remembers the opening the first loop missed.", { type: "openingResonance", value: 26, label: "+26 Resonance at battle start" }),
  item("Echo Vow Chain", "necklace", { mag: 9, stam: 7 }, "Every promise in the chain returns a little power.", { type: "mpOnHit", value: 5, label: "Restore 5 MP after dealing damage" }),
  item("Causality Visor", "helmet", { mag: 8, agi: 9 }, "Shows the weakness a perfected system tried to hide.", { type: "weaknessDamage", value: .35, label: "+35% weakness damage" }),
  item("Second Verse Lute", "weapon", { str: 5, mag: 13, agi: 6 }, "Verseborn's completed refrain, carried through one ending.", { type: "openingResonance", value: 30, label: "+30 Resonance at battle start" }),
  item("Veln Eclipse Blades", "weapon", { str: 13, agi: 10 }, "Mira's twin conclusions, sharpened against repeated history.", { type: "critChance", value: .15, label: "+15% critical chance" }),
  item("Cinderstar Aegis", "weapon", { str: 10, stam: 12, mag: 4 }, "Seerin's promise made heavy enough to stop a second dawn.", { type: "blockPower", value: .3, label: "30% stronger personal guard" }),
  item("Unbound Oathstaff", "weapon", { mag: 14, stam: 8 }, "Kael's faith after obedience has been burned away.", { type: "battleRegen", value: 26, label: "Restore 26 HP after victory" }),
  item("Worldroot Shield", "weapon", { str: 12, stam: 15 }, "Torren carries the foundation instead of standing on it.", { type: "hpOnHit", value: 8, label: "Restore 8 HP after dealing damage" }),
  item("Klik-Wrench Infinite", "weapon", { str: 6, mag: 15, agi: 8 }, "Glimmer improved the improved version. It is probably finished.", { type: "mpOnHit", value: 7, label: "Restore 7 MP after dealing damage" }),
  item("Elderflame Claws", "weapon", { str: 9, mag: 14, agi: 7 }, "Sparky's oldest memory finally remembers how to fight.", { type: "weaknessDamage", value: .4, label: "+40% weakness damage" })
];
ngPlusGear.forEach(gear => gearDb[gear.slot].push(gear));

const ngPlusChestGear = [
  item("Loopglass Sabre", "weapon", { str: 9, agi: 7, mag: 2 }, "A chest-found blade whose edge changes with every completed route.", { type: "statusOnHit", status: "poison", value: .14, label: "14% chance to Poison on hit" }),
  item("Reverie Hexrod", "weapon", { mag: 10, agi: 5, stam: 3 }, "A recovered focus that turns archived dreams into practical spellwork.", { type: "statusOnHit", status: "sleep", value: .14, label: "14% chance to Sleep on hit" }),
  item("Stonewake Maul", "weapon", { str: 12, stam: 5 }, "Heavy Stonewake steel that carries the mountain into the next loop.", { type: "statusOnHit", status: "stun", value: .14, label: "14% chance to Stun on hit" }),
  item("Cinder Repeater", "weapon", { str: 8, mag: 8, agi: 4 }, "A Flameguard weapon rebuilt to reward exact timing.", { type: "critChance", value: .09, label: "+9% critical chance" }),
  item("Second-Road Plate", "armour", { stam: 12, str: 4 }, "Roadwarden armour reinforced with memories of the first journey.", { type: "blockPower", value: .18, label: "18% stronger personal guard" }),
  item("Dreamstitch Coat", "armour", { stam: 8, mag: 7, agi: 3 }, "Reverie thread closes itself whenever a nightmare finds the seam.", { type: "statusResistance", status: "sleep", value: .3, label: "+30% Sleep resistance" }),
  item("Cinderproof Harness", "armour", { stam: 10, agi: 5, str: 2 }, "A flexible harness tested against ash, sparks and bad second ideas.", { type: "allStatusResistance", value: .12, label: "+12% resistance to all statuses" }),
  item("Clockwork Mantle", "armour", { stam: 7, mag: 8, agi: 5 }, "Glimmer added a timing wheel where a sensible tailor would not.", { type: "openingTurnProgress", value: .1, label: "+10% opening turn progress" }),
  item("Recursion Band", "ring", { str: 6, agi: 7, mag: 3 }, "The engraving returns to its first line without repeating the same mistake.", { type: "echoing", value: .05, label: "5% skill Echo turn progress" }),
  item("Ember Thread Signet", "ring", { mag: 6, stam: 6, str: 3 }, "Warm orphan-thread circles a signet rescued from an abandoned route.", { type: "battleRegen", value: 14, label: "Restore 14 HP after victory" }),
  item("Nullscript Ring", "ring", { mag: 7, agi: 6, stam: 2 }, "A blank command ring ready to accept less obedient magic.", { type: "statusChance", value: .12, label: "+12% status application chance" }),
  item("Fault Echo Loop", "ring", { str: 7, stam: 5, agi: 4 }, "A cracked loop that releases a sharp pulse when struck.", { type: "statusOnHit", status: "stun", value: .1, label: "10% chance to Stun on hit" }),
  item("Routekeeper Chain", "necklace", { stam: 7, agi: 6, mag: 3 }, "Its links tug gently toward an opening only a returning traveler can see.", { type: "openingTurnProgress", value: .12, label: "+12% opening turn progress" }),
  item("Orphanfire Pendant", "necklace", { mag: 7, stam: 6, str: 3 }, "A small hearth that refuses to go dark between battles.", { type: "hpOnHit", value: 4, label: "Restore 4 HP after dealing damage" }),
  item("Cogheart Locket", "necklace", { mag: 8, agi: 5, stam: 3 }, "A tiny engine catches loose spellwork and winds itself again.", { type: "mpOnHit", value: 3, label: "Restore 3 MP after dealing damage" }),
  item("Ash Memory Charm", "necklace", { mag: 6, str: 5, agi: 5 }, "Ash settles into the shape of every weakness already discovered.", { type: "afflictedDamage", value: .12, label: "+12% damage against afflicted targets" }),
  item("Pathseer Hood", "helmet", { agi: 8, mag: 5, stam: 2 }, "A travel hood that remembers how long an opening should remain.", { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn" }),
  item("Waking Visor", "helmet", { agi: 7, stam: 6, mag: 3 }, "Its bright inner lens keeps the wearer's thoughts close to the surface.", { type: "statusResistance", status: "sleep", value: .35, label: "+35% Sleep resistance" }),
  item("Dawnless Circlet", "helmet", { mag: 9, agi: 5, stam: 3 }, "A dark circlet that stores the resonance the False Dawn discarded.", { type: "openingResonance", value: 15, label: "+15 Resonance at battle start" }),
  item("Stone Echo Helm", "helmet", { stam: 9, str: 5, agi: 2 }, "A close-fitting helm that lets the mountain absorb the first shock.", { type: "statusResistance", status: "stun", value: .3, label: "+30% Stun resistance" })
];
ngPlusChestGear.forEach(gear => gearDb[gear.slot].push(gear));

const echoForgeSlots = ["weapon", "armour", "ring", "necklace", "helmet"];
const echoForgeBlueprints = {
  weapon: [
    { base: "Voice of Verse", rarity: "Common", effect: { type: "buffDuration", value: 1, label: "support buffs last +1 turn" } },
    { base: "Shelter Staff", rarity: "Common", effect: { type: "magicDamage", value: .14, label: "+14% magic damage" } },
    { base: "Ashrunner Knife", rarity: "Uncommon", effect: { type: "poisonDamage", value: .35, label: "+35% Poison damage" } },
    { base: "Guildsteel Saber", rarity: "Uncommon", effect: { type: "statusOnHit", status: "stun", value: .14, label: "14% chance to Stun on hit" } },
    { base: "Echo-Thread Lute", rarity: "Rare", effect: { type: "echoing", value: .08, label: "8% skill Echo turn progress" } },
    { base: "Loopglass Sabre", rarity: "Rare", effect: { type: "statusChance", value: .18, label: "+18% status application chance" } },
    { base: "Cinderbite Edge", rarity: "Epic", effect: { type: "afflictedDamage", value: .24, label: "+24% damage against afflicted targets" } },
    { base: "Astral Refrain", rarity: "Epic", effect: { type: "magicDamage", value: .22, label: "+22% magic damage" } }
  ],
  armour: [
    { base: "Ashcloak", rarity: "Common", effect: { type: "openingTurnProgress", value: .12, label: "+12% opening turn progress" } },
    { base: "Sootweave Coat", rarity: "Common", effect: { type: "statusDuration", value: 1, label: "inflicted statuses last +1 turn" } },
    { base: "Sootweave Coat", rarity: "Uncommon", effect: { type: "statusDuration", value: 1, label: "inflicted statuses last +1 turn" } },
    { base: "Reverie Mantle", rarity: "Uncommon", effect: { type: "statusResistance", status: "sleep", value: .25, label: "+25% Sleep resistance" } },
    { base: "Sealbreak Vestment", rarity: "Rare", effect: { type: "allStatusResistance", value: .18, label: "+18% resistance to all statuses" } },
    { base: "Roadwarden Plate", rarity: "Rare", effect: { type: "blockPower", value: .22, label: "22% stronger personal guard" } },
    { base: "Nightneedle Harness", rarity: "Epic", effect: { type: "statusOnHit", status: "sleep", value: .16, label: "16% chance to Sleep on hit" } },
    { base: "Dawnforged Aegis", rarity: "Epic", effect: { type: "buffDuration", value: 1, label: "defensive buffs last +1 turn" } }
  ],
  ring: [
    { base: "Promise Ring", rarity: "Common", effect: { type: "buffDuration", value: 1, label: "support buffs last +1 turn" } },
    { base: "Red Ember Band", rarity: "Common", effect: { type: "afflictedDamage", value: .14, label: "+14% damage against afflicted targets" } },
    { base: "Red Ember Band", rarity: "Uncommon", effect: { type: "afflictedDamage", value: .14, label: "+14% damage against afflicted targets" } },
    { base: "Rava's Guard Ring", rarity: "Uncommon", effect: { type: "blockPower", value: .18, label: "18% stronger personal guard" } },
    { base: "Faultline Signet", rarity: "Rare", effect: { type: "statusOnHit", status: "stun", value: .15, label: "15% chance to Stun on hit" } },
    { base: "Stonefather Gauntlet", rarity: "Rare", effect: { type: "hpOnHit", value: 6, label: "restore 6 HP after dealing damage" } },
    { base: "Songbound Rosin", rarity: "Epic", effect: { type: "echoing", value: .07, label: "7% skill Echo turn progress" } },
    { base: "Loopbreaker Ring", rarity: "Epic", effect: { type: "openingTurnProgress", value: .18, label: "+18% opening turn progress" } }
  ],
  necklace: [
    { base: "Cinder Star", rarity: "Common", effect: { type: "magicDamage", value: .1, label: "+10% magic damage" } },
    { base: "Veln Crest Token", rarity: "Common", effect: { type: "statusChance", value: .14, label: "+14% status application chance" } },
    { base: "Veln Crest Token", rarity: "Uncommon", effect: { type: "statusChance", value: .14, label: "+14% status application chance" } },
    { base: "Emberwell Chain", rarity: "Uncommon", effect: { type: "battleRegen", value: 16, label: "restore 16 HP after victory" } },
    { base: "Wyrmheart Ember", rarity: "Rare", effect: { type: "magicDamage", value: .18, label: "+18% magic damage" } },
    { base: "Silent Reliquary", rarity: "Rare", effect: { type: "mpOnHit", value: 4, label: "restore 4 MP after dealing damage" } },
    { base: "Hearthwall Crest", rarity: "Epic", effect: { type: "buffDuration", value: 1, label: "defensive buffs last +1 turn" } },
    { base: "Memory Chain", rarity: "Epic", effect: { type: "statusDuration", value: 1, label: "inflicted statuses last +1 turn" } }
  ],
  helmet: [
    { base: "Songweaver Hood", rarity: "Common", effect: { type: "openingResonance", value: 10, label: "+10 Resonance at battle start" } },
    { base: "Glimmer Goggles", rarity: "Common", effect: { type: "echoing", value: .05, label: "5% skill Echo turn progress" } },
    { base: "Mira Top Hat", rarity: "Uncommon", effect: { type: "statusOnHit", status: "sleep", value: .1, label: "10% chance to Sleep on hit" } },
    { base: "Stone Brow Guard", rarity: "Uncommon", effect: { type: "statusResistance", status: "stun", value: .25, label: "+25% Stun resistance" } },
    { base: "Local Truth Lens", rarity: "Rare", effect: { type: "statusChance", value: .2, label: "+20% status application chance" } },
    { base: "Fleetglass Circlet", rarity: "Rare", effect: { type: "openingTurnProgress", value: .16, label: "+16% opening turn progress" } },
    { base: "Impossible Lens", rarity: "Epic", effect: { type: "afflictedDamage", value: .22, label: "+22% damage against afflicted targets" } },
    { base: "Starless Visor", rarity: "Epic", effect: { type: "statusOnHit", status: "sleep", value: .18, label: "18% chance to Sleep on hit" } }
  ]
};

function nextGearRarity(rarity) {
  const order = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
  return order[Math.min(order.length - 1, Math.max(0, order.indexOf(rarity)) + 1)];
}

const echoForgeGear = Array.from({ length: 80 }, (_, index) => {
  const rank = Math.floor(index / 2) + 1;
  const variant = index % 2;
  const slot = echoForgeSlots[(rank - 1) % echoForgeSlots.length];
  const tier = Math.floor((rank - 1) / echoForgeSlots.length);
  const blueprint = echoForgeBlueprints[slot][(tier * 2 + variant) % echoForgeBlueprints[slot].length];
  const baseGear = gearByName(blueprint.base);
  const boost = 2 + tier + Math.floor(rank / 10);
  const stats = Object.fromEntries(Object.entries(baseGear.stats).map(([stat, value]) => [stat, value + boost]));
  const coreStat = { weapon: "str", armour: "stam", ring: "agi", necklace: "mag", helmet: "agi" }[slot];
  stats[coreStat] = (stats[coreStat] || 0) + 2 + tier;
  const inheritedEffects = gearEffects(baseGear).map(({ echoUnique, ...effect }) => ({ ...effect, label: `Inherited: ${effect.label}` }));
  const echoEffect = { ...blueprint.effect, echoUnique: true, label: `ECHO: ${blueprint.effect.label}` };
  const echoRarity = "Legendary";
  const name = variant === 0 ? `Echo-Forged ${slot[0].toUpperCase()}${slot.slice(1)} Mk ${rank}` : `Echo-Forged ${blueprint.base}${rank > 20 ? ` Mk ${rank}` : ""}`;
  return Object.assign(
    item(name, slot, stats, `A Legendary Echo upgrade of ${blueprint.base}, preserving its identity while opening a new build path at Echo Hunt rank ${rank}.`, [...inheritedEffects, echoEffect]),
    { echoRank: rank, echoBase: blueprint.base, echoRarity, echoVariant: variant, price: 420 + rank * 135 + variant * 70 + tier * 220 }
  );
});
echoForgeGear.forEach(gear => gearDb[gear.slot].push(gear));

const gearOwners = {
  "Voice of Verse": ["Verseborn", "Sparky"],
  "Twin Voidthorns": ["Mira"],
  "Klik-Wrench 7": ["Glimmer"],
  "Earth Shield": ["Seerin", "Torren"],
  "Staff & Sigil": ["Kael"],
  "Flameguard Plate": ["Seerin", "Torren"],
  "Workshop Coat": ["Glimmer", "Sparky"],
  "Stonewake Mantle": ["Torren"],
  "Veln Crest Token": ["Mira"],
  "Gearheart Charm": ["Glimmer", "Sparky"],
  "Songweaver Hood": ["Verseborn"],
  "Glimmer Goggles": ["Glimmer"],
  "Mira Top Hat": ["Mira"],
  "Second Verse Lute": ["Verseborn"],
  "Veln Eclipse Blades": ["Mira"],
  "Cinderstar Aegis": ["Seerin"],
  "Unbound Oathstaff": ["Kael"],
  "Worldroot Shield": ["Torren"],
  "Klik-Wrench Infinite": ["Glimmer"],
  "Elderflame Claws": ["Sparky"],
  "Echo-Thread Lute": ["Verseborn"],
  "Songbound Rosin": ["Verseborn"],
  "Nightneedle Harness": ["Mira"],
  "Hearthwall Crest": ["Seerin"],
  "Silent Reliquary": ["Kael"],
  "Stonefather Gauntlet": ["Torren"],
  "Impossible Lens": ["Glimmer"],
  "Elder Ember Bell": ["Sparky"]
};

const ngPlusSignatureNames = new Set([
  "Second Verse Lute", "Veln Eclipse Blades", "Cinderstar Aegis", "Unbound Oathstaff",
  "Worldroot Shield", "Klik-Wrench Infinite", "Elderflame Claws"
]);

function mythicItem(name, slot, stats, desc, effect, mythicSet = null) {
  return { ...item(name, slot, stats, desc, effect), mythicSet };
}

const HALL_MYTHIC_LOOT_TABLES = {
  41: [
    mythicItem("Riotbrand Maul", "weapon", { str: 17, stam: 9, agi: 5 }, "A scorched uprising-club reforged from Ash Quarter tools and broken levy chains.", [
      { type: "physicalDamage", value: .18, label: "+18% physical damage" },
      { type: "statusOnHit", status: "stun", value: .16, label: "16% chance to Stun on hit" }
    ], "ashenInsurrection"),
    mythicItem("Ash Quarter Bulwark", "armour", { stam: 17, str: 8, agi: 4 }, "Soot-black protection hammered together by the crowd that refused to kneel.", [
      { type: "blockPower", value: .28, label: "28% stronger personal guard" },
      { type: "statusResistance", status: "stun", value: .35, label: "+35% Stun resistance" }
    ], "ashenInsurrection"),
    mythicItem("Gnomefire Seal", "ring", { str: 9, mag: 8, agi: 8 }, "A tiny riot-sign that still radiates the impossible confidence of an angry crowd.", [
      { type: "statusChance", value: .18, label: "+18% status application chance" },
      { type: "critChance", value: .1, label: "+10% critical chance" }
    ], "ashenInsurrection"),
    mythicItem("Sootline Chain", "necklace", { stam: 10, agi: 9, mag: 7 }, "A broken chain threaded with bells, lock teeth and the names of the Sootline rebels.", [
      { type: "hpOnHit", value: 7, label: "Restore 7 HP after dealing damage" },
      { type: "openingTurnProgress", value: .16, label: "+16% opening turn progress" }
    ])
  ],
  42: [
    mythicItem("Interdict Crozier", "weapon", { mag: 17, stam: 8, echo: 6 }, "A forbidden Reverie focus whose sealed pages answer only to disobedient magic.", [
      { type: "magicDamage", value: .2, label: "+20% magic damage" },
      { type: "statusOnHit", status: "sleep", value: .17, label: "17% chance to Sleep on hit" }
    ], "forbiddenMargin"),
    mythicItem("Archive Veil", "armour", { stam: 16, mag: 9, agi: 5 }, "Custodian cloth layered with erased commands and the shadows left in their margins.", [
      { type: "allStatusResistance", value: .22, label: "+22% resistance to all statuses" },
      { type: "buffDuration", value: 1, label: "Buffs last +1 turn" }
    ]),
    mythicItem("Margin of Silence", "ring", { mag: 10, agi: 9, echo: 6 }, "Nyx wrote one final correction into this black-edged archive ring.", [
      { type: "statusChance", value: .2, label: "+20% status application chance" },
      { type: "afflictedDamage", value: .18, label: "+18% damage against afflicted targets" }
    ], "forbiddenMargin"),
    mythicItem("Custodian's Last Circlet", "helmet", { mag: 12, stam: 9, agi: 6 }, "The final key to an archive that no longer accepts ordained truth.", [
      { type: "statusResistance", status: "sleep", value: .5, label: "+50% Sleep resistance" },
      { type: "weaknessDamage", value: .24, label: "+24% weakness damage" }
    ], "forbiddenMargin")
  ],
  43: [
    mythicItem("Worldsplitter Axe", "weapon", { str: 18, stam: 9, agi: 5 }, "Grumm's trial-force and Kaeldrin's verdict meet in one mountain-breaking edge.", [
      { type: "physicalDamage", value: .21, label: "+21% physical damage" },
      { type: "critChance", value: .08, label: "+8% critical chance" }
    ], "stonewakeCrown"),
    mythicItem("Stonewake Crownplate", "armour", { stam: 18, str: 8, echo: 4 }, "Royal plate remade to carry Stonewake weight without bowing beneath it.", [
      { type: "blockPower", value: .32, label: "32% stronger personal guard" },
      { type: "statusResistance", status: "stun", value: .45, label: "+45% Stun resistance" }
    ], "stonewakeCrown"),
    mythicItem("King's Faultline Torque", "necklace", { str: 9, stam: 10, mag: 7 }, "A cracked royal torque that points unerringly toward the next break in the line.", [
      { type: "weaknessDamage", value: .26, label: "+26% weakness damage" },
      { type: "hpOnHit", value: 7, label: "Restore 7 HP after dealing damage" }
    ], "stonewakeCrown"),
    mythicItem("Spellbinder Bastion", "helmet", { mag: 10, stam: 10, agi: 7 }, "Lysra's ward geometry shaped into a helm that refuses both spell and stone.", [
      { type: "magicDamage", value: .17, label: "+17% magic damage" },
      { type: "allStatusResistance", value: .2, label: "+20% resistance to all statuses" }
    ])
  ],
  44: [
    mythicItem("Midnight Chime Cannon", "weapon", { mag: 16, agi: 10, str: 6 }, "A Clock Goblin bell and False Dawn lock rebuilt into a weapon that fires on the thirteenth chime.", [
      { type: "magicDamage", value: .2, label: "+20% magic damage" },
      { type: "statusOnHit", status: "stun", value: .18, label: "18% chance to Stun on hit" }
    ], "clockworkRiot"),
    mythicItem("Riot Clockwork Band", "ring", { agi: 10, mag: 9, str: 6 }, "Its gears accelerate whenever order begins to look too comfortable.", [
      { type: "openingTurnProgress", value: .2, label: "+20% opening turn progress" },
      { type: "critChance", value: .11, label: "+11% critical chance" }
    ], "clockworkRiot"),
    mythicItem("Lockbreaker Pendant", "necklace", { str: 9, mag: 9, agi: 8 }, "A Dawn Station master key snapped at exactly the right moment.", [
      { type: "statusChance", value: .2, label: "+20% status application chance" },
      { type: "mpOnHit", value: 6, label: "Restore 6 MP after dealing damage" }
    ]),
    mythicItem("Tibby's Grandmaster Goggles", "helmet", { mag: 11, agi: 10, echo: 6 }, "Tibby insists every lens is calibrated. None agree on what time it is.", [
      { type: "echoing", value: .08, label: "8% skill Echo turn progress" },
      { type: "weaknessDamage", value: .25, label: "+25% weakness damage" }
    ], "clockworkRiot")
  ],
  45: [
    mythicItem("Blimpstone Banquet Coat", "armour", { stam: 16, mag: 8, agi: 5 }, "Berend's formal kitchen whites, reinforced for a dinner service that became a siege.", [
      { type: "battleRegen", value: 32, label: "Restore 32 HP after victory" },
      { type: "allStatusResistance", value: .18, label: "+18% resistance to all statuses" }
    ], "tavernRefrain"),
    mythicItem("Last Call Signet", "ring", { str: 9, agi: 9, stam: 7 }, "Marla's last-call knock captured in a ring heavy enough to end an argument.", [
      { type: "critChance", value: .12, label: "+12% critical chance" },
      { type: "statusOnHit", status: "stun", value: .16, label: "16% chance to Stun on hit" }
    ]),
    mythicItem("Bellwick Encore Locket", "necklace", { mag: 10, agi: 9, echo: 7 }, "Jory's encore keeps playing after the room, and occasionally causality, has gone quiet.", [
      { type: "openingResonance", value: 24, label: "+24 Resonance at battle start" },
      { type: "buffDuration", value: 1, label: "Buffs last +1 turn" }
    ], "tavernRefrain"),
    mythicItem("Marla's Lantern Crown", "helmet", { str: 10, stam: 9, agi: 8 }, "A practical crown made from tavern brass, lampglass and unapologetic authority.", [
      { type: "openingTurnProgress", value: .18, label: "+18% opening turn progress" },
      { type: "afflictedDamage", value: .2, label: "+20% damage against afflicted targets" }
    ], "tavernRefrain")
  ],
  46: [
    mythicItem("Cindralis Edictblade", "weapon", { str: 15, mag: 10, agi: 7 }, "Prince Lucan's decree translated from courtly script into a decisive edge.", [
      { type: "physicalDamage", value: .17, label: "+17% physical damage" },
      { type: "magicDamage", value: .17, label: "+17% magic damage" }
    ], "royalDecree"),
    mythicItem("Nullcourt Regalia", "armour", { stam: 16, mag: 9, agi: 5 }, "Court regalia lined with nullscript so no command can own the wearer twice.", [
      { type: "allStatusResistance", value: .24, label: "+24% resistance to all statuses" },
      { type: "statusDurationReduction", value: 1, label: "Negative statuses last -1 turn" }
    ]),
    mythicItem("Prince's Unbroken Seal", "ring", { mag: 10, agi: 8, echo: 7 }, "A royal seal that survived the wyrm, the null field and its own succession.", [
      { type: "statusChance", value: .22, label: "+22% status application chance" },
      { type: "openingResonance", value: 22, label: "+22 Resonance at battle start" }
    ], "royalDecree"),
    mythicItem("Crown Decree Chain", "necklace", { mag: 9, stam: 10, echo: 7 }, "Every link bears a different clause; together they reject the old crown's final order.", [
      { type: "mpOnHit", value: 6, label: "Restore 6 MP after dealing damage" },
      { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn" }
    ], "royalDecree")
  ],
  47: [
    mythicItem("Red Memory Halberd", "weapon", { str: 16, mag: 9, stam: 7 }, "The Old Guard's remembered flame burns along a blade rimed with wyrm-frost.", [
      { type: "physicalDamage", value: .19, label: "+19% physical damage" },
      { type: "weaknessDamage", value: .25, label: "+25% weakness damage" }
    ], "frostburnGuard"),
    mythicItem("Sentinel Emberplate", "armour", { stam: 18, str: 7, mag: 5 }, "Last Gate plating reheated in Elder flame until frost and command both cracked.", [
      { type: "blockPower", value: .34, label: "34% stronger personal guard" },
      { type: "allStatusResistance", value: .2, label: "+20% resistance to all statuses" }
    ], "frostburnGuard"),
    mythicItem("Frostburn Signet", "ring", { str: 8, mag: 8, stam: 9 }, "Blue ice and red ember orbit without agreeing which one should melt.", [
      { type: "statusOnHit", status: "stun", value: .17, label: "17% chance to Stun on hit" },
      { type: "statusResistance", status: "stun", value: .4, label: "+40% Stun resistance" }
    ]),
    mythicItem("Tja's Winterflame Crown", "helmet", { mag: 12, agi: 8, stam: 7 }, "Tja's immaculate frostwork framed by an older, considerably less polite fire.", [
      { type: "magicDamage", value: .2, label: "+20% magic damage" },
      { type: "openingTurnProgress", value: .18, label: "+18% opening turn progress" }
    ], "frostburnGuard")
  ],
  48: [
    mythicItem("Unwritten Quillblade", "weapon", { mag: 16, agi: 10, echo: 6 }, "A black archive quill sharpened on every name the nullscript failed to erase.", [
      { type: "magicDamage", value: .2, label: "+20% magic damage" },
      { type: "afflictedDamage", value: .21, label: "+21% damage against afflicted targets" }
    ], "unwrittenNames"),
    mythicItem("Vael's Black Index", "armour", { stam: 15, mag: 10, agi: 5 }, "Nyx's living index sewn into a mantle; every page turns before the spell arrives.", [
      { type: "allStatusResistance", value: .21, label: "+21% resistance to all statuses" },
      { type: "buffDuration", value: 1, label: "Buffs last +1 turn" }
    ], "unwrittenNames"),
    mythicItem("Nameless Archive Chain", "necklace", { mag: 11, stam: 8, agi: 7 }, "A chain of blank nameplates that remembers exactly who wore it.", [
      { type: "echoing", value: .08, label: "8% skill Echo turn progress" },
      { type: "mpOnHit", value: 6, label: "Restore 6 MP after dealing damage" }
    ], "unwrittenNames"),
    mythicItem("Nullscript Halo", "helmet", { mag: 12, agi: 9, echo: 6 }, "A halo of rejected commands orbiting the one mind they cannot catalogue.", [
      { type: "statusChance", value: .21, label: "+21% status application chance" },
      { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn" }
    ])
  ],
  49: [
    mythicItem("Reprise Company Mantle", "armour", { stam: 16, mag: 8, agi: 5 }, "One mantle carrying traces of every fighter who answered the Company's reprise.", [
      { type: "allStatusResistance", value: .22, label: "+22% resistance to all statuses" },
      { type: "buffDuration", value: 1, label: "Buffs last +1 turn" }
    ], "companyReprise"),
    mythicItem("Hall of Names Signet", "ring", { str: 9, mag: 8, agi: 8 }, "Nine names circle its face; the tenth appears only when the wearer commits.", [
      { type: "critChance", value: .12, label: "+12% critical chance" },
      { type: "afflictedDamage", value: .2, label: "+20% damage against afflicted targets" }
    ], "companyReprise"),
    mythicItem("Final Company Medallion", "necklace", { stam: 10, mag: 9, echo: 7 }, "A shared commendation for surviving a company that refuses to stay in one timeline.", [
      { type: "openingResonance", value: 26, label: "+26 Resonance at battle start" },
      { type: "hpOnHit", value: 7, label: "Restore 7 HP after dealing damage" }
    ], "companyReprise"),
    mythicItem("Reprise Command Crown", "helmet", { str: 9, mag: 9, stam: 9 }, "Maeric's authority, Marla's resolve and Rava's fire without any of their patience.", [
      { type: "weaknessDamage", value: .27, label: "+27% weakness damage" },
      { type: "blockPower", value: .22, label: "22% stronger personal guard" }
    ])
  ],
  50: [
    mythicItem("Solinar's Frostfire Greatsword", "weapon", { str: 15, mag: 12, echo: 6 }, "Solinar's final sunrise held between Frostmile ice and Leviathan flame.", [
      { type: "physicalDamage", value: .18, label: "+18% physical damage" },
      { type: "magicDamage", value: .18, label: "+18% magic damage" }
    ], "finalSunrise"),
    mythicItem("Eclipse of Solinar", "ring", { str: 9, mag: 9, echo: 7 }, "A dark solar ring formed at the instant Solinar's two inherited powers collided.", [
      { type: "critChance", value: .12, label: "+12% critical chance" },
      { type: "openingResonance", value: 28, label: "+28 Resonance at battle start" }
    ], "finalSunrise"),
    mythicItem("Confluence Heart", "necklace", { mag: 11, stam: 9, echo: 6 }, "The stable center where Ember Leviathan heat and Frostmile cold become one pulse.", [
      { type: "mpOnHit", value: 7, label: "Restore 7 MP after dealing damage" },
      { type: "allStatusResistance", value: .22, label: "+22% resistance to all statuses" }
    ]),
    mythicItem("Final Sunrise Crown", "helmet", { mag: 12, stam: 9, echo: 6 }, "The crown Solinar wears only after the false boundary between winter and flame burns away.", [
      { type: "weaknessDamage", value: .3, label: "+30% weakness damage" },
      { type: "echoing", value: .08, label: "8% skill Echo turn progress" }
    ], "finalSunrise")
  ]
};

const MYTHIC_GEAR = Object.values(HALL_MYTHIC_LOOT_TABLES).flat();
const mythicGearNames = new Set(MYTHIC_GEAR.map(gear => gear.name));
MYTHIC_GEAR.forEach(gear => gearDb[gear.slot].push(gear));

const MYTHIC_SETS = {
  ashenInsurrection: { name: "Ashen Insurrection", pieces: ["Riotbrand Maul", "Ash Quarter Bulwark", "Gnomefire Seal"], bonus: { type: "statusOnHit", status: "stun", value: .1, label: "10% additional chance to Stun on hit" } },
  forbiddenMargin: { name: "Forbidden Margin", pieces: ["Interdict Crozier", "Margin of Silence", "Custodian's Last Circlet"], bonus: { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn" } },
  stonewakeCrown: { name: "Stonewake Crown", pieces: ["Worldsplitter Axe", "Stonewake Crownplate", "King's Faultline Torque"], bonus: { type: "physicalDamage", value: .12, label: "+12% physical damage" } },
  clockworkRiot: { name: "Clockwork Riot", pieces: ["Midnight Chime Cannon", "Riot Clockwork Band", "Tibby's Grandmaster Goggles"], bonus: { type: "openingTurnProgress", value: .2, label: "+20% opening turn progress" } },
  tavernRefrain: { name: "Tavern Refrain", pieces: ["Blimpstone Banquet Coat", "Bellwick Encore Locket", "Marla's Lantern Crown"], bonus: { type: "openingResonance", value: 25, label: "+25 Resonance at battle start" } },
  royalDecree: { name: "Royal Decree", pieces: ["Cindralis Edictblade", "Prince's Unbroken Seal", "Crown Decree Chain"], bonus: { type: "statusChance", value: .22, label: "+22% status application chance" } },
  frostburnGuard: { name: "Frostburn Old Guard", pieces: ["Red Memory Halberd", "Sentinel Emberplate", "Tja's Winterflame Crown"], bonus: { type: "blockPower", value: .18, label: "18% stronger personal guard" } },
  unwrittenNames: { name: "Unwritten Names", pieces: ["Unwritten Quillblade", "Vael's Black Index", "Nameless Archive Chain"], bonus: { type: "echoing", value: .08, label: "8% skill Echo turn progress" } },
  companyReprise: { name: "Company Reprise", pieces: ["Reprise Company Mantle", "Hall of Names Signet", "Final Company Medallion"], bonus: { type: "afflictedDamage", value: .2, label: "+20% damage against afflicted targets" } },
  finalSunrise: { name: "Final Sunrise", pieces: ["Solinar's Frostfire Greatsword", "Eclipse of Solinar", "Final Sunrise Crown"], bonus: { type: "weaknessDamage", value: .25, label: "+25% weakness damage" } }
};

const HALL_MYTHIC_THEMES = { 41: "mountain", 42: "ruins", 43: "mountain", 44: "ruins", 45: "dragon", 46: "ruins", 47: "dragon", 48: "ruins", 49: "mountain", 50: "dragon" };
const HALL_LEGENDARY_STAGE = 20;
const HALL_MYTHIC_STAGE = 41;

const HALL_RARE_GEAR_POOL = [
  item("Ironwood Staff", "weapon", { mag: 4, stam: 2 }, "A dependable ashwood focus reinforced with iron bands."),
  item("Embersteel Dagger", "weapon", { str: 3, agi: 3 }, "A practical Hall blade that keeps a steady edge."),
  item("Ashen Cloak", "armour", { stam: 4, agi: 2 }, "A soot-dark travel cloak lined for sparks and cold corridors."),
  item("Reinforced Buckler", "armour", { stam: 5, str: 1 }, "A compact field guard repaired at the Ember Hall forge."),
  item("Copper Sigil Ring", "ring", { mag: 3, stam: 2 }, "A plain copper band stamped with a reliable ward."),
  item("Sootline Band", "ring", { str: 2, agi: 3 }, "A workmanlike ring worn by Ash Quarter patrols."),
  item("Lantern Chain", "necklace", { mag: 3, stam: 3 }, "A sturdy brass chain carrying a small Hall lantern token."),
  item("Embercord Pendant", "necklace", { str: 2, mag: 2, agi: 2 }, "A braided field charm used by junior Flameguard."),
  item("Sootguard Helm", "helmet", { stam: 4, agi: 2 }, "A serviceable helm with a smoke-darkened brow plate."),
  item("Copperglass Visor", "helmet", { mag: 3, agi: 3 }, "A practical lens for reading movement through ash and glare.")
];

const HALL_EPIC_GEAR_POOL = [
  item("Cinderwake Spear", "weapon", { str: 7, mag: 4, agi: 2 }, "An ember-channelled spear made for decisive Hall trials.", { type: "statusOnHit", status: "stun", value: .1, label: "10% chance to Stun on hit" }),
  item("Reverie Prism Staff", "weapon", { mag: 8, agi: 3, stam: 2 }, "A many-faceted focus that turns remembered spells into clean light.", { type: "magicDamage", value: .1, label: "+10% magic damage" }),
  item("Emberguard Mantle", "armour", { stam: 8, str: 3, mag: 2 }, "Layered Hall armour carrying a controlled inner warmth.", { type: "blockPower", value: .16, label: "16% stronger personal guard" }),
  item("Riftstitch Coat", "armour", { stam: 6, mag: 5, agi: 3 }, "Reverie thread closes around impacts before the tear can spread.", { type: "allStatusResistance", value: .1, label: "+10% resistance to all statuses" }),
  item("Moonfire Signet", "ring", { mag: 5, agi: 5, stam: 2 }, "A silver signet whose pale flame brightens near a weakness.", { type: "weaknessDamage", value: .16, label: "+16% weakness damage" }),
  item("Faultspark Ring", "ring", { str: 5, stam: 4, agi: 3 }, "A Stonewake spark sealed inside a precisely cracked band.", { type: "weaknessDamage", value: .12, label: "+12% weakness damage" }),
  item("Stormglass Torque", "necklace", { mag: 6, agi: 5, stam: 2 }, "Charged glass stores a little momentum from every clean strike.", { type: "mpOnHit", value: 3, label: "Restore 3 MP after dealing damage" }),
  item("Hearthsong Locket", "necklace", { mag: 5, stam: 5, echo: 2 }, "A warm refrain answers after the trial falls quiet.", { type: "battleRegen", value: 14, label: "Restore 14 HP after victory" }),
  item("Dawnwatch Circlet", "helmet", { mag: 6, agi: 5, stam: 2 }, "A bright Hall circlet tuned to the first opening in a fight.", { type: "openingTurnProgress", value: .1, label: "+10% opening turn progress" }),
  item("Ashseer Hood", "helmet", { agi: 6, mag: 4, stam: 3 }, "A fine dark hood whose inner lens follows afflicted targets.", { type: "afflictedDamage", value: .12, label: "+12% damage against afflicted targets" })
];

const HALL_LEGENDARY_GEAR_POOL = [
  item("Oathblade of the First Flame", "weapon", { str: 12, mag: 7, agi: 4 }, "The named blade carried by the first captain to clear Ember Hall.", [{ type: "physicalDamage", value: .16, label: "+16% physical damage" }, { type: "openingResonance", value: 16, label: "+16 Resonance at battle start" }]),
  item("Star-Scribe's Crozier", "weapon", { mag: 13, agi: 5, echo: 3 }, "A celebrated Reverie relic whose constellations rewrite hostile magic.", [{ type: "magicDamage", value: .16, label: "+16% magic damage" }, { type: "statusChance", value: .14, label: "+14% status application chance" }]),
  item("Bastion of Cinderhall", "armour", { stam: 14, str: 5, mag: 3 }, "The ceremonial plate that held the Hall's western gate through the Long Ash.", [{ type: "blockPower", value: .26, label: "26% stronger personal guard" }, { type: "allStatusResistance", value: .16, label: "+16% resistance to all statuses" }]),
  item("Veil of the Last Archivist", "armour", { stam: 11, mag: 8, agi: 4 }, "A prestigious archive mantle preserved after its final keeper vanished.", [{ type: "buffDuration", value: 1, label: "Buffs last +1 turn" }, { type: "statusResistance", status: "sleep", value: .4, label: "+40% Sleep resistance" }]),
  item("Rava's Crownless Signet", "ring", { str: 8, agi: 8, stam: 4 }, "A famous rebel seal awarded only to those who hold without kneeling.", [{ type: "critChance", value: .1, label: "+10% critical chance" }, { type: "statusChance", value: .16, label: "+16% status application chance" }]),
  item("Nyx's Unwritten Seal", "ring", { mag: 9, agi: 7, echo: 4 }, "A named black seal omitted from every obedient version of the archive.", [{ type: "afflictedDamage", value: .2, label: "+20% damage against afflicted targets" }, { type: "statusDuration", value: 1, label: "Inflicted statuses last +1 turn" }]),
  item("Chain of Seven Lanterns", "necklace", { mag: 8, stam: 8, agi: 4 }, "Seven honoured Hall lanterns burn in miniature along this storied chain.", [{ type: "openingResonance", value: 22, label: "+22 Resonance at battle start" }, { type: "battleRegen", value: 22, label: "Restore 22 HP after victory" }]),
  item("Stonewake King's Torque", "necklace", { str: 8, stam: 10, mag: 3 }, "A royal Stonewake torque whose weight became a symbol of earned command.", [{ type: "hpOnHit", value: 6, label: "Restore 6 HP after dealing damage" }, { type: "weaknessDamage", value: .22, label: "+22% weakness damage" }]),
  item("Crown of the Ember Vigil", "helmet", { mag: 9, agi: 8, stam: 5 }, "The named watch-crown worn through the Hall's longest night.", [{ type: "openingTurnProgress", value: .16, label: "+16% opening turn progress" }, { type: "allStatusResistance", value: .14, label: "+14% resistance to all statuses" }]),
  item("Helm of the Worldroot", "helmet", { stam: 11, str: 7, agi: 3 }, "A legendary Stonekin helm said to carry the patience of the mountain.", [{ type: "statusResistance", status: "stun", value: .5, label: "+50% Stun resistance" }, { type: "blockPower", value: .22, label: "22% stronger personal guard" }])
];

const HALL_ARTIFACT_GEAR = [
  item("The Unwritten Door", "weapon", { mag: 19, agi: 11, echo: 8 }, "A key-shaped focus that closes the route between hostile intent and gathered Resonance.", [
    { type: "statusChance", value: .3, label: "Threshold Dominion: +30% status application chance", artifactUnique: true },
    { type: "mpOnHit", value: 10, label: "Restore 10 MP after dealing damage" }
  ]),
  item("Cinderwinter Paradox", "weapon", { str: 17, mag: 17, stam: 7 }, "Frost and ember share one edge without agreeing which of them is real.", [
    { type: "physicalDamage", value: .25, label: "Frostfire Confluence: +25% physical damage", artifactUnique: true },
    { type: "magicDamage", value: .25, label: "+25% magic damage" },
    { type: "weaknessDamage", value: .2, label: "+20% weakness damage" }
  ]),
  item("Clockless Carapace", "armour", { stam: 20, agi: 11, echo: 6 }, "Its wearer arrives before the mechanism decides the battle has begun.", [
    { type: "openingTurnProgress", value: .35, label: "Outside the Clock: +35% opening turn progress", artifactUnique: true },
    { type: "allStatusResistance", value: .3, label: "+30% resistance to all statuses" },
    { type: "statusDurationReduction", value: 1, label: "Negative statuses last -1 turn" }
  ]),
  item("Mantle of the Second Heart", "armour", { stam: 19, mag: 11, str: 7 }, "A quiet pulse answers every successful strike and keeps protective magic alive.", [
    { type: "hpOnHit", value: 12, label: "Second Pulse: restore 12 HP after dealing damage", artifactUnique: true },
    { type: "buffDuration", value: 2, label: "Buffs last +2 turns" },
    { type: "blockPower", value: .3, label: "30% stronger personal guard" }
  ]),
  item("Oath Without Witness", "ring", { str: 11, mag: 11, stam: 8 }, "A promise that lengthens every blessing and every curse without asking who spoke it.", [
    { type: "statusDuration", value: 2, label: "Unending Oath: inflicted statuses last +2 turns", artifactUnique: true },
    { type: "buffDuration", value: 2, label: "Buffs last +2 turns" },
    { type: "statusChance", value: .2, label: "+20% status application chance" }
  ]),
  item("Riotglass Loop", "ring", { agi: 14, str: 8, mag: 8 }, "The loop catches a decisive instant and throws it back into the turn order.", [
    { type: "echoing", value: .15, label: "Riotglass Reprise: 15% skill Echo turn progress", artifactUnique: true },
    { type: "critChance", value: .18, label: "+18% critical chance" },
    { type: "openingTurnProgress", value: .2, label: "+20% opening turn progress" }
  ]),
  item("Choir of One", "necklace", { mag: 14, echo: 10, stam: 7 }, "One voice becomes an opening chorus, then feeds on every note that lands.", [
    { type: "openingResonance", value: 40, label: "Opening Chorus: +40 Resonance at battle start", artifactUnique: true },
    { type: "mpOnHit", value: 8, label: "Restore 8 MP after dealing damage" },
    { type: "echoing", value: .1, label: "10% skill Echo turn progress" }
  ]),
  item("Worldroot's Loose Stone", "necklace", { stam: 15, str: 11, mag: 6 }, "A fragment that makes guarded blows feel heavier at the enemy's foundation.", [
    { type: "physicalDamage", value: .2, label: "Worldroot Fracture: +20% physical damage", artifactUnique: true },
    { type: "blockPower", value: .4, label: "40% stronger personal guard" },
    { type: "hpOnHit", value: 8, label: "Restore 8 HP after dealing damage" }
  ]),
  item("Lens Beyond Dawn", "helmet", { mag: 14, agi: 14, echo: 7 }, "It sees the weakness inside a wound and the wound inside a weakness.", [
    { type: "weaknessDamage", value: .4, label: "Dawnless Sight: +40% weakness damage", artifactUnique: true },
    { type: "afflictedDamage", value: .3, label: "+30% damage against afflicted targets" },
    { type: "statusChance", value: .15, label: "+15% status application chance" }
  ]),
  item("Crown of the Last Door", "helmet", { stam: 14, mag: 13, agi: 9 }, "The final threshold protects its bearer while opening the battle on their terms.", [
    { type: "allStatusResistance", value: .35, label: "Final Threshold: +35% resistance to all statuses", artifactUnique: true },
    { type: "openingTurnProgress", value: .25, label: "+25% opening turn progress" },
    { type: "openingResonance", value: 30, label: "+30 Resonance at battle start" }
  ])
];
const artifactGearNames = new Set(HALL_ARTIFACT_GEAR.map(gear => gear.name));

[...HALL_RARE_GEAR_POOL, ...HALL_EPIC_GEAR_POOL, ...HALL_LEGENDARY_GEAR_POOL, ...HALL_ARTIFACT_GEAR].forEach(gear => gearDb[gear.slot].push(gear));

const generalDropGear = new Set([
  ...rareGear.filter(gear => gear.name !== "Echo-Thread Lute"),
  ...questGear,
  ...chestGear,
  ...postgameGear,
  ...ngPlusChestGear,
  ...ngPlusGear.filter(gear => !ngPlusSignatureNames.has(gear.name))
].map(gear => gear.name));
const postgameGearNames = new Set(postgameGear.map(gear => gear.name));
const ngPlusGearNames = new Set(ngPlusGear.map(gear => gear.name));
const ngPlusChestGearNames = new Set(ngPlusChestGear.map(gear => gear.name));
const echoForgeGearNames = new Set(echoForgeGear.map(gear => gear.name));

function gearInstance(ref) {
  return typeof ref === "string" ? gearInstances[ref] || null : null;
}

function gearBaseName(ref) {
  return gearInstance(ref)?.name || ref;
}

function echoGearInstanceRefs(name) {
  const baseName = gearBaseName(name);
  return Object.values(gearInstances)
    .filter(instance => instance?.name === baseName)
    .sort((a, b) => (a.copyNumber || 0) - (b.copyNumber || 0) || (a.serial || 0) - (b.serial || 0))
    .map(instance => instance.id);
}

function gearDisplayName(ref) {
  const instance = gearInstance(ref);
  return instance ? `${instance.name} #${instance.copyNumber || 1}` : ref;
}

function gearAffixSignature(entries) {
  return (entries || []).map(entry => `${entry.key}:${entry.value}`).sort().join("|");
}

function createEchoGearInstance(name, options = {}) {
  const baseName = gearBaseName(name);
  const gear = Object.values(gearDb).flat().find(entry => entry.name === baseName);
  if (!gear || !echoForgeGearNames.has(baseName) && !options.allowAny) return null;
  state.nextGearInstance = Math.max(1, Number(state.nextGearInstance) || 1);
  let serial = state.nextGearInstance++;
  const prefix = echoForgeGearNames.has(baseName) ? "echo" : "hall";
  let id = `${prefix}_${serial}`;
  while (gearInstances[id]) {
    serial = state.nextGearInstance++;
    id = `${prefix}_${serial}`;
  }
  const siblings = echoGearInstanceRefs(baseName).map(ref => gearInstance(ref));
  const copyNumber = Math.max(0, ...siblings.map(instance => Number(instance?.copyNumber) || 0)) + 1;
  const rarity = options.rarity || defaultGearRarity(baseName);
  let affixes = Array.isArray(options.affixes) ? options.affixes.map(entry => ({ ...entry })) : [];
  if (!Array.isArray(options.affixes) && options.rollAffixes !== false) {
    const existingSignatures = new Set(siblings.map(instance => gearAffixSignature(instance?.affixes)));
    for (let attempt = 0; attempt < 16; attempt++) {
      affixes = rollGearAffixes(gear, rarity);
      if (!existingSignatures.has(gearAffixSignature(affixes))) break;
    }
  }
  gearInstances[id] = {
    id,
    serial,
    copyNumber,
    name: baseName,
    rarity,
    affixes,
    ...(options.stats && typeof options.stats === "object" ? { stats: { ...options.stats } } : {})
  };
  state.gearInstances = gearInstances;
  return id;
}

function syncEchoForgeCopies(name) {
  const baseName = gearBaseName(name);
  const count = echoGearInstanceRefs(baseName).length;
  state.gearCopies[baseName] = count;
  if (count > 0 && !state.ownedGear.includes(baseName)) state.ownedGear.push(baseName);
  if (!count) state.ownedGear = state.ownedGear.filter(ownedName => ownedName !== baseName);
  return count;
}

function migrateGearToSeparateCopies(name) {
  const baseName = gearBaseName(name);
  let refs = echoGearInstanceRefs(baseName);
  if (refs.length) return refs;
  const legacyCount = Number(state.gearCopies[baseName]) || (state.ownedGear.includes(baseName) ? 1 : 0);
  if (!legacyCount) return refs;
  const holders = Object.values(baseJobs).filter(hero => Object.values(hero.gear || {}).includes(baseName));
  for (let index = 0; index < legacyCount; index++) {
    const preserveRoll = index === 0 && Array.isArray(state.gearAffixes[baseName]);
    createEchoGearInstance(baseName, {
      allowAny: true,
      rarity: state.gearRarities[baseName] || defaultGearRarity(baseName),
      affixes: preserveRoll ? state.gearAffixes[baseName] : undefined,
      rollAffixes: true
    });
  }
  refs = echoGearInstanceRefs(baseName);
  holders.forEach((hero, index) => {
    Object.keys(hero.gear).forEach(slot => {
      if (hero.gear[slot] === baseName) hero.gear[slot] = refs[index] || refs[0];
    });
  });
  syncEchoForgeCopies(baseName);
  return refs;
}

function migrateEchoForgeInstances() {
  state.gearInstances ||= {};
  gearInstances = state.gearInstances;
  const highestSerial = Math.max(0, ...Object.values(gearInstances).map(instance => Number(instance?.serial) || Number(String(instance?.id || "").replace(/^echo_/, "")) || 0));
  state.nextGearInstance = Math.max(highestSerial + 1, Number(state.nextGearInstance) || 1);
  const equippedRefs = Object.values(baseJobs).flatMap(hero => Object.values(hero.gear || {})).filter(Boolean);
  const names = new Set([
    ...state.ownedGear.filter(name => echoForgeGearNames.has(gearBaseName(name))).map(gearBaseName),
    ...equippedRefs.filter(ref => echoForgeGearNames.has(gearBaseName(ref))).map(gearBaseName)
  ]);
  names.forEach(name => {
    if (!state.ownedGear.includes(name)) state.ownedGear.push(name);
    const legacyCount = Math.max(1, Number(state.gearCopies[name]) || 1);
    const directHolders = Object.values(baseJobs).filter(hero => Object.values(hero.gear || {}).includes(name));
    const desiredCount = Math.max(legacyCount, directHolders.length);
    let refs = echoGearInstanceRefs(name);
    while (refs.length < desiredCount) {
      const preserveLegacyRoll = refs.length === 0 && Array.isArray(state.gearAffixes[name]);
      createEchoGearInstance(name, {
        rarity: state.gearRarities[name] || defaultGearRarity(name),
        affixes: preserveLegacyRoll ? state.gearAffixes[name] : undefined,
        rollAffixes: true
      });
      refs = echoGearInstanceRefs(name);
    }
    const used = new Set(equippedRefs.filter(ref => gearInstance(ref)?.name === name));
    directHolders.forEach(hero => {
      Object.keys(hero.gear).forEach(slot => {
        if (hero.gear[slot] !== name) return;
        const ref = refs.find(candidate => !used.has(candidate)) || refs[0];
        hero.gear[slot] = ref;
        used.add(ref);
      });
    });
    syncEchoForgeCopies(name);
  });
}

function mythicMigrationTarget(slot, seed, offset = 0) {
  const candidates = MYTHIC_GEAR.filter(gear => gear.slot === slot);
  if (!candidates.length) return null;
  let hash = 0;
  for (const character of String(seed || slot)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return candidates[(hash + offset) % candidates.length];
}

function migratePlatinumGear() {
  state.gearInstances ||= {};
  gearInstances = state.gearInstances;
  const legacyRarity = "Platinum";
  const sourceNamesWithInstances = new Set();
  const touchedSourceNames = new Set();
  const touchedMythicNames = new Set();

  Object.values(gearInstances).forEach(instance => {
    if (!instance?.name) return;
    sourceNamesWithInstances.add(instance.name);
    const effectiveRarity = instance.rarity || state.gearRarities?.[instance.name];
    if (effectiveRarity !== legacyRarity) return;
    const sourceName = instance.name;
    const target = mythicMigrationTarget(gearByName(sourceName)?.slot, `${sourceName}:${instance.id}`);
    if (!target) return;
    instance.name = target.name;
    instance.rarity = "Mythic";
    touchedSourceNames.add(sourceName);
    touchedMythicNames.add(target.name);
  });

  Object.entries({ ...(state.gearRarities || {}) }).forEach(([sourceName, rarity]) => {
    if (rarity !== legacyRarity || sourceNamesWithInstances.has(sourceName)) return;
    const sourceGear = gearByName(sourceName);
    const count = Math.max(1, Number(state.gearCopies[sourceName]) || (state.ownedGear.includes(sourceName) ? 1 : 0));
    const legacyAffixes = Array.isArray(state.gearAffixes[sourceName]) ? state.gearAffixes[sourceName].map(entry => ({ ...entry })) : [];
    const createdRefs = [];
    for (let index = 0; index < count; index++) {
      const target = mythicMigrationTarget(sourceGear?.slot, sourceName, index);
      if (!target) continue;
      const ref = createEchoGearInstance(target.name, {
        allowAny: true,
        rarity: "Mythic",
        affixes: legacyAffixes,
        rollAffixes: false
      });
      if (ref) createdRefs.push(ref);
      touchedMythicNames.add(target.name);
    }
    let holderIndex = 0;
    Object.values(baseJobs).forEach(hero => Object.keys(hero.gear || {}).forEach(slot => {
      if (hero.gear[slot] !== sourceName || !createdRefs.length) return;
      hero.gear[slot] = createdRefs[Math.min(holderIndex++, createdRefs.length - 1)];
    }));
    touchedSourceNames.add(sourceName);
  });

  touchedSourceNames.forEach(sourceName => {
    delete state.gearRarities[sourceName];
    delete state.gearAffixes[sourceName];
    if (!echoGearInstanceRefs(sourceName).length) {
      delete state.gearCopies[sourceName];
      state.ownedGear = state.ownedGear.filter(name => name !== sourceName);
    } else {
      syncEchoForgeCopies(sourceName);
    }
  });
  touchedMythicNames.forEach(name => {
    echoGearInstanceRefs(name).forEach((ref, index) => {
      const instance = gearInstance(ref);
      if (instance) instance.copyNumber = index + 1;
    });
    syncEchoForgeCopies(name);
  });
}

function ownedGearRefs(slot = null, heroId = null) {
  return state.ownedGear.flatMap(name => {
    const separateRefs = echoGearInstanceRefs(name);
    const refs = separateRefs.length ? separateRefs : [name];
    return refs.filter(ref => {
      const gear = gearByName(ref);
      return gear && (!slot || gear.slot === slot) && (!heroId || canEquip(heroId, gear));
    });
  });
}

function ownsGearRef(ref) {
  const instance = gearInstance(ref);
  return instance ? state.ownedGear.includes(instance.name) : state.ownedGear.includes(ref);
}

function gearVisualRole(gear) {
  const explicit = String(gear?.visualRole || gear?.role || gear?.archetype || "").toLowerCase();
  if (["dps", "tank", "heal", "utility"].includes(explicit)) return explicit;
  const base = Object.values(gearDb).flat().find(item => item.name === gear?.name) || gear;
  const effects = JSON.stringify([gearEffects(base), weaponBasicAttackEffect(base)]).toLowerCase();
  if (/heal|restor|regen/.test(effects)) return "heal";
  if (/buffduration|songcharge|echoing|turnprogress|statuschance|statusduration/.test(effects)) return "utility";
  if (/damagereduction|barrier|defenseup|guard/.test(effects)) return "tank";
  const stats = base?.stats || {};
  const scores = { tank: Number(stats.stam) || 0, utility: Math.max(Number(stats.echo) || 0, Number(stats.agi) || 0), dps: Math.max(Number(stats.str) || 0, Number(stats.mag) || 0) };
  return Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
}

function gearIconHtml(gear, heroId, fallbackIndex, className = "", ref = null) {
  if (!["weapon", "armour", "ring", "necklace", "helmet"].includes(gear?.slot)) {
    return pixelIconHtml("gear-empty", fallbackIndex, className);
  }
  const rarity = String(ref ? gearRarity(ref) : gear?.rarity || gearRarity(gear.name)).toLowerCase();
  const visualRarity = ["rare", "epic", "legendary", "mythic", "artifact"].includes(rarity) ? rarity : "rare";
  const source = `assets/ui/gear-visuals/${gearVisualRole(gear)}-${visualRarity}-${gear.slot}.webp`;
  return `<span class="pixel-icon ${className} gear-art-icon gear-art-${gear.slot}" aria-hidden="true" style="background-image:url('${source}');background-size:contain;background-position:center;background-repeat:no-repeat"></span>`;
}

function gearAccessLabel(gear) {
  if (gear?.name === "Echo-Thread Lute") return "ULTIMATE WEAPON / VERSEBORN ONLY";
  if (mythicGearNames.has(gear?.name)) return "EMBER HALL 41-50 MYTHIC / ALL HEROES";
  if (ngPlusSignatureNames.has(gear?.name)) return `HALL 21+ / NG+ ULTIMATE WEAPON / ${gearOwners[gear.name][0].toUpperCase()} ONLY`;
  if (echoForgeGearNames.has(gear?.name)) return `ECHO HUNT RANK ${gear.echoRank} / ${gear.echoRarity.toUpperCase()} UPGRADE OF ${gear.echoBase.toUpperCase()} / ALL HEROES`;
  if (ngPlusChestGearNames.has(gear?.name)) return "NG+ RANDOM CHEST GEAR / ALL HEROES";
  if (ngPlusGearNames.has(gear?.name)) return "NG+ LEGENDARY DROP / ALL HEROES";
  if (chestGear.includes(gear)) return gearOwners[gear.name] ? `EPIC CHEST / ${gearOwners[gear.name][0].toUpperCase()} ONLY` : "EPIC CHEST / ALL HEROES";
  if (postgameGearNames.has(gear?.name)) return "ENDGAME DROP / ALL HEROES";
  if (generalDropGear.has(gear?.name)) return "FOUND GEAR / ALL HEROES";
  const owners = gearOwners[gear?.name];
  return owners ? `SIGNATURE / ${owners.join(" + ")}` : "GENERAL GEAR / ALL HEROES";
}

function item(name, slot, stats, desc, effect = null) {
  return { name, slot, stats, desc, effect };
}

function gearEffects(gear) {
  if (!gear?.effect) return [];
  return Array.isArray(gear.effect) ? gear.effect : [gear.effect];
}

const WEAPON_BASIC_ATTACK_EFFECTS = {
  "Voice of Verse": { type: "songCharge", value: .2, label: "BASIC ATTACK: next Song gains 20% potency" },
  "Twin Voidthorns": { type: "status", status: "marked", value: .12, duration: 3, label: "BASIC ATTACK: applies Marked (+12% CRIT received)" },
  "Klik-Wrench 7": { type: "status", status: "disrupted", value: .12, duration: 3, label: "BASIC ATTACK: applies Disrupted (-12% damage)" },
  "Earth Shield": { type: "barrier", value: .16, duration: 2, label: "BASIC ATTACK: grants a 16% personal barrier" },
  "Staff & Sigil": { type: "status", status: "magicVulnerability", value: .16, duration: 3, label: "BASIC ATTACK: applies 16% Magic Vulnerability" },
  "Ashrunner Knife": { type: "status", status: "poison", potency: "weak", duration: 3, label: "BASIC ATTACK: inflicts weak Poison" },
  "Shelter Staff": { type: "status", status: "magicVulnerability", value: .12, duration: 3, label: "BASIC ATTACK: applies 12% Magic Vulnerability" },
  "Guildsteel Saber": { type: "status", status: "critExposed", value: .1, duration: 2, label: "BASIC ATTACK: exposes target to +10% CRIT" },
  "Ember Pike": { type: "status", status: "burn", duration: 3, label: "BASIC ATTACK: inflicts Burn" },
  "Calibration Rod": { type: "status", status: "disrupted", value: .1, duration: 3, label: "BASIC ATTACK: applies Disrupted (-10% damage)" },
  "Echo-Thread Lute": { type: "resonance", value: 10, label: "BASIC ATTACK: grants 10 additional Resonance" },
  "Cinderbite Edge": { type: "heal", value: .05, label: "BASIC ATTACK: restores 5% Max HP" },
  "Crownless Edge": { type: "status", status: "physicalVulnerability", value: .2, duration: 3, label: "BASIC ATTACK: applies 20% Physical Vulnerability" },
  "Venomwake Sabre": { type: "status", status: "poison", potency: "strong", duration: 5, label: "BASIC ATTACK: inflicts strong Poison" },
  "Astral Refrain": { type: "echoPower", value: .18, duration: 2, label: "BASIC ATTACK: grants 18% Echo Power" },
  "Stonewake Oathblade": { type: "status", status: "critExposed", value: .14, duration: 3, label: "BASIC ATTACK: exposes target to +14% CRIT" },
  "Second Verse Lute": { type: "songCharge", value: .3, label: "BASIC ATTACK: next Song gains 30% potency" },
  "Veln Eclipse Blades": { type: "status", status: "marked", value: .18, duration: 4, label: "BASIC ATTACK: applies Greater Mark (+18% CRIT received)" },
  "Cinderstar Aegis": { type: "status", status: "holyVulnerability", value: .22, duration: 3, label: "BASIC ATTACK: applies 22% Holy Vulnerability" },
  "Unbound Oathstaff": { type: "status", status: "magicVulnerability", value: .22, duration: 3, label: "BASIC ATTACK: applies 22% Magic Vulnerability" },
  "Worldroot Shield": { type: "barrier", value: .25, duration: 3, label: "BASIC ATTACK: grants a 25% personal barrier" },
  "Klik-Wrench Infinite": { type: "status", status: "disrupted", value: .2, duration: 4, label: "BASIC ATTACK: applies Greater Disrupted (-20% damage)" },
  "Elderflame Claws": { type: "status", status: "burn", duration: 5, coefficient: .32, label: "BASIC ATTACK: inflicts strong Elder Burn" },
  "Loopglass Sabre": { type: "status", status: "physicalVulnerability", value: .16, duration: 3, label: "BASIC ATTACK: applies 16% Physical Vulnerability" },
  "Reverie Hexrod": { type: "status", status: "magicVulnerability", value: .2, duration: 3, label: "BASIC ATTACK: applies 20% Magic Vulnerability" },
  "Stonewake Maul": { type: "status", status: "physicalVulnerability", value: .14, duration: 3, label: "BASIC ATTACK: applies 14% Physical Vulnerability" },
  "Cinder Repeater": { type: "status", status: "critExposed", value: .12, duration: 2, label: "BASIC ATTACK: exposes target to +12% CRIT" },
  "Riotbrand Maul": { type: "status", status: "stun", duration: 1, label: "BASIC ATTACK: inflicts Stun" },
  "Interdict Crozier": { type: "status", status: "sleep", duration: 2, label: "BASIC ATTACK: inflicts Sleep" },
  "Worldsplitter Axe": { type: "status", status: "physicalVulnerability", value: .2, duration: 3, label: "BASIC ATTACK: applies 20% Physical Vulnerability" },
  "Midnight Chime Cannon": { type: "status", status: "stun", duration: 1, label: "BASIC ATTACK: inflicts Stun" },
  "Cindralis Edictblade": { type: "status", status: "physicalVulnerability", value: .18, duration: 3, label: "BASIC ATTACK: applies 18% Physical Vulnerability" },
  "Red Memory Halberd": { type: "status", status: "burn", duration: 4, label: "BASIC ATTACK: inflicts Burn" },
  "Unwritten Quillblade": { type: "status", status: "magicVulnerability", value: .2, duration: 3, label: "BASIC ATTACK: applies 20% Magic Vulnerability" },
  "Solinar's Frostfire Greatsword": { type: "status", status: "burn", duration: 5, coefficient: .32, label: "BASIC ATTACK: inflicts strong Frostfire Burn" },
  "The Unwritten Door": { type: "status", status: "resonanceLocked", duration: 2, label: "ARTIFACT BASIC ATTACK: locks enemy Resonance for 2 turns" },
  "Cinderwinter Paradox": { type: "status", status: "burn", duration: 5, coefficient: .4, label: "ARTIFACT BASIC ATTACK: inflicts strong Frostfire Burn" }
};

function weaponBasicAttackEffect(gear) {
  if (!gear || gear.slot !== "weapon") return null;
  return WEAPON_BASIC_ATTACK_EFFECTS[gear.echoBase || gear.name] || null;
}

function gearEffectLabel(effect) {
  if (!effect?.label) return "";
  let label = effect.type === "mpOnHit"
    ? `Restore at least ${effect.value} MP after dealing damage; scales modestly with Max MP`
    : effect.label;
  if (state.gameMode === "hallBattles" && ["hpOnHit", "mpOnHit", "battleRegen"].includes(effect.type)) {
    const type = effect.type === "mpOnHit" ? "Siphoning" : "Leeching";
    const rate = Math.round(legacyHallSustainRate(effect.type, effect.value) * 100);
    label = type === "Siphoning"
      ? `${type}: after a damaging skill, restore MP equal to ${rate}% of its STR or MAG scaling stat`
      : `${type}: heal ${rate}% of direct damage dealt by this action`;
  }
  if (effect.artifactUnique) return `ARTIFACT EFFECT: ${label.replace(/^ARTIFACT(?: EFFECT)?:\s*/i, "")}`;
  return effect.echoUnique ? `ECHO EFFECT: ${label.replace(/^ECHO(?: EFFECT)?:\s*/i, "")}` : label;
}

function gearEffectLabels(gear) {
  const labels = gearEffects(gear).map(gearEffectLabel).filter(Boolean);
  const basic = weaponBasicAttackEffect(gear);
  return basic ? [basic.label, ...labels] : labels;
}

function mythicSetDefinition(gear) {
  return gear?.mythicSet ? MYTHIC_SETS[gear.mythicSet] || null : null;
}

function activeMythicSetEffects(id) {
  const equippedNames = new Set(Object.values(baseJobs[id]?.gear || {}).map(gearBaseName));
  return Object.values(MYTHIC_SETS)
    .filter(set => set.pieces.every(name => equippedNames.has(name)))
    .map(set => set.bonus);
}

function gearEffectHtml(gear, className = "rare-effect") {
  const basic = weaponBasicAttackEffect(gear);
  const effects = [...(basic ? [{ ...basic, basicAttackUnique: true }] : []), ...gearEffects(gear)].filter(effect => effect.label);
  const set = mythicSetDefinition(gear);
  const setHtml = set ? `<span class="mythic-set-details"><small class="is-mythic-set"><b>${set.name} set</b> / ${set.pieces.join(" / ")}</small><small class="is-mythic-set-bonus"><b>3-piece:</b> ${set.bonus.label}</small></span>` : "";
  const effectHtml = effects.length ? `<span class="gear-unique-effects ${className}">${effects.map(effect => {
    const label = gearEffectLabel(effect);
    return `<small class="${effect.echoUnique ? "is-echo-unique" : effect.basicAttackUnique ? "is-basic-attack" : ""}">${label}</small>`;
  }).join("")}</span>` : "";
  return `${effectHtml}${setHtml}`;
}

const RARITY_AFFIX_COUNTS = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5, Artifact: 5 };
const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
const GEAR_DISPLAY_RARITIES = [...RARITY_ORDER, "Artifact"];

function gearRarityRank(rarity) {
  return rarity === "Artifact" ? RARITY_ORDER.length : RARITY_ORDER.indexOf(rarity);
}

function affix(key, label, type, min, max, options = {}) {
  return { key, label, type, min, max, ...options };
}

const affixPools = {
  weapon: [
    affix("strong", "Strong", "statPct", .05, .15, { stat: "str", theme: "mountain" }),
    affix("scholars", "Scholar's", "statPct", .05, .15, { stat: "mag", theme: "ruins" }),
    affix("fleet", "Fleet", "statPct", .05, .15, { stat: "agi", theme: "dragon" }),
    affix("resonant", "Resonant", "statPct", .05, .15, { stat: "echo", theme: "dragon" }),
    affix("keen", "Keen", "critChance", .04, .1),
    affix("venomous", "Venomous", "statusOnHit", .05, .15, { status: "poison", theme: "swamp" }),
    affix("drowsing", "Drowsing", "statusOnHit", .05, .12, { status: "sleep", theme: "ruins" }),
    affix("stormbreaking", "Stormbreaking", "statusOnHit", .05, .12, { status: "stun", theme: "mountain" }),
    affix("executioner", "Executioner", "afflictedDamage", .1, .22),
    affix("physical", "Forceful", "physicalDamage", .06, .14),
    affix("arcane", "Arcane", "magicDamage", .06, .14),
    affix("leeching", "Leeching", "leeching", .04, .1, { hallOnly: true }),
    affix("siphoning", "Siphoning", "siphoning", .05, .1, { hallOnly: true })
  ],
  armour: [
    affix("stout", "Stout", "statPct", .06, .16, { stat: "stam", theme: "mountain" }),
    affix("vital", "Vital", "hpPct", .08, .2),
    affix("venomLined", "Venom-lined", "statusOnHit", .04, .08, { status: "poison", theme: "swamp" }),
    affix("dreamwoven", "Dreamwoven", "statusOnHit", .04, .08, { status: "sleep", theme: "ruins" }),
    affix("shockbound", "Shockbound", "statusOnHit", .04, .08, { status: "stun", theme: "mountain" }),
    affix("antivenom", "Antivenom", "statusResistance", .1, .3, { status: "poison", theme: "swamp" }),
    affix("wakeful", "Wakeful", "statusResistance", .1, .3, { status: "sleep", theme: "ruins" }),
    affix("unyielding", "Unyielding", "statusResistance", .1, .3, { status: "stun", theme: "mountain" }),
    affix("poisonward", "Poisonward", "poisonReduction", .12, .3, { theme: "swamp" }),
    affix("steadfast", "Steadfast", "statusDurationReduction", 1, 1),
    affix("lasting", "Lasting Guard", "buffDuration", 1, 1),
    affix("leeching", "Leeching", "leeching", .04, .08, { hallOnly: true }),
    affix("siphoning", "Siphoning", "siphoning", .05, .08, { hallOnly: true })
  ],
  accessory: [
    affix("fleet", "Fleet", "statPct", .05, .15, { stat: "agi", theme: "dragon" }),
    affix("resonant", "Resonant", "statPct", .05, .15, { stat: "echo", theme: "dragon" }),
    affix("alchemist", "Alchemist", "statusChance", .08, .18, { theme: "swamp" }),
    affix("venomSeal", "Venom Seal", "statusOnHit", .05, .1, { status: "poison", theme: "swamp" }),
    affix("dreamSeal", "Dream Seal", "statusOnHit", .05, .1, { status: "sleep", theme: "ruins" }),
    affix("stormSeal", "Storm Seal", "statusOnHit", .05, .1, { status: "stun", theme: "mountain" }),
    affix("resolute", "Resolute", "allStatusResistance", .08, .2),
    affix("echoing", "Echoing", "echoing", .05, .08, { theme: "dragon" }),
    affix("prolonging", "Prolonging", "buffDuration", 1, 1),
    affix("cruel", "Cruel", "statusDuration", 1, 1),
    affix("quickstart", "Quickstart", "openingTurnProgress", .1, .25, { theme: "dragon" }),
    affix("keen", "Keen", "critChance", .04, .09),
    affix("leeching", "Leeching", "leeching", .04, .1, { hallOnly: true }),
    affix("siphoning", "Siphoning", "siphoning", .05, .1, { hallOnly: true })
  ]
};

function randomAffixValue(entry) {
  if (entry.min === entry.max) return entry.min;
  const step = entry.max <= 1 ? .01 : 1;
  return Math.round((entry.min + Math.random() * (entry.max - entry.min)) / step) * step;
}

function formatAffix(entry) {
  const value = entry.value;
  if (entry.type === "leeching") return `${entry.label}: Heal ${Math.round(value * 100)}% of direct damage dealt by this action`;
  if (entry.type === "siphoning") return `${entry.label}: After a damaging skill, restore MP equal to ${Math.round(value * 100)}% of its STR or MAG scaling stat`;
  if (entry.type === "echoing") return `${entry.label}: ${Math.round(value * 100)}% chance after an action to grant an immediate ally action; once per wearer per battle, shares the 2-action cap`;
  if (entry.type === "openingTurnProgress") return `${entry.label}: +${Math.round(value * 100)}% initiative in round 1 only (no extra action or CRIT)`;
  if (entry.type === "statPct") return `${entry.label}: ${entry.stat.toUpperCase()} +${Math.round(value * 100)}%`;
  if (entry.type === "hpPct") return `${entry.label}: HP +${Math.round(value * 100)}%`;
  if (entry.type === "statusOnHit") return `${entry.label}: ${Math.round(value * 100)}% ${entry.status.toUpperCase()} on hit`;
  if (entry.type === "statusResistance") return `${entry.label}: ${Math.round(value * 100)}% ${entry.status.toUpperCase()} resistance`;
  if (["critChance", "afflictedDamage", "physicalDamage", "magicDamage", "poisonReduction", "statusChance", "allStatusResistance", "echoing", "openingTurnProgress"].includes(entry.type)) {
    return `${entry.label}: +${Math.round(value * 100)}% ${entry.type.replace(/([A-Z])/g, " $1").toLowerCase()}`;
  }
  return `${entry.label}: +${value} ${entry.type.replace(/([A-Z])/g, " $1").toLowerCase()}`;
}

function gearAffixPool(gear) {
  const pool = gear.slot === "weapon" ? affixPools.weapon : gear.slot === "armour" ? affixPools.armour : affixPools.accessory;
  return pool.filter(entry => !isGenericBreakGearAffix(entry) && (state.gameMode === "hallBattles" || !entry.hallOnly));
}

function defaultGearRarity(name) {
  const baseName = gearBaseName(name);
  const gear = gearByName(baseName);
  if (!gear) return "Common";
  if (artifactGearNames.has(baseName)) return "Artifact";
  if (mythicGearNames.has(baseName)) return "Mythic";
  if (ngPlusSignatureNames.has(baseName) || postgameGearNames.has(baseName)) return "Legendary";
  if (echoForgeGearNames.has(baseName)) return gear.echoRarity || "Legendary";
  if (ngPlusChestGearNames.has(baseName)) return "Epic";
  if (ngPlusGearNames.has(baseName)) return "Epic";
  if (chestGear.includes(gear)) return "Epic";
  if (rareGear.includes(gear) || questGear.includes(gear)) return "Rare";
  if (zoneStarterGear.includes(gear)) return "Uncommon";
  return "Common";
}

function rollGearAffixes(gear, rarity, theme = "", countOverride = null) {
  const count = Number.isInteger(countOverride) ? Math.max(0, countOverride) : RARITY_AFFIX_COUNTS[rarity] || 0;
  if (!count) return [];
  const base = gearAffixPool(gear);
  const weighted = [...base, ...base.filter(entry => entry.theme && entry.theme === theme), ...base.filter(entry => entry.theme && entry.theme === theme)];
  const chosen = [];
  while (chosen.length < count && chosen.length < base.length) {
    const entry = weighted[Math.floor(Math.random() * weighted.length)];
    if (chosen.some(existing => existing.key === entry.key)) continue;
    const rolled = { ...entry, value: randomAffixValue(entry) };
    rolled.text = formatAffix(rolled);
    chosen.push(rolled);
  }
  return chosen;
}

function ensureGearMetadata(name, options = {}) {
  const instance = gearInstance(name);
  if (instance) {
    instance.rarity ||= options.rarity || defaultGearRarity(name);
    if (!Array.isArray(instance.affixes)) instance.affixes = options.rollAffixes === true ? rollGearAffixes(gearByName(name), instance.rarity, options.theme) : [];
    return;
  }
  if (!state.gearAffixes || typeof state.gearAffixes !== "object") state.gearAffixes = {};
  if (!state.gearRarities || typeof state.gearRarities !== "object") state.gearRarities = {};
  if (!state.gearRarities[name]) state.gearRarities[name] = options.rarity || defaultGearRarity(name);
  if (!Array.isArray(state.gearAffixes[name])) {
    const shouldRoll = options.rollAffixes === true;
    state.gearAffixes[name] = shouldRoll ? rollGearAffixes(gearByName(name), state.gearRarities[name], options.theme) : [];
  }
}

function topUpGearAffixes(name, rarity = gearRarity(name), theme = "dragon") {
  const gear = gearByName(name);
  if (!gear) return [];
  const wanted = RARITY_AFFIX_COUNTS[rarity] || 0;
  const existing = gearAffixes(name);
  let attempts = 0;
  while (existing.length < wanted && attempts++ < 24) {
    const candidates = rollGearAffixes(gear, rarity, theme);
    const next = candidates.find(candidate => !existing.some(entry => entry.key === candidate.key));
    if (!next) continue;
    existing.push(next);
  }
  if (existing.length < wanted) {
    const pool = gearAffixPool(gear);
    pool.filter(entry => !existing.some(current => current.key === entry.key)).slice(0, wanted - existing.length).forEach(entry => {
      const rolled = { ...entry, value: randomAffixValue(entry) };
      rolled.text = formatAffix(rolled);
      existing.push(rolled);
    });
  }
  const instance = gearInstance(name);
  if (instance) instance.affixes = existing;
  else state.gearAffixes[name] = existing;
  return existing;
}

function legacyHallSustainRate(type, value) {
  const amount = Math.max(0, Number(value) || 0);
  if (type === "mpOnHit") return Math.max(.05, Math.min(.1, amount * .0125));
  if (type === "battleRegen") return Math.max(.04, Math.min(.1, amount / 400));
  return Math.max(.04, Math.min(.1, amount * .01));
}

function migrateHallSustainEntry(entry) {
  if (!entry || !["hpOnHit", "mpOnHit", "battleRegen"].includes(entry.type)) return entry;
  const type = entry.type === "mpOnHit" ? "siphoning" : "leeching";
  const value = legacyHallSustainRate(entry.type, entry.value);
  const migrated = { ...entry, key: type, label: type === "siphoning" ? "Siphoning" : "Leeching", type, value, min: value, max: value, hallOnly: true };
  migrated.text = formatAffix(migrated);
  return migrated;
}

function migrateHallSustainAffixes() {
  if (state.gameMode !== "hallBattles") return false;
  state.flags ||= {};
  if (state.flags.hallSustainAffixesV1) return false;
  const migrateEntries = entries => Array.isArray(entries) ? entries.map(migrateHallSustainEntry) : entries;
  Object.keys(state.gearAffixes || {}).forEach(name => { state.gearAffixes[name] = migrateEntries(state.gearAffixes[name]); });
  Object.values(state.gearInstances || {}).forEach(instance => { instance.affixes = migrateEntries(instance.affixes) || []; });
  Object.values(state.hallBattles?.shopOffers || {}).forEach(offer => { offer.affixes = migrateEntries(offer.affixes) || []; });
  state.flags.hallSustainAffixesV1 = true;
  return true;
}

function isGenericBreakGearAffix(entry) {
  if (!entry) return false;
  if (["stagger", "break"].includes(String(entry.type || "").toLowerCase())) return true;
  return /\b(?:stagger|break)\b/i.test(`${entry.label || ""} ${entry.text || ""}`);
}

function stableAffixHash(value) {
  return Array.from(String(value)).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

function deterministicAffixValue(entry, seed) {
  if (entry.min === entry.max) return entry.min;
  const fraction = (stableAffixHash(seed) % 1001) / 1000;
  const step = entry.max <= 1 ? .01 : 1;
  return Math.round((entry.min + fraction * (entry.max - entry.min)) / step) * step;
}

function migrateGenericBreakAffixEntries(gear, entries, seed) {
  if (!Array.isArray(entries) || !gear) return entries;
  const retainedKeys = new Set(entries.filter(entry => !isGenericBreakGearAffix(entry)).map(entry => entry.key));
  return entries.map((entry, index) => {
    if (!isGenericBreakGearAffix(entry)) return entry;
    const candidates = gearAffixPool(gear).filter(candidate => !retainedKeys.has(candidate.key));
    if (!candidates.length) return null;
    const replacement = { ...candidates[stableAffixHash(`${seed}:${index}:${entry.key || entry.type}`) % candidates.length] };
    replacement.value = deterministicAffixValue(replacement, `${seed}:${index}:value`);
    replacement.text = formatAffix(replacement);
    retainedKeys.add(replacement.key);
    return replacement;
  }).filter(Boolean);
}

function migrateGenericBreakGearAffixes() {
  state.flags ||= {};
  if (state.flags.breakGearAffixesV1) return false;
  Object.entries(state.gearAffixes || {}).forEach(([ref, entries]) => {
    state.gearAffixes[ref] = migrateGenericBreakAffixEntries(gearByName(ref), entries, `owned:${ref}`) || [];
  });
  Object.entries(state.gearInstances || {}).forEach(([ref, instance]) => {
    instance.affixes = migrateGenericBreakAffixEntries(gearByName(instance.name), instance.affixes, `instance:${ref}`) || [];
  });
  Object.entries(state.hallBattles?.shopOffers || {}).forEach(([stage, offer]) => {
    offer.affixes = migrateGenericBreakAffixEntries(gearByName(offer.name), offer.affixes, `offer:${stage}:${offer.name}`) || [];
  });
  state.flags.breakGearAffixesV1 = true;
  return true;
}

function upgradeOwnedLegendaryGear() {
  const equipped = Object.values(baseJobs).flatMap(hero => Object.values(hero.gear || {})).filter(Boolean);
  const instances = Object.values(gearInstances).map(instance => instance?.id).filter(Boolean);
  const owned = (state.ownedGear || []).flatMap(name => {
    const refs = echoForgeGearNames.has(name) ? echoGearInstanceRefs(name) : [];
    return refs.length ? refs : [name];
  });
  [...new Set([...owned, ...equipped, ...instances])].forEach(ref => {
    if (!gearByName(ref)) return;
    const name = gearBaseName(ref);
    if (postgameGearNames.has(name)) state.gearRarities[name] = "Legendary";
    if (echoForgeGearNames.has(name)) {
      const instance = gearInstance(ref);
      const current = gearRarity(ref) || "Common";
      const upgraded = defaultGearRarity(name);
      const rarity = RARITY_ORDER.indexOf(current) > RARITY_ORDER.indexOf(upgraded) ? current : upgraded;
      if (instance) instance.rarity = rarity;
      else state.gearRarities[name] = rarity;
    }
    const rarity = gearRarity(ref);
    if (postgameGearNames.has(name) || echoForgeGearNames.has(name) || gearRarityRank(rarity) >= gearRarityRank("Legendary")) topUpGearAffixes(ref, rarity, "dragon");
  });
}

function gearRarity(name) {
  const rarity = gearInstance(name)?.rarity || state.gearRarities?.[gearBaseName(name)] || defaultGearRarity(name);
  return rarity === "Platinum" ? "Mythic" : rarity;
}

function gearAffixes(name) {
  const instance = gearInstance(name);
  if (instance) return Array.isArray(instance.affixes) ? instance.affixes : [];
  const baseName = gearBaseName(name);
  return Array.isArray(state.gearAffixes?.[baseName]) ? state.gearAffixes[baseName] : [];
}

function affixValue(id, type, match = null) {
  return Object.values(baseJobs[id]?.gear || {}).reduce((total, name) => {
    return total + gearAffixes(name)
      .filter(entry => entry.type === type && (match === null || entry.stat === match || entry.status === match))
      .reduce((sum, entry) => sum + entry.value, 0);
  }, 0);
}

function gearAffixHtml(name) {
  const entries = gearAffixes(name);
  if (!entries.length) return "";
  return `<span class="gear-affixes">${entries.map(entry => `<small>${formatAffix(entry)}</small>`).join("")}</span>`;
}

function gearRarityHtml(name) {
  const rarity = gearRarity(name);
  return `<small class="gear-rarity rarity-${rarity.toLowerCase()}">${rarity.toUpperCase()}</small>`;
}

const GEAR_SORT_FIELDS = [
  ["newest", "Newest"],
  ["name", "Name"],
  ["itemPower", "Item Power"],
  ["rarity", "Rarity"],
  ["affixCount", "Affix Count"],
  ["str", "STR"],
  ["agi", "AGI"],
  ["mag", "MAG"],
  ["def", "DEF"],
  ["hp", "HP"],
  ["mp", "MP"],
  ["crit", "Crit"],
  ["speed", "Speed"]
];

const GEAR_STAT_FIELDS = [
  ["str", "STR"],
  ["agi", "AGI"],
  ["mag", "MAG"],
  ["stam", "STAM"],
  ["echo", "ECHO"]
];

function gearAffixFacet(entry) {
  if (entry.type === "statPct") return { key: `statPct:${entry.stat}`, label: `${entry.stat.toUpperCase()} %` };
  if (entry.type === "hpPct") return { key: "statPct:hp", label: "HP %" };
  if (entry.type === "statusOnHit") return { key: `status:${entry.status}`, label: entry.status[0].toUpperCase() + entry.status.slice(1) };
  if (entry.type === "statusResistance") return { key: `resist:${entry.status}`, label: `${entry.status[0].toUpperCase() + entry.status.slice(1)} Resistance` };
  const labels = {
    critChance: "Crit",
    afflictedDamage: "Afflicted Damage",
    physicalDamage: "Physical Damage",
    magicDamage: "Magic Damage",
    poisonReduction: "Poison Reduction",
    statusChance: "Status Chance",
    allStatusResistance: "All Status Resistance",
    echoing: "Echoing",
    openingTurnProgress: "Opening Speed",
    buffDuration: "Buff Duration",
    statusDuration: "Status Duration"
  };
  return { key: `type:${entry.type}`, label: labels[entry.type] || entry.label };
}

function gearAffixOptions() {
  const options = new Map();
  ownedGearRefs().forEach(ref => gearAffixes(ref).forEach(entry => {
    const facet = gearAffixFacet(entry);
    options.set(facet.key, facet.label);
  }));
  return [...options].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
}

function gearStatOptions() {
  return GEAR_STAT_FIELDS
    .filter(([key]) => ownedGearRefs().some(ref => (Number(gearByName(ref)?.stats?.[key]) || 0) > 0))
    .map(([key, label]) => ({ key, label }));
}

function gearHasStat(ref, key) {
  return (Number(gearByName(ref)?.stats?.[key]) || 0) > 0;
}

function gearSortForStat(key) {
  return key === "stam" ? "def" : key;
}

function gearHasAffixFacet(ref, key) {
  return gearAffixes(ref).some(entry => gearAffixFacet(entry).key === key);
}

function gearAffixFacetValue(ref, key) {
  const values = gearAffixes(ref)
    .filter(entry => gearAffixFacet(entry).key === key)
    .map(entry => Number(entry.value) || 0);
  return values.length ? Math.max(...values) : 0;
}

function gearSearchText(ref) {
  const gear = gearByName(ref);
  if (!gear) return "";
  const fixed = [
    ...gearEffects(gear),
    ...(weaponBasicAttackEffect(gear) ? [weaponBasicAttackEffect(gear)] : [])
  ];
  const set = mythicSetDefinition(gear);
  const searchable = [
    gearDisplayName(ref),
    gear.name,
    gear.slot,
    gearSlotLabel(gear.slot),
    gearRarity(ref),
    gear.desc,
    gearAccessLabel(gear),
    set?.name,
    set?.bonus?.label,
    ...(set?.pieces || []),
    ...Object.keys(gear.stats || {}),
    ...fixed.flatMap(entry => [entry.label, entry.type, entry.status, entry.element]),
    ...gearAffixes(ref).flatMap(entry => {
      const facet = gearAffixFacet(entry);
      return [entry.label, entry.key, entry.type, entry.status, entry.stat, facet.label, formatAffix(entry)];
    })
  ];
  return searchable.filter(Boolean).join(" ").toLowerCase();
}

function gearItemPower(ref) {
  const gear = gearByName(ref);
  const baseStats = Object.values(gear?.stats || {}).reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0);
  const fixedPower = gearEffects(gear).reduce((sum, effect) => sum + (Math.abs(Number(effect.value) || 0) <= 1 ? Math.abs(Number(effect.value) || 0) * 100 : Math.abs(Number(effect.value) || 0)), 0);
  const affixPower = gearAffixes(ref).reduce((sum, entry) => sum + (Math.abs(Number(entry.value) || 0) <= 1 ? Math.abs(Number(entry.value) || 0) * 100 : Math.abs(Number(entry.value) || 0)), 0);
  return baseStats + fixedPower + affixPower + gearRarityRank(gearRarity(ref)) * 10;
}

function gearSortValue(ref, field) {
  const gear = gearByName(ref);
  const stats = gear?.stats || {};
  if (field.startsWith("affix:")) return gearAffixFacetValue(ref, field.slice(6));
  if (field === "itemPower") return gearItemPower(ref);
  if (field === "rarity") return gearRarityRank(gearRarity(ref));
  if (field === "affixCount") return gearAffixes(ref).length;
  if (field === "newest") return gearInstance(ref)?.serial || state.ownedGear.indexOf(gearBaseName(ref)) + 1;
  if (field === "crit") {
    return [...gearEffects(gear), ...gearAffixes(ref)].filter(entry => entry.type === "critChance").reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  }
  if (field === "def") return Number(stats.def ?? stats.stam) || 0;
  if (field === "hp") return (Number(stats.hp) || 0) + (Number(stats.stam) || 0) * 4 + gearAffixes(ref).filter(entry => entry.type === "hpPct").reduce((sum, entry) => sum + entry.value * 100, 0);
  if (field === "mp") return (Number(stats.mp) || 0) + (Number(stats.mag) || 0) / 2;
  if (field === "speed") return Number(stats.speed ?? stats.agi) || 0;
  return Number(stats[field]) || 0;
}

function filteredSortedGear(entries) {
  const query = gearBrowser.search.trim().toLowerCase();
  const usabilityId = gearBrowser.usability === "selected" ? selectedGearHero : gearBrowser.usability;
  const filtered = entries.filter(({ ref, gear }) => {
    if (query && !gearSearchText(ref).includes(query)) return false;
    if (gearBrowser.slot !== "all" && gear.slot !== gearBrowser.slot) return false;
    if (gearBrowser.rarity !== "all" && gearRarity(ref) !== gearBrowser.rarity) return false;
    if (usabilityId !== "all" && !canEquip(usabilityId, gear)) return false;
    const isEquipped = equippedGearUsers(ref).length > 0;
    if (gearBrowser.equipped === "equipped" && !isEquipped) return false;
    if (gearBrowser.equipped === "unequipped" && isEquipped) return false;
    if (gearBrowser.stats.length) {
      const matches = gearBrowser.stats.map(key => gearHasStat(ref, key));
      if (gearBrowser.statMatch === "all" ? !matches.every(Boolean) : !matches.some(Boolean)) return false;
    }
    if (gearBrowser.affixes.length) {
      const matches = gearBrowser.affixes.map(key => gearHasAffixFacet(ref, key));
      if (gearBrowser.affixMatch === "all" ? !matches.every(Boolean) : !matches.some(Boolean)) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => {
    if (gearBrowser.sort === "name") {
      const value = gearDisplayName(a.ref).localeCompare(gearDisplayName(b.ref));
      return gearBrowser.direction === "asc" ? value : -value;
    }
    if (gearBrowser.sort.startsWith("affix:")) {
      const key = gearBrowser.sort.slice(6);
      const aHas = gearHasAffixFacet(a.ref, key);
      const bHas = gearHasAffixFacet(b.ref, key);
      if (aHas !== bHas) return aHas ? -1 : 1;
    }
    const value = gearSortValue(a.ref, gearBrowser.sort) - gearSortValue(b.ref, gearBrowser.sort);
    return (gearBrowser.direction === "asc" ? value : -value) || gearDisplayName(a.ref).localeCompare(gearDisplayName(b.ref));
  });
}

function resetGearBrowser() {
  Object.assign(gearBrowser, {
    search: "",
    stats: [],
    statMatch: "any",
    affixes: [],
    affixMatch: "any",
    slot: "all",
    rarity: "all",
    usability: "all",
    equipped: "all",
    sort: "newest",
    direction: "desc",
    filterOpen: false,
    sortOpen: false
  });
  selectedGearRef = null;
}

function autoEquipToolbarHtml(id) {
  return `<section class="gear-auto-equip" aria-label="Automatic equipment">
    <div><strong>Auto Equip</strong><small>Role-optimized stats, damage, healing and utility</small></div>
    <div class="gear-auto-source" role="group" aria-label="Gear source">
      <button type="button" data-auto-equip-pool="all" class="${autoEquipPool === "all" ? "is-active" : ""}" aria-pressed="${autoEquipPool === "all"}">All gear</button>
      <button type="button" data-auto-equip-pool="unequipped" class="${autoEquipPool === "unequipped" ? "is-active" : ""}" aria-pressed="${autoEquipPool === "unequipped"}">Unequipped gear</button>
    </div>
    <button type="button" data-auto-equip="hero">Optimize ${id}</button>
    <button type="button" data-auto-equip="party">Optimize everybody</button>
  </section>`;
}

function gearBrowserToolbarHtml(visibleCount, totalCount) {
  const statOptions = gearStatOptions();
  const affixOptions = gearAffixOptions();
  if (gearBrowser.sort.startsWith("affix:") && !gearBrowser.affixes.includes(gearBrowser.sort.slice(6))) {
    gearBrowser.sort = "newest";
  }
  const selectedAffixSorts = affixOptions.filter(option => gearBrowser.affixes.includes(option.key));
  const heroOptions = state.party.map(id => `<option value="${id}" ${gearBrowser.usability === id ? "selected" : ""}>Usable by ${id}</option>`).join("");
  const statChecks = statOptions.length
    ? statOptions.map(option => `<label><input type="checkbox" data-gear-stat="${option.key}" ${gearBrowser.stats.includes(option.key) ? "checked" : ""}> ${escapeMarkup(option.label)}</label>`).join("")
    : "<small>No fixed equipment stats found.</small>";
  const affixChecks = affixOptions.length
    ? affixOptions.map(option => `<label><input type="checkbox" data-gear-affix="${option.key}" ${gearBrowser.affixes.includes(option.key) ? "checked" : ""}> ${escapeMarkup(option.label)}</label>`).join("")
    : "<small>No rolled affixes owned yet.</small>";
  const sortOptions = [
    ...GEAR_SORT_FIELDS.map(([key, label]) => `<option value="${key}" ${gearBrowser.sort === key ? "selected" : ""}>${label}</option>`),
    ...selectedAffixSorts.map(option => `<option value="affix:${option.key}" ${gearBrowser.sort === `affix:${option.key}` ? "selected" : ""}>${escapeMarkup(option.label)} strength</option>`)
  ].join("");
  const filterCount = [gearBrowser.search, gearBrowser.stats.length, gearBrowser.affixes.length, gearBrowser.slot !== "all", gearBrowser.rarity !== "all", gearBrowser.usability !== "all", gearBrowser.equipped !== "all"].filter(Boolean).length;
  const directionHigh = gearBrowser.sort === "name" ? "Z-A" : "Highest first";
  const directionLow = gearBrowser.sort === "name" ? "A-Z" : "Lowest first";
  return `<section class="gear-browser" aria-label="Gear search, filters and sorting">
    <div class="gear-browser-bar">
      <input type="search" data-gear-search value="${escapeMarkup(gearBrowser.search)}" placeholder="Search gear..." aria-label="Search gear">
      <details data-gear-filter-panel ${gearBrowser.filterOpen ? "open" : ""}><summary>Filter${filterCount ? ` (${filterCount})` : ""}</summary>
        <div class="gear-browser-panel gear-filter-grid">
          <label>Type<select data-gear-filter="slot"><option value="all">All slots</option>${["weapon", "armour", "ring", "necklace", "helmet"].map(slot => `<option value="${slot}" ${gearBrowser.slot === slot ? "selected" : ""}>${gearSlotLabel(slot)}</option>`).join("")}</select></label>
          <label>Rarity<select data-gear-filter="rarity"><option value="all">All rarities</option>${GEAR_DISPLAY_RARITIES.map(rarity => `<option value="${rarity}" ${gearBrowser.rarity === rarity ? "selected" : ""}>${rarity}</option>`).join("")}</select></label>
          <label>Usability<select data-gear-filter="usability"><option value="all">All characters</option><option value="selected" ${gearBrowser.usability === "selected" ? "selected" : ""}>Selected hero</option>${heroOptions}</select></label>
          <label>Equipment<select data-gear-filter="equipped"><option value="all">Equipped + unequipped</option><option value="equipped" ${gearBrowser.equipped === "equipped" ? "selected" : ""}>Equipped only</option><option value="unequipped" ${gearBrowser.equipped === "unequipped" ? "selected" : ""}>Unequipped only</option></select></label>
          <fieldset><legend>Fixed stats</legend><div class="gear-match-mode"><button type="button" data-gear-stat-match="any" class="${gearBrowser.statMatch === "any" ? "is-active" : ""}">ANY</button><button type="button" data-gear-stat-match="all" class="${gearBrowser.statMatch === "all" ? "is-active" : ""}">ALL</button></div><div class="gear-affix-options">${statChecks}</div></fieldset>
          <fieldset><legend>Affixes</legend><div class="gear-match-mode"><button type="button" data-gear-match="any" class="${gearBrowser.affixMatch === "any" ? "is-active" : ""}">ANY</button><button type="button" data-gear-match="all" class="${gearBrowser.affixMatch === "all" ? "is-active" : ""}">ALL</button></div><div class="gear-affix-options">${affixChecks}</div></fieldset>
        </div>
      </details>
      <details data-gear-sort-panel ${gearBrowser.sortOpen ? "open" : ""}><summary>Sort</summary>
        <div class="gear-browser-panel gear-sort-grid"><label>Sort by<select data-gear-sort>${sortOptions}</select></label><label>Order<select data-gear-direction><option value="desc" ${gearBrowser.direction === "desc" ? "selected" : ""}>${directionHigh}</option><option value="asc" ${gearBrowser.direction === "asc" ? "selected" : ""}>${directionLow}</option></select></label></div>
      </details>
      <button type="button" class="gear-clear" data-gear-clear>Clear Filters</button>
      <small class="gear-result-count">${visibleCount} / ${totalCount}</small>
    </div>
  </section>`;
}

function bindGearBrowserControls() {
  const search = el.menuBody.querySelector("[data-gear-search]");
  if (search) search.oninput = () => {
    gearBrowser.search = search.value;
    selectedGearRef = null;
    renderMenu();
    const next = el.menuBody.querySelector("[data-gear-search]");
    next?.focus();
    next?.setSelectionRange(gearBrowser.search.length, gearBrowser.search.length);
  };
  el.menuBody.querySelectorAll("[data-gear-filter]").forEach(control => control.onchange = () => {
    gearBrowser[control.dataset.gearFilter] = control.value;
    if (control.dataset.gearFilter === "slot" && control.value !== "all") selectedGearSlot = control.value;
    selectedGearRef = null;
    renderMenu();
  });
  el.menuBody.querySelectorAll("[data-gear-stat]").forEach(control => control.onchange = () => {
    gearBrowser.stats = control.checked
      ? [...new Set([...gearBrowser.stats, control.dataset.gearStat])]
      : gearBrowser.stats.filter(key => key !== control.dataset.gearStat);
    if (control.checked) {
      gearBrowser.sort = gearSortForStat(control.dataset.gearStat);
      gearBrowser.direction = "desc";
    }
    selectedGearRef = null;
    renderMenu();
  });
  el.menuBody.querySelectorAll("[data-gear-stat-match]").forEach(button => button.onclick = () => {
    gearBrowser.statMatch = button.dataset.gearStatMatch;
    selectedGearRef = null;
    renderMenu();
  });
  el.menuBody.querySelectorAll("[data-gear-affix]").forEach(control => control.onchange = () => {
    gearBrowser.affixes = control.checked
      ? [...new Set([...gearBrowser.affixes, control.dataset.gearAffix])]
      : gearBrowser.affixes.filter(key => key !== control.dataset.gearAffix);
    if (control.checked) {
      gearBrowser.sort = `affix:${control.dataset.gearAffix}`;
      gearBrowser.direction = "desc";
    }
    selectedGearRef = null;
    renderMenu();
  });
  el.menuBody.querySelectorAll("[data-gear-match]").forEach(button => button.onclick = () => {
    gearBrowser.affixMatch = button.dataset.gearMatch;
    selectedGearRef = null;
    renderMenu();
  });
  const sort = el.menuBody.querySelector("[data-gear-sort]");
  if (sort) sort.onchange = () => { gearBrowser.sort = sort.value; selectedGearRef = null; renderMenu(); };
  const direction = el.menuBody.querySelector("[data-gear-direction]");
  if (direction) direction.onchange = () => { gearBrowser.direction = direction.value; selectedGearRef = null; renderMenu(); };
  el.menuBody.querySelector("[data-gear-clear]")?.addEventListener("click", () => { resetGearBrowser(); renderMenu(); });
  const filterPanel = el.menuBody.querySelector("[data-gear-filter-panel]");
  const sortPanel = el.menuBody.querySelector("[data-gear-sort-panel]");
  if (filterPanel) filterPanel.ontoggle = () => {
    gearBrowser.filterOpen = filterPanel.open;
    if (filterPanel.open && sortPanel) {
      gearBrowser.sortOpen = false;
      sortPanel.open = false;
    }
  };
  if (sortPanel) sortPanel.ontoggle = () => {
    gearBrowser.sortOpen = sortPanel.open;
    if (sortPanel.open && filterPanel) {
      gearBrowser.filterOpen = false;
      filterPanel.open = false;
    }
  };
}

function lootThemeForMap(mapId = state.map) {
  const region = mapRegion(mapId);
  if (/Reverie|False Dawn/.test(region)) return "ruins";
  if (/Guildspire|Ember/.test(region)) return "mountain";
  if (state.ngPlus > 0 || /Dawn/.test(region)) return "dragon";
  return "swamp";
}

function rollEquipmentRarity(enemyUnit) {
  const roll = Math.random();
  const elite = enemyUnit?.resistanceTier === "elite";
  const boss = enemyUnit?.resistanceTier === "boss";
  if (state.ngPlus > 0) {
    const legendaryChance = Math.min(.58, .2 + Math.max(1, state.ngPlus) * .09 + (boss ? .12 : elite ? .06 : 0));
    return roll < legendaryChance ? "Legendary" : "Epic";
  }
  if (boss) return roll < .18 ? "Legendary" : roll < .68 ? "Epic" : "Rare";
  if (elite) return roll < .16 ? "Epic" : roll < .62 ? "Rare" : "Uncommon";
  return roll < .08 ? "Epic" : roll < .38 ? "Rare" : "Uncommon";
}

const inventoryDb = {
  "Marla's Soup": { type: "Food / HP", desc: "Restores 24 HP to a chosen hero, in or outside battle.", battle: "hp", field: "hp", value: 24, short: "HP +24" },
  "Clockwork Tonic": { type: "Tonic / MP", desc: "Restores 18 MP to a chosen hero, in or outside battle.", battle: "mp", field: "mp", value: 18, short: "MP +18" },
  "Emberheart Stew": { type: "NG+ Food / HP", desc: "Restores 70 HP to a chosen hero, in or outside battle.", battle: "hp", field: "hp", value: 70, short: "HP +70" },
  "Resonance Draught": { type: "NG+ Tonic / MP", desc: "Restores 50 MP to a chosen hero, in or outside battle.", battle: "mp", field: "mp", value: 50, short: "MP +50" },
  "Royal Ember Stew": { type: "NG+ Royal Food / HP", desc: "Restores 110 HP to a chosen hero, in or outside battle.", battle: "hp", field: "hp", value: 110, short: "HP +110" },
  "Grand Resonance Draught": { type: "NG+ Grand Tonic / MP", desc: "Restores 75 MP to a chosen hero, in or outside battle.", battle: "mp", field: "mp", value: 75, short: "MP +75" },
  "Ash Ward": { type: "Ward / Guard", desc: "Halves incoming party damage for one enemy turn. Outside battle it prepares an opening ward.", battle: "guard", field: "guard", value: 1, short: "Party Guard" },
  "Old Registry Key": { type: "Key Item", desc: "Opens an old registry lock in the Ash Quarter." },
  "Ledger Scrap": { type: "Battle Loot", desc: "Discarded ledger paper. Useful to collectors and clerks." },
  "Iron Chain Link": { type: "Quest Material", desc: "A sturdy repair part requested by Marla." },
  "Broken Wax Seal": { type: "Battle Loot", desc: "A clergy seal with its command broken." },
  "Ash Ink": { type: "Quest Material", desc: "Ink recovered from High Administrator Thaddeus." },
  "Resonant Stone": { type: "Crafting Material", desc: "Stone that still hums after battle." },
  "False Dawn Cog": { type: "Rare Material", desc: "A calibrated cog from the False Dawn system." },
  "Loopglass Shard": { type: "New Game Plus Material", desc: "Glass that reflects a route the party has already survived." },
  "Stonewake Medal": { type: "New Game Plus Trophy", desc: "Stonewake proof that respect was earned in a second loop." },
  "Orphan Ember Thread": { type: "New Game Plus Material", desc: "Protective thread woven by the children of Reverie." },
  "Tempered Lockplate": { type: "Crafting Material", desc: "Armoured mechanism plating." },
  "Ancient Ember Scale": { type: "Rare Material", desc: "A warm scale carrying elder-dragon memory." },
  "Living Ash Ink": { type: "Rare Material", desc: "Ink that continues correcting its own record." },
  "Foreman's Black Ledger": { type: "Miniboss Trophy", desc: "The dock foreman's private record of moved names." },
  "Unclaimed Sigil": { type: "Rare Material", desc: "A protection sigil with nobody left to obey." },
  "Custodian Seal": { type: "Miniboss Trophy", desc: "Proof that the archive custodian was defeated." },
  "Redacted Testimony": { type: "Rare Material", desc: "A witness account that resists being erased." },
  "Null Calibration Shard": { type: "Rare Material", desc: "A fragment that cancels unstable magic." },
  "Sentinel Core": { type: "Boss Trophy", desc: "The dormant heart of a Dawn Gate Sentinel." }
};

function inventoryInfo(name) {
  return inventoryDb[name] || { type: "Field Loot", desc: "Battle loot or a quest material." };
}

const QUEST_INVENTORY_ITEMS = new Set(["Old Registry Key", "Iron Chain Link"]);

function gearSlotLabel(slot) {
  return { weapon: "Weapon", armour: "Armour", ring: "Ring", necklace: "Necklace", helmet: "Helmet" }[slot] || "Equipment";
}

function inventoryCategory(name) {
  const info = inventoryInfo(name);
  if (info.battle || info.field) return "consumables";
  if (QUEST_INVENTORY_ITEMS.has(name)) return "quest";
  return "treasure";
}

function inventoryTypeLabel(name) {
  const info = inventoryInfo(name);
  if (inventoryCategory(name) === "quest") return info.type === "Key Item" ? "Key Item" : "Quest Item";
  if (inventoryCategory(name) === "treasure") return "Treasure";
  if (/Food/i.test(info.type)) return "Food";
  if (/Tonic|Draught|MP/i.test(info.type)) return "Tonic";
  if (/Ward/i.test(info.type)) return "Ward";
  return "Consumable";
}

function lootItemDrop(name, amount = 1, stored = true) {
  return { kind: "item", name, amount, type: inventoryTypeLabel(name), stored };
}

function lootDropText(drop) {
  if (typeof drop === "string") return drop;
  const amount = drop.amount > 1 ? ` x${drop.amount}` : "";
  const location = drop.stored === false ? " / Marla's Stash" : "";
  return `${drop.name}${amount} [${drop.type}${location}]`;
}

function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

function lootDropHtml(drop) {
  if (typeof drop === "string") return `<span class="loot-drop"><strong>${escapeMarkup(drop)}</strong></span>`;
  const amount = drop.amount > 1 ? ` x${drop.amount}` : "";
  const rarityClass = drop.kind === "gear" ? ` rarity-${drop.rarity.toLowerCase()}` : "";
  const location = drop.stored === false ? " / STASH" : "";
  return `<span class="loot-drop"><strong class="${rarityClass.trim()}">${escapeMarkup(drop.name)}${amount}</strong><small>${escapeMarkup(drop.type)}${location}</small></span>`;
}

function lootSummaryContent(gold, drops) {
  const entries = [...(gold ? [{ kind: "gold", name: `${gold} G`, type: "Gold", amount: 1, stored: true }] : []), ...drops];
  if (!entries.length) return "No item drops.";
  return {
    text: entries.map(lootDropText).join(", "),
    html: `<span class="loot-drop-list">${entries.map(lootDropHtml).join("")}</span>`
  };
}

function inventoryIcon(name) {
  const itemIcons = { "Marla's Soup": 0, "Emberheart Stew": 0, "Royal Ember Stew": 0, "Clockwork Tonic": 1, "Resonance Draught": 1, "Grand Resonance Draught": 1, "Ash Ward": 2, "Old Registry Key": 3 };
  if (Number.isFinite(itemIcons[name])) return { sheet: "item", index: itemIcons[name] };
  const lootIcons = { "Ledger Scrap": 0, "Iron Chain Link": 1, "Broken Wax Seal": 2, "Ash Ink": 3, "Living Ash Ink": 3, "Resonant Stone": 4 };
  if (Number.isFinite(lootIcons[name])) return { sheet: "loot", index: lootIcons[name] };
  if (/ink/i.test(name)) return { sheet: "loot", index: 3 };
  if (/seal|testimony|ledger/i.test(name)) return { sheet: "loot", index: 2 };
  if (/stone|shard|core|scale|cog|plate/i.test(name)) return { sheet: "loot", index: 4 };
  return { sheet: "item", index: 4 };
}

function pixelIconHtml(sheet, index, className = "") {
  return `<span class="pixel-icon ${sheet}-icon icon-${index} ${className}" aria-hidden="true"></span>`;
}

function statLine(stats = {}) {
  return Object.entries(stats).map(([stat, value]) => `${stat.toUpperCase()} +${value}`).join(" / ") || "No stat bonus";
}

const baseJobs = {
  Verseborn: character("Verseborn", "Songweaver", "Sound", "#30283f", "#17131f", "#a87b42", { str: 8, agi: 10, mag: 15, stam: 9, echo: 14 }, ["Voice of Verse", "Ashcloak", "Promise Ring", "Cinder Star", "Songweaver Hood"], [
    skill("Attack", "melee", "Neutral", 12, 0, "A clean lute strike."),
    skill("Resonant Verse", "magic", "Sound", 25, 6, "Sound magic; adds Resonance."),
    skill("Shared Warning", "block", "Sound", -28, 8, "Party heal and guard."),
    skill("Hushed Refrain", "magic", "Sound", 18, 7, "Low Sound damage and Silence for 2 turns.", { status: { type: "silence", duration: 2, force: true } }),
    skill("ULT: The Name I Chose", "ultimate", "Sound", 78, 100, "Full-party songburst.")
  ]),
  Mira: character("Mira", "Whispering Arrow", "Shadow", "#12151d", "#050508", "#7e62a8", { str: 12, agi: 17, mag: 9, stam: 7, echo: 8 }, ["Twin Voidthorns", "Ashcloak", "Quiet Circuit", "Veln Crest Token", "Mira Top Hat"], [
    skill("Attack", "melee", "Neutral", 14, 0, "Twin dagger slash."),
    skill("Voidthorn Mark", "magic", "Shadow", 32, 5, "Marks and exploits weakness, with a devastating payoff against Shadow Exposed enemies.", { shadowExposureBonus: .6 }),
    skill("Silent Step", "melee", "Shadow", 20, 4, "Pushes one node back. Doubles Stun chance this turn and on Mira's next turn.", { doublesStunChance: true }),
    skill("Cut the Tongue", "melee", "Shadow", 28, 7, "A precise dirty strike that Silences and inflicts Shadow Exposed for 2 turns.", { status: { type: "silence", duration: 2, force: true }, extraStatuses: [{ type: "shadowExposed", duration: 2, force: true }] }),
    skill("ULT: Whispering Arrow", "ultimate", "Shadow", 92, 100, "Screen-darkening precision strike.")
  ]),
  Seerin: character("Seerin", "Flame's Shield", "Holy Fire", "#8d382e", "#9e3d20", "#f0d39a", { str: 13, agi: 7, mag: 11, stam: 18, echo: 10 }, ["Earth Shield", "Flameguard Plate", "Red Ember Band", "Cinder Star", "Stone Brow Guard"], [
    skill("Attack", "melee", "Neutral", 13, 0, "Sword and shield hit."),
    skill("Cinder Guard", "block", "Holy Fire", -26, 7, "Blocks and heals weakest ally."),
    skill("Starflame Cut", "magic", "Holy Fire", 34, 7, "Holy fire arc."),
    skill("Oathbreak", "magic", "Holy Fire", 22, 8, "Clears all enemy Resonance.", { enemyResonanceClear: true }),
    skill("Radiant Purge", "magic", "Holy Fire", 0, 7, "Remove one positive buff from one enemy.", { targetSide: "enemy", dispel: true }),
    skill("ULT: The Woman in the Door", "ultimate", "Holy Fire", 70, 100, "Party-wide shield and counterfire.")
  ]),
  Kael: character("Kael", "Silent Oath", "Sigil", "#ece0c6", "#d6c4ab", "#9a7a50", { str: 6, agi: 8, mag: 17, stam: 11, echo: 13 }, ["Staff & Sigil", "Ashcloak", "Promise Ring", "Cinder Star", "Stone Brow Guard"], [
    skill("Attack", "melee", "Neutral", 9, 0, "Staff strike."),
    skill("Quiet Rite", "magic", "Sigil", -36, 8, "Strong heal."),
    skill("Firebreak Sigil", "block", "Sigil", 0, 6, "Halves incoming damage."),
    skill("Quiet Tithe", "magic", "Sigil", 24, 9, "Removes half of the enemy's current Resonance and prevents gains for one action.", { enemyResonanceDrainRatio: .5, enemyResonanceLock: 1 }),
    skill("ULT: Oath Unbound", "ultimate", "Sigil", -90, 100, "Full heal and cleanse.")
  ]),
  Torren: character("Torren", "Stoneheart", "Earth", "#70472c", "#8a4d25", "#d87536", { str: 17, agi: 5, mag: 5, stam: 21, echo: 8 }, ["Earth Shield", "Stonewake Mantle", "Red Ember Band", "Cinder Star", "Stone Brow Guard"], [
    skill("Attack", "melee", "Neutral", 18, 0, "Shield bash."),
    skill("Foundation Break", "melee", "Earth", 40, 6, "Heavy Break buildup."),
    skill("Hold the Door", "block", "Earth", -18, 5, "Self heal and guard."),
    skill("Hearty Red Stew", "magic", "Heart", 0, 9, "Grant the whole party 20% Vampiric for 3 turns.", { targetSide: "party", partyWide: true, buffs: [{ type: "vampiric", duration: 3, value: .2 }] }),
    skill("ULT: Stone Does Not Stand Alone", "ultimate", "Earth", 85, 100, "Earthquake wall-breaker.")
  ]),
  Glimmer: character("Glimmer", "Gearmind", "Tech", "#e2768c", "#ee7e91", "#b9823e", { str: 7, agi: 14, mag: 18, stam: 6, echo: 12 }, ["Klik-Wrench 7", "Workshop Coat", "Quiet Circuit", "Gearheart Charm", "Glimmer Goggles"], [
    skill("Attack", "melee", "Neutral", 10, 0, "Wrench bonk."),
    skill("Klik-Wrench 7", "magic", "Tech", 44, 8, "Overclocked tech burst."),
    skill("Patch Job", "magic", "Tech", -24, 6, "Heal and stabilize."),
    skill("ULT: The Engineer Who Stayed", "ultimate", "Tech", 96, 100, "Retunes the battlefield itself.")
  ]),
  Sparky: character("Sparky", "Emberborn", "Ancient Fire", "#332846", "#7f4ad1", "#b66cff", { str: 7, agi: 13, mag: 16, stam: 8, echo: 16 }, ["Voice of Verse", "Workshop Coat", "Promise Ring", "Gearheart Charm", "Glimmer Goggles"], [
    skill("Ember Nip", "melee", "Ancient Fire", 14, 0, "Tiny bite. Old flame."),
    skill("Memory Flare", "magic", "Ancient Fire", 36, 7, "Burns false commands."),
    skill("Prrrp", "block", "Heart", -20, 5, "Morale heal."),
    skill("Emberblood", "magic", "Ancient Fire", 0, 8, "Grant one ally 25% Vampiric for 3 turns.", { targetSide: "ally", buffs: [{ type: "vampiric", duration: 3, value: .25 }] }),
    skill("ULT: Eternal Flame", "ultimate", "Ancient Fire", 88, 100, "Dragon memory erupts.")
  ])
};

const FLAMEGUARD_BASE_EVASION = {
  Verseborn: .05,
  Mira: .12,
  Seerin: .03,
  Kael: .05,
  Torren: .02,
  Glimmer: .08,
  Sparky: .08
};

const FLAMEGUARD_COMBAT_ROLES = {
  Verseborn: "utility",
  Mira: "dps",
  Seerin: "tank",
  Torren: "tank",
  Glimmer: "dps",
  Kael: "healer",
  Sparky: "hybrid"
};

const COMBAT_ROLE_ICON_INDEX = { dps: 0, tank: 1, healer: 2, utility: 3, hybrid: 4 };

function combatRoleKey(unit, enemySide = false) {
  if (!enemySide && unit?.id && FLAMEGUARD_COMBAT_ROLES[unit.id]) return FLAMEGUARD_COMBAT_ROLES[unit.id];
  const role = String(unit?.role || "hybrid").toLowerCase();
  if (["tank", "bruiser"].includes(role)) return "tank";
  if (["dps", "assassin"].includes(role)) return "dps";
  if (role === "healer") return "healer";
  if (["utility", "controller"].includes(role)) return "utility";
  return "hybrid";
}

function canGenerateBreak(unit) {
  if (!unit) return false;
  if (unit.id) return FLAMEGUARD_COMBAT_ROLES[unit.id] === "tank";
  return combatRoleKey(unit, true) === "tank";
}

const MAX_LEVEL = 40;
const MAX_BATTLE_ROUNDS = 20;
const BREAK_THRESHOLD = 3;
const BREAK_STR_COEFFICIENT = .35;
const XP_MULTIPLIER = 2;
const TRANSFORMATION_UNLOCK_LEVEL = 10;
const TALENT_POINT_LEVELS = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
const SKILL_MILESTONE_LEVELS = TALENT_POINT_LEVELS;
const BATTLE_RETRY_EVENTS = {
  harborWon: "harbor",
  clergyWon: "clergy",
  ravaWaveWon: "ravaWave",
  emberWon: "ember",
  dawnWon: "dawn",
  ngStonewakeWon: "ngStonewakeTrial",
  ngOrphanTrialWon: "ngOrphanTrial"
};
const talentTrees = {
  Verseborn: [
    talent(5, "Open Chorus", "critChance", .2, "All damaging commands gain a 20% chance to deal double damage."),
    talent(10, "Resonant Field", "aoeSkill", "Resonant Verse", "Resonant Verse strikes every living enemy."),
    talent(15, "Names Have Edges", "revealWeakness", true, "Enemy weaknesses become visible to the whole active party."),
    talent(20, "Every Name Returns", "newSkill", skill("ULT: Every Name Returns", "ultimate", "Sound", 118, 100, "A completed refrain that hits every enemy."), "Unlocks a new all-enemy ultimate.")
  ],
  Mira: [
    talent(5, "First Cut", "critChance", .2, "All damaging commands gain a 20% chance to deal double damage."),
    talent(10, "Voidthorn Rain", "aoeSkill", "Voidthorn Mark", "Voidthorn Mark strikes every living enemy."),
    talent(15, "Ledger Sight", "revealWeakness", true, "Enemy weaknesses become visible to the whole active party."),
    talent(20, "Between Two Names", "newSkill", skill("ULT: Between Two Names", "ultimate", "Shadow", 132, 100, "A double eclipse strike with high critical pressure."), "Unlocks a stronger precision ultimate.")
  ],
  Seerin: [
    talent(5, "Shieldheart", "healBoost", .3, "Healing commands restore 30% more HP."),
    talent(10, "Starflame Halo", "aoeSkill", "Starflame Cut", "Starflame Cut burns every living enemy."),
    talent(15, "Oathreader", "revealWeakness", true, "Enemy weaknesses become visible to the whole active party."),
    talent(20, "Chosen Family Aegis", "newSkill", skill("ULT: Chosen Family Aegis", "ultimate", "Holy Fire", 116, 100, "A shieldburst that strikes every enemy."), "Unlocks a new all-enemy ultimate.")
  ],
  Kael: [
    talent(5, "Mercy Without Permission", "healBoost", .4, "Healing commands restore 40% more HP."),
    talent(10, "Wide Sigil", "partyHeal", "Quiet Rite", "Quiet Rite restores HP to every living party member."),
    talent(15, "Discern the Command", "revealWeakness", true, "Enemy weaknesses become visible to the whole active party."),
    talent(20, "Shadowpriest", "newSkill", skill("ULT II: Shadowpriest", "ultimate", "Shadow", 0, 100, "Become the Shadowpriest for four actions and replace the normal kit.", { targetSide: "self", transform: "shadowpriest", ultimateIndex: 2 }), "Unlocks Kael's persistent Shadowpriest form.")
  ],
  Torren: [
    talent(5, "Faultline Instinct", "critChance", .2, "All damaging commands gain a 20% chance to deal double damage."),
    talent(10, "Foundation Quake", "aoeSkill", "Foundation Break", "Foundation Break strikes every living enemy."),
    talent(15, "Granite Memory", "blockTalent", .18, "Personal Defend blocks another 18 percentage points of incoming damage. Does not strengthen Party Guard."),
    talent(20, "The Mountain Chooses Us", "newSkill", skill("ULT: The Mountain Chooses Us", "ultimate", "Earth", 138, 100, "A battlefield-wide stone rupture."), "Unlocks a new all-enemy ultimate.")
  ],
  Glimmer: [
    talent(5, "Unsafe Overclock", "critChance", .2, "All damaging commands gain a 20% chance to deal double damage."),
    talent(10, "Scatterburst", "aoeSkill", "Klik-Wrench 7", "Klik-Wrench 7 strikes every living enemy."),
    talent(15, "Local Diagnostics", "revealWeakness", true, "Enemy weaknesses become visible to the whole active party."),
    talent(20, "Mech Form", "newSkill", skill("ULT II: Mech Form", "ultimate", "Tech", 0, 100, "Enter Mech Form for four actions and replace the normal kit.", { targetSide: "self", transform: "mech", ultimateIndex: 2 }), "Unlocks Glimmer's persistent Mech form.")
  ],
  Sparky: [
    talent(5, "Ember Mischief", "critChance", .2, "All damaging commands gain a 20% chance to deal double damage."),
    talent(10, "Memory Wildfire", "aoeSkill", "Memory Flare", "Memory Flare burns every living enemy."),
    talent(15, "Ancient Warmth", "battleRegenTalent", 18, "Sparky restores 18 extra HP after every victory."),
    talent(20, "First Flame Remembers", "newSkill", skill("ULT: First Flame Remembers", "ultimate", "Ancient Fire", 136, 100, "Ancient dragon memory engulfs every enemy."), "Unlocks a new all-enemy ultimate.")
  ]
};

const lateGameTalentChoices = {
  Verseborn: [
    talent(25, "Battle Hymn", "newSkill", skill("Battle Hymn", "magic", "Sound", 0, 9, "Party Damage Up for 3 turns.", { targetSide: "party", partyWide: true, buffs: [{ type: "damageUp" }] })),
    talent(25, "Sheltering Refrain", "newSkill", skill("Sheltering Refrain", "block", "Sound", 0, 9, "Party Defense Up for 3 turns.", { targetSide: "party", partyWide: true, buffs: [{ type: "defenseUp" }] })),
    talent(30, "Quick Tempo", "newSkill", skill("Quick Tempo", "magic", "Sound", 0, 10, "Party AGI Up for 3 turns.", { targetSide: "party", partyWide: true, buffs: [{ type: "agilityUp" }] })),
    talent(30, "Long Refrain", "buffDuration", 1, "Verseborn's timed buffs last 1 additional turn."),
    talent(35, "Encore", "newSkill", skill("Encore", "magic", "Sound", 0, 12, "Repeats the last support song once per battle.", { targetSide: "party", encore: true, oncePerBattle: "encore" })),
    talent(35, "Restorative Cadence", "newSkill", skill("Restorative Cadence", "magic", "Sound", -42, 12, "Heals all allies and raises Magic.", { targetSide: "party", partyWide: true, buffs: [{ type: "magicUp" }] })),
    talent(40, "Grand Crescendo", "newSkill", skill("ULT: Grand Crescendo", "ultimate", "Sound", 0, 100, "Party Damage Up and AGI Up.", { targetSide: "party", partyWide: true, buffs: [{ type: "damageUp" }, { type: "agilityUp" }] })),
    talent(40, "Finale Without End", "newSkill", skill("ULT: Finale Without End", "ultimate", "Sound", 154, 100, "All-enemy finale powered by active buffs.", { allEnemies: true, buffScaling: .1 }))
  ],
  Mira: [
    talent(25, "Venomous Edge", "newSkill", skill("Venomous Edge", "melee", "Shadow", 30, 7, "Physical damage with strong Poison.", { status: { type: "poison", chance: .95, potency: "strong", duration: 5 } })),
    talent(25, "Dreamdust", "newSkill", skill("Dreamdust", "magic", "Shadow", 8, 8, "Low damage with Sleep.", { status: { type: "sleep", chance: .9 } })),
    talent(30, "Lingering Venom", "statusDuration", { type: "poison", value: 2 }, "Mira's Poison lasts 2 additional turns."),
    talent(30, "Ambush", "afflictedDamage", .3, "Mira deals 30% more damage to afflicted enemies."),
    talent(35, "Toxicologist", "poisonDamage", .75, "Mira's Poison deals 75% more damage."),
    talent(35, "Unseen Opening", "afflictedCrit", .25, "Mira gains 25% critical chance against afflicted enemies."),
    talent(40, "Silent Execution", "newSkill", skill("ULT: Silent Execution", "ultimate", "Shadow", 128, 100, "Enormous bonus damage against afflicted enemies.", { afflictedBonus: .85 })),
    talent(40, "Night Without Footsteps", "newSkill", skill("ULT: Night Without Footsteps", "ultimate", "Shadow", 54, 100, "Hits all enemies and attempts Sleep.", { allEnemies: true, status: { type: "sleep", chance: 1 } }))
  ],
  Seerin: [
    talent(25, "Shield of Dawn", "newSkill", skill("Shield of Dawn", "block", "Holy Fire", 0, 9, "Party Defense Up.", { targetSide: "party", partyWide: true, buffs: [{ type: "defenseUp" }] })),
    talent(25, "Judgment Bash", "newSkill", skill("Judgment Bash", "melee", "Holy Fire", 31, 8, "Shield damage with Stun.", { status: { type: "stun", chance: .9 } })),
    talent(30, "Steadfast Light", "statusResistance", .2, "Seerin gains 20% status resistance."),
    talent(30, "Guardian's Answer", "guardCounter", .35, "After a personally defended hit, counter for 35% of Attack base damage. Party Guard alone does not trigger this."),
    talent(35, "Earthen Bastion", "newSkill", skill("Earthen Bastion", "block", "Holy Fire", 0, 12, "Party Defense Up and Party Guard.", { targetSide: "party", partyWide: true, buffs: [{ type: "defenseUp", duration: 4 }], grantsWard: true })),
    talent(35, "Dawnbreaker", "newSkill", skill("Dawnbreaker", "magic", "Holy Fire", 50, 12, "Hits all enemies with Stun chance.", { allEnemies: true, status: { type: "stun", chance: .55 } })),
    talent(40, "Aegis of Chosen Kin", "newSkill", skill("ULT: Aegis of Chosen Kin", "ultimate", "Holy Fire", 0, 100, "Party Guard, Defense Up and Damage Up.", { targetSide: "party", partyWide: true, grantsWard: true, buffs: [{ type: "defenseUp" }, { type: "damageUp" }] })),
    talent(40, "Judgment at the Door", "newSkill", skill("ULT: Judgment at the Door", "ultimate", "Holy Fire", 142, 100, "All-enemy judgment with Stun.", { allEnemies: true, status: { type: "stun", chance: .7 } }))
  ],
  Kael: [
    talent(25, "Blessing of Insight", "newSkill", skill("Blessing of Insight", "magic", "Sigil", 0, 8, "Party Magic Up.", { targetSide: "party", partyWide: true, buffs: [{ type: "magicUp" }] })),
    talent(25, "Purify", "newSkill", skill("Purify", "magic", "Sigil", 0, 7, "Removes one negative status from one ally.", { targetSide: "ally", cleanse: true })),
    talent(30, "Greater Rite", "newSkill", skill("Greater Rite", "magic", "Sigil", -48, 12, "Restores HP to every living ally.", { targetSide: "party", partyWide: true })),
    talent(30, "Consecrated Focus", "buffDuration", 1, "Kael's timed buffs last 1 additional turn."),
    talent(35, "Merciful Return", "newSkill", skill("Merciful Return", "magic", "Sigil", -36, 16, "Revives and heals the party.", { targetSide: "party", partyWide: true, revive: .35 })),
    talent(35, "Clear Command", "cleanseHeal", .2, "Purifying also restores 20% maximum HP."),
    talent(40, "Oath Restored", "newSkill", skill("ULT: Oath Restored", "ultimate", "Sigil", -120, 100, "Full-party heal, cleanse and Magic Up.", { targetSide: "party", partyWide: true, cleanse: true, buffs: [{ type: "magicUp" }] })),
    talent(40, "Second Dawn", "newSkill", skill("ULT: Second Dawn", "ultimate", "Sigil", -75, 100, "Revives all allies and raises Defense.", { targetSide: "party", partyWide: true, revive: .65, buffs: [{ type: "defenseUp" }] }))
  ],
  Torren: [
    talent(25, "Stoneguard", "newSkill", skill("Stoneguard", "block", "Earth", 0, 6, "Torren gains Strength Up and Defense Up.", { targetSide: "self", buffs: [{ type: "strengthUp", duration: 3 }, { type: "defenseUp", duration: 4 }] })),
    talent(25, "Quaking Blow", "newSkill", skill("Quaking Blow", "melee", "Earth", 38, 8, "Heavy damage with Stun.", { status: { type: "stun", chance: .9 } })),
    talent(30, "Granite Retort", "guardCounter", .5, "After a personally defended hit, counter for 50% of Attack base damage. Party Guard alone does not trigger this."),
    talent(30, "Unyielding", "statusResistance", .3, "Torren gains 30% status resistance."),
    talent(35, "Earthen Bastion", "newSkill", skill("Earthen Bastion", "block", "Earth", 0, 12, "Party Defense Up for 4 turns.", { targetSide: "party", partyWide: true, buffs: [{ type: "defenseUp", duration: 4 }] })),
    talent(35, "Faultline Roar", "newSkill", skill("Faultline Roar", "melee", "Earth", 48, 13, "Hits all enemies with Stun chance.", { allEnemies: true, status: { type: "stun", chance: .6 } })),
    talent(40, "Worldroot Stance", "newSkill", skill("ULT: Worldroot Stance", "ultimate", "Earth", 0, 100, "Party Guard and long Defense Up.", { targetSide: "party", partyWide: true, grantsWard: true, buffs: [{ type: "defenseUp", duration: 5 }] })),
    talent(40, "Mountain Answers", "newSkill", skill("ULT: Mountain Answers", "ultimate", "Earth", 156, 100, "All-enemy quake with Stun.", { allEnemies: true, status: { type: "stun", chance: .75 } }))
  ],
  Glimmer: [
    talent(25, "Shock Coil", "newSkill", skill("Shock Coil", "magic", "Tech", 38, 8, "Tech damage with Stun.", { status: { type: "stun", chance: .85 } })),
    talent(25, "Overclock", "newSkill", skill("Overclock", "magic", "Tech", 0, 9, "Party AGI Up.", { targetSide: "party", partyWide: true, buffs: [{ type: "agilityUp" }] })),
    talent(30, "Efficient Coil", "statusChance", { type: "stun", value: .2 }, "Glimmer gains 20% Stun application."),
    talent(30, "Stable Overclock", "buffDuration", 1, "Glimmer's timed buffs last 1 additional turn."),
    talent(35, "Turn the Dial", "newSkill", skill("Turn the Dial", "magic", "Tech", 0, 14, "Grants one immediate ally action.", { targetSide: "party", immediateTurn: true, oncePerBattle: "turnTheDial" })),
    talent(35, "Chain Lightning", "newSkill", skill("Chain Lightning", "magic", "Tech", 54, 13, "Hits all enemies and may Stun.", { allEnemies: true, status: { type: "stun", chance: .45 } })),
    talent(40, "Maximum Overclock", "newSkill", skill("ULT: Maximum Overclock", "ultimate", "Tech", 0, 100, "Party AGI Up and one immediate ally action.", { targetSide: "party", partyWide: true, buffs: [{ type: "agilityUp" }], immediateTurn: true, oncePerBattle: "maximumOverclock", appliesOverheated: true })),
    talent(40, "Impossible Engine", "newSkill", skill("ULT: Impossible Engine", "ultimate", "Tech", 160, 100, "All-enemy tech detonation.", { allEnemies: true, pierce: .3 }))
  ],
  Sparky: [
    talent(25, "Ember Crown", "newSkill", skill("Ember Crown", "magic", "Ancient Fire", 0, 8, "Sparky gains Magic Up for 4 turns.", { targetSide: "self", buffs: [{ type: "magicUp", duration: 4 }] })),
    talent(25, "Ancient Burst", "newSkill", skill("Ancient Burst", "magic", "Ancient Fire", 48, 10, "A focused elder-flame burst.")),
    talent(30, "Old Blood", "magicDamage", .18, "Sparky deals 18% more magical damage."),
    talent(30, "Bright Scales", "statusResistance", .2, "Sparky gains 20% status resistance."),
    talent(35, "Meteor Memory", "newSkill", skill("Meteor Memory", "magic", "Ancient Fire", 62, 14, "Ancient fire strikes every enemy.", { allEnemies: true })),
    talent(35, "Dragonheart", "buffDuration", 1, "Sparky's timed buffs last 1 additional turn."),
    talent(40, "Elder Ember", "newSkill", skill("ULT: Elder Ember", "ultimate", "Ancient Fire", 178, 100, "Focused elder flame that ignores defenses.", { pierce: .45 })),
    talent(40, "First Dragon's Roar", "newSkill", skill("ULT: First Dragon's Roar", "ultimate", "Ancient Fire", 150, 100, "Ancient flame engulfs every enemy.", { allEnemies: true }))
  ]
};

Object.entries(lateGameTalentChoices).forEach(([id, choices]) => talentTrees[id].push(...choices));

const earlyTalentAlternatives = {
  Verseborn: [
    talent(5, "Gentle Chorus", "healBoost", .25, "Healing restores 25% more HP."),
    talent(10, "Focused Verse", "magicDamage", .15, "All MAG attacks deal 15% more damage; Resonant Verse stays single-target."),
    talent(15, "Sustained Song", "buffDuration", 1, "Timed buffs last one additional action."),
    talent(20, "Chorus of Shelter", "newSkill", skill("ULT: Chorus of Shelter", "ultimate", "Sound", -70, 100, "Heal the party and grant Defense Up.", { partyWide: true, buffs: [{ type: "defenseUp" }] }))
  ],
  Mira: [
    talent(5, "Dagger Discipline", "physicalDamage", .15, "STR attacks deal 15% more damage."),
    talent(10, "Marked Prey", "afflictedDamage", .2, "Deal 20% more damage against enemies with a negative status."),
    talent(15, "Patient Venom", "statusDuration", { type: "poison", value: 1 }, "Poison lasts one extra action."),
    talent(20, "Veil of Blades", "newSkill", skill("ULT: Veil of Blades", "ultimate", "Shadow", 110, 100, "STR strike with strong Poison.", { scaling: "str", allEnemies: false, status: { type: "poison", chance: 1, potency: "strong" } }))
  ],
  Seerin: [
    talent(5, "Tempered Edge", "physicalDamage", .15, "STR attacks deal 15% more damage."),
    talent(10, "Steady Flame", "buffDuration", 1, "Timed buffs last one extra action."),
    talent(15, "Unbroken Light", "statusResistance", .15, "15% resistance to negative statuses."),
    talent(20, "Sanctuary", "newSkill", skill("ULT: Sanctuary", "ultimate", "Holy Fire", -65, 100, "Heal all allies and grant Party Guard.", { partyWide: true, grantsWard: true }))
  ],
  Kael: [
    talent(5, "Sigil Focus", "magicDamage", .15, "MAG attacks deal 15% more damage, including Shadowpriest."),
    talent(10, "Deep Rite", "healBoost", .3, "30% stronger healing; Quiet Rite stays single-target."),
    talent(15, "Enduring Faith", "buffDuration", 1, "Timed buffs last one extra action."),
    talent(20, "Radiant Covenant", "newSkill", skill("ULT: Radiant Covenant", "ultimate", "Sigil", -85, 100, "Heal and cleanse all allies.", { partyWide: true, cleanse: true }))
  ],
  Torren: [
    talent(5, "Crushing Weight", "physicalDamage", .15, "STR attacks deal 15% more damage."),
    talent(10, "Faultline Precision", "physicalDamage", .2, "20% more STR damage; Foundation Break stays single-target."),
    talent(15, "Stonewise", "revealWeakness", true, "Reveal and remember enemy weaknesses."),
    talent(20, "Mountain Shelter", "newSkill", skill("ULT: Mountain Shelter", "ultimate", "Earth", 0, 100, "Party Guard and Defense Up for four actions.", { targetSide: "party", partyWide: true, grantsWard: true, buffs: [{ type: "defenseUp", duration: 4 }] }))
  ],
  Glimmer: [
    talent(5, "Calibrated Reactor", "magicDamage", .15, "MAG attacks deal 15% more damage."),
    talent(10, "Focused Coil", "statusChance", { type: "stun", value: .25 }, "25% stronger Stun application; Klik-Wrench stays single-target."),
    talent(15, "Insulated Circuit", "statusResistance", .2, "20% resistance to negative statuses."),
    talent(20, "Emergency Rebuild", "newSkill", skill("ULT: Emergency Rebuild", "ultimate", "Tech", -75, 100, "Heal all allies and grant Magic Up.", { partyWide: true, buffs: [{ type: "magicUp" }] }))
  ],
  Sparky: [
    talent(5, "Focused Flame", "magicDamage", .15, "MAG attacks deal 15% more damage."),
    talent(10, "Kindled Core", "magicDamage", .2, "20% more MAG damage; Memory Flare stays single-target."),
    talent(15, "Ancient Sight", "revealWeakness", true, "Reveal and remember enemy weaknesses."),
    talent(20, "Hearthkeeper", "newSkill", skill("ULT: Hearthkeeper", "ultimate", "Heart", -65, 100, "Heal the party and grant Defense Up.", { partyWide: true, buffs: [{ type: "defenseUp" }] }))
  ]
};
Object.entries(earlyTalentAlternatives).forEach(([id, choices]) => talentTrees[id].push(...choices));

// Keep saved talent names intact while correcting the mechanics they describe.
Object.entries(baseJobs).forEach(([id, hero]) => {
  const skills = [...hero.skills, ...talentTrees[id].filter(t => t.type === "newSkill").map(t => t.value)];
  skills.forEach(sk => {
    if (id === "Torren" && sk.power > 0) sk.scaling = "str";
    if (id === "Mira" && sk.anim === "ultimate" && !sk.name.includes("Night Without")) sk.scaling = "str";
    if (sk.name === "Shared Warning") sk.partyWide = true;
    if (sk.name === "Hold the Door") sk.targetSide = "self";
    if (sk.name === "Foundation Break") sk.staggerPower = 3;
    if (sk.name === "ULT: Oath Unbound") {
      sk.partyWide = true;
      sk.cleanse = true;
      sk.desc = "Heal and cleanse all allies; grant Party Guard.";
    }
    if (sk.name === "ULT: The Woman in the Door") {
      sk.grantsWard = true;
      sk.desc = "Holy Fire damage and Party Guard.";
    }
    if (sk.name === "ULT: The Name I Chose") sk.allEnemies = true;
    if (sk.name === "ULT: Between Two Names") sk.desc = "STR-based eclipse strike against every enemy; uses your normal critical chance.";
    if (sk.name === "Voidthorn Mark") sk.desc = "MAG + half AGI Shadow damage. Deals 60% extra damage after Shadow Exposed triggers weakness.";
    if (sk.name === "Patch Job") sk.desc = "Heal the most wounded ally.";
    if (sk.pierce) sk.desc = sk.desc.replace("ignores defenses", "partially penetrates Defense Up");
    if (sk.buffs?.some(buff => buff.type === "agilityUp")) {
      sk.desc += sk.immediateTurn ? " Reorders remaining normal actions; extra action shares the party's 2-per-battle limit." : " Reorders remaining normal actions immediately; grants no extra action.";
    }
  });
  talentTrees[id].forEach(entry => {
    if (entry.type === "newSkill") entry.unlockDesc = entry.value.desc;
  });
});

const compactTalentTrees = {
  Verseborn: [
    talentNode(1, "Perfect Pitch", "magicDamage", .1, "Song and Word-Magic damage +10%."),
    talentNode(1, "Lingering Chorus", "buffDuration", 1, "Verseborn's buffs last 1 additional action."),
    talentNode(1, "Discordant Note", "debuffPotency", .15, "Verseborn's vulnerability and damage-reduction debuffs are 15% stronger."),
    talentNode(2, "Battle Hymn", "newSkill", skill("Battle Hymn", "magic", "Sound", 0, 8, "Raise party physical and magical damage by 10% for 3 actions.", { targetSide: "party", partyWide: true, buffs: [{ type: "damageUp", value: .1, duration: 3 }] })),
    talentNode(2, "Resonant Field", "aoeSkill", "Resonant Verse", "Resonant Verse becomes an area spell that damages every living enemy."),
    talentNode(2, "Resonance", "weaponSongBoost", .2, "After a weapon Basic Attack effect triggers, the next Song gains 20% potency."),
    talentNode(3, "Echoing Verse", "splashDamage", .35, "Single-target offensive Songs splash 35% damage to other enemies."),
    talentNode(3, "Second Chorus", "secondaryBuff", .08, "Party buffs also grant a smaller 8% secondary offense or defense buff."),
    talentNode(3, "Broken Rhythm", "debuffAgility", .15, "Enemies affected by Verseborn's debuffs lose 15% AGI."),
    talentNode(4, "Grand Performance", "openingBuffPotency", .25, "Verseborn's party buffs are 25% stronger during their first action."),
    talentNode(4, "Words Have Weight", "wordPierce", .25, "Word-Magic ignores 25% of magical resistance effects."),
    talentNode(4, "Final Refrain", "finalRefrain", .35, "When a Verseborn buff expires, it restores a small amount of HP and MP."),
    talentNode(5, "Maestro of Flame", "ultimateBoost", .3, "Ultimate I gains 30% potency and grants the party Echo Power."),
    talentNode(5, "Voice of Ruin", "newSkill", skill("ULT II: Voice of Ruin", "ultimate", "Sound", 0, 100, "2.7x MAG to all enemies and reduce magical resistance.", { coefficient: 2.7, allEnemies: true, ultimateIndex: 2, status: { type: "magicDefenseDown", chance: 1, duration: 3, value: .25 } })),
    talentNode(5, "Endless Song", "supportPotency", .25, "Party support effects gain 25% potency and last 1 additional action."),
  ],
  Mira: [
    talentNode(1, "Killer Instinct", "critChance", .05, "+5% CRIT."),
    talentNode(1, "Quick Hands", "initiativeBoost", .15, "Mira gains 15% more initiative from AGI."),
    talentNode(1, "Open Wound", "critBleed", .45, "Critical hits have a 45% chance to inflict Bleed."),
    talentNode(2, "Marked for Death", "newSkill", skill("Marked for Death", "magic", "Shadow", 0, 6, "Light Shadow damage and Mark the target for 4 actions.", { coefficient: .65, status: { type: "marked", chance: 1, duration: 4, value: .12 } })),
    talentNode(2, "Shadowstep", "evasionAfterDodge", .5, "After avoiding an attack, Mira gains +50% CRIT on her next attack."),
    talentNode(2, "Voidthorn Rain", "aoeSkill", "Voidthorn Mark", "Voidthorn Mark becomes an area spell that damages every living enemy."),
    talentNode(3, "Executioner", "lowHpDamage", .25, "Deal 25% more damage to enemies below 35% HP."),
    talentNode(3, "Twin Fang", "basicTwinStrike", .45, "Normal Attack has a 45% chance to add a second strike at 45% power."),
    talentNode(3, "Void Weakness", "shadowResistanceDown", .15, "Shadow attacks can reduce magical resistance for 2 actions."),
    talentNode(4, "Predator's Rhythm", "critCostReduction", .25, "A critical hit reduces the MP cost of Mira's next skill by 25%."),
    talentNode(4, "Perfect Opening", "markedCritDamage", .35, "Critical hits against Marked enemies deal 35% additional critical damage."),
    talentNode(4, "Fade Into Shadow", "killEvasion", .35, "After defeating an enemy, gain +35% Evasion for the next 2 incoming direct attacks."),
    talentNode(5, "Assassination", "ultimateBoost", .4, "Ultimate I gains 40% potency against a single target, with stronger execution damage."),
    talentNode(5, "Queen of Knives", "assassinSynergy", .3, "Mark, Bleed and critical interactions gain 30% potency."),
    talentNode(5, "Voidwalker", "newSkill", skill("ULT II: Voidwalker", "ultimate", "Shadow", 0, 100, "Enter a 4-action Void state with major AGI, CRIT and Shadow damage.", { targetSide: "self", ultimateIndex: 2, buffs: [{ type: "agilityUp", value: .4, duration: 4 }, { type: "critUp", value: .18, duration: 4 }, { type: "shadowUp", value: .3, duration: 4 }] })),
  ],
  Seerin: [
    talentNode(1, "Shield Discipline", "blockTalent", .12, "Personal Defend blocks 12 percentage points more damage."),
    talentNode(1, "Sacred Flame", "holyFireDamage", .1, "Holy Fire attacks gain 10% potency."),
    talentNode(1, "Protector", "woundedProtection", .15, "Protection effects are 15% stronger on critically wounded allies."),
    talentNode(2, "Guardian's Oath", "newSkill", skill("Guardian's Oath", "block", "Holy Fire", 0, 7, "Reduce incoming party damage by 18% for 3 actions.", { targetSide: "party", partyWide: true, buffs: [{ type: "defenseUp", value: .18, duration: 3 }] })),
    talentNode(2, "Radiant Strike", "newSkill", skill("Radiant Strike", "melee", "Holy Fire", 0, 6, "1.15x STR + 0.575x MAG and apply Holy Vulnerability.", { coefficient: 1.15, status: { type: "holyVulnerability", chance: 1, duration: 2, value: .2 } })),
    talentNode(2, "Cinder Sanctuary", "partyHeal", "Cinder Guard", "Cinder Guard heals every living ally. Their next damaging action adds 10% Holy damage."),
    talentNode(3, "Intercept", "intercept", .35, "35% chance to intercept attacks aimed at allies below 35% HP."),
    talentNode(3, "Cleansing Flame", "selfCleanse", 1, "Holy abilities remove one negative status from Seerin."),
    talentNode(3, "Shield Bash", "staggerBonus", 2, "Defensive melee attacks deal +2 Break."),
    talentNode(4, "Unbroken Line", "wardBoost", .15, "Party protection effects reduce 15% additional damage."),
    talentNode(4, "Retribution", "guardCounter", .35, "A personally Guarded hit retaliates for 35% Basic Attack damage."),
    talentNode(4, "Burning Aegis", "thorns", .25, "Guarding reflects 25% of melee damage taken."),
    talentNode(5, "Flameguard Charge", "newSkill", skill("ULT II: Flameguard Charge", "ultimate", "Holy Fire", 0, 100, "2.7x STR + 1.35x MAG with massive Break; Seerin remains Guarded.", { coefficient: 2.7, scaling: "str", ultimateIndex: 2, staggerPower: 5, selfGuard: true })),
    talentNode(5, "Cinder Star Aegis", "newSkill", skill("ULT II: Cinder Star Aegis", "ultimate", "Holy Fire", 0, 100, "Grant a powerful party barrier and damage reduction.", { targetSide: "party", partyWide: true, ultimateIndex: 2, grantsWard: true, buffs: [{ type: "barrier", value: .35, duration: 4 }, { type: "defenseUp", value: .2, duration: 4 }] })),
    talentNode(5, "Last Bastion", "lastBastion", 1, "Once per battle, prevent an ally from being knocked out and leave them at 1 HP."),
  ],
  Torren: [
    talentNode(1, "Granite Skin", "stamHpBonus", 1, "Each STAM grants Torren 1 additional Max HP."),
    talentNode(1, "Heavy Hands", "staggerBonus", 1, "Attacks deal +1 Break."),
    talentNode(1, "Stone Memory", "earthCostReduction", .15, "Earth abilities cost 15% less MP."),
    talentNode(2, "Earthen Guard", "newSkill", skill("Earthen Guard", "block", "Earth", 0, 6, "Gain a personal stone barrier for 4 actions.", { targetSide: "self", buffs: [{ type: "barrier", value: .3, duration: 4 }] })),
    talentNode(2, "Concussive Blow", "basicBreak", 2, "Normal Attack deals +2 Break."),
    talentNode(2, "Foundation Quake", "aoeSkill", "Foundation Break", "Foundation Break becomes an area attack that damages every living enemy."),
    talentNode(3, "Fault Line", "newSkill", skill("Fault Line", "melee", "Earth", 0, 11, "1.25x STR + 0.625x STAM to all enemies with high Break.", { coefficient: 1.25, allEnemies: true, staggerPower: 3 })),
    talentNode(3, "Rockslide", "brokenDamage", .2, "Deal 20% more physical damage to recently Broken enemies."),
    talentNode(3, "Cover Me", "intercept", .25, "25% chance to absorb an attack intended for a wounded ally."),
    talentNode(4, "Living Mountain", "barrierBoost", .25, "Torren's barriers are 25% stronger."),
    talentNode(4, "Aftershock", "aftershock", .3, "Heavy Earth attacks trigger a 30% shockwave against other enemies."),
    talentNode(4, "Stonefury", "damageResonance", .25, "Taking damage generates 25% more Resonance."),
    talentNode(5, "Mountain Stands", "newSkill", skill("ULT II: Mountain Stands", "ultimate", "Earth", 0, 100, "Grant long Party Guard and a powerful barrier.", { targetSide: "party", partyWide: true, ultimateIndex: 2, grantsWard: true, buffs: [{ type: "barrier", value: .35, duration: 5 }] })),
    talentNode(5, "Worldbreaker", "newSkill", skill("ULT II: Worldbreaker", "ultimate", "Earth", 0, 100, "2.75x STR + 1.375x STAM to all enemies with extreme Break.", { coefficient: 2.75, scaling: "str", allEnemies: true, ultimateIndex: 2, staggerPower: 5 })),
    talentNode(5, "Immovable Object", "defendBoost", .2, "Defend and personal Guard gain 20 percentage points of reduction."),
  ],
  Glimmer: [
    talentNode(1, "Overclocked Tools", "techDamage", .1, "Tech damage +10%."),
    talentNode(1, "Efficient Engineering", "techCostReduction", .12, "Tech skills cost 12% less MP."),
    talentNode(1, "Dirty Wrench", "basicDebuffDuration", 1, "Debuffs from Glimmer's weapon Basic Attack last 1 additional action."),
    talentNode(2, "Combat Drone", "newSkill", skill("Combat Drone", "magic", "Tech", 0, 9, "Deploy a drone that follows Glimmer's attacks for the battle.", { targetSide: "self", buffs: [{ type: "combatDrone", value: .25, duration: 99 }] })),
    talentNode(2, "Patch Network", "partyHeal", "Patch Job", "Patch Job heals every living ally and grants each of them Combat Drone for 2 actions."),
    talentNode(2, "Disruptor Coil", "techDisrupt", .35, "Tech attacks have a 35% chance to reduce enemy damage."),
    talentNode(3, "Dual Drone Protocol", "dronePower", .5, "Combat Drone deals 50% more damage and can strike a second target."),
    talentNode(3, "Arc Reactor", "aoeDamage", .15, "Tech area attacks deal 15% more damage."),
    talentNode(3, "Reinforced Frame", "gadgetDefense", .15, "Gadget buffs also grant Glimmer 15% damage reduction."),
    talentNode(4, "Mech Calibration", "mechPower", .2, "Mech offensive stats gain 20% potency."),
    talentNode(4, "Titanium Chassis", "mechDefense", .15, "Mech Form gains 15% additional damage reduction."),
    talentNode(4, "Overloaded Systems", "mechOverload", .25, "Mech skills deal 25% more damage but cost 15% more MP."),
    talentNode(5, "Maximum Overdrive", "mechCapstone", .4, "Mech damage and Mech Ultimate potency increase by 40%."),
    talentNode(5, "Fortress Protocol", "fortressCapstone", .25, "Mech survivability and protection effects increase by 25%."),
    talentNode(5, "Mad Inventor", "gadgetCapstone", .35, "Normal-form gadgets, drones and Ultimate I gain 35% potency."),
  ],
  Kael: [
    talentNode(1, "Gentle Hand", "healBoost", .15, "Kael's healing gains 15% potency."),
    talentNode(1, "Sacred Barrier", "barrierBoost", .2, "Kael's barriers are 20% stronger."),
    talentNode(1, "Dark Whisper", "shadowpriestDamage", .1, "Shadowpriest offensive spells deal 10% more damage."),
    talentNode(2, "Communal Rite", "partyHeal", "Quiet Rite", "Quiet Rite heals every living ally and grants them 12% Damage Reduction for 2 actions."),
    talentNode(2, "Purification", "newSkill", skill("Purification", "magic", "Sigil", 0, 7, "Remove one negative status from one ally.", { targetSide: "ally", cleanse: true })),
    talentNode(2, "Void Lance", "shadowSkillUnlock", "Void Lance", "Shadowpriest unlocks the strong single-target Void Lance spell."),
    talentNode(3, "Guardian Saint", "buffDuration", 1, "Kael's party defensive buffs last 1 additional action."),
    talentNode(3, "Umbral Wave", "shadowSkillUnlock", "Umbral Wave", "Shadowpriest unlocks strong area Shadow magic."),
    talentNode(3, "Twilight Balance", "wardResonance", .25, "Preventing party damage generates 25% more Resonance."),
    talentNode(4, "Divine Shelter", "ultimateBoost", .3, "Ultimate I gains 30% healing and protection potency."),
    talentNode(4, "Soul Rend", "shadowSkillUnlock", "Soul Rend", "Shadowpriest unlocks Soul Rend and magical vulnerability."),
    talentNode(4, "Long Night", "transformDuration", 1, "Shadowpriest lasts 1 additional action."),
    talentNode(5, "Saint of the Flame", "saintCapstone", .4, "Normal Kael's healing, barriers and Ultimate I gain 40% potency."),
    talentNode(5, "Prince of Shadows", "shadowCapstone", .35, "Shadowpriest MAG and Ultimate potency increase by 35%."),
    talentNode(5, "Twilight Priest", "twilightCapstone", 1, "Shadowpriest retains Quiet Rite; normal Kael gains Void Lance."),
  ],
  Sparky: [
    talentNode(1, "Hotter Than He Looks", "ancientFireDamage", .1, "Ancient Fire damage +10%."),
    talentNode(1, "Tiny Terror", "initiativeBoost", .15, "Sparky gains 15% more initiative from AGI."),
    talentNode(1, "Smolder", "burnDamage", .4, "Burn inflicted by Sparky deals 40% more damage."),
    talentNode(2, "Ember Bite", "newSkill", skill("Ember Bite", "melee", "Ancient Fire", 0, 6, "1.25x STR and inflict Burn.", { coefficient: 1.25, status: { type: "burn", chance: .8, duration: 4 } })),
    talentNode(2, "Memory Wildfire", "aoeSkill", "Memory Flare", "Memory Flare becomes an area spell that damages every living enemy."),
    talentNode(2, "Ancient Spark", "ultimateGain", .25, "Ancient Fire attacks generate 25% more Resonance."),
    talentNode(3, "Dragon Memory", "elderDamage", .18, "Spectral Elder Dragon attacks gain 18% potency."),
    talentNode(3, "Hungry Flame", "burningDamage", .25, "Deal 25% more damage to Burning enemies."),
    talentNode(3, "Smoke Trail", "fireEvasion", .25, "Ancient Fire and Holy Fire actions have a 25% chance to grant +25% Evasion for the next 2 incoming direct attacks."),
    talentNode(4, "Elder Blood", "echoEffectiveness", .5, "ECHO is 50% more effective on Sparky's Ultimates."),
    talentNode(4, "Inferno Heart", "burnDamage", .5, "Burn damage gains another 50% potency."),
    talentNode(4, "Little Apocalypse", "aoeDamage", .2, "Ancient Fire area attacks deal 20% more damage."),
    talentNode(5, "Elder Ember Awakened", "ultimateBoost", .4, "Spectral Elder Dragon Ultimates gain 40% potency."),
    talentNode(5, "Living Wildfire", "livingWildfire", .5, "Burn damage and spreading gain 50% potency."),
    talentNode(5, "Tiny Dragon, Huge Problem", "burstCapstone", .2, "Single-target Ember damage +20% and CRIT +8%."),
  ]
};

compactTalentTrees.Glimmer = [
  talentNode(1, "Field Medic", "patchHealing", .2, "Patch Job healing +20%."),
  talentNode(1, "Overclocked Tools", "droneBaseBonus", .1, "Combat Drone base follow-up potency increases from 25% to 35%."),
  talentNode(1, "Dirty Wrench", "scrambleDuration", 1, "Scramble Signal lasts 1 additional action."),
  talentNode(2, "Patch Network", "partyHeal", "Patch Job", "Patch Job heals all living allies and gives each Combat Drone for 2 actions."),
  talentNode(2, "Dual Drone Protocol", "dronePower", .5, "Drone potency +50%; a second enemy takes 50% of the normal follow-up damage."),
  talentNode(2, "Disruptor Coil", "techDisrupt", .35, "Direct Tech hits have a 35% chance to apply Disrupted 15% for 2 actions."),
  talentNode(3, "Emergency Plating", "patchBarrier", .2, "Patch Job gives healed allies below 50% HP a 20% Barrier for 2 actions."),
  talentNode(3, "Reinforced Frame", "gadgetDefense", .15, "While Glimmer has Combat Drone, she takes 15% less damage."),
  talentNode(3, "Feedback Loop", "techResonanceDrain", 10, "The first direct Tech hit against a Disrupted enemy each action removes 10 enemy Resonance."),
  talentNode(4, "Mobile Clinic", "mechClinic", .25, "After each Mech action, heal the most wounded living ally for 0.25x MAG."),
  talentNode(4, "Carrier Chassis", "mechCarrier", .25, "Damaging Mech actions trigger Combat Drone with 25% increased potency; Dual Drone Protocol still applies."),
  talentNode(4, "EMP Array", "mechEmp", .2, "Damaging Mech actions apply or refresh Disrupted 20% for 2 actions on the primary target."),
  talentNode(5, "Mobile Hospital", "mobileHospital", .4, "Mobile Clinic heals 0.40x MAG and grants 15% Barrier for 2 actions below 50% HP. Patch Job healing +15%."),
  talentNode(5, "Swarm Intelligence", "droneSwarm", .6, "After the normal follow-up, add a 60% strike; with Dual Drone Protocol it can hit another living enemy."),
  talentNode(5, "System Crash", "systemCrash", .15, "Disrupted enemies take 15% more Tech damage from Glimmer. Feedback Loop removes 20 Resonance."),
];
compactTalentTrees.Seerin = [
  talentNode(1, "Sacred Flame", "holyFireDamage", .1, "Holy Fire damage +10%."),
  talentNode(1, "Shield Discipline", "blockTalent", .12, "Personal Defend gains 12 percentage points of damage reduction."),
  talentNode(1, "Protector", "woundedProtection", .15, "Healing and protection are 15% stronger on allies below 35% HP."),
  talentNode(2, "Radiant Brand", "starflameBrand", .2, "Starflame Cut applies Holy Vulnerability 20% for 2 actions."),
  talentNode(2, "Shield Bash", "shieldBash", .2, "With Shieldbreaker Oath, normal Attack gains another +1 Break. Attack deals 20% more damage against Broken enemies."),
  talentNode(2, "Cinder Sanctuary", "partyHeal", "Cinder Guard", "Cinder Guard heals all living allies and grants Holy Follow-up 10% for their next damaging action."),
  talentNode(3, "Purifying Oath", "purifyingOath", .2, "Holy Fire potency +20% at 0 enemy Resonance. The first qualifying hit each action cleanses one negative status from Seerin."),
  talentNode(3, "Retribution", "guardCounter", .35, "A personally Guarded hit counters for 35% normal Attack damage and adds +1 Break."),
  talentNode(3, "Sacred Constitution", "sacredConstitution", .5, "STAM counts as 150% for Max HP; bonus MAG equals 25% total STAM."),
  talentNode(4, "Radiant Judgment", "radiantJudgment", 25, "Radiant Purge dispels one buff, removes 25 enemy Resonance and grants Seerin Holy Follow-up 15%."),
  talentNode(4, "Burning Aegis", "thorns", .25, "Personal Guard reflects 25% received melee damage and adds +1 Break."),
  talentNode(4, "Hold the Line", "bulwarkTaunt", 1, "Bulwark Taunts all living enemies until Seerin's next action; AoE and enemy support keep normal targeting."),
  talentNode(5, "Oathfire Ascendant", "oathfireAscendant", .3, "The Woman in the Door gains 30% potency against 0-Resonance or Holy-Vulnerable enemies, ending them at 0 Resonance. Party Guard remains."),
  talentNode(5, "Flameguard Charge", "flameguardCharge", 5, "The Woman in the Door adds +5 Break to its primary target and grants Seerin Personal Guard. Holy Fire and Party Guard remain."),
  talentNode(5, "Last Bastion", "lastBastion", 1, "Once per battle, prevent a fatal ally hit and leave them at 1 HP."),
];
compactTalentTrees.Sparky = [
  talentNode(1, "Warm Little Heart", "prrrpHealing", .2, "Prrrp healing +20%."),
  talentNode(1, "Tough Little Scales", "interceptReduction", .15, "Tiny Dragon, Big Problem intercepts take another 15% less damage."),
  talentNode(1, "Smolder", "burnDuration", 1, "Burn applied by Sparky lasts 1 additional action."),
  talentNode(2, "Shared Warmth", "emberDefense", .1, "Emberblood also grants its target Defense Up 10% for 3 actions."),
  talentNode(2, "Smoke Trail", "interceptEvasion", .3, "After a successful intercept, gain 30% Evasion for the next incoming direct attack."),
  talentNode(2, "Ember Bite", "emberNipBurn", .8, "Ember Nip gains an 80% base chance to apply Burn for 4 actions."),
  talentNode(3, "Ember Bond", "emberBond", .25, "Emberblood Vampiric healing also heals Sparky for 25% of HP actually restored."),
  talentNode(3, "Brave Little Thing", "interceptResonance", 12, "Each successful intercept generates +12 party Resonance."),
  talentNode(3, "Hungry Flame", "burningDamage", .25, "Direct Ancient Fire damage +25% against Burning enemies."),
  talentNode(4, "Ancient Comfort", "prrrpBarrier", .2, "Prrrp grants 20% Barrier for 2 actions to an ally below 50% HP."),
  talentNode(4, "Never Too Small", "interceptPrrrp", .25, "After intercepting, the next Prrrp within 2 actions costs 2 less MP and heals 25% more."),
  talentNode(4, "Inferno Heart", "burnRefresh", 1, "A direct Ancient Fire hit refreshes existing Burn to full duration, once per enemy each action."),
  talentNode(5, "Hearthfire", "hearthfire", .25, "Emberblood Vampiric healing heals the most wounded other living ally for 25% of restored HP."),
  talentNode(5, "Tiny Dragon, Huge Problem", "interceptCharges", 3, "Tiny Dragon, Big Problem can intercept 3 single-target attacks during its duration."),
  talentNode(5, "Living Wildfire", "deathBurnTransfer", .75, "When a Sparky-Burning enemy dies, transfer Burn to one living enemy with remaining duration and 75% tick potency."),
];

const HEAL_CONVERSION_BUFFS = {
  Seerin: { "Cinder Guard": { type: "holyFollowUp", value: .1, duration: 1, label: "Holy Follow-up", description: "their next damaging action adds 10% Holy damage" } },
  Glimmer: { "Patch Job": { type: "combatDrone", value: .4, duration: 2, label: "Combat Drone", description: "grants Combat Drone for 2 actions; it fires after each damaging action" } },
  Kael: { "Quiet Rite": { type: "defenseUp", value: .12, duration: 2, label: "12% Damage Reduction", description: "grants 12% Damage Reduction for 2 actions" } }
};

Object.keys(talentTrees).forEach(id => {
  talentTrees[id] = compactTalentTrees[id];
  baseJobs[id].skills[0].basicAttack = true;
});

// Ultimate I remains relevant throughout progression; these coefficients are
// strengthened further by level ranks and ECHO when the command is resolved.
Object.entries({
  Verseborn: { coefficient: 2.3, allEnemies: true },
  Mira: { coefficient: 2.55, scaling: "str", afflictedBonus: .35 },
  Seerin: { coefficient: 2.25, allEnemies: true, grantsWard: true, staggerPower: 3 },
  Torren: { coefficient: 2.5, scaling: "str", allEnemies: true, staggerPower: 4 },
  Glimmer: { coefficient: 2.35, allEnemies: true, status: { type: "defenseDown", chance: 1, duration: 3, value: .2 } },
  Sparky: { coefficient: 2.45, allEnemies: true, status: { type: "burn", chance: 1, duration: 4 } }
}).forEach(([id, upgrades]) => Object.assign(baseJobs[id].skills.find(entry => entry.anim === "ultimate"), upgrades));

baseJobs.Glimmer.skills.push(skill("ULT II: Mech Form", "ultimate", "Tech", 0, 100, "Enter a scaling Mech Form for four actions.", { targetSide: "self", transform: "mech", ultimateIndex: 2 }));
baseJobs.Kael.skills.push(skill("ULT II: Shadowpriest", "ultimate", "Shadow", 0, 100, "Enter a scaling Shadowpriest form for four actions.", { targetSide: "self", transform: "shadowpriest", ultimateIndex: 2 }));

const rank0MovedSkills = {
  Verseborn: "Hushed Refrain", Mira: "Cut the Tongue", Seerin: "Oathbreak",
  Torren: "Hearty Red Stew", Glimmer: "Patch Job", Kael: "Quiet Tithe", Sparky: "Emberblood"
};
const rank0Choices = {
  Verseborn: [
    skill("Crescendo Strike", "magic", "Sound", 0, 7, "1.4x MAG Sound damage to one enemy; 25% extra damage against an afflicted target.", { coefficient: 1.4, afflictedBonus: .25 }),
    skill("Rallying Chorus", "magic", "Sound", 0, 8, "Grant the living party 15% STR and MAG for 2 actions each.", { targetSide: "party", partyWide: true, buffs: [{ type: "strengthUp", value: .15, duration: 2 }, { type: "magicUp", value: .15, duration: 2 }] })
  ],
  Mira: [
    skill("Black Needle", "melee", "Shadow", 0, 6, "1.5x AGI Shadow damage to one enemy; critical hits deal 2.3x damage.", { coefficient: 1.5, scaling: "agi", rank0Agility: true, criticalMultiplier: 2.3 }),
    skill("Veiled Recovery", "magic", "Shadow", -25, 6, "Heal Mira for 25 + 0.8x MAG and grant 20% Evasion for 2 incoming attacks.", { targetSide: "self", healScaling: .8, buffs: [{ type: "evasion", value: .2, duration: 2 }] })
  ],
  Seerin: [
    { name: "Shieldbreaker Oath", passive: "attackBreak", desc: "Normal Attack gains +2 Break buildup. No extra action button." },
    skill("Bulwark of Faith", "magic", "Holy Fire", 0, 7, "Choose one ally: grant 25% damage reduction for 2 actions. Seerin intercepts their next single-target hostile attack.", { targetSide: "ally", protectsAlly: true, buffs: [{ type: "defenseUp", value: .25, duration: 2 }] })
  ],
  Torren: [
    skill("Faultline Smash", "melee", "Earth", 0, 7, "1.4x (STR + 0.5 STAM) damage; 30% extra damage against a Broken enemy or one with at least 2 Break buildup.", { coefficient: 1.4, rank0BreakPayoff: .3 }),
    skill("Mountain Stance", "magic", "Earth", 0, 6, "Guard Torren and grant 30% damage reduction for 3 actions.", { targetSide: "self", rank0Guard: true, buffs: [{ type: "defenseUp", value: .3, duration: 3 }] })
  ],
  Glimmer: [
    skill("Combat Drone", "magic", "Tech", 0, 9, "Deploy a drone that follows Glimmer's attacks for the battle.", { targetSide: "self", buffs: [{ type: "combatDrone", value: .25, duration: 99 }] }),
    skill("Scramble Signal", "magic", "Tech", 0, 7, "Disrupt one enemy: reduce outgoing damage by 20% for 2 actions. Deals no direct damage.", { statusOnly: true, status: { type: "disrupted", value: .2, duration: 2, force: true } })
  ],
  Kael: [
    skill("Sacred Focus", "magic", "Sigil", 0, 7, "Grant Kael or one ally 25% MAG for 3 actions.", { targetSide: "ally", buffs: [{ type: "magicUp", value: .25, duration: 3 }] }),
    skill("Umbral Brand", "magic", "Shadow", 0, 7, "One enemy takes 20% more Shadow damage for 3 actions. Complements Shadow Exposed; deals no direct damage.", { statusOnly: true, status: { type: "shadowVulnerability", value: .2, duration: 3, force: true } })
  ],
  Sparky: [
    skill("Tiny Dragon, Big Problem", "magic", "Ancient Fire", 0, 6, "Sparky gains 25% damage reduction for 2 actions and intercepts the next single-target hostile attack against one chosen ally.", { targetSide: "ally", protectsAlly: true, protectorDefense: .25 }),
    { name: "Old Flame", passive: "doubleBurn", desc: "Burn ticks applied by Sparky deal double damage. Initial hits and Burn durations are unchanged. No extra action button." }
  ]
};
Object.keys(rank0Choices).forEach(id => {
  const existing = baseJobs[id].skills.find(entry => entry.name === rank0MovedSkills[id]);
  rank0Choices[id].unshift({ ...existing, rank0: true });
  rank0Choices[id].forEach(entry => { entry.rank0 = true; });
});

function selectedRank0(id) {
  return rank0Choices[id]?.find(entry => entry.name === progressFor(id).rank0) || null;
}

function selectRank0(id, name) {
  if (mode === "battle" || !state.party.includes(id) || !rank0Choices[id]?.some(entry => entry.name === name)) return false;
  progressFor(id).rank0 = name;
  queueSave();
  playSfx("menu");
  updatePanels();
  renderMenu();
  return true;
}

function rank0ChoicesHtml(id) {
  const chosen = selectedRank0(id)?.name;
  return `<section class="talent-tier"><header><strong>Rank 0</strong><span>Choose one / no talent-point cost</span></header><div class="talent-tier-grid">${rank0Choices[id].map(entry => {
    const selected = chosen === entry.name;
    return `<button type="button" class="talent-choice ${selected ? "is-active" : ""}" data-rank0="${id}:${entry.name}" aria-pressed="${selected}"><span><strong>${entry.name}</strong><p>${entry.desc}</p><small>${entry.passive ? "Passive / no action button" : `${entry.cost} MP`} / 0 talent points</small><small>${selected ? "CHOSEN" : chosen ? "SWAP CHOICE" : "CHOOSE"}</small></span><b>${selected ? "ON" : chosen ? "SWAP" : "+"}</b></button>`;
  }).join("")}</div></section>`;
}

const STATUS_DEFS = {
  shadowVulnerability: { label: "SHADOW VULNERABILITY", short: "SH-", negative: true, duration: 3, value: .2 },
  rankProtection: { label: "ALLY PROTECTION", short: "COVER", buff: true, duration: 2, value: 1 },
  poison: { label: "POISON", short: "PSN", negative: true, duration: 4 },
  burn: { label: "BURN", short: "BRN", negative: true, duration: 4 },
  bleed: { label: "BLEED", short: "BLD", negative: true, duration: 3 },
  marked: { label: "MARKED", short: "MRK", negative: true, duration: 4, value: .12 },
  physicalVulnerability: { label: "PHYSICAL VULNERABILITY", short: "PV-", negative: true, duration: 3, value: .18 },
  magicVulnerability: { label: "MAGIC VULNERABILITY", short: "MV-", negative: true, duration: 3, value: .18 },
  agilityDown: { label: "AGILITY REDUCED", short: "AG-", negative: true, duration: 3, value: .15 },
  holyVulnerability: { label: "HOLY VULNERABILITY", short: "HV-", negative: true, duration: 2, value: .2 },
  critExposed: { label: "CRIT EXPOSED", short: "CR-", negative: true, duration: 2, value: .12 },
  disrupted: { label: "DISRUPTED", short: "DSP", negative: true, duration: 3, value: .15 },
  sleep: { label: "SLEEP", short: "SLP", negative: true, duration: 5 },
  stun: { label: "STUN", short: "STN", negative: true, duration: 1 },
  silence: { label: "SILENCE", short: "SIL", icon: "S", negative: true, duration: 2 },
  broken: { label: "BROKEN", short: "BRK", icon: "!", negative: true, duration: 1 },
  shadowExposed: { label: "SHADOW EXPOSED", short: "SH-", icon: "V", negative: true, duration: 2 },
  strengthUp: { label: "STRENGTH UP", short: "STR", buff: true, duration: 3, value: .25 },
  magicUp: { label: "MAGIC UP", short: "MAG", buff: true, duration: 3, value: .25 },
  defenseUp: { label: "DEFENSE UP", short: "DEF", buff: true, duration: 3, value: .25 },
  defenseDown: { label: "DEFENSE REDUCED", short: "DF-", negative: true, duration: 3, value: .2 },
  magicDefenseDown: { label: "MAGIC DEFENSE REDUCED", short: "MR-", negative: true, duration: 3, value: .25 },
  mechGuard: { label: "REINFORCED CHASSIS", short: "RIG", buff: true, duration: 2, value: .25 },
  damageUp: { label: "DAMAGE UP", short: "DMG", buff: true, duration: 3, value: .15 },
  agilityUp: { label: "AGILITY UP", short: "AGI", buff: true, duration: 3, value: .25 },
  critUp: { label: "CRIT UP", short: "CRT", buff: true, duration: 3, value: .15 },
  shadowUp: { label: "SHADOW UP", short: "SHD", buff: true, duration: 3, value: .25 },
  echoPower: { label: "ECHO POWER", short: "ECH", buff: true, duration: 3, value: .2 },
  evasion: { label: "EVASION", short: "EVA", buff: true, duration: 2, value: .25 },
  barrier: { label: "BARRIER", short: "BAR", buff: true, duration: 3, value: .22 },
  holyFollowUp: { label: "HOLY FOLLOW-UP", short: "HLY", buff: true, duration: 1, value: .1 },
  combatDrone: { label: "COMBAT DRONE", short: "DRN", buff: true, duration: 99, value: .25 },
  vampiric: { label: "VAMPIRIC", short: "VMP", icon: "V", buff: true, duration: 3, value: .2 },
  stunFocus: { label: "STUN FOCUS", short: "STN+", icon: "!", buff: true, duration: 1 },
  resonanceLocked: { label: "RESONANCE LOCK", short: "R-L", negative: true, duration: 2 },
  overheated: { label: "OVERHEATED", short: "HOT", negative: true, duration: 2 }
};

const STATUS_TIER_CHANCES = {
  normal: { poison: .9, sleep: .75, stun: .65 },
  elite: { poison: .7, sleep: .45, stun: .35 },
  boss: { poison: .5, sleep: .1, stun: .2 }
};

const TRANSFORMATION_CONFIG = {
  mech: { duration: 4, attack: .25, defense: .4, tech: .25, visual: "GlimmerMech" },
  shadowpriest: { duration: 4, magic: .4, visual: "KaelShadow" }
};

const TRANSFORMED_SKILLS = {
  mech: [
    skill("Piston Impact", "melee", "Tech", 0, 0, "1.35x STR Tech multi-hit strike.", { coefficient: 1.35, multiHit: 2, basicAttack: true }),
    skill("Gearstorm Barrage", "magic", "Tech", 0, 10, "1.9x MAG multi-hit barrage.", { coefficient: 1.9, multiHit: 4 }),
    skill("Arc Reactor Burst", "magic", "Tech", 0, 12, "1.5x MAG to all enemies with reduced Defense.", { coefficient: 1.5, allEnemies: true, status: { type: "defenseDown", chance: .6, duration: 3, value: .2 } }),
    skill("Reinforced Chassis", "block", "Tech", 0, 8, "Reduce incoming damage by 25% for two actions.", { targetSide: "self", buffs: [{ type: "mechGuard", duration: 2, value: .25 }] }),
    skill("Maximum Overdrive", "ultimate", "Tech", 0, 100, "2.8x MAG multi-hit blast against all enemies.", { coefficient: 2.8, allEnemies: true, multiHit: 5, ultimateIndex: 1 })
  ],
  shadowpriest: [
    skill("Void Lance", "magic", "Shadow", 0, 7, "1.6x MAG shadow strike.", { coefficient: 1.6 }),
    skill("Umbral Wave", "magic", "Shadow", 0, 10, "1.45x MAG against all enemies.", { coefficient: 1.45, allEnemies: true }),
    skill("Soul Rend", "magic", "Shadow", 0, 12, "2.0x MAG and reduced Magic Defense.", { coefficient: 2, status: { type: "magicDefenseDown", chance: 1, duration: 3, value: .25 } }),
    skill("Dark Communion", "magic", "Shadow", 0, 9, "1.5x MAG and heal for 25% of damage dealt.", { coefficient: 1.5, selfHealRatio: .25 }),
    skill("Eclipse", "ultimate", "Shadow", 0, 100, "2.75x MAG against all enemies with reduced Magic Defense.", { coefficient: 2.75, allEnemies: true, multiHit: 4, ultimateIndex: 2, status: { type: "magicDefenseDown", chance: 1, duration: 2, value: .2 } })
  ]
};

const zoneLevelBands = {
  "Cindervale / Ash Quarter": [1, 4],
  "Reverie Orphanage": [4, 8],
  Guildspire: [8, 11],
  "Ember Hall": [11, 15],
  "False Dawn": [15, 20]
};

function character(name, title, element, color, hair, trim, stats, gear, skills) {
  return { name, title, element, color, hair, trim, stats, gear: slotsFrom(gear), skills, hp: 1, mp: 1 };
}

function slotsFrom(names) {
  return { weapon: names[0], armour: names[1], ring: names[2], necklace: names[3], helmet: names[4] };
}

function skill(name, anim, element, power, cost, desc, options = {}) {
  return { name, anim, element, power, cost, desc, scaling: anim === "melee" ? "str" : "mag", healScaling: .3, ...options };
}

function talent(level, name, type, value, desc = null, unlockDesc = null) {
  const text = desc || value?.desc || "";
  return { level, name, type, value, desc: text, unlockDesc: unlockDesc || text };
}

const STARTING_HERO_GEAR = Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, { ...hero.gear }]));

const state = {
  gameMode: "story",
  knownWeaknesses: {},
  favoriteGear: {},
  map: "lantern",
  x: 8,
  y: 8,
  renderX: 8 * TILE,
  renderY: 8 * TILE,
  facing: 0,
  quest: -1,
  resonance: 15,
  walkUntil: 0,
  party: ["Verseborn"],
  activeParty: ["Verseborn"],
  gold: 180,
  inventory: { "Marla's Soup": 4, "Clockwork Tonic": 2, "Ash Ward": 1, "Old Registry Key": 1 },
  inventorySlots: 30,
  bagUpgrades: 0,
  stash: {},
  ownedGear: [...new Set(["Verseborn"].flatMap(id => Object.values(baseJobs[id].gear)))],
  gearCopies: ["Verseborn"].flatMap(id => Object.values(baseJobs[id].gear)).reduce((copies, name) => {
    copies[name] = (copies[name] || 0) + 1;
    return copies;
  }, {}),
  gearAffixes: {},
  gearRarities: {},
  gearInstances,
  nextGearInstance: 1,
  endgameRank: 0,
  echoForgeRank: 0,
  ngPlus: 0,
  heroProgress: Object.fromEntries(Object.keys(baseJobs).map(id => [id, { level: 1, xp: 0, talents: [], pendingMilestones: [] }])),
  discoveredMaps: ["lantern"],
  escort: null,
  fieldWard: false,
  hallBattles: { unlockedStage: 1, clearedStages: [], recruitStages: [], pendingRecruit: 0, startingCompanions: [], startingWelcomeComplete: false, shopStage: 0, shopOffers: {}, purchasedShopStages: [] },
  flags: {}
};

function savedGameExists(saveKey = storySaveKey()) {
  try {
    return Boolean(localStorage.getItem(saveKey));
  } catch {
    return false;
  }
}

function saveSlotKey(baseKey, slot = activeSaveSlot) {
  return slot === 2 ? `${baseKey}-slot-2` : baseKey;
}

function storySaveKey(slot = activeSaveSlot) {
  return saveSlotKey(SAVE_KEY, slot);
}

function hallSaveKey(slot = activeSaveSlot) {
  return saveSlotKey(HALL_SAVE_KEY, slot);
}

function hallSceneHistoryKey(slot = activeSaveSlot) {
  return saveSlotKey(HALL_SCENE_HISTORY_KEY, slot);
}

function titleSaveKey(modeIndex = titleMenuIndex, slot = activeSaveSlot) {
  return modeIndex === 1 ? hallSaveKey(slot) : storySaveKey(slot);
}

function saveSlotSummary(modeIndex, slot) {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(titleSaveKey(modeIndex, slot)) || "null");
  } catch {
    data = null;
  }
  if (!data?.state) return { exists: false, detail: "" };
  const party = Array.isArray(data.state.party) ? data.state.party : [];
  const levels = party.map(id => Number(data.state.heroProgress?.[id]?.level)).filter(Number.isFinite);
  const partyLevel = levels.length ? Math.max(1, Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)) : 1;
  if (modeIndex === 1) {
    const stage = Math.max(1, Number(data.state.hallBattles?.unlockedStage) || 1);
    return { exists: true, detail: `STAGE ${stage} / PARTY LV ${partyLevel}` };
  }
  return { exists: true, detail: `PARTY LV ${partyLevel}` };
}

function activeSaveKey() {
  return state.gameMode === "hallBattles" ? hallSaveKey() : storySaveKey();
}

function saveGame(saveKey = activeSaveKey()) {
  if (mode === "title" || mode === "battle" || mode === "transition") return false;
  try {
    const heroes = Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, {
      hp: hero.hp,
      mp: hero.mp,
      gear: { ...hero.gear }
    }]));
    const questState = Object.fromEntries(sideQuests.map(quest => [quest.id, { status: quest.status, progress: quest.progress }]));
    const spawnState = Object.fromEntries(Object.entries(maps).map(([mapId, mapData]) => [mapId, Object.fromEntries((mapData.spawns || []).map(spawnPoint => [spawnPoint.id, {
      x: spawnPoint.x,
      y: spawnPoint.y,
      available: spawnPoint.available,
      returnAt: spawnPoint.returnAt,
      retryAt: spawnPoint.retryAt
    }]))]));
    localStorage.setItem(saveKey, JSON.stringify({ version: 4, state, heroes, questState, spawnState }));
    return true;
  } catch {
    return false;
  }
}

function queueSave() {
  if (mode === "title" || mode === "battle" || mode === "transition") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveGame, 500);
}

function loadGame(saveKey = activeSaveKey()) {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(saveKey) || "null");
  } catch {
    return false;
  }
  if (!data?.state) return false;
  Object.assign(state, data.state);
  state.gameMode = data.state.gameMode === "hallBattles" ? "hallBattles" : "story";
  state.knownWeaknesses = data.state.knownWeaknesses || {};
  state.favoriteGear = data.state.favoriteGear || {};
  state.gearInstances ||= {};
  gearInstances = state.gearInstances;
  state.nextGearInstance = Math.max(1, Number(state.nextGearInstance) || 1);
  state.party = Array.isArray(state.party) && state.party.length ? state.party.filter(id => baseJobs[id]) : ["Verseborn"];
  state.activeParty = Array.isArray(state.activeParty) && state.activeParty.length ? state.activeParty.filter(id => state.party.includes(id)).slice(0, 3) : [state.party[0]];
  state.heroProgress ||= {};
  state.gearAffixes ||= {};
  state.gearRarities ||= {};
  state.ownedGear = Array.isArray(state.ownedGear) ? state.ownedGear.filter(name => gearByName(name)) : [];
  state.gearCopies ||= {};
  state.discoveredMaps = Array.isArray(state.discoveredMaps) ? state.discoveredMaps.filter(id => maps[id]) : ["lantern"];
  state.flags ||= {};
  state.hallBattles = normalizeHallBattleProgress(state.hallBattles);
  if (!maps[state.map]) state.map = "lantern";
  Object.entries(data.heroes || {}).forEach(([id, saved]) => {
    if (!baseJobs[id]) return;
    baseJobs[id].hp = Number.isFinite(saved.hp) ? saved.hp : baseJobs[id].hp;
    baseJobs[id].mp = Number.isFinite(saved.mp) ? saved.mp : baseJobs[id].mp;
    if (saved.gear) Object.keys(baseJobs[id].gear).forEach(slot => {
      const name = saved.gear[slot];
      if (!name || gearByName(name)) baseJobs[id].gear[slot] = name || null;
    });
  });
  migrateEchoForgeInstances();
  migratePlatinumGear();
  migrateHallSustainAffixes();
  migrateGenericBreakGearAffixes();
  const migratedHallBaseStats = migrateHallBaseStatsV1();
  upgradeOwnedLegendaryGear();
  sideQuests.forEach(quest => {
    const saved = data.questState?.[quest.id];
    if (!saved) return;
    quest.status = saved.status || quest.status;
    quest.progress = Number.isFinite(saved.progress) ? saved.progress : quest.progress;
  });
  Object.entries(data.spawnState || {}).forEach(([mapId, savedSpawns]) => {
    (maps[mapId]?.spawns || []).forEach(spawnPoint => {
      const saved = savedSpawns[spawnPoint.id];
      if (!saved) return;
      if (Number.isFinite(saved.x)) spawnPoint.x = saved.x;
      if (Number.isFinite(saved.y)) spawnPoint.y = saved.y;
      if (typeof saved.available === "boolean") spawnPoint.available = saved.available;
      if (Number.isFinite(saved.returnAt)) spawnPoint.returnAt = saved.returnAt;
      if (Number.isFinite(saved.retryAt)) spawnPoint.retryAt = saved.retryAt;
    });
  });
  sanitizeWorldSpawns();
  if (migratedHallBaseStats) {
    const heroes = Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, {
      hp: hero.hp,
      mp: hero.mp,
      gear: { ...hero.gear }
    }]));
    try { localStorage.setItem(saveKey, JSON.stringify({ ...data, state, heroes })); } catch {}
  }
  Object.keys(baseJobs).forEach(id => {
    progressFor(id);
    clampHeroVitals(id);
  });
  const safeEntry = nearestMapEntry(state.map, state.x, state.y);
  state.x = safeEntry.x;
  state.y = safeEntry.y;
  state.renderX = state.x * TILE;
  state.renderY = state.y * TILE;
  return true;
}

const vendors = {
  marla: {
    name: "Marla's Counter",
    blurb: "Hot food, honest prices, no heroic credit.",
    wares: [
      { kind: "item", name: "Marla's Soup", price: 18, desc: "Restores 24 HP in battle." },
      { kind: "item", name: "Clockwork Tonic", price: 26, desc: "Restores 18 MP in battle." },
      { kind: "item", name: "Ash Ward", price: 34, desc: "Grants a one-turn party guard." },
      { kind: "gear", name: "Ashrunner Knife", price: 72 },
      { kind: "gear", name: "Sootweave Coat", price: 78 },
      { kind: "upgrade", name: "Field Satchel Expansion", basePrice: 140, desc: "+10 inventory slots. Each expansion costs more." }
    ]
  },
  shelter: {
    name: "Reverie Supply Locker",
    blurb: "Shelter gear is sold at cost. Nobody profits from a locked door.",
    wares: [
      { kind: "item", name: "Marla's Soup", price: 20, desc: "Restores 24 HP in or outside battle." },
      { kind: "item", name: "Ash Ward", price: 32, desc: "Prepares a one-turn party guard." },
      { kind: "gear", name: "Shelter Staff", price: 88 },
      { kind: "gear", name: "Reverie Mantle", price: 92 },
      { kind: "upgrade", name: "Shelter Pack Stitching", basePrice: 150, desc: "+10 inventory slots. Each expansion costs more." }
    ]
  },
  guild: {
    name: "Guildspire Requisitions",
    blurb: "Approved equipment. Forms already stamped.",
    wares: [
      { kind: "gear", name: "Flameguard Plate", price: 145 },
      { kind: "gear", name: "Stonewake Mantle", price: 132 },
      { kind: "gear", name: "Guildsteel Saber", price: 104 },
      { kind: "gear", name: "Registry Coat", price: 110 },
      { kind: "gear", name: "Red Ember Band", price: 84 },
      { kind: "gear", name: "Stone Brow Guard", price: 96 },
      { kind: "upgrade", name: "Reinforced Guild Satchel", basePrice: 160, desc: "+10 inventory slots. Each expansion costs more." }
    ]
  },
  workshop: {
    name: "Glimmer's Parts Bench",
    blurb: "Working gear. Mostly. Warranty is a state of mind.",
    wares: [
      { kind: "gear", name: "Workshop Coat", price: 118 },
      { kind: "gear", name: "Ember Pike", price: 112 },
      { kind: "gear", name: "Flameguard Leathers", price: 116 },
      { kind: "gear", name: "Quiet Circuit", price: 105 },
      { kind: "gear", name: "Gearheart Charm", price: 124 },
      { kind: "gear", name: "Glimmer Goggles", price: 110 },
      { kind: "upgrade", name: "Impossible Pocket Retrofit", basePrice: 190, desc: "+10 inventory slots. Each expansion costs more." }
    ]
  },
  dawn: {
    name: "Causeway Salvage Station",
    blurb: "Recovered system gear. Local calibration only.",
    wares: [
      { kind: "item", name: "Clockwork Tonic", price: 24, desc: "Restores 18 MP in or outside battle." },
      { kind: "item", name: "Ash Ward", price: 36, desc: "Prepares a one-turn party guard." },
      { kind: "gear", name: "Calibration Rod", price: 126 },
      { kind: "gear", name: "Stormglass Vestment", price: 132 },
      { kind: "upgrade", name: "Null-Fold Pack", basePrice: 210, desc: "+10 inventory slots. Each expansion costs more." }
    ]
  }
};

const lootTables = {
  "Slobbo": loot([8, 15], [["Ledger Scrap", 1, 1]], [["Echo-Thread Lute", .18]]),
  "Brokk": loot([12, 20], [["Iron Chain Link", 1, 2], ["Marla's Soup", .35, 1]], [["Sealbreak Vestment", .12]]),
  "Corrupt Clergy": loot([14, 22], [["Broken Wax Seal", 1, 2], ["Clockwork Tonic", .3, 1]], [["Sealbreak Vestment", .2]]),
  "High Administrator Thaddeus": loot([10, 18], [["Ash Ink", 1, 2], ["Ash Ward", .3, 1]], [["Echo-Thread Lute", .1]]),
  "Gorg": loot([18, 28], [["Resonant Stone", 1, 2]], [["Faultline Signet", .22]]),
  "Cracked Pillar": loot([16, 25], [["Resonant Stone", 1, 2], ["Marla's Soup", .3, 1]], [["Faultline Signet", .16]]),
  "Clock Goblin": loot([24, 36], [["False Dawn Cog", 1, 2]], [["Local Truth Lens", .24]]),
  "Lord Sprocket": loot([22, 34], [["Tempered Lockplate", 1, 2], ["Clockwork Tonic", .35, 1]], [["Local Truth Lens", .16]]),
  "Red Dragon Lord": loot([32, 48], [["Ancient Ember Scale", 1, 2], ["Ash Ward", .5, 1]], [["Wyrmheart Ember", .35]])
};

Object.assign(lootTables, {
  "Inkbound Auditor": loot([38, 56], [["Living Ash Ink", 1, 2]], [["Echo-Thread Lute", .45]]),
  "Dock Foreman": loot([70, 95], [["Foreman's Black Ledger", 1, 1]], [["Sealbreak Vestment", .55]]),
  "Saint Justin": loot([42, 64], [["Unclaimed Sigil", 1, 2]], [["Sealbreak Vestment", .45]]),
  "Archive Custodian": loot([82, 110], [["Custodian Seal", 1, 1]], [["Faultline Signet", .6]]),
  "Sir Reginald": loot([48, 72], [["Redacted Testimony", 1, 1]], [["Local Truth Lens", .5]]),
  "Elder Plumpin": loot([55, 80], [["Ancient Ember Scale", 1, 2]], [["Wyrmheart Ember", .62]]),
  "Baron Revus Veln": loot([60, 88], [["Null Calibration Shard", 1, 2]], [["Local Truth Lens", .58]]),
  "Dawn Gate Sentinel": loot([110, 145], [["Sentinel Core", 1, 1]], [["Wyrmheart Ember", .7]]),
  "Kaeldrin": loot([180, 240], [["Stonewake Medal", 1, 1]], [["Stonewake Oathblade", 1]]),
  "Lysra": loot([170, 230], [["Loopglass Shard", 1, 2]], [["Echo Vow Chain", .7]]),
  "Nyx Vael": loot([150, 210], [["Loopglass Shard", 1, 2]], [["Causality Visor", .65]]),
  "Rava": loot([165, 225], [["Orphan Ember Thread", 1, 2]], [["Orphanheart Coat", .7]]),
  "Jory Bellwick": loot([190, 250], [["Orphan Ember Thread", 1, 2]], [["Second-Loop Signet", .75]]),
  "Shade": loot([145, 205], [["Loopglass Shard", 1, 2]], [["Second-Loop Signet", .55]]),
  "Grumm": loot([155, 215], [["Stonewake Medal", 1, 1], ["Resonant Stone", 1, 2]], [["Stonewake Oathblade", .5]]),
  "Marla": loot([130, 190], [["Marla's Soup", 1, 2]], [["Orphanheart Coat", .45]]),
  "Harl": loot([140, 200], [["Loopglass Shard", 1, 1]], [["Echo Vow Chain", .45]])
});

function loot(gold, common, rare) {
  return { gold, common, rare };
}

const quests = [
  ["Ash Boy's First Verse", "Find Harl and learn that names are moved before people.", "Tavern opening, dock clues, duo battle."],
  ["The Door at Reverie", "Protect the children and let Kael choose faith over obedience.", "Institution dungeon and moral lock."],
  ["The Empty Chair", "Register the Flameguard and stabilize Ember Hall.", "Rival team, tests, Torren's return."],
  ["The Engineer Who Stayed", "Retune the False Dawn tower and recruit Glimmer.", "Tech dungeon finale with systems boss."]
];

const sideQuests = [
  sideQuest("marlaCrate", "A Crate Owed Twice", "Marla", "fetch", { item: "Iron Chain Link", amount: 3 }, { gold: 75, xp: 90, items: { "Marla's Soup": 2 } }, "Bring Marla three chain links for repairs under the Lantern."),
  sideQuest("nyxInk", "Ink That Remembers", "Nyx", "kill", { names: ["High Administrator Thaddeus"], amount: 3 }, { gold: 110, xp: 120, items: { "Clockwork Tonic": 2 } }, "Defeat High Administrator Thaddeus three times and recover what his ink observed."),
  sideQuest("harlEscort", "A Name Walks Home", "Harl", "escort", { map: "lantern" }, { gold: 125, xp: 140, items: { "Ash Ward": 2 } }, "Escort Harl safely from the ledger house back to the Drunk Lantern."),
  sideQuest("ravaWave", "Nobody Crosses This Yard", "Rava", "wave", { waves: 3 }, { gold: 150, xp: 180, gear: "Rava's Guard Ring" }, "Hold the Reverie dormitory through three escalating clergy waves."),
  sideQuest("rareLore", "Names Outside the Ledger", "Nyx", "rare", { amount: 2 }, { gold: 240, xp: 260, gear: "Nyx's Margin Note" }, "Find and defeat two lore-marked rare spawns across Cindervale."),
  sideQuest("stonewakeTrial", "The Weight of the Old Rank", "Kaeldrin", "boss", { flag: "ngStonewakeWon", amount: 1 }, { gold: 900, xp: 900, gears: ["Stonewake Oathblade", "Second Verse Lute", "Worldroot Shield"] }, "In New Game Plus, defeat Kaeldrin and Lysra in Stonewake's full-rank trial.", { requiresNgPlus: true }),
  sideQuest("orphanTrial", "The Children Answer Back", "Jory", "boss", { flag: "ngOrphanTrialWon", amount: 1 }, { gold: 1000, xp: 1050, gears: ["Orphanheart Coat", "Veln Eclipse Blades", "Cinderstar Aegis", "Unbound Oathstaff"] }, "In New Game Plus, survive Nyx, Rava and Jory's Reverie counter-trial.", { requiresNgPlus: true })
];

function sideQuest(id, title, giver, type, target, reward, desc, options = {}) {
  return { id, title, giver, type, target, reward, desc, status: "unseen", progress: 0, ...options };
}

const maps = {
  emberHallBattles: map("Ember Hall - Trial Room", "Ember Hall Battle", "lantern", [], [
    point(4, 7, "Marla", [["Marla", "Back already? Sit down if you need patching up. The Trial Gate will still be there when the soup is finished."], ["Marla", "I kept the counter stocked. Old victories earn real experience here, so there is no shame in training twice."]], "hallRest", undefined, "marla"),
    point(11, 7, "Glimmer", [["Glimmer", "Forty stable battle records. Stable is relative, but the enemies are definitely real enough to hit back."], ["Glimmer", "Clear the newest record to open the next one. Cleared records stay available for training and XP."]], undefined, undefined, "workshop"),
    point(8, 5, "Stage", [["Trial Gate", "The Hall records fifty battles. Every cleared stage remains available to replay for its normal XP." ]], "hallBattleMap")
  ], ["Trial Gate", "Choose an unlocked battle or replay an old victory for XP."], { background: "ember-hall-battle", collision: "emberHallBattles", grid: [0, 0], gridSize: [1, 1] }),

  lantern: map("The Drunk Lantern", "Issue 1", "lantern", [{ x: 14, y: 8, to: "ashLane", tx: 2, ty: 8 }], [
    point(4, 7, "Marla", [["Marla", "Soup first. Heroics after. Harl vanished near the old dock ledger room."], ["Verseborn", "A missing man, a tavern tab, and a song waiting to be wrong. Classic start."], ["Marla", "Find Harl. Start at the Ledger Docks, and bring him home."]], "acceptIssue1", undefined, "marla", "marlaCrate"),
    point(7, 7, "Harl", [["Harl", "I am staying close to the Lantern until my name stops moving without me."], ["Marla", "He carries mugs. I keep an eye on the door."]], undefined, "quest:harlEscort", undefined, "harlEscort"),
    point(8, 5, "Stage", [["Verseborn", "The first song is not a spell. It is a room agreeing to feel the same thing."]])
  ], ["A1 - Opening Tavern", "Home base, vendor, side quests and a safe return point."], { grid: [0, 2], gridSize: [5, 5] }),

  ashLane: map("Ash Quarter - Sootline Alley", "Issue 1", "ash", [{ x: 1, y: 8, to: "lantern", tx: 13, ty: 8 }, { x: 14, y: 8, to: "sootMarket", tx: 2, ty: 8 }, { x: 8, y: 5, to: "ledgerHouse", tx: 7, ty: 6 }], [
    chest(5, 7, "ash-songbound", { gear: "Songbound Rosin", gold: 24 })
  ], ["A2 - Sootline Alley", "A residential route with returning street threats."], { background: "ash-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 6, 14, 10]], grid: [1, 2], gridSize: [5, 5], spawns: [
    spawn("ash-ledger-1", 9, 8, "Soot Ledger Prowlers", [enemy("Slobbo", 52, 8, "Sound", "#71513e", 2)], { respawn: 24 }),
    spawn("ash-rare-auditor", 12, 7, "Rare: Inkbound Auditor", [enemy("Inkbound Auditor", 94, 13, "Holy Fire", "#40304f", 2, "High Administrator Thaddeus")], { respawn: 105, rare: true, lore: "A clerk erased from every registry except its own ink." })
  ] }),

  sootMarket: map("Ash Quarter - Soot Market", "Issue 1", "ash", [{ x: 1, y: 8, to: "ashLane", tx: 13, ty: 8 }, { x: 14, y: 8, to: "ashDock", tx: 2, ty: 8 }], [
    chest(5, 7, "ash-cinderbite", { gear: "Cinderbite Edge", items: { "Marla's Soup": 1 } })
  ], ["A3 - Soot Market", "The main route branches into a searchable ledger house."], { background: "ash-route", panorama: true, view: 1, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [2, 2], gridSize: [5, 5], spawns: [
    spawn("market-chain-1", 11, 8, "Chain Runners", [enemy("Brokk", 64, 9, "Shadow", "#4a4542", 1)], { respawn: 30 })
  ] }),

  ashDock: map("Ash Quarter - Ledger Docks", "Issue 1", "ash", [{ x: 1, y: 8, to: "sootMarket", tx: 13, ty: 8 }, { x: 14, y: 8, to: "reverieCourt", tx: 3, ty: 10, needs: "issue1" }], [
    recruitPoint(7, 7, "Mira", [["Mira", "You came alone. Good. Quiet footsteps survive longer on these docks."], ["Verseborn", "I can do quiet. Briefly."], ["Mira", "The route is physical. The lie is administrative. Together, that makes a dungeon."], ["Mira", "Draw your lute. I will cover the blind side."]], "harbor"),
    chest(4, 8, "ash-echo", { gear: "Echo Collector", gold: 30 })
  ], ["A4 - Ledger Docks", "The first story battle sits beyond two explorable field units."], { background: "ash-route", panorama: true, view: 2, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [3, 2], gridSize: [5, 5], spawns: [
    spawn("dock-foreman", 11, 8, "Miniboss: Dock Foreman", [enemy("Dock Foreman", 126, 15, "Tech", "#403b39", 2, "Brokk")], { boss: true, lore: "The foreman kept moving names after the orders stopped." })
  ] }),

  ledgerHouse: map("Old Ledger House", "Issue 1", "ash", [{ x: 7, y: 5, to: "ashLane", tx: 8, ty: 6 }], [
    point(10, 5, "Harl", [["Harl", "They were not moving people under false names. They moved the names first."], ["Mira", "Reverie Orphanage. Fire Clergy seal."]], "issue1", "harborWon", undefined, "harlEscort"),
    chest(4, 7, "ash-nightneedle", { gear: "Nightneedle Harness", items: { "Clockwork Tonic": 1 } })
  ], ["A3b - Ledger House", "Optional interior, clue room and escort side quest."], { background: "ash", collision: "ash", grid: [2, 1], gridSize: [5, 5] }),

  reverieCourt: map("Reverie - Courtyard", "Issue 2", "reverie", [{ x: 3, y: 11, direction: "down", to: "ashDock", tx: 13, ty: 8 }, { x: 13, y: 5, direction: "up", to: "reverieDorm", tx: 7, ty: 6 }, { x: 10, y: 5, direction: "up", to: "reverieArchive", tx: 8, ty: 11, needs: "clergyWon" }], [
    recruitPoint(6, 7, "Seerin", [["Seerin", "You may inspect the building. You may not take a child."], ["Verseborn", "Then stand with me while we prove who tried."], ["Seerin", "My oath is to life. You are confusing that with authority."], ["Seerin", "I will hold the line. You make them listen."]], "clergy"),
    chest(4, 8, "reverie-hearthwall", { gear: "Hearthwall Crest", gold: 38 })
  ], ["B1 - Shelter Courtyard", "Protection comes before institutional permission."], { background: "reverie-route", panorama: true, view: 0, views: 3, walkable: [[1, 5, 14, 10]], grid: [3, 3], gridSize: [5, 5], spawns: [
    spawn("court-seal-1", 11, 9, "Clergy Seal Patrol", [enemy("Corrupt Clergy", 70, 10, "Shadow", "#9d5436", 1)], { respawn: 38 })
  ] }),

  reverieDorm: map("Reverie - Dormitory Wing", "Issue 2", "reverie", [{ x: 6, y: 5, direction: "up", to: "reverieCourt", tx: 13, ty: 5 }, { x: 14, y: 7, direction: "right", to: "reverieSeal", tx: 11, ty: 9 }], [
    point(8, 6, "Nyx", [["Nyx", "Adults pretend punctuation cannot hurt people."], ["Nyx", "The supply locker is less interesting than the archive. It is still useful."]], undefined, undefined, "shelter", "nyxInk"),
    point(10, 6, "Rava", [["Rava", "Three waves. No speeches. Keep them away from the little kids."]], "ravaWave"),
    point(13, 6, "Jory", [["Jory", "The first loop taught us where the Flameguard leaves openings."], ["Rava", "You wanted stronger opponents. Try not to complain when you get them."], ["Nyx", "I documented seventeen likely mistakes. We only need one."]], "ngOrphanTrial", "newGamePlus"),
    chest(9, 8, "reverie-silent", { gear: "Silent Reliquary", items: { "Ash Ward": 1 } })
  ], ["B2 - Dormitory Wing", "NPC side quests and a wave-defense encounter live off the main route."], { background: "reverie-route", panorama: true, view: 1, views: 3, walkable: [[1, 5, 14, 10]], grid: [4, 3], gridSize: [5, 5], spawns: [
    spawn("dorm-scribe-1", 12, 7, "High Administrator Thaddeus Remnant", [enemy("High Administrator Thaddeus", 58, 8, "Sound", "#6d5948", 2)], { respawn: 34 })
  ] }),

  reverieSeal: map("Reverie - Sealed Hall", "Issue 2", "reverie", [{ x: 11, y: 10, direction: "down", to: "reverieDorm", tx: 13, ty: 7 }, { x: 12, y: 4, direction: "up", to: "guildSteps", tx: 2, ty: 8, needs: "issue2" }], [
    chest(13, 8, "reverie-roadwarden", { gear: "Roadwarden Plate", gold: 42 })
  ], ["B3 - Sealed Hall", "A cold threshold and a rare lore encounter."], { background: "reverie-route", panorama: true, view: 2, views: 3, walkable: [[1, 5, 14, 10]], grid: [4, 4], gridSize: [5, 5], spawns: [
    spawn("reverie-rare-sigil", 12, 6, "Rare: Saint Justin", [enemy("Saint Justin", 108, 14, "Tech", "#b9a274", 2, "Corrupt Clergy")], { respawn: 120, rare: true, lore: "A protection rite that outlived the priest who abandoned it." })
  ] }),

  reverieArchive: map("Reverie - Clergy Archive", "Issue 2", "reverie", [{ x: 8, y: 12, direction: "down", to: "reverieCourt", tx: 10, ty: 5 }], [
    recruitPoint(7, 7, "Kael", [["Kael", "I will keep the seal. Not as obedience. As evidence."], ["Verseborn", "Evidence travels better with witnesses."], ["Kael", "Then I will walk with the Flameguard. Quietly."]], "issue2", "clergyWon"),
    chest(5, 7, "reverie-echo", { gear: "Echo Collector", items: { "Clockwork Tonic": 1 } })
  ], ["B2b - Clergy Archive", "A short moral dungeon interior with a permanent custodian miniboss."], { background: "reverie", collision: "reverie", grid: [3, 4], gridSize: [5, 5], spawns: [
    spawn("archive-custodian", 8, 6, "Miniboss: Archive Custodian", [enemy("Archive Custodian", 142, 16, "Earth", "#6d5948", 2, "High Administrator Thaddeus")], { boss: true, lore: "It files people under the rules they broke." })
  ] }),

  guildSteps: map("Guildspire - Crown Steps", "Issue 3", "guildspire", [{ x: 1, y: 8, to: "reverieSeal", tx: 13, ty: 8 }, { x: 14, y: 8, to: "guildRegistry", tx: 2, ty: 8 }], [
    chest(4, 8, "guild-stonefather", { gear: "Stonefather Gauntlet", gold: 50 })
  ], ["C1 - Crown Steps", "The route opens into a formal three-unit civic hub."], { background: "guildspire-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 4, 14, 10]], grid: [1, 1], gridSize: [3, 3] }),

  guildRegistry: map("Guildspire - Registry", "Issue 3", "guildspire", [{ x: 1, y: 8, to: "guildSteps", tx: 13, ty: 8 }, { x: 14, y: 8, to: "guildHall", tx: 2, ty: 8 }, { x: 8, y: 11, to: "guildCouncil", tx: 8, ty: 11, needs: "registered" }], [
    point(8, 6, "Kaeldrin", [["Kaeldrin", "Stonewake is already assigned. Efficiency matters."], ["Glimmer", "I fixed the test machine."], ["Kaeldrin", "Good. Maintain it."], ["Kaeldrin", "The requisitions desk has approved field equipment."]], "registry", undefined, "guild"),
    chest(4, 8, "guild-fleetglass", { gear: "Fleetglass Circlet", items: { "Ash Ward": 1 } })
  ], ["C2 - Registry", "Main registration, equipment vendor and a branch to the council chamber."], { background: "guildspire-route", panorama: true, view: 1, views: 3, walkable: [[1, 4, 14, 10]], grid: [2, 1], gridSize: [3, 3] }),

  guildHall: map("Guildspire - Audience Hall", "Issue 3", "guildspire", [{ x: 1, y: 8, to: "guildRegistry", tx: 13, ty: 8 }, { x: 14, y: 8, to: "emberYard", tx: 4, ty: 10, needs: "registered" }], [
    point(8, 6, "Lyrsa", [["Lyrsa", "Mira Veln refusing privilege is still a privilege. Fascinating posture."]]),
    chest(5, 8, "guild-cinderbite", { gear: "Cinderbite Edge", gold: 55 })
  ], ["C3 - Audience Hall", "Political dialogue and a rare archive apparition."], { background: "guildspire-route", panorama: true, view: 2, views: 3, walkable: [[1, 4, 14, 10]], grid: [2, 2], gridSize: [3, 3], spawns: [
    spawn("guild-rare-witness", 12, 8, "Rare: Sir Reginald", [enemy("Sir Reginald", 118, 15, "Ancient Fire", "#4d4167", 2, "Clock Goblin")], { respawn: 135, rare: true, lore: "A testimony removed from the record but not from the hall." })
  ] }),

  guildCouncil: map("Guildspire - Council Chamber", "Issue 3", "guildspire", [{ x: 8, y: 12, to: "guildRegistry", tx: 8, ty: 10 }], [
    recruitPoint(11, 8, "Torren", [["Torren", "I am not here to earn an old place back. I am here to build a new one."], ["Verseborn", "Ember Hall has an empty chair and several structurally questionable walls."], ["Torren", "Then both can be fixed. I am coming."]], "torren", "registered"),
    point(7, 7, "Kaeldrin", [["Kaeldrin", "A second journey deserves a full-rank test."], ["Lyrsa", "Stonewake will not repeat the restraint of the first evaluation."], ["Verseborn", "Good. We did not bring repeat answers."]], "ngStonewakeTrial", "newGamePlus"),
    chest(5, 8, "guild-emberwell", { gear: "Emberwell Chain", items: { "Marla's Soup": 2 } })
  ], ["C2b - Council Chamber", "A branch room for Torren's return and later contracts."], { background: "guildspire", collision: "guildspire", grid: [1, 2], gridSize: [3, 3] }),

  emberYard: map("Ember Hall - Training Yard", "Issue 3", "ember", [{ x: 4, y: 12, direction: "down", to: "guildHall", tx: 13, ty: 8 }, { x: 8, y: 6, direction: "right", to: "emberHearth", tx: 9, ty: 6 }], [
    chest(2, 9, "ember-lens", { gear: "Impossible Lens", gold: 60 })
  ], ["D1 - Training Yard", "A broad home-base field with repeatable training constructs."], { background: "ember-route", panorama: true, view: 0, views: 5, music: "overworld", walkable: [[1, 3, 14, 11]], grid: [0, 2], gridSize: [5, 5], spawns: [
    spawn("yard-construct", 4, 5, "Training Construct", [enemy("Gorg", 78, 11, "Earth", "#6f5540", 1)], { respawn: 22 })
  ] }),

  emberHearth: map("Ember Hall - Hearth Room", "Issue 3", "ember", [{ x: 8, y: 6, direction: "left", to: "emberYard", tx: 7, ty: 6 }, { x: 13, y: 3, direction: "up", to: "emberWorkshop", tx: 7, ty: 10 }, { x: 11, y: 12, direction: "down", to: "emberCellar", tx: 8, ty: 10, needs: "torren" }], [
    chest(10, 8, "ember-bell", { gear: "Elder Ember Bell", items: { "Marla's Soup": 1 } })
  ], ["D2 - Hearth Room", "The route branches down into the resonance cellar."], { background: "ember-route", panorama: true, view: 1, views: 5, walkable: [[1, 4, 14, 10]], grid: [1, 2], gridSize: [5, 5] }),

  emberWorkshop: map("Ember Hall - Workshop", "Issue 3", "ember", [{ x: 7, y: 12, direction: "down", to: "emberHearth", tx: 13, ty: 4 }, { x: 10, y: 3, direction: "up", to: "emberArmory", tx: 7, ty: 4 }], [
    recruitPoint(9, 7, "Sparky", [["Sparky", "Prrrp."], ["Verseborn", "You remember that flame, do you not?"], ["Sparky", "Prrrp!"], ["Verseborn", "Tiny dragon. Ancient heart. Absolutely coming with us."]], "sparky", "emberWon"),
    point(11, 7, "Workshop Bench", [["Workshop Bench", "Glimmer labelled every drawer except the one that bites."]], undefined, "sparky", "workshop")
  ], ["D3 - Workshop", "Recruit Sparky, buy crafted gear and inspect Glimmer's machines."], { background: "ember-route", panorama: true, view: 2, views: 5, walkable: [[1, 4, 14, 10]], grid: [2, 2], gridSize: [5, 5] }),

  emberArmory: map("Ember Hall - Armory Passage", "Issue 3", "ember", [{ x: 6, y: 4, direction: "up", to: "emberWorkshop", tx: 10, ty: 4 }, { x: 8, y: 5, direction: "up", to: "emberRoof", tx: 10, ty: 6 }], [
    chest(9, 6, "ember-roadwarden", { gear: "Roadwarden Plate", items: { "Ash Ward": 1 } })
  ], ["D4 - Armory Passage", "A combat-ready branch with respawning equipment husks."], { background: "ember-route", panorama: true, view: 3, views: 5, walkable: [[1, 4, 14, 10]], grid: [3, 2], gridSize: [5, 5], spawns: [
    spawn("armory-pillar", 10, 8, "Cracked Armory Pillar", [enemy("Cracked Pillar", 74, 9, "Tech", "#55473c", 2)], { respawn: 31 })
  ] }),

  emberRoof: map("Ember Hall - Roof Watch", "Issue 3", "ember", [{ x: 10, y: 6, direction: "left", to: "emberArmory", tx: 8, ty: 6 }, { x: 14, y: 6, direction: "right", to: "dawnCauseway", tx: 2, ty: 8, needs: "sparky" }], [
    chest(14, 9, "ember-echo", { gear: "Echo Collector", gold: 68 })
  ], ["D5 - Roof Watch", "The home-base grid ends at the road to False Dawn."], { background: "ember-route", panorama: true, view: 4, views: 5, walkable: [[1, 4, 14, 10]], grid: [4, 2], gridSize: [5, 5], spawns: [
    spawn("roof-rare-memory", 11, 7, "Rare: Elder Plumpin", [enemy("Elder Plumpin", 124, 16, "Sigil", "#5a2f52", 3, "Red Dragon Lord")], { respawn: 145, rare: true, lore: "A dragon memory that recognizes Sparky before anyone else does." })
  ] }),

  emberCellar: map("Ember Hall - Resonance Cellar", "Issue 3", "ember", [{ x: 8, y: 12, to: "emberHearth", tx: 11, ty: 10 }], [
    point(6, 7, "Torren", [["Torren", "Tell me what has to stay still."], ["Verseborn", "Us, preferably."]], "ember")
  ], ["D2b - Resonance Cellar", "A permanent story encounter beneath the branching home base."], { background: "ember", collision: "ember", grid: [1, 3], gridSize: [5, 5] }),

  dawnCauseway: map("False Dawn - Storm Causeway", "Issue 4", "alarm", [{ x: 1, y: 8, to: "emberRoof", tx: 13, ty: 6 }, { x: 14, y: 8, to: "dawnStation", tx: 2, ty: 8 }], [
    chest(4, 8, "dawn-songbound", { gear: "Songbound Rosin", gold: 72 })
  ], ["E1 - Storm Causeway", "A consistent high-altitude tech dungeon begins."], { background: "dawn-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [0, 1], gridSize: [3, 3], spawns: [
    spawn("dawn-bell-1", 9, 8, "Clock Goblin Patrol", [enemy("Clock Goblin", 78, 11, "Tech", "#a66a35", 2)], { respawn: 42 })
  ] }),

  dawnStation: map("False Dawn - Calibration Station", "Issue 4", "alarm", [{ x: 1, y: 8, direction: "left", to: "dawnCauseway", tx: 13, ty: 8 }, { x: 9, y: 4, direction: "up", to: "dawnGate", tx: 2, ty: 8 }], [
    point(4, 7, "Harl", [["Harl", "The central system marked these supplies obsolete. Locally, they still work."], ["Verseborn", "That is becoming a theme."]], undefined, undefined, "dawn"),
    chest(5, 7, "dawn-nightneedle", { gear: "Nightneedle Harness", items: { "Clockwork Tonic": 2 } })
  ], ["E2 - Calibration Station", "Side platforms hold regular and rare system remnants."], { background: "dawn-route", panorama: true, view: 1, views: 3, walkable: [[1, 5, 14, 10]], grid: [1, 1], gridSize: [3, 3], spawns: [
    spawn("station-lock-1", 8, 8, "Calibration Husk", [enemy("Lord Sprocket", 76, 10, "Earth", "#58616b", 1)], { respawn: 45 }),
    spawn("dawn-rare-null", 12, 7, "Rare: Baron Revus Veln", [enemy("Baron Revus Veln", 132, 17, "Sound", "#26353e", 2, "Clock Goblin")], { respawn: 160, rare: true, lore: "A local truth the central alarm failed to overwrite." })
  ] }),

  dawnGate: map("False Dawn - Exterior Gate", "Issue 4", "alarm", [{ x: 1, y: 8, to: "dawnStation", tx: 9, ty: 5 }, { x: 14, y: 8, to: "alarm", tx: 2, ty: 6, needs: "spawn:gate-sentinel" }], [
    chest(5, 8, "dawn-emberwell", { gear: "Emberwell Chain", items: { "Ash Ward": 2 } })
  ], ["E3 - Exterior Gate", "The gate sentinel is a miniboss and never respawns."], { background: "dawn-route", panorama: true, view: 2, views: 3, walkable: [[1, 5, 14, 10]], grid: [2, 1], gridSize: [3, 3], spawns: [
    spawn("gate-sentinel", 10, 8, "Miniboss: Dawn Gate Sentinel", [enemy("Dawn Gate Sentinel", 168, 18, "Ancient Fire", "#58616b", 1, "Lord Sprocket")], { boss: true, lore: "The last lock between command and observation." })
  ] }),

  alarm: map("False Dawn - Alarm Core", "Issue 4", "alarm", [{ x: 1, y: 6, direction: "left", to: "dawnGate", tx: 13, ty: 8 }], [
    recruitPoint(5, 7, "Glimmer", [["Glimmer", "The alarm is not broken. It is obeying the wrong truth."], ["Verseborn", "Then we give it a better verse."], ["Glimmer", "Everything stays still except me."], ["Glimmer", "That was an invitation. Keep up."]], "dawn"),
    point(11, 5, "Glimmer", [["Kaeldrin", "Your rank still stands."], ["Glimmer", "I know. You came back when you needed the machine. They came when they needed me."], ["Glimmer", "Also, the parts bench is open. Do not lick anything glowing."]], "ending", "dawnWon", "workshop"),
    chest(12, 8, "dawn-fleetglass", { gear: "Fleetglass Circlet", gold: 90 }, "dawnWon")
  ], ["E4 - Alarm Core", "Story boss and ending; its bosses never join the respawn pool."], { background: "alarm", collision: "alarm", grid: [2, 2], gridSize: [3, 3] })
};

const HALL_ENEMY_LIBRARY = {
  ledger: { name: "Slobbo", hp: 42, atk: 6, weak: "Sound", color: "#71513e", node: 1 },
  chain: { name: "Brokk", hp: 54, atk: 8, weak: "Shadow", color: "#4a4542", node: 1 },
  scribe: { name: "High Administrator Thaddeus", hp: 48, atk: 7, weak: "Sound", color: "#6d5948", node: 2 },
  auditor: { name: "Inkbound Auditor", hp: 76, atk: 10, weak: "Holy Fire", color: "#40304f", node: 3 },
  foreman: { name: "Dock Foreman", hp: 108, atk: 12, weak: "Tech", color: "#403b39", node: 3 },
  seal: { name: "Corrupt Clergy", hp: 62, atk: 9, weak: "Shadow", color: "#9d5436", node: 2 },
  sigil: { name: "Saint Justin", hp: 82, atk: 11, weak: "Tech", color: "#b9a274", node: 2, sprite: "Corrupt Clergy" },
  custodian: { name: "Archive Custodian", hp: 118, atk: 13, weak: "Earth", color: "#6d5948", node: 3 },
  construct: { name: "Gorg", hp: 68, atk: 9, weak: "Earth", color: "#6f5540", node: 1 },
  pillar: { name: "Cracked Pillar", hp: 72, atk: 9, weak: "Tech", color: "#55473c", node: 2 },
  memory: { name: "Elder Plumpin", hp: 104, atk: 13, weak: "Sigil", color: "#5a2f52", node: 3, sprite: "Red Dragon Lord" },
  wyrm: { name: "Red Dragon Lord", hp: 132, atk: 15, weak: "Sigil", color: "#5a2f52", node: 3 },
  bell: { name: "Clock Goblin", hp: 70, atk: 10, weak: "Tech", color: "#a66a35", node: 2 },
  lock: { name: "Lord Sprocket", hp: 76, atk: 11, weak: "Earth", color: "#58616b", node: 2 },
  null: { name: "Baron Revus Veln", hp: 104, atk: 14, weak: "Sound", color: "#26353e", node: 3, sprite: "Clock Goblin" },
  sentinel: { name: "Dawn Gate Sentinel", hp: 146, atk: 16, weak: "Ancient Fire", color: "#58616b", node: 3 },
  shade: { name: "Shade", hp: 112, atk: 16, weak: "Holy Fire", color: "#30283f", node: 3 },
  grumm: { name: "Grumm", hp: 154, atk: 17, weak: "Sound", color: "#594331", node: 3 },
  lyrsa: { name: "Lysra", hp: 126, atk: 16, weak: "Shadow", color: "#77619a", node: 3, sprite: "Lyrsa" },
  kaeldrin: { name: "Kaeldrin", hp: 166, atk: 18, weak: "Tech", color: "#d7c68f", node: 3 },
  nyx: { name: "Nyx Vael", hp: 118, atk: 17, weak: "Holy Fire", color: "#49375d", node: 3, sprite: "Nyx" },
  rava: { name: "Rava", hp: 136, atk: 18, weak: "Earth", color: "#75442d", node: 3 },
  jory: { name: "Jory Bellwick", hp: 116, atk: 16, weak: "Shadow", color: "#8d6337", node: 3, sprite: "Jory" },
  tja: { name: "Tja", hp: 138, atk: 18, weak: "Ancient Fire", color: "#416d79", node: 3 },
  king: { name: "King Maeric", hp: 194, atk: 20, weak: "Shadow", color: "#aa7b35", node: 3 },
  mob: { name: "Angry Gnome Mob", hp: 152, atk: 19, weak: "Sound", color: "#71513e", node: 3 },
  thugg: { name: "Ash Quarter Thugg", hp: 142, atk: 20, weak: "Holy Fire", color: "#56403a", node: 3 },
  berend: { name: "Berend Blimpstone", hp: 146, atk: 18, weak: "Shadow", color: "#a98657", node: 3 },
  prince: { name: "Prince Lucan Cindralis", hp: 184, atk: 23, weak: "Shadow", color: "#667ea9", node: 3 },
  tibby: { name: "Tibby", hp: 134, atk: 19, weak: "Tech", color: "#8d6337", node: 3 },
  marla: { name: "Marla", hp: 150, atk: 18, weak: "Sound", color: "#6a5142", node: 3 },
  solinar: { name: "Solinar", hp: 210, atk: 31, weak: "Shadow", color: "#df843a", node: 3 },
  solinarEnraged: { name: "Solinar", hp: 230, atk: 36, weak: "Shadow", color: "#df843a", node: 3, finalState: "enraged" },
  frostmile: { name: "Frostmile Wyrm", hp: 140, atk: 26, weak: "Ancient Fire", color: "#92b8d6", node: 3 },
  leviathan: { name: "Ember Leviathan", hp: 175, atk: 29, weak: "Sigil", color: "#9d472e", node: 3 }
};

const HALL_BATTLE_BLUEPRINTS = [
  ["Sootline Opening", "ashLane", ["ledger"]],
  ["Chain Runners", "sootMarket", ["ledger", "chain"]],
  ["Dock Ledger Patrol", "ashDock", ["chain", "ledger"]],
  ["Ink in the Rain", "ashLane", ["auditor", "scribe"]],
  ["The Dock Foreman", "ashDock", ["foreman"], true],
  ["Courtyard Seal", "reverieCourt", ["seal"]],
  ["Dormitory Scribes", "reverieDorm", ["scribe", "seal"]],
  ["Saint Justin", "reverieSeal", ["sigil", "scribe"]],
  ["Clergy Lockdown", "reverieDorm", ["seal", "scribe", "seal"]],
  ["The Archive Custodian", "reverieArchive", ["custodian"], true, [["seal", "scribe"]]],
  ["Crown Step Construct", "guildSteps", ["construct"]],
  ["Registry Faultline", "guildRegistry", ["pillar", "construct"], false, [["construct", "pillar"]]],
  ["The Unbreakable", "guildHall", ["grumm"]],
  ["Spellbinder Trial", "guildCouncil", ["lyrsa", "seal"]],
  ["The Ex-Rank", "guildCouncil", ["kaeldrin", "grumm"], true, [["seal", "lyrsa"]]],
  ["Buried Hall Memory", "emberYard", ["construct", "pillar"]],
  ["Armory Collapse", "emberArmory", ["pillar", "construct", "pillar"], false, [["construct", "pillar"]]],
  ["Elder Plumpin", "emberRoof", ["memory"]],
  ["Resonance Breach", "emberCellar", ["wyrm", "pillar"]],
  ["The Red Dragon Lord", "emberRoof", ["wyrm"], true, [["wyrm", "seal"]]],
  ["Clock Goblin Patrol", "dawnCauseway", ["bell"], false, [["bell", "lock"]]],
  ["Calibration Locks", "dawnStation", ["lock", "bell"], false, [["bell", "lock", "construct"]]],
  ["Baron Revus Veln", "dawnStation", ["null", "bell"]],
  ["Seal at the Gate", "dawnGate", ["sentinel", "lock"], false, [["sentinel", "lock", "bell"]]],
  ["Last Gate Protocol", "dawnGate", ["sentinel"], true, [["lock", "sentinel"]]],
  ["The Shadow's Edge", "reverieArchive", ["shade"]],
  ["Stone and Shadow", "guildHall", ["grumm", "shade"], false, [["grumm", "shade", "lyrsa"]]],
  ["Quiet Refrain", "reverieDorm", ["nyx", "jory"], false, [["nyx", "jory", "scribe"]]],
  ["Cinderhorn Convergence", "emberYard", ["rava", "lyrsa"]],
  ["Full-Rank Company", "guildCouncil", ["kaeldrin", "shade", "grumm"], true, [["nyx", "jory", "lyrsa"]]],
  ["Audit of the Forbidden", "reverieArchive", ["auditor", "custodian"], false, [["auditor", "custodian", "scribe"]]],
  ["Cinderhorn Hunt", "emberRoof", ["rava", "wyrm"]],
  ["The Quiet Archive", "reverieArchive", ["nyx", "custodian"], false, [["nyx", "custodian", "shade"]]],
  ["Winter Spellbinders", "guildHall", ["tja", "lyrsa"], false, [["tja", "lyrsa", "jory"]]],
  ["Crown of Cindervale", "guildCouncil", ["king"], true, [["king", "sentinel", "kaeldrin"]]],
  ["Three Unwritten Names", "reverieSeal", ["shade", "nyx", "jory"], false, [["nyx", "jory", "custodian"]]],
  ["Stonewake Rebellion", "emberYard", ["grumm", "rava", "kaeldrin"], false, [["rava", "kaeldrin", "lyrsa"]]],
  ["Royal Winter", "dawnCauseway", ["tja", "king"], false, [["tja", "king", "sentinel"]]],
  ["The Final Archive", "alarm", ["custodian", "sentinel", "wyrm"], false, [["sentinel", "lock", "bell"]]],
  ["Hall of Forty Echoes", "alarm", ["king", "kaeldrin", "sentinel"], true, [["king", "grumm", "tja"]]],
  ["Sootline Uprising", "ashLane", ["mob", "thugg"], true, [["ledger", "chain"], ["bell", "lock", "thugg"]]],
  ["Reverie Interdict", "reverieSeal", ["seal", "sigil"], true, [["scribe", "custodian"], ["shade", "nyx", "scribe"]]],
  ["Stonewake Last Trial", "guildHall", ["grumm", "construct"], true, [["kaeldrin", "lyrsa"], ["sigil", "king", "kaeldrin"]]],
  ["Clockwork Riot", "dawnStation", ["bell", "lock"], true, [["tibby", "thugg"], ["construct", "lock", "bell"]]],
  ["Tavern Refrain", "lantern", ["mob", "tibby"], true, [["berend", "jory"], ["marla", "berend", "mob"]]],
  ["Noble Decree", "guildCouncil", ["null", "sigil"], true, [["prince", "king"], ["prince", "wyrm", "king"]]],
  ["Ember Old Guard", "emberRoof", ["memory", "tja"], true, [["wyrm", "chain"], ["sentinel", "wyrm", "tja"]]],
  ["Names in the Archive", "reverieArchive", ["nyx", "scribe"], true, [["custodian", "prince"], ["sigil", "null", "nyx"]]],
  ["Company Reprise", "emberYard", ["shade", "grumm", "tja"], true, [["kaeldrin", "lyrsa"], ["king", "marla", "rava"]]],
  ["Solinar's Final Sunrise", "alarm", ["frostmile"], true, [["leviathan"], ["solinar"], ["solinarEnraged"]]]
].map(([name, mapId, enemies, boss, waves = []], index) => ({ stage: index + 1, name, mapId, enemies, boss: Boolean(boss), waves }));

const HALL_RECRUITS = ["Mira", "Seerin", "Kael", "Torren", "Sparky", "Glimmer"];
const HALL_RECRUIT_STAGES = [7, 14, 21, 28];
const RECRUIT_SCENE_ROOM_NAMES = {
  "trial-room": "Ember Hall Trial Room",
  "central-hall": "Central Ember Hall",
  "torren-kitchen": "Torren's Kitchen",
  "kael-library": "Kael's Library",
  "glimmer-lab": "Glimmer's Lab",
  "training-room": "Training Room",
  "music-studio": "Verseborn's Music Studio",
  "sparky-coop": "Sparky's Coop",
  "relaxation-lounge": "Relaxation Lounge"
};
const EMBER_HALL_INTRO_ID = "ember-hall-welcome";
const RECRUIT_SCENES = [
  {
    id: EMBER_HALL_INTRO_ID, recruit: "Verseborn", variant: "welcome", title: "Welcome to Ember Hall", room: "trial-room", preferred: [],
    cast: ["Verseborn", "Marla", "Glimmer"], guests: ["Marla", "Glimmer"], allowWithoutPartner: true,
    build: () => [
      ["Marla", "So. This is Ember Hall.", { actor: "Marla", anim: "melee", motion: "welcome-step", dx: 5, facing: 3, duration: 72 }],
      ["Verseborn", "I expected more banners. Possibly a choir.", { actor: "Verseborn", anim: "walk", motion: "entrance", dx: 32, facing: 3, duration: 90 }],
      ["Glimmer", "Give me twenty minutes.", { actor: "Glimmer", anim: "melee", motion: "tool-tap", effect: "spark", facing: 1, duration: 84 }],
      ["Marla", "You fight the trials. You come back here. You get stronger."],
      ["Verseborn", "And ideally remain mostly alive."],
      ["Marla", "That too."],
      ["Marla", "When you're ready, step into the trial."]
    ]
  },
  {
    id: "mira-welcome", recruit: "Mira", variant: "welcome", title: "Spare Blades", room: "training-room", preferred: ["Seerin", "Verseborn"],
    cast: ["Verseborn", "Seerin", "Mira"],
    build: ({ actors = [] }) => actors.includes("Seerin") ? [
      ["Seerin", "You carry too many knives.", { actor: "Seerin", anim: "melee", motion: "practice-strike", facing: 3, duration: 108, with: [{ actor: "Mira", anim: "melee", motion: "spar-dodge", facing: 1, duration: 108 }] }],
      ["Mira", "And still not enough."],
      ["Verseborn", "At last, a woman of refined priorities.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Seerin", "If you're staying, you train properly."],
      ["Mira", "Then try to keep up."]
    ] : [
      ["Mira", "Show me where you keep the spare blades.", { actor: "Mira", anim: "melee", motion: "dagger-flip", facing: 1, duration: 78 }],
      ["Verseborn", "Hello to you too.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Mira", "I said spare blades. That was hello."],
      ["Verseborn", "Then welcome home. Try not to improve my posture."],
      ["Mira", "No promises."]
    ]
  },
  {
    id: "mira-humorous", recruit: "Mira", variant: "humorous", title: "Improved Readiness", room: "glimmer-lab", preferred: ["Glimmer"],
    build: ({ partner }) => partner === "Glimmer" ? [
      ["Glimmer", "I adjusted your dagger sheath."],
      ["Mira", "Why is it humming?"],
      ["Glimmer", "Improved readiness."],
      ["Mira", "It bit my glove.", { actor: "Mira", anim: "walk", emote: "!", facing: 3 }],
      ["Glimmer", "Excellent. The safety test worked."],
      ["Mira", "We define safety very differently."]
    ] : [
      [partner, "Mira, your dagger sheath is humming."],
      ["Mira", "I know."],
      [partner, "Should it be?"],
      ["Mira", "It was described as improved readiness."],
      [partner, "It just bit your glove.", { actor: "Mira", anim: "walk", emote: "!", facing: 3 }],
      ["Mira", "Apparently I am ready."]
    ]
  },
  {
    id: "mira-warm", recruit: "Mira", variant: "warm", title: "The Good Cup", room: "relaxation-lounge", preferred: ["Seerin", "Kael", "Verseborn"],
    build: ({ partner }) => [
      [partner, "You left the good cup beside my chair."],
      ["Mira", "The handle on yours was loose."],
      [partner, "You fixed that too."],
      ["Mira", "Practical maintenance. Do not make it sentimental."],
      [partner, "Of course not."],
      ["Mira", "Good. Drink before it gets cold.", { actor: "Mira", emote: "...", facing: 1 }]
    ]
  },
  {
    id: "seerin-welcome", recruit: "Seerin", variant: "welcome", title: "Practice Blades", room: "training-room", preferred: ["Mira", "Verseborn"],
    cast: ["Verseborn", "Mira", "Seerin"],
    build: ({ actors = [] }) => actors.includes("Mira") ? [
      ["Verseborn", "You entered like a knight from a story.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Seerin", "I prefer prepared.", { actor: "Seerin", anim: "melee", motion: "practice-strike", facing: 1, duration: 108, with: [{ actor: "Mira", anim: "melee", motion: "spar-dodge", facing: 3, duration: 108 }] }],
      ["Mira", "That still sounds dramatic."],
      ["Seerin", "Good. Then let's test your footing."],
      ["Mira", "Now this feels like home."]
    ] : [
      ["Verseborn", "You entered like a knight from a story.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Seerin", "I prefer prepared.", { actor: "Seerin", anim: "melee", motion: "practice-strike", facing: 1, duration: 72 }],
      ["Verseborn", "Prepared can still be dramatic."],
      ["Seerin", "Good. Then let's test your footing."],
      ["Verseborn", "Practice blades. Understood."]
    ]
  },
  {
    id: "seerin-humorous", recruit: "Seerin", variant: "humorous", title: "Load-Bearing", room: "torren-kitchen", preferred: ["Torren", "Verseborn"],
    build: ({ partner }) => [
      [partner, "Why is your shield under the soup pot?"],
      ["Seerin", "The table was uneven."],
      [partner, "That shield survived three constructs."],
      ["Seerin", "And now it survives lunch."],
      [partner, "I cannot decide whether to object."],
      ["Seerin", "The table has decided for you.", { actor: "Seerin", emote: "!", facing: 3 }]
    ]
  },
  {
    id: "seerin-warm", recruit: "Seerin", variant: "warm", title: "No Orders", room: "kael-library", preferred: ["Kael", "Mira", "Verseborn"],
    build: ({ partner, history }) => [
      ["Seerin", "I still wake expecting orders."],
      [partner, "And what do you hear instead?"],
      ["Seerin", history.seen.includes("seerin-welcome") ? "Someone challenging the furniture. Usually." : "The Hall settling around us."],
      [partner, "Does that help?"],
      ["Seerin", "More than I expected."],
      [partner, "Then we can be quiet a little longer.", { actor: partner, emote: "...", facing: 3 }]
    ]
  },
  {
    id: "kael-welcome", recruit: "Kael", variant: "welcome", title: "A Quiet Shelf", room: "kael-library", preferred: ["Glimmer", "Verseborn"],
    cast: ["Verseborn", "Glimmer", "Kael"],
    build: ({ actors = [] }) => actors.includes("Glimmer") ? [
      ["Kael", "Before anything else, there are hall rules."],
      ["Verseborn", "A thrilling opening.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Glimmer", "Do unstable devices have a shelf?", { actor: "Glimmer", anim: "melee", motion: "shelf-place", facing: 3, duration: 132, with: [{ actor: "Kael", anim: "melee", motion: "shelf-straighten", facing: 1, duration: 132 }] }],
      ["Kael", "No."],
      ["Verseborn", "He truly is the spine of this place."]
    ] : [
      ["Kael", "Before anything else, there are hall rules.", { actor: "Kael", anim: "melee", motion: "shelf-straighten", facing: 1, duration: 96 }],
      ["Verseborn", "A thrilling opening.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Kael", "Books return to their shelves. Cups do not join them."],
      ["Verseborn", "He truly is the spine of this place."],
      ["Kael", "Someone has to be."]
    ]
  },
  {
    id: "kael-humorous", recruit: "Kael", variant: "humorous", title: "Confession", room: "sparky-coop", preferred: ["Sparky", "Verseborn"],
    build: ({ partner }) => partner === "Sparky" ? [
      ["Sparky", "Krrt?"],
      ["Kael", "That sounded like a confession."],
      ["Sparky", "Prrrp.", { actor: "Sparky", anim: "walk", emote: "!", facing: 3 }],
      ["Kael", "The missing spoon is forgiven."],
      ["Sparky", "Chrrp!"],
      ["Kael", "The second spoon remains under review."]
    ] : [
      [partner, "A spoon was left on your book."],
      ["Kael", "An offering, perhaps."],
      [partner, "It is Marla's spoon."],
      ["Kael", "Then it is evidence."],
      [partner, "Should we return it?"],
      ["Kael", "Before the sermon becomes practical."]
    ]
  },
  {
    id: "kael-warm", recruit: "Kael", variant: "warm", title: "No Repair Required", room: "relaxation-lounge", preferred: ["Seerin", "Mira", "Verseborn"],
    build: ({ partner }) => [
      [partner, "You keep asking whether everyone else is all right."],
      ["Kael", "It is a useful question."],
      [partner, "It applies to you too."],
      ["Kael", "I suspected there was a trap."],
      [partner, "Sit. No fixing anything for five minutes."],
      ["Kael", "A demanding treatment. I will try.", { actor: "Kael", emote: "...", facing: 1 }]
    ]
  },
  {
    id: "torren-welcome", recruit: "Torren", variant: "welcome", title: "Sit Down", room: "torren-kitchen", preferred: ["Sparky", "Verseborn"],
    cast: ["Verseborn", "Torren", "Sparky"],
    build: ({ actors = [] }) => actors.includes("Sparky") ? [
      ["Torren", "Good. Sit down.", { actor: "Torren", anim: "melee", motion: "stir", effect: "steam", facing: 1, duration: 120 }],
      ["Verseborn", "An excellent first command.", { actor: "Verseborn", anim: "block", motion: "small-step", facing: 3, duration: 66 }],
      ["Torren", "Stew first. Questions later."],
      ["Sparky", "Prrrp!", { actor: "Sparky", anim: "walk", motion: "hop-to-pot", dx: -18, facing: 1, duration: 72 }],
      ["Torren", "No, you can't have the whole pot."]
    ] : [
      ["Torren", "Good. Sit down.", { actor: "Torren", anim: "melee", motion: "stir", effect: "steam", facing: 1, duration: 120 }],
      ["Verseborn", "An excellent first command.", { actor: "Verseborn", anim: "block", motion: "small-step", facing: 3, duration: 66 }],
      ["Torren", "Stew first. Questions later."],
      ["Verseborn", "I may already trust you completely."],
      ["Torren", "Taste it first."]
    ]
  },
  {
    id: "torren-humorous", recruit: "Torren", variant: "humorous", title: "Self-Propelled Shelf", room: "glimmer-lab", preferred: ["Glimmer", "Verseborn"],
    build: ({ partner }) => partner === "Glimmer" ? [
      ["Glimmer", "The new shelf moves supplies where they are needed."],
      ["Torren", "It is walking toward the stairs."],
      ["Glimmer", "Initiative!"],
      ["Torren", "It is carrying acid."],
      ["Glimmer", "Urgency!"],
      ["Torren", "I am nailing it to the floor.", { actor: "Torren", anim: "walk", emote: "!", facing: 3 }]
    ] : [
      [partner, "A self-propelled shelf just walked past me."],
      ["Torren", "A shelf should know where it stands."],
      [partner, "It was carrying acid."],
      ["Torren", "Then it should know quickly."],
      [partner, "Can you stop it?"],
      ["Torren", "I brought nails.", { actor: "Torren", anim: "walk", emote: "!", facing: 3 }]
    ]
  },
  {
    id: "torren-warm", recruit: "Torren", variant: "warm", title: "A Chair That Holds", room: "relaxation-lounge", preferred: ["Mira", "Kael", "Verseborn"],
    build: ({ partner, history }) => [
      [partner, "You reinforced every chair in this room."],
      ["Torren", "People come back tired."],
      [partner, "You could simply say you care."],
      ["Torren", history.seen.includes("torren-welcome") ? "I already threatened Verseborn with dinner." : "I built the chairs. That is clearer."],
      [partner, "It is, actually."],
      ["Torren", "Good. Sit. It will hold.", { actor: "Torren", emote: "...", facing: 1 }]
    ]
  },
  {
    id: "sparky-welcome", recruit: "Sparky", variant: "welcome", title: "A Shiny Welcome", room: "sparky-coop", preferred: ["Mira", "Seerin", "Verseborn"],
    cast: ["Verseborn", "Mira", "Sparky", "Seerin"],
    build: ({ actors = [] }) => actors.includes("Mira") && actors.includes("Seerin") ? [
      ["Verseborn", "Behold: the smallest legend in the hall.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Sparky", "Prrr!", { actor: "Sparky", anim: "walk", motion: "fly-oval", facing: 1, duration: 120 }],
      ["Mira", "...That is unfairly cute.", { actor: "Mira", anim: "walk", motion: "approach-lean", dx: 6, facing: 3, duration: 78 }],
      ["Seerin", "He's adorable.", { actor: "Seerin", anim: "melee", motion: "reach", dx: -5, facing: 1, duration: 78 }],
      ["Verseborn", "Excellent. He has defeated you both."]
    ] : actors.includes("Mira") ? [
      ["Verseborn", "Behold: the smallest legend in the hall.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Sparky", "Prrr!", { actor: "Sparky", anim: "walk", motion: "fly-oval", facing: 1, duration: 120 }],
      ["Mira", "...That is unfairly cute.", { actor: "Mira", anim: "walk", motion: "approach-lean", dx: 6, facing: 3, duration: 78 }],
      ["Verseborn", "Excellent. He has defeated you."],
      ["Sparky", "Chrrp!"]
    ] : actors.includes("Seerin") ? [
      ["Verseborn", "Behold: the smallest legend in the hall.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Sparky", "Prrr!", { actor: "Sparky", anim: "walk", motion: "fly-oval", facing: 1, duration: 120 }],
      ["Seerin", "He's adorable.", { actor: "Seerin", anim: "melee", motion: "reach", dx: -5, facing: 1, duration: 78 }],
      ["Verseborn", "Excellent. He has defeated you."],
      ["Sparky", "Chrrp!"]
    ] : [
      ["Verseborn", "Behold: the smallest legend in the hall.", { actor: "Verseborn", anim: "magic", motion: "flourish", facing: 3, duration: 66 }],
      ["Sparky", "Prrr!", { actor: "Sparky", anim: "walk", motion: "fly-oval", facing: 1, duration: 120 }],
      ["Verseborn", "A flawless entrance."],
      ["Sparky", "Chrrp!"],
      ["Verseborn", "Yes. You may keep the title."]
    ]
  },
  {
    id: "sparky-humorous", recruit: "Sparky", variant: "humorous", title: "Perfect Pitch", room: "music-studio", preferred: ["Verseborn"],
    build: () => [
      ["Verseborn", "That tuning fork is not a snack."],
      ["Sparky", "Krrt?"],
      ["Verseborn", "It is for finding the correct note."],
      ["Sparky", "CHIRRRP!", { actor: "Sparky", anim: "walk", emote: "!", facing: 3 }],
      ["Verseborn", "Correct note found. Several windows lost."],
      ["Sparky", "Prrrp."]
    ]
  },
  {
    id: "sparky-warm", recruit: "Sparky", variant: "warm", title: "Keeping Watch", room: "central-hall", preferred: ["Kael", "Mira", "Verseborn"],
    build: ({ partner }) => [
      [partner, "You do not have to keep watch alone."],
      ["Sparky", "Krrr..."],
      [partner, "We are all here."],
      ["Sparky", "Prrrp.", { actor: "Sparky", emote: "...", facing: 1 }],
      [partner, "Stay as long as you like."],
      ["Sparky", "Chrrp."]
    ]
  },
  {
    id: "glimmer-welcome", recruit: "Glimmer", variant: "welcome", title: "Bench Rights", room: "glimmer-lab", preferred: ["Kael", "Verseborn"],
    cast: ["Verseborn", "Glimmer", "Kael"],
    build: ({ actors = [] }) => actors.includes("Kael") ? [
      ["Glimmer", "Good news. I improved it.", { actor: "Glimmer", anim: "melee", motion: "tinker-recoil", effect: "spark-smoke", facing: 1, duration: 132 }],
      ["Kael", "Why is it smoking?", { actor: "Kael", anim: "walk", motion: "recoil", facing: 1, duration: 72 }],
      ["Glimmer", "Because progress is happening."],
      ["Verseborn", "I admire the confidence. I fear the result.", { actor: "Verseborn", anim: "block", motion: "recoil", facing: 3, duration: 72 }],
      ["Glimmer", "Both are correct."]
    ] : [
      ["Glimmer", "Good news. I improved it.", { actor: "Glimmer", anim: "melee", motion: "tinker-recoil", effect: "spark-smoke", facing: 1, duration: 132 }],
      ["Verseborn", "Why is it smoking?", { actor: "Verseborn", anim: "block", motion: "recoil", facing: 3, duration: 72 }],
      ["Glimmer", "Because progress is happening."],
      ["Verseborn", "I admire the confidence. I fear the result."],
      ["Glimmer", "Both are correct."]
    ]
  },
  {
    id: "glimmer-humorous", recruit: "Glimmer", variant: "humorous", title: "Responsive Target", room: "training-room", preferred: ["Mira", "Seerin", "Verseborn"],
    build: ({ partner }) => [
      ["Glimmer", "I made the training dummy more responsive."],
      [partner, "It threw my practice blade back."],
      ["Glimmer", "Immediate feedback."],
      [partner, "It bowed first."],
      ["Glimmer", "Manners cost nothing."],
      [partner, "The bruise disagrees.", { actor: partner, anim: "walk", emote: "!", facing: 3 }]
    ]
  },
  {
    id: "glimmer-warm", recruit: "Glimmer", variant: "warm", title: "The Lab Light", room: "relaxation-lounge", preferred: ["Kael", "Torren", "Verseborn"],
    build: ({ partner }) => [
      [partner, "You left the lab light on again."],
      ["Glimmer", "Empty workshops are too quiet."],
      [partner, "You could work in here with us."],
      ["Glimmer", "My tools take up space."],
      [partner, "So do the rest of us."],
      ["Glimmer", "That is a surprisingly sound design principle.", { actor: "Glimmer", emote: "...", facing: 1 }]
    ]
  }
];

function map(name, chapter, set, exits, points, beat, options = {}) {
  return { name, chapter, set, exits, points, beat, spawns: [], ...options };
}

function point(x, y, id, text, event, needs, vendor, quest) {
  return { x, y, id, text, event, needs, vendor, quest };
}

function recruitPoint(x, y, id, text, event, needs, vendor, quest) {
  return { ...point(x, y, id, text, event, needs, vendor, quest), recruit: id };
}

function chest(x, y, id, reward, needs) {
  return { x, y, id: `Chest:${id}`, text: [], needs, chest: { id, reward } };
}

function spawn(id, x, y, name, enemies, options = {}) {
  const behavior = options.behavior || (options.boss ? "guard" : options.rare ? "wander" : "chase");
  const phase = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 37;
  return {
    id, x, y, homeX: x, homeY: y, renderX: x * TILE, renderY: y * TILE,
    name, enemies, behavior, phase, nextMoveTick: 0, respawn: 30,
    available: !options.rare || Math.random() < .4,
    retryAt: options.rare ? Date.now() + 45000 : 0,
    ...options
  };
}

const palettes = {
  lantern: ["#4c352a", "#2a1d1c", "#161219", "#7c3427", "#d08b3f"],
  ash: ["#3d3833", "#252424", "#17151a", "#5c4540", "#c65b38"],
  reverie: ["#5f5844", "#37332a", "#20202a", "#8c5137", "#d6b06a"],
  guildspire: ["#d8d4c8", "#9b96a0", "#1b2236", "#2a3155", "#7054a0"],
  ember: ["#573f2d", "#30211b", "#271817", "#8b2e22", "#e07136"],
  alarm: ["#2e3841", "#1c252d", "#121820", "#5e6a71", "#e18b35"]
};

const collisionMasks = {
  emberHallBattles: [
    [1, 1, 14, 4], [2, 5, 6, 5], [9, 5, 13, 5],
    [2, 9, 5, 12], [9, 9, 14, 12], [6, 10, 8, 12]
  ],
  lantern: [
    [1, 1, 14, 4], [2, 5, 6, 5], [9, 5, 13, 5],
    [2, 9, 5, 11], [9, 9, 12, 11], [13, 9, 14, 12]
  ],
  ash: [
    [1, 1, 14, 4], [1, 10, 5, 12], [10, 10, 14, 12],
    [1, 5, 2, 6], [13, 7, 14, 9]
  ],
  reverie: [
    [1, 2, 5, 3], [10, 2, 14, 3],
    [1, 4, 4, 4], [11, 4, 14, 4],
    [5, 4, 6, 5], [9, 4, 10, 5],
    [3, 6, 4, 7], [10, 6, 12, 7],
    [5, 8, 6, 9], [9, 8, 10, 9],
    [1, 8, 4, 9], [11, 8, 14, 9],
    [1, 10, 5, 11], [10, 10, 14, 11]
  ],
  guildspire: [
    [1, 1, 5, 4], [10, 1, 14, 4], [2, 5, 5, 7],
    [10, 5, 13, 7], [1, 10, 4, 12], [11, 10, 14, 12]
  ],
  ember: [
    [1, 1, 5, 4], [10, 1, 14, 4], [2, 6, 5, 8],
    [10, 6, 14, 7], [10, 9, 14, 12], [1, 10, 5, 12]
  ],
  alarm: [
    [3, 1, 4, 2], [4, 4, 5, 6], [1, 8, 3, 10],
    [7, 1, 8, 5], [7, 7, 8, 12],
    [10, 2, 12, 4], [9, 8, 10, 9], [13, 7, 14, 10]
  ],
  reverieDorm: [
    [7, 8, 8, 9], [10, 8, 10, 9], [12, 8, 12, 9]
  ],
  reverieSeal: [
    [9, 3, 10, 5], [14, 3, 14, 5], [9, 7, 9, 9], [13, 7, 14, 8]
  ],
  emberYard: [
    [1, 3, 2, 4],
    [1, 5, 2, 6], [5, 5, 5, 6],
    [1, 7, 2, 8], [3, 8, 5, 8],
    [1, 10, 2, 11], [5, 10, 6, 11]
  ],
  emberHearth: [
    [6, 6, 8, 8], [5, 9, 8, 9], [13, 7, 13, 11]
  ],
  emberWorkshop: [
    [11, 8, 14, 11]
  ],
  emberRoof: [
    [12, 5, 12, 6], [12, 8, 13, 8], [13, 10, 14, 10]
  ]
};

const fieldPathMasks = {
  ashLane: [[1, 5, 14, 8], [7, 5, 9, 7]],
  sootMarket: [[1, 5, 14, 8]],
  ashDock: [[1, 5, 10, 8], [9, 7, 14, 8]],
  reverieCourt: [[3, 7, 4, 11], [4, 7, 6, 8], [6, 8, 7, 9], [7, 9, 13, 9], [10, 5, 10, 9], [13, 5, 13, 9]],
  reverieDorm: [[6, 5, 7, 7], [7, 7, 14, 7]],
  reverieSeal: [[12, 4, 12, 10], [10, 9, 12, 10]],
  reverieArchive: [[1, 3, 14, 11], [7, 2, 8, 12]],
  guildSteps: [[1, 5, 14, 9]],
  guildRegistry: [[1, 5, 14, 9], [7, 5, 9, 11]],
  guildHall: [[1, 5, 14, 9]],
  emberYard: [[1, 4, 6, 10], [3, 10, 4, 12], [6, 6, 8, 6]],
  emberHearth: [[8, 6, 12, 6], [9, 5, 12, 11], [11, 10, 11, 12], [13, 3, 13, 5]],
  emberWorkshop: [[6, 5, 10, 10], [7, 10, 7, 12], [10, 3, 10, 7], [10, 6, 12, 7]],
  emberArmory: [[6, 4, 8, 6], [7, 5, 11, 6], [10, 6, 11, 8]],
  emberRoof: [[10, 5, 14, 10], [10, 4, 10, 6], [14, 6, 14, 9]],
  dawnCauseway: [[1, 7, 9, 8], [8, 5, 14, 9]],
  dawnStation: [[1, 7, 5, 8], [5, 8, 9, 8], [8, 7, 10, 8], [9, 4, 10, 8], [10, 7, 14, 8]],
  dawnGate: [[1, 7, 8, 8], [7, 4, 10, 8], [9, 3, 14, 8]],
  alarm: [[1, 6, 6, 7], [3, 3, 6, 10], [5, 3, 6, 4], [5, 7, 7, 10], [6, 6, 9, 6], [8, 6, 13, 10], [10, 4, 13, 7], [10, 1, 13, 4]]
};

const mapForegroundZones = {
  lantern: [
    [52, 164, 48, 29],
    [149, 179, 65, 29]
  ],
  guildCouncil: [
    [39, 82, 55, 42],
    [162, 82, 59, 42],
    [91, 51, 75, 31]
  ],
  emberCellar: [
    [25, 83, 70, 36],
    [156, 111, 82, 53]
  ]
};

const npc = {
  Marla: ["#6b4a38", "#2c1d18", "#d9c0a0"],
  Stage: ["#6f5238", "#1c1820", "#ffd27d"],
  Harl: ["#80624e", "#2c241e", "#bfa06a"],
  Nyx: ["#1e2a46", "#0b0b13", "#b58a3e"],
  Rava: ["#26342f", "#427065", "#d8b08b"],
  Kaeldrin: ["#10233f", "#111018", "#d9c07b"],
  Lyrsa: ["#f2eee6", "#f2f2ec", "#6b4bb0"],
  "Field Clerk": ["#26353e", "#b08a55", "#7bd4c6"]
};

function gearByName(name) {
  const baseName = gearBaseName(name);
  const gear = Object.values(gearDb).flat().find(g => g.name === baseName);
  if (!gear) return gear;
  const rolledStats = gearInstance(name)?.stats || temporaryGearStats.get(name);
  return rolledStats ? { ...gear, stats: { ...rolledStats } } : gear;
}

function talentNode(tier, name, type, value, desc) {
  const text = desc || value?.desc || "";
  return { tier, level: TALENT_POINT_LEVELS[Math.max(0, (tier - 1) * 2)], name, type, value, desc: text, unlockDesc: text };
}

function addOwnedGear(name, amount = 1, options = {}) {
  const baseName = gearBaseName(name);
  if (!baseName || amount < 1) return [];
  const wasOwned = state.ownedGear.includes(baseName);
  const existingSeparateCopies = echoGearInstanceRefs(baseName).length > 0;
  if (echoForgeGearNames.has(baseName) || options.separateCopy || existingSeparateCopies) {
    if (!echoForgeGearNames.has(baseName) && !existingSeparateCopies && wasOwned) migrateGearToSeparateCopies(baseName);
    if (!wasOwned) state.ownedGear.push(baseName);
    const instanceOptions = { ...options, allowAny: true };
    const refs = Array.from({ length: amount }, () => createEchoGearInstance(baseName, instanceOptions)).filter(Boolean);
    syncEchoForgeCopies(baseName);
    return refs;
  }
  if (!wasOwned) state.ownedGear.push(baseName);
  state.gearCopies[baseName] = (state.gearCopies[baseName] || 0) + amount;
  ensureGearMetadata(baseName, options);
  return Array.from({ length: amount }, () => baseName);
}

function equippedGearUsers(name) {
  if (!name) return [];
  const instance = gearInstance(name);
  return state.party.filter(id => Object.values(baseJobs[id].gear).some(ref => instance ? ref === name : gearBaseName(ref) === gearBaseName(name)));
}

function gearCopyCount(name) {
  if (gearInstance(name)) return 1;
  const baseName = gearBaseName(name);
  const separateCopies = echoGearInstanceRefs(baseName).length;
  if (separateCopies) return separateCopies;
  return state.gearCopies[baseName] || (state.ownedGear.includes(baseName) ? 1 : 0);
}

function canEquip(id, gear) {
  const owners = gearOwners[gear?.name];
  return !owners || owners.includes(id);
}

const AUTO_EQUIP_PROFILES = {
  Verseborn: { damage: 1, healing: .45, hp: .12, mp: .16, agi: .22, echo: .28, control: .75, support: 1, tank: .2 },
  Mira: { damage: 1.35, healing: 0, hp: .08, mp: .08, agi: .34, echo: .12, control: 1, support: .15, tank: .05 },
  Seerin: { damage: .62, healing: .45, hp: .34, mp: .12, agi: .08, echo: .18, control: .7, support: .75, tank: 1 },
  Kael: { damage: .35, healing: 1.45, hp: .2, mp: .3, agi: .12, echo: .25, control: .35, support: 1.15, tank: .35 },
  Torren: { damage: .85, healing: .18, hp: .48, mp: .06, agi: .05, echo: .12, control: .55, support: .5, tank: 1.25 },
  Glimmer: { damage: 1.2, healing: .35, hp: .1, mp: .16, agi: .28, echo: .24, control: .85, support: .55, tank: .12 },
  Sparky: { damage: 1.2, healing: .35, hp: .1, mp: .18, agi: .24, echo: .32, control: .45, support: .55, tank: .1 }
};

function autoEquipLoadoutScore(id) {
  const profile = AUTO_EQUIP_PROFILES[id] || AUTO_EQUIP_PROFILES.Verseborn;
  const t = totals(id);
  const output = estimatedHeroOutput(id);
  const statusProc = ["poison", "sleep", "stun"].reduce((sum, type) => sum + effectValue(id, "statusOnHit", type), 0);
  const resistance = ["poison", "sleep", "stun"].reduce((sum, type) => sum + effectValue(id, "statusResistance", type), effectValue(id, "allStatusResistance"));
  const utility = statusProc * 100 * profile.control
    + effectValue(id, "statusChance") * 65 * profile.control
    + effectValue(id, "statusDuration") * 7 * profile.control
    + effectValue(id, "buffDuration") * 8 * profile.support
    + effectValue(id, "blockPower") * 100 * profile.tank
    + resistance * 36 * (profile.tank + .25)
    + effectValue(id, "echoing") * 260
    + effectValue(id, "openingTurnProgress") * 45 * (profile.agi + .4)
    + effectValue(id, "openingResonance") * .35
    + (state.gameMode === "hallBattles" ? 0 : effectValue(id, "hpOnHit") * .7)
    + (state.gameMode === "hallBattles" ? 0 : effectValue(id, "mpOnHit") * 1.2)
    + (state.gameMode === "hallBattles" ? 0 : effectValue(id, "battleRegen") * .16)
    + combatSustainRate(id, "leeching") * 90 * (profile.damage + .25)
    + combatSustainRate(id, "siphoning") * 110 * (profile.damage + profile.support * .35)
    + effectValue(id, "weaknessDamage") * 55 * profile.damage
    + effectValue(id, "poisonDamage") * 55 * (id === "Mira" ? 1 : .25);
  return output.dps * profile.damage
    + output.hps * profile.healing
    + t.max * profile.hp
    + t.mp * profile.mp
    + t.agi * profile.agi
    + t.echo * profile.echo
    + utility;
}

function autoEquipGearScore(id, slot, ref) {
  const hero = baseJobs[id];
  if (!hero || !Object.hasOwn(hero.gear, slot)) return -1e9;
  const gear = ref ? gearByName(ref) : null;
  if (gear && (gear.slot !== slot || !canEquip(id, gear))) return -1e9;
  const current = hero.gear[slot];
  try {
    hero.gear[slot] = ref || null;
    const rarity = ref ? gearRarityRank(gearRarity(ref)) : 0;
    return autoEquipLoadoutScore(id) + rarity * .001 + (ref ? gearItemPower(ref) : 0) * .00001;
  } finally {
    hero.gear[slot] = current;
  }
}

function gearInventoryTokens(slot) {
  const tokens = [];
  state.ownedGear.forEach(name => {
    const separateRefs = echoGearInstanceRefs(name);
    if (separateRefs.length) {
      separateRefs.forEach(ref => {
        const gear = gearByName(ref);
        if (gear?.slot === slot) tokens.push({ id: ref, ref, gear, equippedBy: null });
      });
      return;
    }
    const gear = gearByName(name);
    if (gear?.slot !== slot) return;
    const copies = Math.max(1, Number(state.gearCopies[name]) || 1);
    for (let copy = 0; copy < copies; copy++) tokens.push({ id: `${name}#${copy + 1}`, ref: name, gear, equippedBy: null });
  });
  state.party.forEach(id => {
    const equippedRef = baseJobs[id]?.gear?.[slot];
    if (!equippedRef) return;
    const exact = tokens.find(token => !token.equippedBy && token.ref === equippedRef);
    const fallback = tokens.find(token => !token.equippedBy && gearBaseName(token.ref) === gearBaseName(equippedRef));
    const token = exact || fallback;
    if (token) token.equippedBy = id;
  });
  return tokens;
}

function maximizeGearAssignments(weights) {
  const rows = weights.length;
  const columns = weights[0]?.length || 0;
  if (!rows || columns < rows) return [];
  const maximum = Math.max(0, ...weights.flat().filter(Number.isFinite));
  const u = Array(rows + 1).fill(0);
  const v = Array(columns + 1).fill(0);
  const p = Array(columns + 1).fill(0);
  const way = Array(columns + 1).fill(0);
  for (let row = 1; row <= rows; row++) {
    p[0] = row;
    let column = 0;
    const minimum = Array(columns + 1).fill(Infinity);
    const used = Array(columns + 1).fill(false);
    do {
      used[column] = true;
      const activeRow = p[column];
      let delta = Infinity;
      let nextColumn = 0;
      for (let candidate = 1; candidate <= columns; candidate++) {
        if (used[candidate]) continue;
        const cost = maximum - weights[activeRow - 1][candidate - 1] - u[activeRow] - v[candidate];
        if (cost < minimum[candidate]) {
          minimum[candidate] = cost;
          way[candidate] = column;
        }
        if (minimum[candidate] < delta) {
          delta = minimum[candidate];
          nextColumn = candidate;
        }
      }
      for (let candidate = 0; candidate <= columns; candidate++) {
        if (used[candidate]) {
          u[p[candidate]] += delta;
          v[candidate] -= delta;
        } else {
          minimum[candidate] -= delta;
        }
      }
      column = nextColumn;
    } while (p[column] !== 0);
    do {
      const previous = way[column];
      p[column] = p[previous];
      column = previous;
    } while (column !== 0);
  }
  const assignment = Array(rows).fill(-1);
  for (let column = 1; column <= columns; column++) {
    if (p[column]) assignment[p[column] - 1] = column - 1;
  }
  return assignment;
}

function assignGearRef(id, slot, ref) {
  const hero = baseJobs[id];
  if (!hero || !Object.hasOwn(hero.gear, slot)) return false;
  const currentRef = hero.gear[slot] || null;
  if (!ref) {
    hero.gear[slot] = null;
    return currentRef !== null;
  }
  const gear = gearByName(ref);
  if (!gear || gear.slot !== slot || !ownsGearRef(ref) || !canEquip(id, gear) || currentRef === ref) return false;
  const holders = state.party.filter(heroId => heroId !== id && baseJobs[heroId].gear[slot] === ref);
  const usedCopies = state.party.filter(heroId => baseJobs[heroId].gear[slot] === ref).length;
  if (holders.length && usedCopies >= gearCopyCount(ref)) {
    const otherId = holders[0];
    const currentGear = gearByName(currentRef);
    baseJobs[otherId].gear[slot] = currentGear && canEquip(otherId, currentGear) ? currentRef : null;
  }
  hero.gear[slot] = ref;
  return true;
}

function autoEquipHero(id, pool = autoEquipPool) {
  if (!state.party.includes(id)) return false;
  let changed = false;
  Object.keys(baseJobs[id].gear).forEach(slot => {
    const tokens = gearInventoryTokens(slot).filter(token => canEquip(id, token.gear)
      && (pool === "all" || !token.equippedBy || token.equippedBy === id));
    const current = baseJobs[id].gear[slot];
    const candidates = [...tokens, { id: `empty:${slot}`, ref: null, gear: null, equippedBy: null }]
      .sort((a, b) => autoEquipGearScore(id, slot, b.ref) - autoEquipGearScore(id, slot, a.ref));
    const best = candidates[0]?.ref || null;
    if (best !== current) changed = assignGearRef(id, slot, best) || changed;
  });
  state.party.forEach(clampHeroVitals);
  return changed;
}

function autoEquipParty(pool = autoEquipPool) {
  const heroes = state.party.filter(id => baseJobs[id]);
  if (!heroes.length) return false;
  let changed = false;
  Object.keys(baseJobs[heroes[0]].gear).forEach(slot => {
    const tokens = gearInventoryTokens(slot);
    const choices = [...tokens, ...heroes.map((id, index) => ({ id: `empty:${slot}:${index}`, ref: null, gear: null, equippedBy: null }))];
    const weights = heroes.map(id => choices.map(choice => {
      if (choice.gear && !canEquip(id, choice.gear)) return -1e9;
      if (pool === "unequipped" && choice.equippedBy && choice.equippedBy !== id) return -1e9;
      return autoEquipGearScore(id, slot, choice.ref);
    }));
    const assignment = maximizeGearAssignments(weights);
    const next = heroes.map((id, index) => choices[assignment[index]]?.ref || null);
    heroes.forEach((id, index) => {
      if (baseJobs[id].gear[slot] !== next[index]) changed = true;
      baseJobs[id].gear[slot] = next[index];
    });
  });
  heroes.forEach(clampHeroVitals);
  return changed;
}

function runAutoEquip(target) {
  const changed = target === "party" ? autoEquipParty() : autoEquipHero(selectedGearHero);
  selectedGearRef = null;
  playSfx(changed ? "item" : "menu");
  updatePanels();
  renderMenu();
  showHudNotice(changed
    ? target === "party" ? `AUTO EQUIP - ${state.party.length} heroes optimized` : `AUTO EQUIP - ${selectedGearHero} optimized`
    : "AUTO EQUIP - current loadout is already optimal");
}

function effectValue(id, type, match = null) {
  const fixed = Object.values(baseJobs[id].gear).reduce((total, name) => {
    const effects = gearEffects(gearByName(name));
    return total + effects
      .filter(effect => effect.type === type && (match === null || effect.status === match || effect.stat === match))
      .reduce((sum, effect) => sum + (effect.value || 0), 0);
  }, 0);
  const setBonus = activeMythicSetEffects(id)
    .filter(effect => effect.type === type && (match === null || effect.status === match || effect.stat === match))
    .reduce((sum, effect) => sum + (effect.value || 0), 0);
  return fixed + setBonus + affixValue(id, type, match);
}

function talentPointsEarned(level) {
  return TALENT_POINT_LEVELS.filter(required => required <= level).length;
}

function talentPointsSpent(id) {
  return progressFor(id).talents.length;
}

function progressFor(id) {
  if (!state.heroProgress[id]) state.heroProgress[id] = { level: 1, xp: 0, talents: [], pendingMilestones: [] };
  const progress = state.heroProgress[id];
  if (id === "Mira" && ["Fade into Shadow", "Fade Into Shadow"].includes(progress.rank0)) progress.rank0 = "Veiled Recovery";
  if (!Array.isArray(progress.talents)) progress.talents = [];
  const validNames = new Set((talentTrees[id] || []).map(entry => entry.name));
  progress.talents = [...new Set(progress.talents.filter(name => validNames.has(name)))];
  const capstones = progress.talents.filter(name => talentTrees[id].some(entry => entry.name === name && entry.tier === 5));
  if (capstones.length > 1) progress.talents = progress.talents.filter(name => !capstones.slice(1).includes(name));
  if (progress.rank0 && !rank0Choices[id]?.some(entry => entry.name === progress.rank0)) delete progress.rank0;
  const available = Math.max(0, talentPointsEarned(progress.level) - progress.talents.length);
  progress.pendingMilestones = available ? TALENT_POINT_LEVELS.filter(level => level <= progress.level).slice(-available) : [];
  return progress;
}

function pendingSkillPoints() {
  return state.party.flatMap(id => progressFor(id).pendingMilestones.map(level => ({ id, level })));
}

function updateSkillPointNotice() {
  const pending = pendingSkillPoints();
  const hidden = !pending.length || !["walk", "atlas"].includes(mode);
  el.skillPointNotice.classList.toggle("hidden", hidden);
  if (!pending.length) return;
  const first = pending[0];
  const extra = pending.length > 1 ? ` / +${pending.length - 1} more` : "";
  el.skillPointNotice.querySelector("strong").textContent = pending.length === 1 ? "SKILL POINT READY" : `${pending.length} SKILL POINTS READY`;
  el.skillPointNoticeDetail.textContent = `${first.id} / Level ${first.level}${extra}`;
  el.skillPointNotice.setAttribute("aria-label", `${pending.length} skill point${pending.length === 1 ? "" : "s"} ready. Open Skills.`);
}

function spendPendingSkillPoint(id, level) {
  progressFor(id);
  updateSkillPointNotice();
}

function xpForNextLevel(level) {
  if (level >= MAX_LEVEL) return 0;
  return 60 + level * 28 + level * level * 4;
}

function activeTalents(id) {
  const chosen = progressFor(id).talents;
  return (talentTrees[id] || []).filter(entry => chosen.includes(entry.name));
}

function talentValue(id, type, matchValue = null) {
  return activeTalents(id)
    .filter(entry => entry.type === type && (matchValue === null || entry.value === matchValue))
    .reduce((total, entry) => total + (typeof entry.value === "number" ? entry.value : 1), 0);
}

function typedTalentValue(id, type, matchType = null) {
  return activeTalents(id)
    .filter(entry => entry.type === type)
    .reduce((total, entry) => {
      if (typeof entry.value === "number") return total + entry.value;
      if (entry.value && (matchType === null || entry.value.type === matchType)) return total + (entry.value.value || 0);
      return total;
    }, 0);
}

function ensureStatuses(unit) {
  if (unit && !Array.isArray(unit.statuses)) unit.statuses = [];
  return unit?.statuses || [];
}

function combatantKey(unit) {
  return unit?.id || unit?.name || "unknown";
}

function statusOf(unit, type) {
  return ensureStatuses(unit).find(status => status.type === type) || null;
}

function statusValue(unit, type) {
  const status = statusOf(unit, type);
  if (!status) return 0;
  const opening = status.source?.id === "Verseborn" && status.remaining === status.initialRemaining ? 1 + typedTalentValue("Verseborn", "openingBuffPotency") : 1;
  return (status.value ?? STATUS_DEFS[type]?.value ?? 0) * opening;
}

function hasNegativeStatus(unit) {
  return ensureStatuses(unit).some(status => STATUS_DEFS[status.type]?.negative && !["broken", "overheated"].includes(status.type));
}

function currentBreakStrength(source) {
  if (!source?.id) return Math.max(1, source?.stats?.str || source?.atk || 1);
  return Math.max(1, Math.round(totals(source.id).str * (1 + statusValue(source, "strengthUp"))));
}

function addBreakProgress(source, target, amount) {
  if (!canGenerateBreak(source)) return { gain: 0, breaks: 0, remainder: target?.stagger || 0, bonusDamage: 0 };
  const gain = Math.max(0, Math.round(amount || 0));
  const total = Math.max(0, target?.stagger || 0) + gain;
  const breaks = Math.floor(total / BREAK_THRESHOLD);
  if (target) target.stagger = total % BREAK_THRESHOLD;
  return {
    gain,
    breaks,
    remainder: target?.stagger || 0,
    bonusDamage: breaks * Math.max(1, Math.round(currentBreakStrength(source) * BREAK_STR_COEFFICIENT))
  };
}

function brokenPhysicalDamageMultiplier(source, statKey, target) {
  if (source?.id !== "Torren" || statKey !== "str" || !statusOf(target, "broken")) return 1;
  return 1 + typedTalentValue(source.id, "brokenDamage");
}

const EVASION_CAP = .6;

function baseEvasionValue(defender) {
  if (Number.isFinite(defender?.baseEvasion)) return Math.max(0, defender.baseEvasion);
  if (defender?.id && Number.isFinite(FLAMEGUARD_BASE_EVASION[defender.id])) return FLAMEGUARD_BASE_EVASION[defender.id];
  return .05;
}

function combatEvasionChance(defender) {
  if (!defender) return 0;
  const heroBonus = defender.id ? effectValue(defender.id, "evasion") + typedTalentValue(defender.id, "baseEvasion") : 0;
  const enemyBonus = defender.id ? 0 : defender.affixes?.evasion || 0;
  return Math.max(0, Math.min(EVASION_CAP, baseEvasionValue(defender) + statusValue(defender, "evasion") + heroBonus + enemyBonus));
}

function consumeEvasionCharge(defender) {
  const temporary = statusOf(defender, "evasion");
  if (!temporary) return;
  const charges = Number.isFinite(temporary.incomingCharges) ? temporary.incomingCharges : temporary.remaining;
  temporary.incomingCharges = Math.max(0, charges - 1);
  temporary.remaining = temporary.incomingCharges;
  if (!temporary.incomingCharges) defender.statuses = ensureStatuses(defender).filter(status => status !== temporary);
}

function tryEvadeAttack(defender, roll = Math.random()) {
  const evaded = roll < combatEvasionChance(defender);
  consumeEvasionCharge(defender);
  if (evaded && defender.id === "Mira" && typedTalentValue(defender.id, "evasionAfterDodge")) {
    applyStatus(defender, "critUp", defender, { duration: 2, value: typedTalentValue(defender.id, "evasionAfterDodge"), force: true });
  }
  return evaded;
}

function statusApplicationChance(target, type, baseChance = 1, source = null) {
  const enemyTarget = battle?.enemies?.includes(target);
  let chance = baseChance;
  if (enemyTarget) {
    const tier = target.resistanceTier || "normal";
    chance *= target.statusChances?.[type] ?? STATUS_TIER_CHANCES[tier]?.[type] ?? 1;
  } else {
    const id = target.id;
    const specific = id ? effectValue(id, "statusResistance", type) : 0;
    const broad = id ? effectValue(id, "allStatusResistance") + typedTalentValue(id, "statusResistance") : 0;
    chance *= Math.max(.05, 1 - specific - broad);
  }
  if (source?.id) {
    chance *= 1 + typedTalentValue(source.id, "statusChance", type) + effectValue(source.id, "statusChance");
  }
  return Math.max(0, Math.min(.95, chance));
}

function sourceBasicDamage(source) {
  if (source?.id) {
    const basic = battleSkills(source.id, source).find(entry => entry.cost === 0 && (entry.power > 0 || entry.coefficient)) || baseJobs[source.id].skills[0];
    return Math.max(1, basic.power + totals(source.id).str);
  }
  return Math.max(1, (source?.atk || source?.stats?.str || 8) + 2);
}

function transformedStatMultiplier(source, stat) {
  const config = source?.form ? TRANSFORMATION_CONFIG[source.form] : null;
  if (!config) return 1;
  const echo = source.id ? totals(source.id).echo : 0;
  const echoScale = 1 + echo * .0015;
  if (source.form === "mech") {
    const calibration = source.id ? typedTalentValue(source.id, "mechPower") + typedTalentValue(source.id, "mechCapstone") : 0;
    return (stat === "str" ? 1 + config.attack + calibration : 1 + config.tech + calibration) * echoScale;
  }
  if (source.form === "shadowpriest" && stat === "mag") {
    const shadowPower = source.id ? typedTalentValue(source.id, "shadowCapstone") : 0;
    return (1 + config.magic + shadowPower) * echoScale;
  }
  return 1;
}

function sourceRelevantStat(source, options = {}) {
  const magicBased = options.scaling ? options.scaling === "mag" : ["magic", "ultimate"].includes(options.damageKind) || ["Tech", "Shadow", "Sigil"].includes(options.element);
  if (source?.id) {
    const stats = totals(source.id);
    const stat = magicBased ? "mag" : "str";
    return Math.max(1, Math.round(stats[stat] * transformedStatMultiplier(source, stat)));
  }
  return Math.max(1, magicBased ? (source?.stats?.mag || source?.atk || 8) : (source?.atk || source?.stats?.str || 8));
}

function poisonValueFor(target, source, options = {}) {
  if (Number.isFinite(options.value)) return Math.max(1, Math.round(options.value));
  const coefficients = { weak: .2, normal: .3, strong: .4 };
  const coefficient = options.coefficient ?? coefficients[options.potency || "normal"];
  const poisonBoost = source?.id ? 1 + typedTalentValue(source.id, "poisonDamage") + effectValue(source.id, "poisonDamage") : 1;
  const scaled = sourceRelevantStat(source, options) * coefficient * poisonBoost;
  const boss = target?.resistanceTier === "boss";
  const floor = (target?.max || 1) * (boss ? .005 : .01);
  const capped = boss ? Math.min(Math.max(scaled, floor), (target?.max || 1) * .015) : Math.max(scaled, floor);
  return Math.max(1, Math.round(capped));
}

function dotValueFor(type, target, source, options = {}) {
  if (type === "poison") return poisonValueFor(target, source, options);
  const coefficient = type === "burn" ? .24 : .2;
  const boostType = type === "burn" ? "burnDamage" : "bleedDamage";
  const capstone = type === "burn" && source?.id ? typedTalentValue(source.id, "livingWildfire") : 0;
  return Math.max(1, Math.round(sourceRelevantStat(source, options) * coefficient * (1 + (source?.id ? typedTalentValue(source.id, boostType) : 0) + capstone)));
}

function statusDurationFor(source, type, requested) {
  const base = requested || STATUS_DEFS[type]?.duration || 1;
  const negative = STATUS_DEFS[type]?.negative;
  const talentBonus = negative && source?.id ? typedTalentValue(source.id, "statusDuration", type) : 0;
  const gearBonus = negative && source?.id ? effectValue(source.id, "statusDuration") : 0;
  if (type === "sleep") return Math.min(5, base);
  if (type === "stun") return 1;
  const burnBonus = type === "burn" && source?.id === "Sparky" ? typedTalentValue(source.id, "burnDuration") : 0;
  return Math.max(1, base + talentBonus + gearBonus + burnBonus);
}

function applyStatus(target, type, source, options = {}) {
  const def = STATUS_DEFS[type];
  if (!target || !def || target.hp <= 0) return { applied: false, message: "" };
  if (def.negative && !options.force && Math.random() >= statusApplicationChance(target, type, options.chance ?? 1, source)) {
    return { applied: false, message: `${def.label} RESISTED` };
  }
  let duration = statusDurationFor(source, type, options.duration);
  const existing = statusOf(target, type);
  const poisonDurations = { weak: 3, normal: 4, strong: 5 };
  if (type === "poison" && !options.duration) duration = statusDurationFor(source, type, poisonDurations[options.potency || "normal"]);
  if (def.negative && target.id) duration = Math.max(1, duration - effectValue(target.id, "statusDurationReduction"));
  let value = ["poison", "burn", "bleed"].includes(type) ? (Number.isFinite(options.value) ? options.value : dotValueFor(type, target, source, options)) : options.value ?? def.value;
  if (def.negative && source?.id && !["poison", "burn", "bleed"].includes(type) && Number.isFinite(value)) value *= 1 + typedTalentValue(source.id, "debuffPotency");
  const coefficient = type === "poison" ? options.coefficient ?? ({ weak: .2, normal: .3, strong: .4 }[options.potency || "normal"]) : null;
  const data = {
    type,
    source: { id: source?.id || null, name: source?.name || source?.id || "Unknown" },
    remaining: duration,
    initialRemaining: duration,
    value: existing && type === "poison" ? Math.max(existing.value || 0, value) : value,
    coefficient: existing && type === "poison" ? Math.max(existing.coefficient || 0, coefficient) : coefficient,
    appliedRound: battle?.round || 0,
    appliedTurn: combatantKey(source)
  };
  if (type === "evasion") data.incomingCharges = Math.max(1, Number(options.incomingCharges) || duration);
  if (existing) {
    if (type === "poison") data.remaining = Math.max(existing.remaining || 0, duration);
    Object.assign(existing, data);
  }
  else ensureStatuses(target).push(data);
  if (battle?.attackDamage) {
    battle.attackStatuses ||= [];
    battle.attackStatuses.push(`${target.name}: ${def.label}`);
  }
  return { applied: true, message: def.label };
}

const CLEANSE_PRIORITY = {
  shadowVulnerability: 80,
  stun: 100, sleep: 95, silence: 90, physicalVulnerability: 80, magicVulnerability: 80,
  holyVulnerability: 80, marked: 78, critExposed: 74, poison: 60, burn: 60, bleed: 60,
  defenseDown: 45, magicDefenseDown: 45, agilityDown: 40, disrupted: 40, shadowExposed: 40
};

const DISPEL_PRIORITY = {
  rankProtection: 85,
  barrier: 100, evasion: 95, damageUp: 90, strengthUp: 85, magicUp: 85,
  defenseUp: 85, critUp: 80, agilityUp: 78, shadowUp: 75, echoPower: 75,
  vampiric: 72, holyFollowUp: 68, stunFocus: 60
};

function removableStatus(unit, priorities) {
  return ensureStatuses(unit)
    .filter(status => priorities[status.type] && status.remaining > 0)
    .sort((a, b) => {
      const aScore = priorities[a.type] + Math.min(5, a.remaining) * 3 - (a.remaining === 1 ? 12 : 0);
      const bScore = priorities[b.type] + Math.min(5, b.remaining) * 3 - (b.remaining === 1 ? 12 : 0);
      return bScore - aScore;
    })[0] || null;
}

function removeCleanseStatus(target) {
  const status = removableStatus(target, CLEANSE_PRIORITY);
  if (!status) return null;
  target.statuses = ensureStatuses(target).filter(entry => entry !== status);
  return STATUS_DEFS[status.type]?.label || status.type;
}

function cleanseStatuses(target) {
  return removeCleanseStatus(target) ? 1 : 0;
}

function dispelStatus(target) {
  const status = removableStatus(target, DISPEL_PRIORITY);
  if (!status) return null;
  target.statuses = ensureStatuses(target).filter(entry => entry !== status);
  return STATUS_DEFS[status.type]?.label || status.type;
}

function cleanseWithTalent(source, target) {
  const removedStatus = removeCleanseStatus(target);
  const removed = removedStatus ? 1 : 0;
  if (removedStatus) addBattleFloater(target, 0, { kind: "cleanse", text: `CLEANSED: ${removedStatus.toUpperCase()}` });
  const bonus = source?.id ? typedTalentValue(source.id, "cleanseHeal") : 0;
  if (removed && bonus) {
    const restored = Math.min(Math.round(target.max * bonus), target.max - target.hp);
    target.hp += restored;
    if (restored) addBattleFloater(target, restored, { kind: "heal" });
  }
  return removed;
}

function breakSleepFromDamage(target) {
  const asleep = statusOf(target, "sleep");
  if (!asleep) return "";
  target.statuses = target.statuses.filter(status => status !== asleep);
  return "SLEEP BROKEN!";
}

function outgoingDamageMultiplier(unit, kind, target = null) {
  let multiplier = 1 + statusValue(unit, "damageUp");
  if (kind === "melee") multiplier *= 1 + statusValue(unit, "strengthUp");
  if (kind === "magic" || kind === "ultimate") multiplier *= 1 + statusValue(unit, "magicUp");
  if (unit?.id) {
    const damageType = kind === "melee" ? "physicalDamage" : "magicDamage";
    multiplier *= 1 + effectValue(unit.id, damageType) + typedTalentValue(unit.id, damageType);
    if (target && hasNegativeStatus(target)) multiplier *= 1 + typedTalentValue(unit.id, "afflictedDamage") + effectValue(unit.id, "afflictedDamage");
    if (target && target.hp / target.max < .35) multiplier *= 1 + typedTalentValue(unit.id, "lowHpDamage");
    if (kind === "melee") multiplier *= 1 + statusValue(target, "physicalVulnerability");
    else multiplier *= 1 + statusValue(target, "magicVulnerability");
    multiplier *= 1 + statusValue(unit, "shadowUp");
  }
  multiplier *= Math.max(.5, 1 - statusValue(unit, "disrupted"));
  return multiplier;
}

function incomingDamageMultiplier(unit) {
  let multiplier = Math.max(.2, 1 - statusValue(unit, "defenseUp") - statusValue(unit, "barrier"));
  if (unit?.form === "mech") multiplier *= 1 - TRANSFORMATION_CONFIG.mech.defense - typedTalentValue(unit.id, "mechDefense") - typedTalentValue(unit.id, "fortressCapstone");
  if (statusOf(unit, "combatDrone")) multiplier *= 1 - typedTalentValue(unit.id, "gadgetDefense");
  multiplier *= 1 - statusValue(unit, "mechGuard");
  return Math.max(.15, multiplier);
}

function effectiveAgility(unit, base) {
  const buff = 1 + statusValue(unit, "agilityUp");
  const opening = battle?.round === 1 && unit?.id ? 1 + effectValue(unit.id, "openingTurnProgress") : 1;
  const talent = unit?.id ? 1 + typedTalentValue(unit.id, "initiativeBoost") : 1;
  const slowed = unit && hasNegativeStatus(unit) ? 1 - statusValue(unit, "agilityDown") : 1;
  return Math.round(base * buff * opening * talent * slowed);
}

function applySkillStatuses(source, target, sk) {
  const applications = [];
  const status = sk.status && sk.name === "Scramble Signal" ? { ...sk.status, duration: sk.status.duration + typedTalentValue(source.id, "scrambleDuration") } : sk.status;
  if (status) applications.push(applyStatus(target, status.type, source, { ...status, scaling: skillScaling(sk), damageKind: sk.anim, element: sk.element }));
  if (source?.id === "Seerin" && sk.name === "Starflame Cut" && typedTalentValue(source.id, "starflameBrand")) applications.push(applyStatus(target, "holyVulnerability", source, { duration: 2, value: .2, force: true }));
  if (source?.id === "Sparky" && sk.name === "Ember Nip" && typedTalentValue(source.id, "emberNipBurn")) applications.push(applyStatus(target, "burn", source, { duration: 4, chance: .8, scaling: skillScaling(sk), element: sk.element }));
  (sk.extraStatuses || []).forEach(status => applications.push(applyStatus(target, status.type, source, { ...status, scaling: skillScaling(sk), damageKind: sk.anim, element: sk.element })));
  if (source?.id && sk.element === "Tech" && !sk.statusOnly && (sk.power > 0 || sk.coefficient) && Math.random() < typedTalentValue(source.id, "techDisrupt")) {
    applications.push(applyStatus(target, "disrupted", source, { force: true, duration: 2, value: .15 }));
  }
  if (source?.id && sk.element === "Shadow" && typedTalentValue(source.id, "shadowResistanceDown") && Math.random() < .5) {
    applications.push(applyStatus(target, "magicVulnerability", source, { chance: 1, duration: 2, value: typedTalentValue(source.id, "shadowResistanceDown") }));
  }
  if (source?.id === "Verseborn" && applications.some(result => result.applied) && typedTalentValue(source.id, "debuffAgility")) {
    applications.push(applyStatus(target, "agilityDown", source, { chance: 1, duration: 3, value: typedTalentValue(source.id, "debuffAgility") }));
  }
  if (source?.id && (sk.power > 0 || sk.coefficient)) {
    ["poison", "sleep", "stun"].forEach(type => {
      const chance = skillStatusOnHitChance(source, sk, type);
      if (chance > 0) applications.push(applyStatus(target, type, source, { chance, potency: type === "poison" ? "weak" : undefined, duration: type === "poison" ? 3 : undefined, scaling: skillScaling(sk), damageKind: sk.anim, element: sk.element }));
    });
  }
  return applications.map(result => result.message).filter(Boolean);
}

function applySkillBuffs(source, targets, sk) {
  const notes = [];
  if (sk.protectsAlly) {
    const protectedAlly = targets[0];
    if (protectedAlly && protectedAlly !== source) {
      applyStatus(source, "rankProtection", source, { duration: 2, value: typedTalentValue(source.id, "interceptCharges") || 1, force: true });
      statusOf(source, "rankProtection").protectedKey = combatantKey(protectedAlly);
      notes.push(`${source.name} protects ${protectedAlly.name}`);
    }
    if (sk.protectorDefense) applyStatus(source, "defenseUp", source, { duration: 2, value: sk.protectorDefense, force: true });
    if (source.id === "Seerin" && typedTalentValue(source.id, "bulwarkTaunt")) source.holdTheLine = true;
  }
  if (sk.rank0Guard) {
    source.guarding = true;
    notes.push(`${source.name} is Guarded`);
  }
  const songBoost = source?.id && sk.element === "Sound" ? source.nextSongBoost || 0 : 0;
  (sk.buffs || []).forEach(buff => {
    targets.forEach(target => {
      const supportBonus = source?.id ? typedTalentValue(source.id, "supportPotency") : 0;
      const barrierBonus = buff.type === "barrier" && source?.id ? typedTalentValue(source.id, "barrierBoost") + (source.form === "mech" ? typedTalentValue(source.id, "fortressCapstone") : 0) : 0;
      const duration = (buff.duration || STATUS_DEFS[buff.type]?.duration || 3) + (source?.id ? typedTalentValue(source.id, "buffDuration") + effectValue(source.id, "buffDuration") + (typedTalentValue(source.id, "supportPotency") ? 1 : 0) : 0);
      const woundedBonus = target.hp / target.max < .35 && ["defenseUp", "barrier"].includes(buff.type) ? typedTalentValue(source.id, "woundedProtection") : 0;
      const value = (buff.value ?? STATUS_DEFS[buff.type]?.value) * (1 + supportBonus + barrierBonus + songBoost + woundedBonus);
      const result = applyStatus(target, buff.type, source, { duration, chance: 1, value });
      if (result.message) notes.push(`${target.name}: ${result.message}`);
    });
  });
  if (source.id === "Sparky" && sk.name === "Emberblood" && typedTalentValue(source.id, "emberDefense")) targets.forEach(target => applyStatus(target, "defenseUp", source, { duration: 3, value: .1, force: true }));
  if (source?.id && sk.partyWide && sk.buffs?.length && typedTalentValue(source.id, "secondaryBuff")) {
    const primaryDefense = sk.buffs.some(buff => ["defenseUp", "barrier"].includes(buff.type));
    const secondary = primaryDefense ? "damageUp" : "defenseUp";
    targets.forEach(target => applyStatus(target, secondary, source, { duration: 2, chance: 1, value: typedTalentValue(source.id, "secondaryBuff") }));
    notes.push(`Second Chorus: ${STATUS_DEFS[secondary].label}`);
  }
  if (sk.buffs?.some(buff => buff.type === "agilityUp")) reorderRemainingTurns();
  if (songBoost) delete source.nextSongBoost;
  return notes;
}

function skillStatusOnHitChance(source, sk, type) {
  const stunMultiplier = type === "stun" && source?.id === "Mira" && (sk.doublesStunChance || statusOf(source, "stunFocus")) ? 2 : 1;
  return Math.min(.95, effectValue(source.id, "statusOnHit", type) * stunMultiplier);
}

function statusBadgesHtml(unit) {
  const entries = ensureStatuses(unit);
  if (!entries.length) return "";
  return `<div class="status-chips">${entries.slice(0, 6).map(status => {
    const def = STATUS_DEFS[status.type];
    const icon = def?.icon ? `<i aria-hidden="true">${def.icon}</i>` : "";
    return `<span class="${def?.negative ? "is-negative" : "is-buff"}" title="${def?.label || status.type}: ${status.remaining} turn(s)">${icon}${def?.short || status.type.toUpperCase()} ${status.remaining}</span>`;
  }).join("")}</div>`;
}

function processTurnStart(unit) {
  const notes = [];
  delete unit.holdTheLine;
  delete unit.mechClinicResolved;
  ["poison", "burn", "bleed"].forEach(type => {
    const dot = statusOf(unit, type);
    if (!dot || unit.hp <= 0) return;
    let amount = dot.value || 1;
    if (type === "burn" && dot.source?.id === "Sparky" && selectedRank0("Sparky")?.passive === "doubleBurn") amount *= 2;
    if (unit.id) amount = Math.max(1, Math.round(amount * (1 - affixValue(unit.id, "poisonReduction"))));
    unit.hp = Math.max(0, unit.hp - amount);
    addBattleFloater(unit, amount, { damageType: STATUS_DEFS[type].label });
    notes.push(`${STATUS_DEFS[type].label} -${amount} HP`);
  });
  transferDeadSparkyBurns();
  if (unit.hp <= 0) return { skip: true, notes };
  if (statusOf(unit, "stun")) {
    notes.push("STUNNED!");
    return { skip: true, notes };
  }
  if (statusOf(unit, "sleep")) {
    notes.push("SLEEP!");
    return { skip: true, notes };
  }
  return { skip: false, notes };
}

function processTurnEnd(unit) {
  const notes = [];
  if (unit.prrrpWindow > 0) unit.prrrpWindow--;
  ensureStatuses(unit).forEach(status => {
    if (status.type === "evasion" && Number.isFinite(status.incomingCharges)) return;
    if (status.appliedRound === battle?.round && status.appliedTurn === combatantKey(unit)) return;
    status.remaining--;
  });
  const expired = unit.statuses.filter(status => status.remaining <= 0);
  unit.statuses = unit.statuses.filter(status => status.remaining > 0);
  expired.forEach(status => {
    notes.push(`${STATUS_DEFS[status.type]?.label || status.type} faded.`);
    if (STATUS_DEFS[status.type]?.buff && status.source?.id === "Verseborn" && typedTalentValue("Verseborn", "finalRefrain") && unit.hp > 0) {
      const hp = Math.min(Math.max(1, Math.round(unit.max * .04)), unit.max - unit.hp);
      const mp = Math.min(Math.max(1, Math.round(unit.maxmp * .03)), unit.maxmp - unit.mp);
      unit.hp += hp;
      unit.mp += mp;
      if (hp) addBattleFloater(unit, hp, { kind: "heal" });
      notes.push(`Final Refrain restores ${hp} HP and ${mp} MP.`);
    }
  });
  if (unit.form) {
    const appliedNow = unit.formAppliedRound === battle?.round && unit.formAppliedTurn === combatantKey(unit);
    if (!appliedNow) unit.formTurns--;
    if (unit.formTurns <= 0) {
      const oldForm = unit.form;
      delete unit.form;
      delete unit.formTurns;
      delete unit.formAppliedRound;
      delete unit.formAppliedTurn;
      unit.statuses = unit.statuses.filter(status => status.type !== "mechGuard");
      notes.push(`${oldForm === "mech" ? "Mech Form" : "Shadowpriest"} ended.`);
    }
  }
  return notes;
}

function reorderRemainingTurns() {
  if (!battle?.turnQueue) return;
  const remaining = battle.turnQueue.slice(battle.turnIndex + 1);
  const normal = remaining.filter(turn => !turn.extra).map(turn => {
    const unit = turn.side === "party" ? battle.party.find(p => p.id === turn.id) : battle.enemies[turn.index];
    return { ...turn, agi: effectiveAgility(unit, turn.side === "party" ? totals(turn.id).agi : unit.stats.agi) };
  }).sort((a, b) => b.agi - a.agi);
  battle.turnQueue.splice(battle.turnIndex + 1, remaining.length, ...remaining.map(turn => turn.extra ? turn : normal.shift()));
}

function skillScaling(sk) {
  return sk.scaling || (sk.anim === "melee" ? "str" : "mag");
}

function skillOffensiveStat(id, sk, unit = { id }, stats = totals(id)) {
  const statKey = skillScaling(sk);
  const primary = stats[statKey] * transformedStatMultiplier(unit, statKey);
  if (sk.rank0Agility) return Math.round(primary);
  const agility = id === "Mira" ? stats.agi * .5 : 0;
  if (id === "Torren" && statKey === "str" && skillTargetsEnemies(sk)) {
    return primary + stats.stam * transformedStatMultiplier(unit, "stam") * .5;
  }
  if (id === "Seerin" && statKey === "str" && skillTargetsEnemies(sk) && !sk.dispel) {
    return primary + stats.mag * transformedStatMultiplier(unit, "mag") * .5;
  }
  return Math.round(primary + agility);
}

function skillScalingLabel(id, sk) {
  const primary = skillScaling(sk).toUpperCase();
  if (sk.rank0Agility) return primary;
  if (id === "Torren" && primary === "STR" && skillTargetsEnemies(sk)) return "STR + 0.5 STAM";
  if (id === "Seerin" && primary === "STR" && skillTargetsEnemies(sk) && !sk.dispel) return "STR + 0.5 MAG";
  return id === "Mira" && skillTargetsEnemies(sk) ? `${primary} + 0.5 AGI` : primary;
}

function rank0Protector(target, allTargets) {
  if (allTargets || !target || target.hp <= 0) return null;
  const protector = battle.party.find(ally => ally !== target && ally.hp > 0
    && !statusOf(ally, "sleep") && !statusOf(ally, "stun")
    && statusOf(ally, "rankProtection")?.protectedKey === combatantKey(target));
  if (!protector) return null;
  const protection = statusOf(protector, "rankProtection");
  protection.value--;
  if (protection.value <= 0) protector.statuses = ensureStatuses(protector).filter(status => status !== protection);
  return protector;
}

function skillHitsElementWeakness(target, sk) {
  return Boolean(target && (target.weak === sk.element || (sk.element === "Shadow" && statusOf(target, "shadowExposed"))));
}

function skillWeaknessMultiplier(id, sk, target) {
  if (!skillHitsElementWeakness(target, sk)) return 1;
  const exposurePayoff = sk.shadowExposureBonus && statusOf(target, "shadowExposed") ? 1 + sk.shadowExposureBonus : 1;
  return 1.55 * (1 + effectValue(id, "weaknessDamage")) * exposurePayoff;
}

function healingAmount(id, sk, unit = null) {
  const sacred = id === "Kael" && !unit?.form ? typedTalentValue(id, "saintCapstone") : 0;
  const ultimate = sk.anim === "ultimate" ? ultimatePotencyMultiplier(id, sk) : 1;
  const patch = sk.name === "Patch Job" ? typedTalentValue(id, "patchHealing") + (typedTalentValue(id, "mobileHospital") ? .15 : 0) : 0;
  const prrrp = sk.name === "Prrrp" ? typedTalentValue(id, "prrrpHealing") : 0;
  const interceptBoost = sk.name === "Prrrp" && unit?.prrrpWindow > 0 ? 1 + typedTalentValue(id, "interceptPrrrp") : 1;
  return Math.round((Math.abs(sk.power) + totals(id).mag * (sk.healScaling ?? .3))
    * (1 + talentValue(id, "healBoost") + sacred + patch + prrrp) * (1 + statusValue(unit, "magicUp")) * ultimate * interceptBoost);
}

function knownWeakness(unit) {
  return Boolean(unit && (partyCanSeeWeaknesses() || state.knownWeaknesses[unit.name] === unit.weak));
}

function rememberWeakness(unit) {
  if (!unit?.weak || state.knownWeaknesses[unit.name] === unit.weak) return false;
  state.knownWeaknesses[unit.name] = unit.weak;
  return true;
}

function applyTalentSkillConversion(id, skillEntry) {
  const hitsAll = talentValue(id, "aoeSkill", skillEntry.name) > 0;
  const healsAll = talentValue(id, "partyHeal", skillEntry.name) > 0;
  if (!hitsAll && !healsAll) return skillEntry;
  const addedBuff = healsAll ? HEAL_CONVERSION_BUFFS[id]?.[skillEntry.name] : null;
  return {
    ...skillEntry,
    allEnemies: skillEntry.allEnemies || hitsAll,
    partyWide: skillEntry.partyWide || healsAll,
    buffs: addedBuff ? [...(skillEntry.buffs || []), addedBuff] : skillEntry.buffs,
    desc: `${skillEntry.desc} Talent upgrade: affects every living ${hitsAll ? "enemy" : "ally"}${addedBuff ? ` and ${addedBuff.description}` : ""}.`
  };
}

function battleSkills(id, unit = null) {
  const combatUnit = unit || battle?.party?.find(member => member.id === id);
  if (combatUnit?.form && TRANSFORMED_SKILLS[combatUnit.form]) {
    let transformed = TRANSFORMED_SKILLS[combatUnit.form];
    if (combatUnit.form === "shadowpriest") {
      const unlocks = new Set(activeTalents(id).filter(entry => entry.type === "shadowSkillUnlock").map(entry => entry.value));
      transformed = transformed.filter(entry => ["Dark Communion", "Eclipse"].includes(entry.name) || unlocks.has(entry.name) || (entry.name === "Quiet Rite" && typedTalentValue(id, "twilightCapstone")));
      if (typedTalentValue(id, "twilightCapstone")) transformed = [...transformed, { ...baseJobs.Kael.skills.find(entry => entry.name === "Quiet Rite") }];
    }
    return transformed;
  }
  const extra = activeTalents(id)
    .filter(entry => entry.type === "newSkill")
    .map(entry => ({
      ...entry.value,
      talentSkill: true,
      ultimateIndex: entry.value.ultimateIndex ?? (entry.value.anim === "ultimate" ? 2 : undefined),
      allEnemies: entry.value.allEnemies ?? (entry.level <= 20 && entry.value.anim === "ultimate" && entry.value.power > 0)
    }));
  const base = baseJobs[id].skills
    .filter(entry => entry.name !== rank0MovedSkills[id])
    .filter(entry => !entry.transform || progressFor(id).level >= TRANSFORMATION_UNLOCK_LEVEL)
    .map(entry => applyTalentSkillConversion(id, entry.anim === "ultimate" ? { ...entry, ultimateIndex: entry.ultimateIndex || 1 } : { ...entry }));
  if (id === "Kael" && typedTalentValue(id, "twilightCapstone")) base.push({ ...TRANSFORMED_SKILLS.shadowpriest[0], name: "Twilight Lance", coefficient: 1.2, cost: 8 });
  const rank0 = selectedRank0(id);
  if (rank0 && !rank0.passive) base.push(applyTalentSkillConversion(id, { ...rank0 }));
  if (rank0?.passive === "attackBreak") {
    const attack = base.find(entry => entry.basicAttack);
    if (attack) attack.rank0Break = 2 + (typedTalentValue(id, "shieldBash") ? 1 : 0);
  }
  return [...base, ...extra];
}

function battleAnimationName(sk, unit = null) {
  if (sk.anim !== "ultimate") return sk.anim;
  if (!unit?.form && ["Kael", "Glimmer"].includes(unit?.id) && !sk.transform) return "magic";
  return "ultimate";
}

function activateTransformation(unit, form) {
  const config = TRANSFORMATION_CONFIG[form];
  if (!unit || !config) return false;
  unit.form = form;
  unit.formTurns = config.duration + (unit.id ? typedTalentValue(unit.id, "transformDuration") : 0);
  unit.anim = "idle";
  unit.formAppliedRound = battle?.round || 0;
  unit.formAppliedTurn = combatantKey(unit);
  return true;
}

function skillHitsAll(id, sk) {
  return Boolean(sk.allEnemies || talentValue(id, "aoeSkill", sk.name));
}

function skillTargetsEnemies(sk) {
  return sk.targetSide === "enemy" || (!["ally", "party", "self"].includes(sk.targetSide) && sk.power >= 0 && sk.anim !== "block");
}

function partyCanSeeWeaknesses() {
  return state.activeParty.some(id => talentValue(id, "revealWeakness") > 0);
}

function averagePartyLevel() {
  const roster = state.party.length ? state.party : ["Verseborn"];
  return Math.max(1, Math.round(roster.reduce((sum, id) => sum + progressFor(id).level, 0) / roster.length));
}

function awardHeroXp(id, amount) {
  const progress = progressFor(id);
  if (progress.level >= MAX_LEVEL || amount <= 0) return [];
  progress.xp += amount;
  const gained = [];
  while (progress.level < MAX_LEVEL && progress.xp >= xpForNextLevel(progress.level)) {
    progress.xp -= xpForNextLevel(progress.level);
    progress.level++;
    gained.push(progress.level);
    if (SKILL_MILESTONE_LEVELS.includes(progress.level) && !progress.pendingMilestones.includes(progress.level)) {
      progress.pendingMilestones.push(progress.level);
    }
  }
  if (progress.level >= MAX_LEVEL) progress.xp = 0;
  if (gained.length) {
    const total = totals(id);
    baseJobs[id].hp = total.max;
    baseJobs[id].mp = total.mp;
  }
  return gained;
}

function awardPartyXp(amount, reason = "Progress", reserveRate = .65) {
  const earnedXp = Math.max(0, Math.round(amount * XP_MULTIPLIER));
  const levelUps = [];
  state.party.forEach(id => {
    const share = state.activeParty.includes(id) ? earnedXp : Math.max(1, Math.round(earnedXp * reserveRate));
    const levels = awardHeroXp(id, share);
    if (levels.length) levelUps.push(`${id} Lv ${levels.at(-1)}`);
  });
  updateSkillPointNotice();
  if (levelUps.length) showHudNotice(`LEVEL UP - ${levelUps.join(" / ")}`);
  return `${earnedXp} XP${reason ? ` (${reason})` : ""}${levelUps.length ? ` / LEVEL UP: ${levelUps.join(", ")}` : ""}`;
}

function zoneBandForMap(mapId = state.map) {
  const region = mapRegion(mapId);
  const base = zoneLevelBands[region] || [1, 4];
  if (!state.ngPlus) return base.slice();
  const order = Math.max(0, Object.keys(zoneLevelBands).indexOf(region));
  const loopBoost = Math.max(0, state.ngPlus - 1) * 4;
  return [Math.min(MAX_LEVEL, 16 + order + loopBoost), Math.min(MAX_LEVEL, 20 + order + loopBoost)];
}

function zoneLevelText(mapId = state.map) {
  const [low, high] = zoneBandForMap(mapId);
  return `${state.ngPlus ? "NG+ " : ""}Lv ${low}-${high}`;
}

function discoverMap(mapId) {
  if (state.discoveredMaps.includes(mapId)) return "";
  state.discoveredMaps.push(mapId);
  const [low] = zoneBandForMap(mapId);
  const xp = 28 + low * 6;
  const summary = awardPartyXp(xp, "new area");
  showHudNotice(`AREA DISCOVERED - ${summary}`);
  return summary;
}

function showHudNotice(message) {
  el.hint.textContent = message;
  const expected = message;
  setTimeout(() => {
    if (el.hint.textContent === expected) el.hint.textContent = "Houd WASD/pijlen ingedrukt, Z/Enter kiezen, C menu, Tab party";
  }, 3200);
}

function totals(id) {
  const h = baseJobs[id];
  const out = { ...h.stats };
  const levels = progressFor(id).level - 1;
  Object.keys(out).forEach(stat => {
    const growth = .32 + h.stats[stat] / 30;
    out[stat] += Math.floor(levels * growth);
  });
  Object.values(h.gear).forEach(name => {
    const g = gearByName(name);
    if (!g) return;
    Object.entries(g.stats).forEach(([k, v]) => out[k] = (out[k] || 0) + v);
  });
  ["str", "agi", "mag", "stam", "echo"].forEach(stat => {
    out[stat] = Math.round(out[stat] * (1 + affixValue(id, "statPct", stat)));
  });
  const constitution = typedTalentValue(id, "sacredConstitution");
  if (constitution) out.mag += Math.round(out.stam * .25);
  const max = 30 + out.stam * (1 + constitution) * (4 + typedTalentValue(id, "stamHpBonus"));
  const mp = 12 + Math.floor(out.mag / 2);
  return { ...out, max: Math.round(max * (1 + affixValue(id, "hpPct"))), mp };
}

function agilityCritBonusFromAgi(agility) {
  return Math.max(0, Math.max(0, agility) * .001);
}

function heroCritBreakdown(id) {
  const burst = typedTalentValue(id, "burstCapstone") ? .08 : 0;
  const base = Math.max(0, .05 + talentValue(id, "critChance") + effectValue(id, "critChance") + burst);
  const agilityBonus = agilityCritBonusFromAgi(totals(id).agi);
  const baseCapped = Math.min(.65, base);
  const total = Math.min(.65, base + agilityBonus);
  return {
    base: baseCapped,
    agilityBonus,
    agilityApplied: Math.max(0, total - baseCapped),
    total
  };
}

function heroCritChance(id, afflicted = false) {
  const normal = heroCritBreakdown(id).total;
  return Math.min(.65, normal + (afflicted ? typedTalentValue(id, "afflictedCrit") : 0));
}

function healingCritChance(unit) {
  if (!unit?.id) return 0;
  return Math.min(1, heroCritChance(unit.id) + statusValue(unit, "critUp") + (unit.id === "Kael" ? .1 : 0));
}

function ultimateRank(id) {
  const level = progressFor(id).level;
  return level >= 36 ? 4 : level >= 24 ? 3 : level >= 12 ? 2 : 1;
}

function echoPotencyMultiplier(id, sk = null) {
  const stats = totals(id);
  const effectiveness = id === "Sparky" && sk?.anim === "ultimate" ? 1 + typedTalentValue(id, "echoEffectiveness") : 1;
  return 1 + stats.echo * .0015 * effectiveness + statusValue(battle?.party?.find(unit => unit.id === id), "echoPower");
}

function ultimatePotencyMultiplier(id, sk) {
  if (sk?.anim !== "ultimate") return 1;
  const rankBonus = [0, 0, .16, .3, .44][ultimateRank(id)];
  const talentBonus = typedTalentValue(id, "ultimateBoost");
  const formBonus = sk.ultimateIndex === 2 && id === "Glimmer" ? typedTalentValue(id, "mechCapstone") : sk.ultimateIndex === 2 && id === "Kael" ? typedTalentValue(id, "shadowCapstone") : 0;
  const gadgetBonus = id === "Glimmer" && sk.ultimateIndex === 1 ? typedTalentValue(id, "gadgetCapstone") : 0;
  return (1 + rankBonus + talentBonus + formBonus + gadgetBonus) * echoPotencyMultiplier(id, sk);
}

function skillMpCost(id, sk, unit = null) {
  if (!sk || sk.anim === "ultimate") return sk?.cost || 0;
  let multiplier = 1;
  if (sk.element === "Earth") multiplier -= typedTalentValue(id, "earthCostReduction");
  if (sk.element === "Tech") multiplier -= typedTalentValue(id, "techCostReduction");
  if (unit?.form === "mech") multiplier += typedTalentValue(id, "mechOverload") ? .15 : 0;
  if (unit?.nextSkillDiscount) multiplier -= unit.nextSkillDiscount;
  const firstSongKey = `firstSong:${id}`;
  if (sk.element === "Sound" && battle && !battle.usedOnce[firstSongKey]) multiplier -= typedTalentValue(id, "firstSongDiscount");
  const comfortDiscount = sk.name === "Prrrp" && unit?.prrrpWindow > 0 && typedTalentValue(id, "interceptPrrrp") ? 2 : 0;
  return Math.max(sk.cost > 0 ? 1 : 0, Math.round((sk.cost || 0) * Math.max(.35, multiplier)) - comfortDiscount);
}

function scaledMpOnHitRecovery(unit, flat) {
  const rate = flat <= 2 ? .04 : flat <= 3 ? .05 : flat <= 5 ? .07 : .09;
  return Math.max(flat, Math.round(unit.maxmp * rate));
}

function legacyHallSustainValue(id, type) {
  if (state.gameMode !== "hallBattles") return 0;
  return Object.values(baseJobs[id]?.gear || {}).reduce((total, ref) => {
    return total + gearEffects(gearByName(ref)).reduce((sum, effect) => {
      const mappedType = effect.type === "mpOnHit" ? "siphoning" : ["hpOnHit", "battleRegen"].includes(effect.type) ? "leeching" : null;
      return sum + (mappedType === type ? legacyHallSustainRate(effect.type, effect.value) : 0);
    }, 0);
  }, 0);
}

function combatSustainRate(id, type) {
  return Math.min(.15, Math.max(0, effectValue(id, type) + legacyHallSustainValue(id, type)));
}

function siphoningOffensiveStat(unit, sk) {
  const stats = totals(unit.id);
  return skillScaling(sk) === "str" ? stats.str : stats.mag;
}

function resolveActionSustain(unit, sk, directDamage) {
  if (!unit?.id || !sk || directDamage <= 0) return { hp: 0, mp: 0 };
  const leeching = combatSustainRate(unit.id, "leeching");
  const eligibleDamage = Math.min(directDamage, unit.max * 2);
  const hp = leeching ? Math.min(Math.max(1, Math.round(eligibleDamage * leeching)), unit.max - unit.hp) : 0;
  if (hp > 0) {
    unit.hp += hp;
    addBattleFloater(unit, hp, { kind: "heal" });
  }
  const siphoning = sk.basicAttack ? 0 : combatSustainRate(unit.id, "siphoning");
  const mp = siphoning ? Math.min(Math.max(1, Math.round(siphoningOffensiveStat(unit, sk) * siphoning)), unit.maxmp - unit.mp) : 0;
  if (mp > 0) unit.mp += mp;
  return { hp, mp };
}

function refreshHeroVitals() {
  Object.keys(baseJobs).forEach(id => {
    const t = totals(id);
    const h = baseJobs[id];
    if (h.hp <= 1) h.hp = t.max;
    h.hp = Math.min(h.hp, t.max);
    if (h.mp <= 1) h.mp = t.mp;
    h.mp = Math.min(h.mp, t.mp);
  });
}

function currentMap() {
  return maps[state.map];
}

function currentQuest() {
  return state.quest >= 0 ? quests[state.quest] : null;
}

function visiblePoints() {
  return currentMap().points.filter(p => {
    if (p.needs && !state.flags[p.needs]) return false;
    if (p.recruit && p.event && state.flags[p.event]) return false;
    if (state.escort === p.id) return false;
    if (state.map === "ledgerHouse" && p.id === "Harl" && state.flags["quest:harlEscort"]) return false;
    return true;
  });
}

function objectiveTarget() {
  if (state.gameMode === "hallBattles") return { map: "emberHallBattles", id: "Stage", label: "Open the Trial Gate" };
  if (state.quest < 0) return { map: "lantern", id: "Marla", label: "Speak with Marla" };
  if (state.quest === 0) {
    if (!state.flags.harborWon) return { map: "ashDock", id: "Mira", label: "Meet Mira at the Ledger Docks" };
    return { map: "ledgerHouse", id: "Harl", label: "Find Harl in the Old Ledger House" };
  }
  if (state.quest === 1) {
    if (!state.flags.clergyWon) return { map: "reverieCourt", id: "Seerin", label: "Meet Seerin in the Reverie courtyard" };
    return { map: "reverieArchive", id: "Kael", label: "Find Kael in the Clergy Archive" };
  }
  if (state.quest === 2) {
    if (!state.flags.registered) return { map: "guildRegistry", id: "Kaeldrin", label: "Register at Guildspire" };
    if (!state.flags.torren) return { map: "guildCouncil", id: "Torren", label: "Find Torren in the council chamber" };
    if (!state.flags.emberWon) return { map: "emberCellar", id: "Torren", label: "Stabilize the Resonance Cellar" };
    return { map: "emberWorkshop", id: "Sparky", label: "Return to the Ember Hall workshop" };
  }
  if (!state.flags["spawn:gate-sentinel"]) return { map: "dawnGate", spawn: "gate-sentinel", label: "Break the False Dawn gate" };
  if (!state.flags.dawnWon) return { map: "alarm", id: "Glimmer", label: "Reach Glimmer in the Alarm Core" };
  return { map: "alarm", id: "Glimmer", label: "Speak with Glimmer" };
}

function objectiveExit() {
  const target = objectiveTarget();
  if (!target || target.map === state.map) return null;
  const visited = new Set([state.map]);
  const queue = [{ mapId: state.map, firstExit: null }];
  while (queue.length) {
    const current = queue.shift();
    for (const exit of maps[current.mapId].exits) {
      if (exit.needs && !state.flags[exit.needs]) continue;
      if (visited.has(exit.to)) continue;
      const firstExit = current.firstExit || exit;
      if (exit.to === target.map) return firstExit;
      visited.add(exit.to);
      queue.push({ mapId: exit.to, firstExit });
    }
  }
  return null;
}

function visibleSpawns() {
  const now = Date.now();
  return (currentMap().spawns || []).filter(spawnPoint => {
    if (state.flags[`spawn:${spawnPoint.id}`]) return false;
    if (!spawnPoint.available) {
      if (spawnPoint.boss) return false;
      const readyAt = Math.max(spawnPoint.returnAt || 0, spawnPoint.retryAt || 0);
      if (now >= readyAt) {
        if (spawnPoint.rare) {
          spawnPoint.available = Math.random() < .45;
          spawnPoint.retryAt = now + 45000 + Math.floor(Math.random() * 30000);
        } else {
          spawnPoint.available = true;
        }
        if (spawnPoint.available) {
          spawnPoint.x = spawnPoint.homeX;
          spawnPoint.y = spawnPoint.homeY;
          spawnPoint.renderX = spawnPoint.x * TILE;
          spawnPoint.renderY = spawnPoint.y * TILE;
          spawnPoint.nextMoveTick = tick + 30 + spawnPoint.phase;
        }
      }
    }
    return spawnPoint.available;
  });
}

function enemySpriteIndex(name) {
  return {
    "Slobbo": 0, "Brokk": 1, "Corrupt Clergy": 2,
    "High Administrator Thaddeus": 3, "Gorg": 4, "Cracked Pillar": 5,
    "Clock Goblin": 6, "Lord Sprocket": 7, "Red Dragon Lord": 8
  }[name] ?? 0;
}

function fieldRenderOffsetY() {
  return currentMap().panorama ? -TILE : 0;
}

function drawWorldEnemy(spawnPoint) {
  const enemyUnit = spawnPoint.enemies[0];
  const moving = Boolean(spawnPoint.fieldMoving);
  const stride = moving ? [0, -1, 0, 1][Math.floor(tick / 5) % 4] : (Math.floor((tick + spawnPoint.phase) / 28) % 4 === 1 ? -1 : 0);
  const offsetY = fieldRenderOffsetY();
  const anchorX = Math.round(spawnPoint.renderX + 8);
  const baseline = Math.round(spawnPoint.renderY + 25 + offsetY + stride);
  const key = enemyAnimationKey(enemyUnit);
  const animatedSheet = key ? enemyAnimationSheets[key] : null;
  if (animatedSheet && !animatedSheet.battleOnly) {
    const row = moving ? 1 : 0;
    const cells = animatedSheet.rows[row];
    const frame = moving ? Math.floor(tick / 6) % cells.length : Math.floor((tick + spawnPoint.phase) / 14) % cells.length;
    const cell = cells[frame];
    const targetHeight = Math.max(25, Math.round((enemyAnimationHeights[key] || 44) * .68));
    const scale = targetHeight / Math.max(1, animatedSheet.referenceHeight);
    const width = Math.max(1, Math.round(cell.w * scale));
    const height = Math.max(1, Math.round(cell.h * scale));
    drawFieldShadow(anchorX, baseline, key === "Red Dragon Lord" ? 12 : spawnPoint.boss ? 10 : 8);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (spawnPoint.facingX > 0) {
      ctx.translate(anchorX * 2, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(animatedSheet.image, cell.x, cell.y, cell.w, cell.h, Math.round(anchorX - width / 2), Math.round(baseline - height), width, height);
    ctx.restore();
  } else {
    if (!worldEnemySheet) return;
    const index = enemySpriteIndex(enemyUnit.sprite || enemyUnit.name);
    const cell = worldEnemySheet.cells[index];
    const width = cell.w;
    const height = cell.h;
    const sway = moving ? [0, 1, 0, -1][Math.floor(tick / 5) % 4] : 0;
    const x = Math.round(anchorX - width / 2 + sway);
    const y = Math.round(baseline - height);
    drawFieldShadow(anchorX, baseline, spawnPoint.boss ? 10 : 7);
    ctx.drawImage(worldEnemySheet.image, cell.x, cell.y, cell.w, cell.h, x, y, width, height);
  }
  if (spawnPoint.rare) drawSubtlePulse(spawnPoint.renderX + 8, spawnPoint.renderY + 8 + offsetY, 0, "#bca2ff", 156);
  if (spawnPoint.boss) drawText("!", spawnPoint.renderX + 8, spawnPoint.renderY - 12 + offsetY, "#ffcf73", 8, "center");
}

function updateWorldEnemyRender(spawnPoint) {
  if (!Number.isFinite(spawnPoint.renderX)) spawnPoint.renderX = spawnPoint.x * TILE;
  if (!Number.isFinite(spawnPoint.renderY)) spawnPoint.renderY = spawnPoint.y * TILE;
  const targetX = spawnPoint.x * TILE;
  const targetY = spawnPoint.y * TILE;
  const moving = spawnPoint.renderX !== targetX || spawnPoint.renderY !== targetY;
  if (moving && targetX !== spawnPoint.renderX) spawnPoint.facingX = targetX > spawnPoint.renderX ? 1 : -1;
  spawnPoint.renderX = approach(spawnPoint.renderX, targetX, 2);
  spawnPoint.renderY = approach(spawnPoint.renderY, targetY, 2);
  spawnPoint.fieldMoving = moving;
}

function exitDirection(exit) {
  if (exit.direction) return exit.direction;
  if (exit.x <= 1) return "left";
  if (exit.x >= 14) return "right";
  return exit.y >= 10 ? "down" : "up";
}

function drawExitMarkers() {
  const offsetY = fieldRenderOffsetY();
  const nextExit = objectiveExit();
  currentMap().exits.forEach((exit, index) => {
    const unlocked = !exit.needs || state.flags[exit.needs];
    const objective = exit === nextExit;
    const phase = Math.floor((tick + index * 11) / 12) % 3;
    const centerX = fieldScreenX(exit.x * TILE + 8);
    const centerY = exit.y * TILE + 8 + offsetY;
    const color = objective ? "#fff1a3" : unlocked ? "#d5aa68aa" : "#7b667088";
    const direction = exitDirection(exit);
    let symbol = "^^", x = centerX, y = centerY + phase;
    if (direction === "left") { symbol = "<<"; x = centerX + phase; y = centerY; }
    else if (direction === "right") { symbol = ">>"; x = centerX - phase; y = centerY; }
    else if (direction === "down") { symbol = "vv"; y = centerY - phase; }
    const edge = objective ? "#ffd66d" : unlocked ? "#d59b4277" : "#4f424877";
    if (direction === "left" || direction === "right") {
      drawRect(centerX - 9, centerY - 9, 18, 18, "#100d1599");
      drawRect(centerX + (direction === "left" ? 7 : -8), centerY - 10, 1, 20, edge);
      drawRect(centerX + (direction === "left" ? 5 : -6), centerY - 7, 1, 14, `${edge.slice(0, 7)}55`);
    } else {
      drawRect(centerX - 9, centerY - 8, 18, 16, "#100d1599");
      drawRect(centerX - 10, centerY + (direction === "down" ? -7 : 6), 20, 1, edge);
      drawRect(centerX - 7, centerY + (direction === "down" ? -5 : 4), 14, 1, `${edge.slice(0, 7)}55`);
    }
    drawText(symbol, x, y, color, 7, "center");
    if (objective) drawText("!", centerX, centerY - 9, "#fff1a3", 7, "center");
  });
}

function drawObjectiveMarker() {
  const target = objectiveTarget();
  if (!target || target.map !== state.map) return;
  let x = null, y = null;
  if (target.id) {
    const point = visiblePoints().find(entry => entry.id === target.id);
    if (point) { x = point.x * TILE + 8; y = point.y * TILE - 10 + fieldRenderOffsetY(); }
  }
  if (target.spawn) {
    const spawnPoint = visibleSpawns().find(entry => entry.id === target.spawn);
    if (spawnPoint) { x = spawnPoint.renderX + 8; y = spawnPoint.renderY - 11 + fieldRenderOffsetY(); }
  }
  if (x === null) return;
  x = fieldScreenX(x);
  const settle = Math.floor(tick / 18) % 3 === 1 ? -1 : 0;
  drawRect(x - 5, y - 7 + settle, 10, 8, "#2b1b12dd");
  drawText("!", x, y - 1 + settle, "#fff1a3", 7, "center");
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawFieldShadow(x, y, radius) {
  drawRect(Math.round(x - radius), Math.round(y), radius * 2, 2, "#05030a99");
  drawRect(Math.round(x - radius + 2), Math.round(y + 2), Math.max(2, radius * 2 - 4), 1, "#05030a66");
}

function drawText(text, x, y, color = "#f7e0a6", size = 8, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function box(x, y, w, h, fill = "#1d1622", stroke = "#d6aa68") {
  drawRect(x, y, w, h, "#09070a");
  drawRect(x + 2, y + 2, w - 4, h - 4, stroke);
  drawRect(x + 4, y + 4, w - 8, h - 8, fill);
}

function drawBaseSprite(px, py, body, hair, trim, dir = 0, anim = "idle", frame = tick) {
  const bob = anim === "walk" ? (frame % 24 < 12 ? 1 : -1) : 0;
  const cast = anim === "magic" || anim === "ultimate" ? Math.sin(frame / 4) * 2 : 0;
  const guard = anim === "block" ? 2 : 0;
  const melee = anim === "melee" ? Math.max(0, 6 - (frame % 12)) : 0;
  drawRect(px + 5, py + 2 + bob, 7, 5, hair);
  drawRect(px + 4, py + 6 + bob, 9, 4, "#e9b987");
  drawRect(px + 4, py + 10 + bob, 9, 10, body);
  drawRect(px + 3 - melee, py + 12 + bob, 2, 7, trim);
  drawRect(px + 12 + guard + cast, py + 12 + bob, 2, 7, trim);
  drawRect(px + 5, py + 20, 3, 5 + bob, "#19151a");
  drawRect(px + 10, py + 20, 3, 5 - bob, "#19151a");
  if (dir === 1) drawRect(px + 5, py + 7 + bob, 2, 2, "#24141a");
  else if (dir === 3) drawRect(px + 10, py + 7 + bob, 2, 2, "#24141a");
  else drawRect(px + 6, py + 7 + bob, 2, 2, "#24141a");
}

function animationColumn(id, anim, frame) {
  const columns = animationSheets[id]?.columns || 4;
  if (anim === "walk") return Math.floor(frame / 5) % columns;
  if (anim === "idle" && mode === "battle") {
    const phase = Math.floor((frame + Object.keys(spriteScale).indexOf(id) * 5) / 16) % 4;
    return [0, 0, Math.min(3, columns - 1), 0][phase];
  }
  if (["melee", "block", "magic", "ultimate"].includes(anim)) {
    const activeEffect = effect?.caster === id ? effect : null;
    const duration = Math.max(1, activeEffect?.duration || 24);
    const progress = activeEffect ? activeEffect.t / duration : (frame % 24) / 24;
    return Math.max(0, Math.min(columns - 1, Math.floor(progress * columns)));
  }
  return 0;
}

function animationFrameRect(sheet, col, row) {
  const x = Math.floor(col * sheet.image.width / sheet.columns);
  const y = Math.floor(row * sheet.image.height / sheet.rows);
  const right = Math.floor((col + 1) * sheet.image.width / sheet.columns);
  const bottom = Math.floor((row + 1) * sheet.image.height / sheet.rows);
  return { x, y, w: right - x, h: bottom - y };
}

function battleVisualId(unit) {
  return unit?.form === "mech" ? "GlimmerMech" : unit?.form === "shadowpriest" ? "KaelShadow" : unit?.id;
}

function drawBattlePartySprite(unit, anchorX, baseline, frame = tick) {
  const visualId = battleVisualId(unit);
  const sheet = battleAnimationSheets[visualId];
  if (!sheet) return false;
  let animation = unit.anim || "idle";
  if (animation === "ultimate") animation = "ultimate1";
  const row = sheet.rowMap?.[animation] ?? sheet.rowMap?.idle ?? 0;
  const activeEffect = effect?.caster === unit.id ? effect : null;
  const duration = Math.max(1, activeEffect?.duration || 24);
  const progress = activeEffect ? Math.min(1, activeEffect.t / duration) : 0;
  const idlePhase = Math.floor((frame + (unit.id?.length || 0) * 3) / BATTLE_IDLE_FRAME_TICKS) % 6;
  const usesDirectFrames = sheet.directFrames === true;
  const defaultColumn = animation === "idle"
    ? [0, 1, 2, 3, 2, 1][idlePhase]
    : animation === "death"
      ? Math.min(sheet.columns - 1, Math.floor(Math.max(0, frame - (Number.isFinite(unit.deathTick) ? unit.deathTick : frame)) / BATTLE_DEATH_FRAME_TICKS))
      : usesDirectFrames
        ? Math.min(sheet.columns - 1, Math.floor(progress * sheet.columns))
        : Math.min(sheet.columns - 1, 1 + Math.floor(progress * (sheet.columns - 1)));
  const sequence = usesDirectFrames ? null : battleFrameSequences[visualId]?.[animation];
  const col = sequence ? sequence[Math.min(sequence.length - 1, defaultColumn)] : defaultColumn;
  const targetHeight = (battleSpriteHeights[visualId] || 54) * BATTLE_COMPOSITION_SCALE;
  const scale = targetHeight / Math.max(1, sheet.referenceHeight || sheet.cellHeight);
  const idleCrop = animation === "idle" && !usesDirectFrames ? battleIdleSourceCrops[visualId] : null;
  const sourceOffsetX = idleCrop?.x || 0;
  const sourceOffsetY = idleCrop?.y || 0;
  const sourceWidth = idleCrop?.width || sheet.cellWidth;
  const sourceHeight = idleCrop?.height || sheet.cellHeight;
  const sourceX = col * sheet.cellWidth + sourceOffsetX;
  const sourceY = row * sheet.cellHeight + sourceOffsetY;
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const idleAnchorOffset = animation === "idle" ? Number(sheet.idleAnchorOffsets?.[col] || 0) : 0;
  const idleBreathOffset = animation === "idle" && calmBattleIdleHeroes.has(visualId) ? [0, 0, -1, -1, 0, 0][idlePhase] : 0;
  const destX = idleCrop ? Math.round(anchorX - width / 2) : Math.round(anchorX - width / 2 - idleAnchorOffset * scale);
  const destY = Math.round(baseline - (sheet.baseline - sourceOffsetY) * scale + idleBreathOffset);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, width, height);
  ctx.restore();
  return true;
}

function drawAnimationSprite(id, px, py, dir, anim, frame) {
  const sheet = animationSheets[id];
  if (!sheet) return false;
  const playable = Boolean(spriteScale[id]);
  const actionPose = ["melee", "block", "magic", "ultimate"].includes(anim);
  const battlePose = playable && (mode === "battle" || actionPose);
  const directionRows = { 0: 0, 1: 1, 3: 2, 2: 3 };
  const actionRows = { melee: 4, block: 5, magic: 6, ultimate: 6 };
  const row = battlePose ? (actionRows[anim] ?? 4) : (directionRows[dir] ?? 0);
  const col = animationColumn(id, battlePose ? anim : (anim === "walk" ? "walk" : "idle"), frame);
  const targetHeight = playable
    ? (battlePose ? spriteScale[id].battle[1] : spriteScale[id].field[1])
    : (animatedNpcHeights[id] || 26);
  const scale = targetHeight / Math.max(1, sheet.referenceHeight);
  const actionDuration = effect?.caster === id ? (effect.impactTicks || 24) : 24;
  const actionT = effect?.caster === id ? Math.min(actionDuration, effect.t) : 0;
  let motionX = 0;
  let motionY = 0;
  if (battlePose && anim === "idle") {
    const idle = battleIdleMotion(id, frame);
    motionX = idle[0];
    motionY = idle[1];
  }
  if (battlePose && anim === "melee") motionX = Math.round(Math.sin((actionT / actionDuration) * Math.PI) * 7);
  if (battlePose && (anim === "magic" || anim === "ultimate")) motionY = -Math.round(Math.sin((actionT / 24) * Math.PI) * 3);
  const anchorX = px + (battlePose ? 24 : 8) + motionX;
  const baseline = py + (battlePose ? 52 : 32) + motionY;
  const source = animationFrameRect(sheet, col, row);
  const sourceWidth = source.w;
  const sourceHeight = source.h;
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const destX = Math.round(anchorX - width / 2);
  const destY = Math.round(baseline - (sourceHeight - 2) * scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.image, source.x, source.y, sourceWidth, sourceHeight, destX, destY, width, height);
  ctx.restore();
  return true;
}

function drawSprite(id, px, py, dir = 0, anim = "idle", frame = tick) {
  const h = baseJobs[id];
  if (drawAnimationSprite(id, px, py, dir, anim, frame)) return;
  if (!h) return drawNpc(id, px, py, dir, anim, frame);
  const sheet = spriteSheets[id];
  if (!sheet) {
    if (id === "Sparky") return drawDragon(px, py, anim, frame);
    return drawBaseSprite(px, py, h.color, h.hair, h.trim, dir, anim, frame);
  }

  const actionPose = anim === "melee" || anim === "block" || anim === "magic" || anim === "ultimate";
  const battlePose = mode === "battle" || actionPose;
  const walkSheet = walkSpriteSheets[id];
  if (!battlePose && anim === "walk" && dir !== 2 && walkSheet) {
    const row = dir === 0 ? 0 : 1;
    const frameTicks = id === "Verseborn" ? WALK_FRAME_TICKS : WALK_FRAME_TICKS + 2;
    const col = Math.floor(frame / frameTicks) % 6;
    const cell = walkSheet.cells[row * 6 + col];
    const cellLeft = Math.floor(col * walkSheet.image.width / 6);
    const cellTop = Math.floor(row * walkSheet.image.height / 2);
    const cellRight = Math.floor((col + 1) * walkSheet.image.width / 6);
    const sourceCenterX = cellLeft + (cellRight - cellLeft) / 2;
    const sourceBaseline = cellTop + walkSheet.metrics[row].baseline;
    const anchorX = px + 8;
    const baseline = py + 32;
    const target = spriteScale[id].field;
    const scale = target[1] / cell.h;
    const width = Math.max(1, Math.round(cell.w * scale));
    const height = Math.max(1, Math.round(cell.h * scale));
    const destX = Math.round(anchorX + (cell.x - sourceCenterX) * scale);
    const destY = Math.round(baseline + (cell.y - sourceBaseline) * scale);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const sourceFacesLeft = id === "Verseborn";
    const shouldMirror = sourceFacesLeft ? dir === 3 : dir === 1;
    if (shouldMirror) {
      ctx.translate(anchorX * 2, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(walkSheet.image, cell.x, cell.y, cell.w, cell.h, destX, destY, width, height);
    ctx.restore();
    return;
  }
  const row = battlePose ? 1 : 0;
  const fieldColumns = { 0: 0, 1: 1, 2: 3, 3: 2 };
  const battleColumns = { idle: 0, walk: 0, melee: 1, block: 0, magic: 2, ultimate: 3 };
  const col = battlePose ? (battleColumns[anim] ?? 0) : (fieldColumns[dir] ?? 0);
  const cell = sheet.cells[row * 4 + col];
  const target = battlePose ? spriteScale[id].battle : spriteScale[id].field;
  // Pose effects may be wider than the body; height keeps the hero scale stable
  // when turning or switching between idle, melee, block, magic and ultimate art.
  const scale = target[1] / cell.h;
  const width = Math.max(1, Math.round(cell.w * scale));
  const height = Math.max(1, Math.round(cell.h * scale));
  const actionDuration = effect?.impactTicks || 24;
  const actionT = effect ? Math.min(actionDuration, effect.t) : 0;
  let motionX = 0;
  let motionY = 0;
  if (battlePose && anim === "idle") {
    const idle = battleIdleMotion(id, frame);
    motionX = idle[0];
    motionY = idle[1];
  }
  if (battlePose && anim === "melee") motionX = Math.round(Math.sin((actionT / actionDuration) * Math.PI) * 8);
  if (battlePose && (anim === "magic" || anim === "ultimate")) motionY = -Math.round(Math.sin((actionT / 24) * Math.PI) * 3);
  const anchorX = px + (battlePose ? 24 : 8) + motionX;
  const baseline = py + (battlePose ? 52 : 32) + motionY;
  const cellLeft = Math.floor(col * sheet.image.width / 4);
  const cellTop = Math.floor(row * sheet.image.height / 2);
  const sourceCenterX = cellLeft + (Math.floor((col + 1) * sheet.image.width / 4) - cellLeft) / 2;
  const sourceBaseline = cellTop + sheet.metrics[row].baseline;
  const destX = Math.round(anchorX + (cell.x - sourceCenterX) * scale);
  const destY = Math.round(baseline + (cell.y - sourceBaseline) * scale);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.image, cell.x, cell.y, cell.w, cell.h, destX, destY, width, height);
  ctx.restore();
}

function battleIdleMotion(id, frame) {
  const patterns = {
    Verseborn: [[0, 0], [0, -1], [1, -1], [0, 0]],
    Mira: [[0, 0], [-1, 0], [-1, -1], [0, 0]],
    Seerin: [[0, 0], [1, 0], [1, -1], [0, 0]],
    Kael: [[0, 0], [0, 0], [0, -1], [0, 0]],
    Torren: [[0, 0], [0, -1], [0, -1], [0, 0]],
    Glimmer: [[0, 0], [1, -1], [0, -2], [-1, -1]],
    Sparky: [[0, 0], [1, -1], [0, -2], [-1, -1]]
  };
  const pattern = patterns[id] || patterns.Verseborn;
  const phase = Math.floor((frame + Object.keys(patterns).indexOf(id) * 3) / 11) % pattern.length;
  return pattern[phase];
}

function drawNpc(id, px, py, dir, anim, frame) {
  if (id === "Stage") {
    const baseline = py + 32;
    if (stageSelectorImage) {
      const sourceWidth = stageSelectorImage.width / STAGE_SELECTOR_FRAMES;
      const sourceFrame = Math.floor(frame / 10) % STAGE_SELECTOR_FRAMES;
      const width = 43;
      const height = 43;
      drawFieldShadow(px + 8, baseline + 1, 11);
      ctx.drawImage(
        stageSelectorImage,
        sourceFrame * sourceWidth, 0, sourceWidth, stageSelectorImage.height,
        Math.round(px + 8 - width / 2), baseline - height, width, height
      );
      return;
    }
    drawRect(px - 2, baseline - 5, 20, 5, "#4b2f26");
    drawRect(px, baseline - 7, 16, 3, "#835739");
    drawRect(px + 2, baseline - 8, 12, 1, "#c28a50");
    drawText("T", px + 8, baseline - 12, "#ffd27d", 9, "center");
    return;
  }
  if (id === "Workshop Bench") {
    const baseline = py + 32;
    drawRect(px - 7, baseline - 16, 30, 4, "#21191a");
    drawRect(px - 6, baseline - 15, 28, 3, "#a36b35");
    drawRect(px - 4, baseline - 12, 24, 12, "#3a2922");
    drawRect(px - 3, baseline - 11, 22, 9, "#694226");
    drawRect(px - 1, baseline - 9, 8, 5, "#2a2222");
    drawRect(px + 10, baseline - 9, 7, 5, "#2a2222");
    drawRect(px + 2, baseline - 7, 2, 1, "#c5984e");
    drawRect(px + 12, baseline - 7, 2, 1, "#c5984e");
    drawRect(px - 5, baseline - 2, 4, 3, "#241a1a");
    drawRect(px + 17, baseline - 2, 4, 3, "#241a1a");
    drawRect(px - 2, baseline - 19, 8, 3, "#3b4448");
    drawRect(px, baseline - 21, 4, 3, "#98a7a4");
    drawRect(px + 8, baseline - 18, 7, 2, "#d0a655");
    drawRect(px + 12, baseline - 23, 4, 7, "#33434b");
    drawRect(px + 13, baseline - 25, 2, 5, "#73d8cf");
    drawRect(px + 14, baseline - 24, 1, 2, "#d9fff7");
    drawRect(px + 18, baseline - 20, 2, 4, "#7762a9");
    if (Math.floor(frame / 38) % 5 === 1) {
      drawRect(px + 16, baseline - 27, 1, 1, "#d9fff7");
      drawRect(px + 19, baseline - 24, 1, 1, "#d8bdff");
    }
    return;
  }
  const rows = { Marla: 0, Harl: 1, Nyx: 2, Rava: 3, Kaeldrin: 4, Lyrsa: 5 };
  const row = rows[id];
  if (!npcSheet || row === undefined) {
    const p = npc[id] || npc.Stage;
    drawBaseSprite(px, py, p[0], p[1], p[2], dir, anim, frame);
    return;
  }
  const columns = { 0: 0, 1: 1, 2: 3, 3: 2 };
  const col = columns[dir] ?? 0;
  const cell = npcSheet.cells[row * 4 + col];
  const scale = 1;
  const cellLeft = Math.floor(col * npcSheet.image.width / 4);
  const cellTop = Math.floor(row * npcSheet.image.height / 6);
  const cellRight = Math.floor((col + 1) * npcSheet.image.width / 4);
  const sourceCenterX = cellLeft + (cellRight - cellLeft) / 2;
  const sourceBaseline = cellTop + npcSheet.metrics[row].baseline;
  const step = anim === "walk" ? [0, -1, 0, 1][Math.floor(frame / 8) % 4] : 0;
  const anchorX = px + 8;
  const baseline = py + 32 + step;
  ctx.drawImage(
    npcSheet.image,
    cell.x, cell.y, cell.w, cell.h,
    Math.round(anchorX + (cell.x - sourceCenterX) * scale),
    Math.round(baseline + (cell.y - sourceBaseline) * scale),
    cell.w,
    cell.h
  );
}

function drawVendorGrounding(pointData, anchorX, baseline) {
  if (!pointData.vendor) return;
  const workshop = pointData.vendor === "workshop";
  const outer = workshop ? "#55cfc399" : "#d7a84b88";
  const inner = workshop ? "#9af7e9aa" : "#ffe29a99";
  ctx.save();
  ctx.globalAlpha = .8;
  drawRect(anchorX - 10, baseline - 2, 20, 3, "#120f13aa");
  drawRect(anchorX - 9, baseline - 3, 3, 1, outer);
  drawRect(anchorX + 6, baseline - 3, 3, 1, outer);
  drawRect(anchorX - 6, baseline, 12, 1, outer);
  drawRect(anchorX - 1, baseline - 4, 3, 1, inner);
  if ((tick + pointData.x * 13) % 126 < 18) {
    drawRect(anchorX, baseline - 6, 1, 1, inner);
    drawRect(anchorX - 2, baseline - 4, 1, 1, outer);
    drawRect(anchorX + 2, baseline - 4, 1, 1, outer);
  }
  ctx.restore();
}

function drawDragon(px, py, anim, frame) {
  const bob = Math.sin(frame / 8) * 2;
  drawRect(px + 3, py + 9 + bob, 11, 8, "#2b2540");
  drawRect(px + 5, py + 3 + bob, 8, 7, "#2b2540");
  drawRect(px + 7, py + 5 + bob, 2, 2, "#d6b3ff");
  drawRect(px + 1, py + 9 + bob, 4, 6, "#6b3bb8");
  drawRect(px + 13, py + 9 + bob, 4, 6, "#6b3bb8");
  drawRect(px + 12, py + 16 + bob, 5, 3, "#6b3bb8");
  drawRect(px + 8, py + bob, 2, 3, "#6b3bb8");
  if (anim === "magic" || anim === "ultimate") drawSpark(px + 15, py + 5, "#b66cff", frame);
}

function drawSpark(x, y, color, frame) {
  const r = 3 + (frame % 12);
  ctx.strokeStyle = color;
  ctx.strokeRect(x - r / 2, y - r / 2, r, r);
}

function drawTitle(now = performance.now()) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = "#050413";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!titleImage) {
    ctx.fillStyle = "#fff1c6";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LOADING ART", canvas.width / 2, canvas.height / 2);
    ctx.restore();
    return;
  }

  const layout = titleImageLayout();
  const fixedBackground = titleIdleFrames[0] || titleImage;
  ctx.drawImage(fixedBackground, layout.x, layout.y, layout.width, layout.height);
  drawTitleMenu(layout);
  ctx.restore();
}

function titleImageLayout() {
  const width = titleImage?.naturalWidth || 1448;
  const height = titleImage?.naturalHeight || 1086;
  const scale = Math.min(canvas.width / width, canvas.height / height);
  const drawWidth = Math.round(width * scale);
  const drawHeight = Math.round(height * scale);
  return {
    x: Math.round((canvas.width - drawWidth) / 2),
    y: Math.round((canvas.height - drawHeight) / 2),
    width: drawWidth,
    height: drawHeight,
    scale
  };
}

function drawTitleTwinkles(layout) {
  titleTwinkles.forEach(star => {
    const phase = ((tick + star.phase) % 360) / 360;
    const glow = Math.max(0, Math.sin(phase * Math.PI * 2));
    if (glow < 0.62) return;
    const alpha = Math.pow((glow - 0.62) / 0.38, 2) * 0.68;
    const x = Math.round(layout.x + star.x * layout.scale);
    const y = Math.round(layout.y + star.y * layout.scale);
    const arm = Math.max(2, Math.round(7 * layout.scale));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color;
    ctx.fillRect(x - arm, y, arm * 2 + 1, 1);
    ctx.fillRect(x, y - arm, 1, arm * 2 + 1);
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.globalAlpha = 1;
  });
}

function drawTitleMenu(layout) {
  const portraitTouchMain = titleMenuState === "main"
    && document.documentElement?.classList.contains("touch-phone")
    && document.documentElement?.classList.contains("touch-portrait");
  if (portraitTouchMain) return;
  const sx = value => Math.round(layout.x + value * layout.scale);
  const sy = value => Math.round(layout.y + value * layout.scale);
  const panelX = sx(570);
  const panelY = sy(438);
  const panelWidth = Math.round(310 * layout.scale);
  const panelHeight = Math.round(151 * layout.scale);
  ctx.fillStyle = "#050b27";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "#9c6fd2";
  ctx.lineWidth = Math.max(1, Math.round(2 * layout.scale));
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  const entries = titleMenuEntriesForState();
  const selectedIndex = titleMenuState === "main" ? titleMenuIndex : titleSubmenuIndex;
  const startY = entries.length === 2 ? 468 : 449;
  const fontSize = Math.max(14, Math.round(30 * layout.scale));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  entries.forEach((entry, index) => {
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    const maxLabelWidth = Math.round(246 * layout.scale);
    const measuredWidth = ctx.measureText(entry).width;
    if (measuredWidth > maxLabelWidth) {
      const fittedSize = Math.max(12, Math.floor(fontSize * maxLabelWidth / measuredWidth));
      ctx.font = `bold ${fittedSize}px "Courier New", monospace`;
    }
    const top = sy(startY + index * 49);
    const height = Math.round(43 * layout.scale);
    if (index === selectedIndex) {
      ctx.fillStyle = "rgba(77, 35, 126, 0.78)";
      ctx.fillRect(sx(576), top, Math.round(296 * layout.scale), height);
    }
    const unavailableContinue = titleActionMenuOpen() && index === 1
      && !savedGameExists(titleSaveKey());
    ctx.fillStyle = unavailableContinue ? "#746d77" : index === selectedIndex ? "#fff0bd" : "#f0e4c6";
    if (titleSlotMenuOpen() && index < 2) {
      const summary = saveSlotSummary(titleMenuIndex, index + 1);
      ctx.font = `bold ${Math.max(12, Math.round(21 * layout.scale))}px "Courier New", monospace`;
      ctx.fillText(`${entry.toUpperCase()} / ${summary.exists ? "EXISTING" : "EMPTY"}`, sx(732), sy(startY + (summary.exists ? 15 : 22) + index * 49));
      if (summary.detail) {
        ctx.font = `bold ${Math.max(9, Math.round(13 * layout.scale))}px "Courier New", monospace`;
        ctx.fillStyle = "#d8c2f2";
        ctx.fillText(summary.detail, sx(732), sy(startY + 34 + index * 49));
      }
    } else {
      ctx.fillText(entry.toUpperCase(), sx(732), sy(startY + 22 + index * 49));
    }
  });

  const arrowBob = Math.round(Math.sin(tick / 18) * 2);
  ctx.font = `bold ${fontSize}px "Courier New", monospace`;
  ctx.fillStyle = "#ffd46f";
  ctx.textAlign = "center";
  ctx.fillText(">", sx(612) + arrowBob, sy(startY + 22 + selectedIndex * 49));
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function titleSlotMenuOpen() {
  return titleMenuState === "story" || titleMenuState === "hall";
}

function titleActionMenuOpen() {
  return titleMenuState === "storyActions" || titleMenuState === "hallActions";
}

function titleMenuEntriesForState() {
  if (titleMenuState === "main") return titleMenuEntries;
  if (titleSlotMenuOpen()) return saveSlotEntries;
  return titleSubmenuEntries[titleMenuIndex];
}

function moveTitleSelection(direction) {
  if (!runtimeAssetsReady) return;
  if (titleMenuState === "main") {
    titleMenuIndex = (titleMenuIndex + direction + titleMenuEntries.length) % titleMenuEntries.length;
  } else {
    const submenu = titleMenuEntriesForState();
    titleSubmenuIndex = (titleSubmenuIndex + direction + submenu.length) % submenu.length;
  }
  playSfx("menu");
}

function openTitleSubmenu() {
  titleMenuState = titleMenuIndex === 0 ? "story" : "hall";
  titleSubmenuIndex = 0;
  playSfx("menu");
}

function closeTitleSubmenu() {
  if (titleActionMenuOpen()) {
    titleMenuState = titleMenuIndex === 0 ? "story" : "hall";
    titleSubmenuIndex = activeSaveSlot - 1;
    playSfx("menu");
    return;
  }
  titleMenuState = "main";
  titleSubmenuIndex = 0;
  playSfx("menu");
}

function startTitleGame(continueGame = false) {
  if (!runtimeAssetsReady) return;
  const loaded = continueGame && loadGame(storySaveKey());
  if (!continueGame) {
    try { localStorage.removeItem(storySaveKey()); } catch {}
  }
  state.gameMode = "story";
  mode = "walk";
  updateMusic();
  updatePanels();
  updateSkillPointNotice();
  if (loaded) showHudNotice("CONTINUE - saved journey restored");
  else showTalk([["Narrator", "Issue 1: The Man With the Enormous Voice"], ["Verseborn", "A warm room, a quiet stage, and Marla looking like she has work for me."]]);
}

function resetHallBattleRun() {
  clearTimeout(saveTimer);
  try {
    localStorage.removeItem(hallSaveKey());
    localStorage.removeItem(hallSceneHistoryKey());
  } catch {}
  gearInstances = {};
  Object.entries(baseJobs).forEach(([id, hero]) => {
    hero.gear = { ...STARTING_HERO_GEAR[id] };
    hero.hp = 1;
    hero.mp = 1;
  });
  Object.assign(state, {
    gameMode: "hallBattles",
    knownWeaknesses: {},
    favoriteGear: {},
    map: "emberHallBattles",
    x: 8,
    y: 9,
    renderX: 8 * TILE,
    renderY: 9 * TILE,
    facing: 2,
    quest: -1,
    resonance: 15,
    walkUntil: 0,
    party: ["Verseborn"],
    activeParty: ["Verseborn"],
    gold: 180,
    inventory: { "Marla's Soup": 4, "Clockwork Tonic": 2, "Ash Ward": 1, "Old Registry Key": 1 },
    inventorySlots: 30,
    bagUpgrades: 0,
    stash: {},
    ownedGear: [...new Set(Object.values(STARTING_HERO_GEAR.Verseborn))],
    gearCopies: Object.values(STARTING_HERO_GEAR.Verseborn).reduce((copies, name) => {
      copies[name] = (copies[name] || 0) + 1;
      return copies;
    }, {}),
    gearAffixes: {},
    gearRarities: {},
    gearInstances,
    nextGearInstance: 1,
    endgameRank: 0,
    echoForgeRank: 0,
    ngPlus: 0,
    heroProgress: Object.fromEntries(Object.keys(baseJobs).map(id => [id, { level: 1, xp: 0, talents: [], pendingMilestones: [] }])),
    discoveredMaps: ["emberHallBattles"],
    escort: null,
    fieldWard: false,
    flags: { hallBaseStatsV1: true },
    hallBattles: { unlockedStage: 1, clearedStages: [], recruitStages: [], pendingRecruit: 0, startingCompanions: [], startingWelcomeComplete: false, shopStage: 0, shopOffers: {}, purchasedShopStages: [] }
  });
}

function startHallBattles(continueGame = false) {
  if (!runtimeAssetsReady) return;
  const loaded = continueGame && loadGame(hallSaveKey());
  if (!loaded) resetHallBattleRun();
  state.gameMode = "hallBattles";
  state.map = "emberHallBattles";
  state.x = Number.isFinite(state.x) ? state.x : 8;
  state.y = Number.isFinite(state.y) ? state.y : 9;
  state.renderX = state.x * TILE;
  state.renderY = state.y * TILE;
  mode = "walk";
  refreshHeroVitals();
  updateMusic();
  updatePanels();
  updateSkillPointNotice();
  if (!loaded) saveGame(hallSaveKey());
  const progress = hallBattleProgress();
  const needsStartingParty = !progress.startingWelcomeComplete && progress.startingCompanions.length !== 2;
  const needsStartingWelcome = !progress.startingWelcomeComplete && progress.startingCompanions.length === 2;
  showHudNotice(loaded ? "EMBER HALL BATTLE - record restored" : "EMBER HALL BATTLE - choose your starting Flameguard");
  if (needsStartingParty) openHallStartingPartySelection();
  else if (needsStartingWelcome) playHallStartingWelcomeSequence(progress.startingCompanions);
}

function activateTitleSelection() {
  if (!runtimeAssetsReady) return;
  if (titleMenuState === "main") return openTitleSubmenu();
  if (titleSubmenuIndex === 2) return closeTitleSubmenu();
  if (titleSlotMenuOpen()) {
    activeSaveSlot = titleSubmenuIndex + 1;
    titleMenuState = titleMenuIndex === 0 ? "storyActions" : "hallActions";
    titleSubmenuIndex = savedGameExists(titleSaveKey()) ? 1 : 0;
    playSfx("menu");
    return;
  }
  const saveKey = titleSaveKey();
  if (titleSubmenuIndex === 1 && !savedGameExists(saveKey)) {
    playSfx("menu");
    return;
  }
  if (titleMenuIndex === 1 && titleSubmenuIndex === 0) {
    if (savedGameExists(hallSaveKey()) && !window.confirm(`Start a new Ember Hall run in Save Slot ${activeSaveSlot}? This slot's Hall progress and Scene Memories will be erased.`)) return;
    playSfx("menu");
    return startHallBattles(false);
  }
  if (titleMenuIndex === 1) return startHallBattles(true);
  startTitleGame(titleSubmenuIndex === 1);
}

function titleMenuPointerTarget(event) {
  if (!titleImage) return null;
  const rect = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * canvas.width / rect.width;
  const canvasY = (event.clientY - rect.top) * canvas.height / rect.height;
  const layout = titleImageLayout();
  const sourceX = (canvasX - layout.x) / layout.scale;
  const sourceY = (canvasY - layout.y) / layout.scale;
  if (sourceX >= 570 && sourceX <= 880) {
    const entries = titleMenuEntriesForState();
    const startY = entries.length === 2 ? 468 : 449;
    for (let index = 0; index < entries.length; index++) {
      if (sourceY >= startY + index * 49 && sourceY <= startY + index * 49 + 43) {
        return { kind: titleMenuState === "main" ? "mode" : "action", index };
      }
    }
  }
  if (sourceX >= 600 && sourceX <= 864 && sourceY >= 650 && sourceY <= 690) return { kind: "confirm" };
  return null;
}

function drawRecruitScene() {
  const scene = activeRecruitScene;
  const image = scene.room === "trial-room" ? mapImages["ember-hall-battle"] : recruitSceneImages[scene.room];
  if (image) {
    const targetRatio = LOGICAL_WIDTH / LOGICAL_HEIGHT;
    const sourceWidth = Math.min(image.naturalWidth || image.width, (image.naturalHeight || image.height) * targetRatio);
    const sourceHeight = sourceWidth / targetRatio;
    const sourceX = ((image.naturalWidth || image.width) - sourceWidth) / 2;
    const sourceY = ((image.naturalHeight || image.height) - sourceHeight) / 2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  } else {
    drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, "#171018");
  }
  const shade = ctx.createLinearGradient(0, 112, 0, LOGICAL_HEIGHT);
  shade.addColorStop(0, "#09070a00");
  shade.addColorStop(1, "#09070a66");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 112, LOGICAL_WIDTH, LOGICAL_HEIGHT - 112);
  scene.actors.forEach((actor, index) => {
    const isActing = actor.actionUntil > tick;
    const progress = isActing ? Math.min(1, Math.max(0, (tick - actor.actionStarted) / Math.max(1, actor.actionUntil - actor.actionStarted))) : 0;
    const pose = recruitScenePoseAt(actor, progress, isActing);
    const idleBob = pose.anim === "idle" && Math.floor((tick + index * 7) / 22) % 2 ? -1 : 0;
    const drawX = fieldScreenX(actor.x) + pose.x;
    const drawY = actor.baseline + pose.y;
    drawFieldShadow(drawX, actor.baseline + 1, actor.id === "Sparky" ? 6 : 8);
    drawSprite(actor.id, drawX - 8, drawY - 32 + idleBob, pose.facing, pose.anim, tick);
    drawRecruitSceneEffect(actor, drawX, drawY, progress, isActing);
    if (actor.emote && actor.actionUntil > tick) {
      drawText(actor.emote, fieldScreenX(actor.x), actor.baseline - 40, "#fff0a8", 10, "center");
    }
  });
  const roomName = RECRUIT_SCENE_ROOM_NAMES[scene.room] || "Ember Hall";
  drawText(roomName, 9, 13, "#0b090d", 8);
  drawText(roomName, 8, 12, "#ffe0a1", 8);
}

function recruitScenePoseAt(actor, progress, isActing = true) {
  if (!isActing) return { x: 0, y: 0, anim: "idle", facing: actor.facing };
  const p = Math.min(1, Math.max(0, progress));
  const facingDirection = actor.facing === 1 ? -1 : actor.facing === 3 ? 1 : 0;
  const smooth = value => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
  };
  let x = 0;
  let y = 0;
  let anim = actor.anim || "idle";
  switch (actor.motion) {
    case "entrance":
    case "welcome-step": {
      const arrival = smooth(p / .55);
      x = -(actor.actionDx || 0) * (1 - arrival);
      anim = p < .55 ? "walk" : actor.motion === "welcome-step" && p < .72 ? "melee" : "idle";
      break;
    }
    case "dagger-flip":
      x = facingDirection * (p < .22 ? smooth(p / .22) * 3 : 3 * (1 - smooth((p - .22) / .68)));
      y = p > .18 && p < .62 ? -Math.sin((p - .18) / .44 * Math.PI) * 4 : 0;
      anim = p > .16 && p < .6 ? "melee" : "idle";
      break;
    case "practice-strike": {
      const strike = p < .28 ? smooth(p / .28) : p < .62 ? 1 : 1 - smooth((p - .62) / .38);
      x = facingDirection * strike * 7;
      anim = p < .18 ? "walk" : p < .62 ? "melee" : p < .86 ? "walk" : "block";
      break;
    }
    case "spar-dodge": {
      const dodge = p < .26 ? smooth(p / .26) : p < .58 ? 1 : 1 - smooth((p - .58) / .42);
      x = -facingDirection * dodge * 5;
      y = p > .35 && p < .68 ? -Math.sin((p - .35) / .33 * Math.PI) * 3 : 0;
      anim = p < .34 ? "walk" : p < .68 ? "melee" : "idle";
      break;
    }
    case "flourish":
      x = facingDirection * Math.sin(p * Math.PI) * 2;
      anim = p > .2 && p < .68 ? actor.anim || "magic" : "idle";
      break;
    case "stir":
      x = Math.round(Math.sin(p * Math.PI * 6) * 2);
      anim = p < .78 && Math.floor(p * 12) % 2 ? "melee" : "idle";
      break;
    case "small-step":
      x = facingDirection * Math.sin(p * Math.PI) * 3;
      anim = p < .32 ? "walk" : p < .68 ? actor.anim || "block" : "idle";
      break;
    case "hop-to-pot": {
      const arrival = smooth(p / .72);
      x = -(actor.actionDx || 0) * (1 - arrival);
      y = p < .72 ? -Math.sin(p / .72 * Math.PI) * 8 : -1;
      anim = p < .72 ? "walk" : "idle";
      break;
    }
    case "fly-oval":
      x = 8 * (1 - Math.cos(p * Math.PI * 2));
      y = -8 - Math.sin(p * Math.PI * 2) * 7 + Math.sin(p * Math.PI * 8);
      anim = "walk";
      break;
    case "approach-lean": {
      const arrival = smooth(p / .5);
      x = -(actor.actionDx || 0) * (1 - arrival);
      y = p > .48 ? 2 : 0;
      anim = p < .5 ? "walk" : "idle";
      break;
    }
    case "reach": {
      const arrival = smooth(p / .45);
      x = -(actor.actionDx || 0) * (1 - arrival);
      anim = p < .45 ? "walk" : p < .72 ? "melee" : "idle";
      break;
    }
    case "shelf-place": {
      const step = p < .25 ? smooth(p / .25) : p < .48 ? 1 : p < .66 ? 1 - smooth((p - .48) / .18) : 0;
      x = facingDirection * step * 5;
      anim = p < .25 ? "walk" : p < .5 ? "melee" : "idle";
      break;
    }
    case "shelf-straighten": {
      const step = p < .48 ? 0 : p < .66 ? smooth((p - .48) / .18) : p < .82 ? 1 : 1 - smooth((p - .82) / .18);
      x = facingDirection * step * 4;
      anim = p < .48 ? "idle" : p < .66 ? "walk" : p < .86 ? "melee" : "idle";
      break;
    }
    case "tool-tap":
      x = p < .68 ? Math.round(Math.sin(p * Math.PI * 8)) : 0;
      anim = p < .68 && Math.floor(p * 10) % 2 ? "melee" : "idle";
      break;
    case "tinker-recoil":
      if (p < .64) {
        x = Math.round(Math.sin(p * Math.PI * 10));
        anim = Math.floor(p * 12) % 2 ? "melee" : "idle";
      } else if (p < .82) {
        x = -facingDirection * Math.sin((p - .64) / .18 * Math.PI) * 5;
        y = -Math.sin((p - .64) / .18 * Math.PI) * 3;
        anim = "walk";
      } else {
        anim = "idle";
      }
      break;
    case "recoil":
      x = -facingDirection * Math.sin(p * Math.PI) * 6;
      y = -Math.sin(p * Math.PI) * 3;
      anim = p < .72 ? "walk" : "idle";
      break;
  }
  return { x, y, anim, facing: actor.facing };
}

function drawRecruitSceneEffect(actor, x, baseline, progress, isActing) {
  if (!isActing || !actor.effect) return;
  const direction = actor.facing === 1 ? -1 : 1;
  const effectX = x + direction * 11;
  if ((actor.effect === "spark" && progress > .46 && progress < .68) || (actor.effect === "spark-smoke" && progress > .48 && progress < .63)) {
    drawSpark(effectX, baseline - 22, "#ffe079", Math.floor(progress * 100));
  }
  if (actor.effect === "steam" && progress > .28 && progress < .9) {
    const rise = Math.floor((progress - .28) * 14);
    drawRect(effectX - 2, baseline - 14 - rise, 3, 3, "#ddd4cc");
    drawRect(effectX + 2, baseline - 10 - rise, 2, 2, "#9f9794");
  }
  if (actor.effect === "spark-smoke" && progress >= .6 && progress < .9) {
    const puff = Math.floor((progress - .6) * 18);
    drawRect(effectX - 4, baseline - 23 - puff, 5, 4, "#756f75");
    drawRect(effectX + 1, baseline - 20 - puff, 4, 4, "#aaa0a2");
    drawRect(effectX - 1, baseline - 27 - puff, 3, 3, "#d7c8bb");
  }
}

function fieldScreenX(worldX) {
  return worldX * LOGICAL_WIDTH / FIELD_WORLD_WIDTH;
}

function drawTileMap() {
  if (new URLSearchParams(location.search).has("qa")) {
    canvas.dataset.qaMap = state.map;
    canvas.dataset.qaPosition = `${state.x},${state.y}`;
    canvas.dataset.qaDestination = fieldDestination ? `${fieldDestination.x},${fieldDestination.y}` : "";
    canvas.dataset.qaMode = mode;
  }
  if (screenSlide) {
    drawScreenSlide();
    return;
  }
  if (activeRecruitScene) {
    drawRecruitScene();
    return;
  }
  const map = currentMap();
  const p = palettes[map.set];
  const offsetY = fieldRenderOffsetY();
  const background = mapImages[map.background || map.set];
  if (background) drawMapBackground(map, background);
  else drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, p[2]);
  ctx.save();
  ctx.scale(LOGICAL_WIDTH / FIELD_WORLD_WIDTH, 1);
  drawAmbient(map.set, map.panorama);
  ctx.restore();
  drawQaNavigationOverlay();
  drawExitMarkers();
  updateRenderPosition();
  const spawns = visibleSpawns();
  spawns.forEach(updateWorldEnemyRender);
  const entities = [
    ...spawns.map(spawnPoint => ({ x: spawnPoint.renderX + 8, depth: spawnPoint.renderY + 25, draw: () => drawWorldEnemy(spawnPoint) })),
    ...visiblePoints().map(point => ({
      x: point.x * TILE + 8,
      depth: point.y * TILE + (point.chest ? 18 : 25),
      draw: () => {
        if (point.chest) return drawChest(point);
        drawVendorGrounding(point, point.x * TILE + 8, point.y * TILE + 25 + offsetY);
        if (point.id !== "Stage") drawFieldShadow(point.x * TILE + 8, point.y * TILE + 25 + offsetY, point.id === "Kaeldrin" ? 9 : point.id === "Workshop Bench" ? 12 : 7);
        drawSprite(point.id, point.x * TILE, point.y * TILE - 7 + offsetY, 0, "idle");
      }
    })),
    ...(state.escort ? [{
      x: state.renderX - 5,
      depth: state.renderY + 24,
      draw: () => {
        drawFieldShadow(state.renderX + 3, state.renderY + 28 + offsetY, 7);
        drawSprite(state.escort, state.renderX - 13, state.renderY - 3 + offsetY, state.facing, tick < state.walkUntil ? "walk" : "idle");
      }
    }] : []),
    {
      x: state.renderX + 8,
      depth: state.renderY + 25,
      player: true,
      draw: () => {
        drawFieldShadow(state.renderX + 8, state.renderY + 25 + offsetY, spriteScale[state.activeParty[0]]?.field[0] > 30 ? 10 : 7);
        drawSprite(state.activeParty[0], state.renderX, state.renderY - 7 + offsetY, state.facing, tick < state.walkUntil ? "walk" : "idle");
      }
    }
  ];
  entities.sort((a, b) => a.depth - b.depth || Number(Boolean(a.player)) - Number(Boolean(b.player))).forEach(entity => {
    ctx.save();
    ctx.translate(fieldScreenX(entity.x) - entity.x, 0);
    entity.draw();
    ctx.restore();
  });
  if (background) drawMapForeground(map, background);
  drawObjectiveMarker();
  const labelSize = map.name.length > 29 ? 7 : map.name.length > 23 ? 8 : 9;
  drawText(map.name, 9, 13, "#0b090d", labelSize);
  drawText(map.name, 8, 12, "#ffe0a1", labelSize);
}

function drawChest(pointData) {
  const anchorX = pointData.x * TILE + 8;
  const baseline = pointData.y * TILE + 18 + fieldRenderOffsetY();
  const opened = state.flags[`chest:${pointData.chest.id}`];
  const reward = pointData.chest.reward || {};
  const rarity = pointData.chest.rarity || (reward.gear ? "epic" : Object.keys(reward.items || {}).length ? "rare" : "common");
  const row = { common: 0, rare: 1, epic: 2 }[rarity] ?? 0;
  const openedAt = chestOpenTicks[pointData.chest.id];
  const opening = opened && Number.isFinite(openedAt) && tick - openedAt < 25;
  const frame = opened ? (opening ? Math.min(4, Math.floor((tick - openedAt) / 5)) : 4) : 0;
  drawFieldShadow(anchorX, baseline + 1, rarity === "epic" ? 10 : 8);
  if (chestSheet) {
    const sourceX = Math.floor(frame * chestSheet.cellWidth);
    const sourceY = Math.floor(row * chestSheet.cellHeight);
    const sourceWidth = Math.ceil(chestSheet.cellWidth);
    const sourceHeight = Math.ceil(chestSheet.cellHeight);
    const targetHeight = rarity === "epic" ? 22 : rarity === "rare" ? 20 : 18;
    const targetWidth = Math.round(sourceWidth * targetHeight / sourceHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(chestSheet.image, sourceX, sourceY, sourceWidth, sourceHeight, Math.round(anchorX - targetWidth / 2), baseline - targetHeight, targetWidth, targetHeight);
    ctx.restore();
  } else {
    drawRect(anchorX - 6, baseline - 10, 12, 8, opened ? "#6f4827" : "#b17436");
    drawRect(anchorX - 1, baseline - 7, 2, 4, "#f1c663");
  }
  if (!opened && tick % 150 < 12) drawSubtlePulse(anchorX, baseline - 22, 0, rarity === "epic" ? "#d899ff" : rarity === "rare" ? "#9ed8ff" : "#ffe29a", 150);
}

function mapSourceFrame(map, image) {
  if (!Number.isFinite(map.view)) return { x: 0, y: 0, width: image.width, height: image.height };
  const views = Math.max(2, map.views || 2);
  const width = Math.min(image.width, Math.round(image.height * FIELD_WORLD_WIDTH / LOGICAL_HEIGHT));
  const maxX = Math.max(0, image.width - width);
  return { x: Math.round(maxX * map.view / (views - 1)), y: 0, width, height: image.height };
}

function drawMapBackground(map, image, offsetX = 0, offsetY = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const source = mapSourceFrame(map, image);
  ctx.drawImage(image, source.x, source.y, source.width, source.height, offsetX, offsetY, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.restore();
}

function drawMapForeground(map, image) {
  const zones = mapForegroundZones[state.map];
  if (!zones?.length) return;
  const source = mapSourceFrame(map, image);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  zones.forEach(([x, y, width, height]) => {
    const sx = Math.round(source.x + x / FIELD_WORLD_WIDTH * source.width);
    const sy = Math.round(source.y + y / LOGICAL_HEIGHT * source.height);
    const sw = Math.max(1, Math.round(width / FIELD_WORLD_WIDTH * source.width));
    const sh = Math.max(1, Math.round(height / LOGICAL_HEIGHT * source.height));
    ctx.drawImage(image, sx, sy, sw, sh, fieldScreenX(x), y, fieldScreenX(width), height);
  });
  ctx.restore();
}

function drawQaNavigationOverlay() {
  if (new URLSearchParams(location.search).get("qaGrid") !== "1") return;
  const offsetY = fieldRenderOffsetY();
  ctx.save();
  ctx.scale(LOGICAL_WIDTH / FIELD_WORLD_WIDTH, 1);
  ctx.lineWidth = 1;
  for (let y = 1; y <= 12; y++) {
    for (let x = 1; x <= 14; x++) {
      const passableTile = terrainPassable(x, y);
      ctx.fillStyle = passableTile ? "#24c96b22" : "#e23b4d38";
      ctx.strokeStyle = passableTile ? "#72f0a688" : "#ff849088";
      ctx.fillRect(x * TILE, y * TILE + offsetY, TILE, TILE);
      ctx.strokeRect(x * TILE + .5, y * TILE + offsetY + .5, TILE - 1, TILE - 1);
    }
  }
  ctx.restore();
}

function drawScreenSlide() {
  screenSlide.t++;
  const progress = Math.min(1, screenSlide.t / 14);
  const ease = progress * progress * (3 - 2 * progress);
  const dx = screenSlide.dx * LOGICAL_WIDTH;
  const dy = screenSlide.dy * LOGICAL_HEIGHT;
  const fromImage = mapImages[screenSlide.from.background || screenSlide.from.set];
  const toImage = mapImages[screenSlide.to.background || screenSlide.to.set];
  drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, "#0b0910");
  if (fromImage) drawMapBackground(screenSlide.from, fromImage, -dx * ease, -dy * ease);
  if (toImage) drawMapBackground(screenSlide.to, toImage, dx * (1 - ease), dy * (1 - ease));
  if (progress >= 1) {
    screenSlide = null;
    mode = "walk";
  }
}

function approach(value, target, amount) {
  if (Math.abs(target - value) <= amount) return target;
  return value + Math.sign(target - value) * amount;
}

function updateRenderPosition() {
  if (!Number.isFinite(state.renderX)) state.renderX = state.x * TILE;
  if (!Number.isFinite(state.renderY)) state.renderY = state.y * TILE;
  state.renderX = approach(state.renderX, state.x * TILE, 1);
  state.renderY = approach(state.renderY, state.y * TILE, 1);
}

function drawAmbient(set, panorama = false) {
  if (panorama) {
    if (set === "ash") {
      const rainFrame = Math.floor(tick / 8) % 3;
      for (let i = 0; i < 15; i++) drawRect((i * 43 + rainFrame * 7) % 256, (i * 31 + rainFrame * 4) % 224, 1, 3, "#9db2bc44");
    }
    if (set === "ember") drawFlame(128, 64, ambientFrame(0, 116), "#e44f26", "#ffe074");
    if (set === "alarm") drawSubtlePulse(128, 92, 0, "#35d7ef", 144, 1);
    return;
  }
  if (set === "lantern") {
    [[39, 32], [117, 45], [219, 46], [214, 175]].forEach(([x, y], i) => drawFlame(x, y, ambientFrame(i, 112), "#e98236", "#ffe08a"));
  }
  if (set === "ash") {
    const rainFrame = Math.floor(tick / 8) % 3;
    for (let i = 0; i < 20; i++) {
      const x = (i * 41 + rainFrame * 7) % 256;
      const y = (i * 29 + rainFrame * 4) % 224;
      drawRect(x, y, 1, 3, "#9db2bc55");
    }
    [[48, 77], [129, 78], [213, 75], [224, 119]].forEach(([x, y], i) => drawSubtlePulse(x, y, i, "#e99a45", 126));
  }
  if (set === "reverie") {
    [[101, 33], [154, 33], [101, 185], [155, 185]].forEach(([x, y], i) => drawFlame(x, y, ambientFrame(i, 136), "#df7c38", "#ffdda0"));
  }
  if (set === "guildspire") {
    [[88, 35], [192, 35], [81, 91], [198, 91]].forEach(([x, y], i) => drawFlame(x, y, ambientFrame(i, 148), "#c49346", "#fff1ae"));
  }
  if (set === "ember") {
    drawFlame(128, 53, ambientFrame(0, 92), "#e44f26", "#ffe074", 2);
    drawFlame(85, 184, ambientFrame(2, 132), "#dc5d2a", "#ffc85e");
    [[43, 29], [213, 31], [224, 117]].forEach(([x, y], i) => drawSubtlePulse(x, y, i, "#e07136", 142));
  }
  if (set === "alarm") {
    [[128, 123], [128, 40], [191, 50], [42, 72], [213, 139]].forEach(([x, y], i) => drawSubtlePulse(x, y, i, i % 2 ? "#ef8e31" : "#35d7ef", 118, 2));
  }
}

function ambientFrame(index, cycle) {
  const phase = (tick + index * 31) % cycle;
  return phase < 24 ? Math.floor(phase / 8) : 1;
}

function drawSubtlePulse(x, y, index, color, cycle, size = 1) {
  const phase = (tick + index * 37) % cycle;
  if (phase < 24) drawPulse(x, y, Math.floor(phase / 8), color, size);
  else {
    ctx.save();
    ctx.globalAlpha = .36;
    drawRect(x, y, size, size, color);
    ctx.restore();
  }
}

function drawFlame(x, y, frame, outer, inner, size = 1) {
  const shapes = [
    [[0, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2]],
    [[1, 0], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2]]
  ];
  shapes[frame].forEach(([dx, dy], index) => drawRect(x + dx * size, y + dy * size, size, size, index < 2 ? inner : outer));
}

function drawPulse(x, y, frame, color, size = 1) {
  const radius = (frame + 1) * size;
  ctx.save();
  ctx.globalAlpha = [0.45, 0.72, 1][frame];
  ctx.strokeStyle = color;
  ctx.strokeRect(x - radius, y - radius, radius * 2 + 1, radius * 2 + 1);
  drawRect(x, y, size, size, color);
  ctx.restore();
}

function drawBackgroundDetails(p, set) {
  if (set === "lantern") drawLanternRoom(p);
  if (set === "ash") drawAshQuarter(p);
  if (set === "reverie") drawReverie(p);
  if (set === "guildspire") drawGuildspire(p);
  if (set === "ember") drawEmberHall(p);
  if (set === "alarm") drawFalseDawn(p);
}

function drawBrickWall(x, y, w, h, base, mortar) {
  drawRect(x, y, w, h, base);
  for (let yy = y + 7; yy < y + h; yy += 8) drawRect(x, yy, w, 1, mortar);
  for (let yy = y; yy < y + h; yy += 8) {
    const offset = ((yy - y) / 8) % 2 ? 8 : 0;
    for (let xx = x + offset; xx < x + w; xx += 16) drawRect(xx, yy, 1, 8, mortar);
  }
}

function drawWindow(x, y, lit = true, tall = false) {
  const h = tall ? 22 : 16;
  drawRect(x - 2, y - 2, 16, h + 4, "#141118");
  drawRect(x, y, 12, h, lit ? "#d18437" : "#243647");
  drawRect(x + 5, y, 2, h, "#38261f");
  drawRect(x, y + Math.floor(h / 2), 12, 2, "#38261f");
  if (lit) drawRect(x + 2, y + 2, 3, 3, tick % 18 < 9 ? "#ffe49a" : "#f0b25b");
}

function drawCrate(x, y) {
  drawRect(x, y, 14, 13, "#2a1b18");
  drawRect(x + 1, y + 1, 12, 11, "#765037");
  drawRect(x + 2, y + 2, 2, 9, "#b47a45");
  drawRect(x + 10, y + 2, 2, 9, "#3d2922");
  drawRect(x + 3, y + 5, 8, 2, "#3d2922");
}

function drawBarrel(x, y) {
  drawRect(x + 2, y, 9, 2, "#2b1c18");
  drawRect(x, y + 2, 13, 11, "#69452d");
  drawRect(x + 2, y + 3, 9, 8, "#8a5b34");
  drawRect(x, y + 4, 13, 2, "#252027");
  drawRect(x, y + 10, 13, 2, "#252027");
}

function drawLanternRoom(p) {
  drawBrickWall(16, 16, 224, 47, "#2d1d1d", "#160f13");
  drawRect(24, 58, 86, 10, "#2a1713");
  drawRect(26, 60, 82, 6, "#9a6038");
  for (let x = 32; x < 103; x += 13) {
    drawRect(x, 39, 5, 13, "#151117");
    drawRect(x + 1, 41 + (x % 3), 3, 9 - (x % 3), x % 2 ? "#9b4c37" : "#d19b45");
  }
  drawRect(135, 43, 78, 48, "#241318");
  drawRect(139, 47, 70, 40, "#5f2930");
  drawRect(143, 54, 62, 30, "#1d171b");
  drawRect(151, 80, 46, 4, "#b37943");
  drawRect(151, 50, 5, 30, "#7c3427");
  drawRect(192, 50, 5, 30, "#7c3427");
  drawRect(34, 103, 34, 18, "#261812");
  drawRect(38, 107, 26, 10, "#8b5d3c");
  drawRect(42, 121, 4, 9, "#2b1c18");
  drawRect(58, 121, 4, 9, "#2b1c18");
  drawRect(146, 132, 40, 18, "#261812");
  drawRect(150, 136, 32, 10, "#8b5d3c");
  drawBarrel(112, 69);
  drawBarrel(213, 83);
  for (let i = 0; i < 5; i++) drawRect(22 + i * 46, 31 + Math.sin((tick + i * 9) / 18), 4, 5, tick % 20 < 10 ? "#f3ba5b" : "#d47a35");
}

function drawAshQuarter(p) {
  drawRect(16, 16, 224, 77, "#1a1d20");
  const houses = [[24, 35, 54, 58], [86, 27, 60, 66], [157, 31, 69, 62]];
  houses.forEach((h, i) => {
    drawRect(h[0], h[1] + 10, h[2], h[3] - 10, i % 2 ? "#493a35" : "#3b3230");
    drawRect(h[0] - 3, h[1] + 7, h[2] + 6, 7, i % 2 ? "#653b34" : "#53302d");
    for (let yy = h[1] + 18; yy < h[1] + h[3]; yy += 13) drawRect(h[0], yy, h[2], 1, "#1c1c20");
    drawWindow(h[0] + 9, h[1] + 22, true);
    drawWindow(h[0] + h[2] - 23, h[1] + 20, i !== 1);
  });
  drawRect(16, 92, 224, 3, "#17191c");
  for (let x = 20; x < 234; x += 22) drawRect(x, 96 + ((x / 22) % 2) * 21, 17, 2, "#b1a58f25");
  drawCrate(28, 150);
  drawCrate(44, 158);
  drawBarrel(214, 139);
  drawRect(72, 102, 80, 1, "#211a1d");
  for (let i = 0; i < 7; i++) {
    const sx = (tick * .22 + i * 43) % 260 - 10;
    drawRect(sx, 25 + i * 21, 8, 2, "#b5b1a84c");
    drawRect(sx + 3, 23 + i * 21, 6, 1, "#d4cdc044");
  }
  for (let i = 0; i < 4; i++) drawRect(54 + i * 44, 96 + Math.sin((tick + i * 13) / 15), 2, 2, "#e37c3d");
}

function drawReverie(p) {
  drawBrickWall(16, 16, 224, 55, "#5b5548", "#2f2d29");
  [36, 112, 188].forEach((x, i) => {
    drawWindow(x, 28, i !== 1, true);
    drawRect(x + 2, 30, 3, 17, i === 1 ? "#7b4b99" : "#bd6c42");
    drawRect(x + 7, 30, 3, 17, i === 1 ? "#d4aa63" : "#537d6c");
  });
  drawRect(98, 70, 60, 122, "#403849");
  drawRect(102, 70, 52, 122, "#7a5146");
  for (let y = 79; y < 192; y += 16) {
    drawRect(105, y, 46, 1, "#d8b67b55");
    drawRect(126, y - 4, 5, 5, "#d6b06a");
  }
  drawRect(28, 91, 52, 18, "#28382d");
  drawRect(176, 91, 52, 18, "#28382d");
  for (let x = 33; x < 79; x += 9) drawRect(x, 87 + (x % 3), 4, 9, x % 2 ? "#557b52" : "#8e6d43");
  for (let x = 181; x < 227; x += 9) drawRect(x, 87 + (x % 3), 4, 9, x % 2 ? "#557b52" : "#8e6d43");
  for (let i = 0; i < 9; i++) drawRect(22 + i * 27, 78 + Math.sin((tick + i * 8) / 18), 2, 2, "#ffd49055");
}

function drawGuildspire(p) {
  drawRect(86, 16, 84, 176, "#242b4c");
  drawRect(91, 16, 74, 176, "#3d3764");
  drawRect(95, 16, 66, 176, "#26294d");
  for (let y = 27; y < 192; y += 24) {
    drawRect(101, y, 54, 1, "#b99a5b");
    drawRect(125, y - 4, 6, 6, "#7054a0");
  }
  [25, 59, 185, 219].forEach(x => {
    drawRect(x, 26, 12, 148, "#ebe5d7");
    drawRect(x - 3, 24, 18, 7, "#bdb7b0");
    drawRect(x - 4, 169, 20, 7, "#8f8992");
    drawRect(x + 3, 34, 2, 128, "#ffffff50");
  });
  drawRect(76, 34, 104, 5, "#756159");
  drawRect(80, 30, 96, 5, "#b8b0aa");
  drawRect(89, 25, 78, 5, "#e6e0d5");
  drawRect(116, 21, 24, 8, "#171b33");
  for (let i = 0; i < 8; i++) drawSpark(28 + i * 29, 51 + Math.sin((tick + i * 7) / 20) * 2, i % 2 ? "#7054a0" : "#d6b06a", tick + i);
}

function drawEmberHall(p) {
  drawBrickWall(16, 16, 224, 52, "#3a2420", "#1c1212");
  drawRect(22, 33, 45, 40, "#181116");
  drawRect(26, 37, 37, 32, "#6b3326");
  drawRect(31, 45, 27, 24, "#1f1312");
  const flame = tick % 18 < 9 ? "#ffb13f" : "#e7682f";
  drawRect(38, 53, 13, 16, flame);
  drawRect(42, 47, 5, 20, "#ffe07a");
  drawRect(83, 41, 109, 11, "#2a1a16");
  drawRect(86, 44, 103, 6, "#91613e");
  for (let x = 91; x < 187; x += 16) {
    drawRect(x, 28, 2, 16, "#bd8d55");
    drawRect(x - 3, 25 + (x % 5), 8, 4, x % 2 ? "#68777c" : "#b6783c");
  }
  drawRect(186, 76, 39, 32, "#2a1b18");
  for (let i = 0; i < 7; i++) {
    const a = (tick / 16) + i;
    drawRect(204 + Math.round(Math.cos(a) * 12), 92 + Math.round(Math.sin(a) * 12), 3, 3, i % 2 ? "#8f7652" : "#d88a3f");
  }
  drawCrate(28, 139);
  drawBarrel(49, 143);
  for (let i = 0; i < 7; i++) drawSpark(24 + i * 35, 73 + Math.sin((tick + i * 8) / 12) * 4, p[4], tick + i);
}

function drawFalseDawn(p) {
  drawRect(16, 16, 224, 59, "#111820");
  for (let x = 20; x < 237; x += 28) {
    drawRect(x, 21, 20, 48, "#2f3c43");
    drawRect(x + 3, 24, 14, 42, "#1a242b");
    drawRect(x + 6, 30, 8, 2, "#6c858d");
    drawRect(x + 6, 53, 8, 2, "#6c858d");
  }
  drawRect(33, 82, 190, 6, "#10161b");
  drawRect(36, 84, 184, 2, tick % 30 < 15 ? "#e18b35" : "#60747c");
  drawRect(117, 72, 22, 110, "#10161b");
  drawRect(121, 75, 14, 104, "#34464d");
  for (let y = 82; y < 178; y += 18) drawRect(123, y, 10, 3, tick % 24 < 12 ? "#ed9d45" : "#6c858d");
  for (let i = 0; i < 9; i++) {
    const pulse = (tick + i * 11) % 70;
    drawRect(25 + i * 25, 105 + (i % 3) * 27, 3, 3, pulse < 35 ? "#e18b35" : "#47707a");
    if (pulse < 8) drawSpark(25 + i * 25, 105 + (i % 3) * 27, p[4], tick + i);
  }
}

const battlePartyLayouts = {
  1: [[72, 124]],
  2: [[54, 106], [90, 144]],
  3: [[46, 99], [91, 131], [46, 161]]
};
const BATTLE_ARENA_HEIGHT = 188;

function partyBattlePosition(index, count = battle?.party?.length || 1) {
  const [x, y] = (battlePartyLayouts[Math.min(3, count)] || battlePartyLayouts[3])[index] || [55, 122];
  return [x + (LOGICAL_WIDTH - FIELD_WORLD_WIDTH) * (x / FIELD_WORLD_WIDTH), y];
}

function enemyBattlePosition(index, count = battle?.enemies?.length || 1) {
  const positions = count === 1
    ? [[184, 124]]
    : count === 2
      ? [[202, 106], [166, 144]]
      : [[210, 99], [165, 131], [210, 161]];
  const [x, y] = positions[index] || [190, 105];
  return [x + (LOGICAL_WIDTH - FIELD_WORLD_WIDTH) * (x / FIELD_WORLD_WIDTH), y];
}

function selectedBattleEnemy() {
  if (!battle?.targetMode) return null;
  return battle.enemies.filter(enemyUnit => enemyUnit.hp > 0)[battleActionIndex] || null;
}

function battleFloaterPosition(target) {
  const partyIndex = battle?.party?.indexOf(target) ?? -1;
  if (partyIndex >= 0) {
    const [x, baseline] = partyBattlePosition(partyIndex, battle.party.length);
    const topRowInset = baseline <= 106 ? 12 : 0;
    return [x + 2, baseline - 55 + topRowInset];
  }
  const enemyIndex = battle?.enemies?.indexOf(target) ?? -1;
  if (enemyIndex >= 0) {
    const [x, baseline] = enemyBattlePosition(enemyIndex, battle.enemies.length);
    const key = enemyAnimationKey(target);
    const topRowInset = baseline <= 106 ? 12 : 0;
    return [x - 2, baseline - Math.max(38, (enemyAnimationHeights[key] || 44) * enemyBattleScale(key) + 8) + topRowInset];
  }
  return [LOGICAL_WIDTH / 2, 80];
}

function addBattleFloater(target, amount, options = {}) {
  if (!battle || (!amount && !options.text)) return;
  if (battle.attackDamage && (!options.kind || options.kind === "damage")) {
    battle.attackDamage.push({ amount: Math.abs(Math.round(amount)), type: options.damageType || "Physical", crit: Boolean(options.crit) });
  }
  const [x, y] = battleFloaterPosition(target);
  const occupiedLanes = new Set(battleFloaters.filter(floater => floater.target === target && tick - floater.born < BATTLE_FLOATER_LIFETIME).map(floater => floater.lane));
  const lane = battleFloaterLaneOffsets.findIndex((_, index) => !occupiedLanes.has(index));
  battleFloaters.push({
    x,
    y,
    target,
    lane: lane < 0 ? battleFloaters.length % battleFloaterLaneOffsets.length : lane,
    amount: Math.abs(Math.round(amount)),
    kind: options.kind || "damage",
    damageType: options.damageType || (options.kind === "heal" ? "HEAL" : "PHYSICAL"),
    text: options.text || "",
    crit: Boolean(options.crit),
    born: tick + (options.delayTicks || 0)
  });
}

const battleFloaterLaneOffsets = [[0, 0], [0, -15], [-20, -8], [20, -23], [-20, -23], [20, -8]];

function drawBattleFloaters() {
  battleFloaters = battleFloaters.filter(floater => tick - floater.born < BATTLE_FLOATER_LIFETIME);
  battleFloaters.forEach(floater => {
    const age = tick - floater.born;
    if (age < 0) return;
    const rise = Math.round(Math.min(age, 40) * .16);
    const alpha = Math.min(1, (BATTLE_FLOATER_LIFETIME - age) / 30);
    const healing = floater.kind === "heal";
    const evaded = floater.kind === "evade";
    const feedback = evaded || ["cleanse", "dispel", "broken"].includes(floater.kind);
    const main = floater.text || `${floater.crit ? "CRIT! " : ""}${healing ? "+" : ""}${floater.amount}`;
    const mainSize = evaded || floater.kind === "broken" ? 13 : feedback ? 9 : floater.crit ? 15 : 10;
    const [laneX, laneY] = battleFloaterLaneOffsets[floater.lane] || battleFloaterLaneOffsets[0];
    const mainY = floater.y - rise + laneY;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.font = `${floater.crit || feedback ? 900 : "bold"} ${mainSize}px "Arial Black", "Trebuchet MS", sans-serif`;
    const halfWidth = Math.ceil(ctx.measureText(main).width / 2) + 4;
    const mainX = Math.max(halfWidth, Math.min(LOGICAL_WIDTH - halfWidth, floater.x + laneX));
    ctx.lineWidth = floater.crit || feedback ? 5 : 2;
    ctx.strokeStyle = "#160d13";
    ctx.strokeText(main, mainX, mainY);
    if (floater.crit || feedback) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffd45c";
      ctx.strokeText(main, mainX, mainY);
    }
    ctx.fillStyle = evaded ? "#79ddff" : floater.kind === "cleanse" ? "#76f1b0" : floater.kind === "dispel" ? "#d7a7ff" : floater.kind === "broken" ? "#ffb348" : healing ? "#65e88a" : "#ff5b55";
    ctx.fillText(main, mainX, mainY);
    ctx.font = `bold ${floater.crit ? 7 : 6}px "Comic Sans MS", "Comic Sans", cursive`;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#160d13";
    const label = feedback ? "" : healing ? "HEAL" : floater.damageType.toUpperCase();
    if (label) {
      ctx.strokeText(label, mainX, mainY + 7);
      ctx.fillText(label, mainX, mainY + 7);
    }
    ctx.restore();
  });
}

function drawBattleGroundMarker(anchorX, baseline, kind) {
  const pulse = Math.floor(tick / 8) % 2;
  const colour = kind === "target" ? "#c99cff" : "#f4c66e";
  ctx.save();
  ctx.globalAlpha = kind === "target" ? .68 : .52 + pulse * .12;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(anchorX, baseline + 1, kind === "target" ? 15 : 13, kind === "target" ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = kind === "target" ? "#f3ddff" : "#fff0bd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(anchorX, baseline + 1, kind === "target" ? 17 : 15, kind === "target" ? 6 : 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (kind === "target") {
    drawRect(anchorX - 2, baseline - 39 - pulse, 5, 2, "#f3ddff");
    drawRect(anchorX - 1, baseline - 37 - pulse, 3, 2, "#c99cff");
    drawRect(anchorX, baseline - 35 - pulse, 1, 2, "#8f5ac7");
  } else {
    drawRect(anchorX - 18, baseline - 1, 3, 3, "#fff0bd");
    drawRect(anchorX + 16, baseline - 1, 3, 3, "#fff0bd");
  }
  ctx.restore();
}

function drawWithTurnOutline(drawUnit, colour) {
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;
  ctx.shadowColor = colour;
  offsets.forEach(([x, y]) => {
    ctx.shadowOffsetX = x;
    ctx.shadowOffsetY = y;
    drawUnit();
  });
  ctx.restore();
  drawUnit();
}

function drawBattleVitalBar(anchorX, y, value, max, label, colour, width = 42) {
  const safeMax = Math.max(1, max || 1);
  const pct = Math.max(0, Math.min(1, value / safeMax));
  const x = Math.round(anchorX - width / 2);
  drawRect(x, y, width, 6, "#08080ddf");
  drawRect(x + 1, y + 1, width - 2, 4, "#2a2230");
  drawRect(x + 1, y + 1, Math.round((width - 2) * pct), 4, colour);
  drawText(`${label} ${Math.max(0, value)}`, x + 2, y + 5, "#fff4d2", 5);
}

function drawBattleVitals(unit, anchorX, baseline, enemySide = false) {
  if (unit.hp <= 0) return;
  if (enemySide) {
    if (partyCanSeeWeaknesses()) rememberWeakness(unit);
    const label = knownWeakness(unit) ? unit.weak : "???";
    drawRect(anchorX - 31, baseline - 5, 62, 8, "#100d18ed");
    drawText("Weak: " + label, anchorX - 29, baseline + 1, knownWeakness(unit) ? "#ffe096" : "#b4abbc", 5);
  }
  drawBattleVitalBar(anchorX, baseline + 4, unit.hp, unit.max, "HP", enemySide ? "#c85645" : "#e8a64b", enemySide ? 46 : 42);
  if (enemySide && Number.isFinite(unit.maxmp)) {
    drawBattleVitalBar(anchorX, baseline + 11, unit.mp, unit.maxmp, "MP", "#4f78a8", 46);
  } else if (Number.isFinite(unit.maxmp)) {
    drawBattleVitalBar(anchorX, baseline + 11, unit.mp, unit.maxmp, "MP", "#7d62b8", 42);
  }
  drawBattleStatusBadges(unit, anchorX, baseline + 19);
}

function drawBattleStatusBadges(unit, anchorX, y) {
  const statuses = (unit.statuses || []).filter(status => status.type !== "broken");
  const visible = statuses.slice(0, 4);
  const chipWidth = 8;
  const chipHeight = 10;
  const gap = 1;
  const overflow = Math.max(0, statuses.length - 4);
  const total = Math.max(0, visible.length * (chipWidth + gap) - gap) + (overflow ? 7 : 0);
  const barTop = y - 24;
  y = Math.min(y, BATTLE_ARENA_HEIGHT - chipHeight);
  const startX = anchorX - total / 2;
  const left = Math.max(1, Math.min(LOGICAL_WIDTH - total - 1, startX));
  const hoverLeft = Math.min(left, anchorX - 31);
  statusHoverAreas.push({ unit, x: hoverLeft, y: barTop, w: Math.max(left + total, anchorX + 31) - hoverLeft, h: y + chipHeight - barTop });
  visible.forEach((status, index) => {
    const def = STATUS_DEFS[status.type];
    const x = Math.round(left + index * (chipWidth + gap));
    drawRect(x, y, chipWidth, chipHeight, def?.negative ? '#7f2f39' : '#52655d');
    drawRect(x + .5, y + .5, chipWidth - 1, chipHeight - 1, '#100d18');
    const image = statusIconImages[status.type];
    if (image) { ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(image, x, y, chipWidth, 7); ctx.restore(); }
    else drawText(def?.short || '?', x + 4, y + 5, '#fff0da', 3, 'center');
    drawRect(x + .5, y + 6, chipWidth - 1, 3.5, '#100d18');
    drawText(statusDisplayData(unit, status).compact, x + 4, y + 9, '#fff0da', 3, 'center');
  });
  if (overflow) drawText(`+${overflow}`, left + total - 3, y + 7, '#ffe096', 3, 'center');
}

function statusDisplayData(unit, status) {
  const def = STATUS_DEFS[status.type] || {};
  const value = statusValue(unit, status.type);
  const percent = `${Math.round(value * 1000) / 10}%`;
  const descriptions = {
    strengthUp: `Physical attack damage +${percent}.`, magicUp: `Magic attack damage +${percent}.`,
    defenseUp: `Reduces incoming damage by ${percent}; combines with other defenses.`, damageUp: `Direct damage +${percent}.`,
    agilityUp: `Initiative AGI +${percent}; does not grant an extra action.`, critUp: `Attack critical chance +${percent}, subject to the total cap.`,
    shadowUp: `Direct attack damage +${percent} in the current combat implementation.`, echoPower: `Adds ${value.toFixed(2)} to the Ultimate ECHO multiplier.`,
    evasion: `Evasion +${percent}. Each incoming direct attack consumes one charge whether it hits or is Evaded.`, barrier: `${percent} damage reduction, not a separate HP shield.`,
    mechGuard: `Reduces incoming damage by ${percent}.`, holyFollowUp: `Next damaging action adds ${percent} Holy follow-up damage.`,
    combatDrone: `Drone follows damaging actions. Applied power: ${percent}; source talents can add further damage.`,
    vampiric: `Heal ${percent} of direct damage dealt.`, stunFocus: 'Doubles Mira\'s existing gear-based Stun chance; does not create a chance by itself.',
    poison: `${value} damage at the start of each action.`, burn: `${value} damage at the start of each action.`, bleed: `${value} damage at the start of each action.`,
    marked: `Attacks against this target gain ${percent} critical chance.`, physicalVulnerability: `Takes ${percent} more physical damage from player attacks.`,
    magicVulnerability: `Takes ${percent} more magical damage from player attacks.`, holyVulnerability: `Takes ${percent} more Holy Fire damage.`,
    critExposed: `Attacks against this target gain ${percent} critical chance.`, agilityDown: `Initiative AGI reduced by ${percent}.`,
    disrupted: `Outgoing damage reduced by ${percent}.`, defenseDown: `Subtracts ${percent} from active Defense Up; not a flat damage bonus.`,
    magicDefenseDown: `Subtracts ${percent} from active Defense Up against magic.`, sleep: 'Skips actions; direct damage wakes the target.',
    stun: 'Skips an action.', silence: 'Prevents magic / Ultimate use for affected enemies; they use melee instead.',
    shadowExposed: 'Shadow attacks trigger weakness; Voidthorn Mark gains its extra payoff.', broken: 'Recently Broken. Enables Broken interactions; does not itself skip an action.',
    resonanceLocked: 'Prevents enemy Resonance gains.', overheated: 'Cannot receive another granted extra action. This is not a speed buff.'
  };
  const potency = Number.isFinite(status.value ?? def.value);
  return { name: def.label || status.type, kind: def.negative ? 'Debuff' : 'Buff', remaining: status.remaining,
    timing: status.type === 'evasion' ? `${status.incomingCharges ?? status.remaining} incoming attacks remaining` : `${status.remaining} actions remaining`,
    compact: def.buff && potency ? (status.type === 'echoPower' ? `+${value.toFixed(2)}` : percent) : `${status.remaining}t`,
    description: descriptions[status.type] || 'Active combat status.' };
}

function statusTooltipHtml(unit) {
  const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const baseEvasion = Math.round(baseEvasionValue(unit) * 1000) / 10;
  const currentEvasion = Math.round(combatEvasionChance(unit) * 1000) / 10;
  return `<strong>${escape(unit.name || unit.id)}</strong><small>Base Evasion ${baseEvasion}% · Current Evasion ${currentEvasion}%</small>` + (unit.statuses || []).map(status => {
    const data = statusDisplayData(unit, status);
    return `<section><b>${escape(data.name)}</b><small>${data.kind} · ${escape(data.timing)}</small><p>${escape(data.description)}</p></section>`;
  }).join('');
}

function updateStatusTooltip() {
  const rect = canvas.getBoundingClientRect();
  const x = statusPointer ? (statusPointer.x - rect.left) * LOGICAL_WIDTH / rect.width : -1;
  const y = statusPointer ? (statusPointer.y - rect.top) * LOGICAL_HEIGHT / rect.height : -1;
  const area = mode === 'battle' && statusHoverAreas.find(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
  if (!area) { if (statusTooltip) statusTooltip.hidden = true; return; }
  if (!statusTooltip) {
    statusTooltip = document.createElement('div');
    statusTooltip.className = 'battle-status-tooltip';
    statusTooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(statusTooltip);
  }
  statusTooltip.hidden = false;
  const html = statusTooltipHtml(area.unit);
  if (statusTooltip.innerHTML !== html) statusTooltip.innerHTML = html;
  statusTooltip.style.left = '50%';
  statusTooltip.style.top = '50%';
}

canvas.addEventListener('pointermove', event => { statusPointer = { x: event.clientX, y: event.clientY }; updateStatusTooltip(); });
canvas.addEventListener('pointerleave', () => { statusPointer = null; updateStatusTooltip(); });
canvas.addEventListener('wheel', event => {
  if (statusTooltip && !statusTooltip.hidden) { statusTooltip.scrollTop += event.deltaY; event.preventDefault(); }
}, { passive: false });

function drawEnemyBreakIcon(unit, anchorX) {
  if (!breakIconSheet || unit.hp <= 0) return;
  const broken = Boolean(statusOf(unit, "broken"));
  const breakValue = Math.max(0, Math.min(BREAK_THRESHOLD, Math.floor(unit.stagger || 0)));
  if (!broken && breakValue === 0) return;
  const cell = breakIconSheet.cells[broken ? 3 : breakValue - 1];
  if (!cell) return;
  const size = 18;
  const [, enemyTop] = battleFloaterPosition(unit);
  const x = Math.round(anchorX - size / 2);
  const y = Math.max(21, Math.round(enemyTop - size - 2));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(breakIconSheet.image, cell.x, cell.y, cell.w, cell.h, x, y, size, size);
  ctx.restore();
}

function drawBattleTurnRail() {
  if (!battle?.turnQueue) return;
  const turns = battle.turnQueue.slice(battle.turnIndex).filter(turnIsAlive);
  drawRect(3, 3, LOGICAL_WIDTH - 6, 17, "#090a11dd");
  drawRect(4, 4, LOGICAL_WIDTH - 8, 1, "#8b6a45");
  drawText(`R${battle.round}/${battle.roundCap || MAX_BATTLE_ROUNDS}`, 8, 15, "#f0c97a", 6);
  if (!turns.length) return;
  const startX = 39;
  const gap = 2;
  const available = LOGICAL_WIDTH - startX - 6;
  const chipWidth = Math.max(24, Math.floor((available - gap * (turns.length - 1)) / turns.length));
  turns.forEach((turn, index) => {
    const x = startX + index * (chipWidth + gap);
    const active = index === 0;
    const background = active ? "#725338" : turn.side === "enemy" ? "#3d2428" : "#24233a";
    const border = active ? "#f0bd68" : turn.side === "enemy" ? "#a15446" : "#665788";
    drawRect(x, 7, chipWidth, 10, border);
    drawRect(x + 1, 8, chipWidth - 2, 8, background);
    const shortName = turn.name.split(" ")[0].slice(0, Math.max(3, Math.floor(chipWidth / 6)));
    drawText(`${active ? ">" : ""}${shortName}`, x + Math.floor(chipWidth / 2), 14, active ? "#fff0ca" : "#ded6e6", 5, "center");
  });
}

function drawCombatRoleIcon(role, x, y, size = 8) {
  const index = COMBAT_ROLE_ICON_INDEX[role] ?? COMBAT_ROLE_ICON_INDEX.hybrid;
  if (!combatRoleIconSheet) {
    drawRect(x, y, size, size, "#34273f");
    return;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    combatRoleIconSheet.image,
    index * combatRoleIconSheet.cellWidth,
    0,
    combatRoleIconSheet.cellWidth,
    combatRoleIconSheet.cellHeight,
    x,
    y,
    size,
    size
  );
  ctx.restore();
}

function drawCompactRosterName(name, x, y, maxWidth) {
  let size = 4;
  ctx.font = `${size}px monospace`;
  while (size > 3 && ctx.measureText(name).width > maxWidth) {
    size--;
    ctx.font = `${size}px monospace`;
  }
  drawText(name, x, y, "#f7e5bf", size);
}

function drawBattleRoleRoster(units, enemySide = false) {
  const width = 69;
  const rowHeight = 9;
  const x = enemySide ? LOGICAL_WIDTH - width - 3 : 3;
  const y = 22;
  const height = 4 + units.length * rowHeight;
  drawRect(x, y, width, height, "#090a11df");
  drawRect(x, y, width, 1, enemySide ? "#a15446" : "#d8b06b");
  units.forEach((unit, index) => {
    const rowY = y + 3 + index * rowHeight;
    drawCombatRoleIcon(combatRoleKey(unit, enemySide), x + 2, rowY, 7);
    drawCompactRosterName(unit.name || unit.id, x + 11, rowY + 6, 28);
    drawText(String(Math.max(0, Math.round(unit.hp || 0))), x + 55, rowY + 6, enemySide ? "#ef7867" : "#f0b354", 4, "right");
    drawText(String(Math.max(0, Math.round(unit.mp || 0))), x + 67, rowY + 6, enemySide ? "#70a8d6" : "#a98ee8", 4, "right");
  });
}

function drawBattleRoleRosters() {
  if (!battle) return;
  drawBattleRoleRoster(battle.party, false);
  drawBattleRoleRoster(battle.enemies, true);
}

function drawBattleScene() {
  statusHoverAreas = [];
  const map = currentMap();
  const arenaId = battleArenaFor(map);
  const background = battleImages[arenaId];
  if (background) drawBattleBackground(background, arenaId);
  else drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, "#17212a");
  drawRect(0, 0, LOGICAL_WIDTH, BATTLE_ARENA_HEIGHT, "#07101a24");

  const turn = currentTurn();
  const target = selectedBattleEnemy();

  battle.party.forEach((unit, index) => {
    const [anchorX, baseline] = partyBattlePosition(index, battle.party.length);
    const down = unit.hp <= 0 || unit.down;
    if (down) markBattleUnitDown(unit);
    const hasTurn = !down && turn?.side === "party" && turn.id === unit.id;
    if (hasTurn) drawBattleGroundMarker(anchorX, baseline, "turn");
    drawFieldShadow(anchorX, baseline + 1, unit.id === "Torren" ? 14 : 10);
    const drawUnit = () => {
      ctx.save();
      if (down) {
        const deathFade = Math.min(1, Math.max(0, (tick - (Number.isFinite(unit.deathTick) ? unit.deathTick : tick)) / (BATTLE_DEATH_FRAME_TICKS * 4)));
        ctx.globalAlpha = 1 - deathFade * .22;
        ctx.filter = `grayscale(${deathFade * .7}) brightness(${1 - deathFade * .2})`;
      }
      const x = anchorX + battleOffset(unit);
      if (!drawBattlePartySprite(unit, x, baseline, tick)) drawSprite(unit.id, x - 24, baseline - 52, 0, unit.anim || "idle", tick);
      ctx.restore();
    };
    if (hasTurn) drawWithTurnOutline(drawUnit, "#fff0bd");
    else drawUnit();
    drawBattleVitals(unit, anchorX, baseline);
  });

  battle.enemies.forEach((enemyUnit, index) => {
    const animatedDeath = Boolean(enemyAnimationSheetFor(enemyUnit));
    if (enemyUnit.hp <= 0 && !enemyUnit.defeatUntil) {
      enemyUnit.anim = "death";
      enemyUnit.deathTick = tick;
      enemyUnit.defeatUntil = tick + (animatedDeath ? 30 : 12);
    }
    if (enemyUnit.hp <= 0 && tick >= enemyUnit.defeatUntil && battle.phaseTransition?.step !== "fallen") return;
    const [anchorX, baseline] = enemyBattlePosition(index, battle.enemies.length);
    if (enemyUnit.hp <= 0 && !animatedDeath) ctx.globalAlpha = Math.max(0, (enemyUnit.defeatUntil - tick) / 12);
    const hasTurn = turn?.side === "enemy" && turn.index === index;
    if (hasTurn) drawBattleGroundMarker(anchorX, baseline, "turn");
    if (target === enemyUnit) drawBattleGroundMarker(anchorX, baseline, "target");
    drawFieldShadow(anchorX, baseline + 1, enemySpriteIndex(enemyUnit.sprite || enemyUnit.name) >= 6 ? 15 : 11);
    const drawUnit = () => drawEnemy(enemyUnit, anchorX - 8 + battleOffset(enemyUnit), baseline - 31);
    if (hasTurn) drawWithTurnOutline(drawUnit, "#ffc08a");
    else drawUnit();
    drawEnemyBreakIcon(enemyUnit, anchorX);
    drawBattleVitals(enemyUnit, anchorX, baseline + (battle.hallStage === 50 ? 8 : 0), true);
    ctx.globalAlpha = 1;
  });
  drawEffect();
  drawBattleTurnRail();
  drawBattleRoleRosters();
  drawBattleFloaters();
  updateStatusTooltip();
  if (battle.phaseTransition?.step === "incoming") {
    const phase = battle.phaseTransition;
    drawRect(0, 19, LOGICAL_WIDTH, BATTLE_ARENA_HEIGHT - 19, "#090a15d9");
    drawRect(28, 48, LOGICAL_WIDTH - 56, 100, "#17121fef");
    drawRect(28, 48, LOGICAL_WIDTH - 56, 2, "#d9ae65");
    drawText(`PHASE ${phase.number}/${phase.total}`, LOGICAL_WIDTH / 2, 69, "#f4c776", 8, "center");
    phase.enemies.forEach((unit, index) => {
      const name = unit.finalState === "enraged" ? `${unit.name} / Enraged` : unit.name;
      const rowY = 80 + index * 17;
      drawCombatRoleIcon(combatRoleKey(unit, true), LOGICAL_WIDTH / 2 - 43, rowY, 13);
      drawCompactRosterName(name, LOGICAL_WIDTH / 2 - 26, rowY + 9, 66);
    });
    drawText("CLICK TO CONTINUE", LOGICAL_WIDTH / 2, 138, "#f1d8a0", 5, "center");
  }
}

function battleArenaFor(map) {
  const hallArena = {
    28: "lantern-stage",
    40: "cinder-cataclysm"
  }[battle?.hallStage];
  if (hallArena) return hallArena;
  const locationArena = {
    lantern: "lantern-stage",
    ashLane: "cinder-terrace",
    sootMarket: "ash-quarter",
    ashDock: "cinder-sunset",
    ledgerHouse: "reverie-library",
    reverieCourt: "reverie-garden",
    reverieDorm: "reverie",
    reverieSeal: "guildspire-marble",
    reverieArchive: "reverie-library",
    guildSteps: "cinder-terrace",
    guildRegistry: "reverie-library",
    guildHall: "guildspire-marble",
    guildCouncil: "guildspire",
    emberYard: "cinder-sunset",
    emberHearth: "lantern-tavern",
    emberWorkshop: "ember-hall",
    emberArmory: "cinder-ruins",
    emberRoof: "cinder-sunset",
    emberCellar: "ember-hall",
    dawnCauseway: "fallen-dawn",
    dawnStation: "false-dawn",
    dawnGate: "cinder-ruins",
    alarm: "fallen-dawn"
  }[state.map];
  if (locationArena) return locationArena;
  return {
    lantern: "ash-quarter",
    ash: "ash-quarter",
    reverie: "reverie",
    guildspire: "guildspire",
    ember: "ember-hall",
    alarm: "false-dawn"
  }[map.set] || "ash-quarter";
}

function drawBattleBackground(image, arenaId) {
  const targetHeight = BATTLE_ARENA_HEIGHT;
  const sourceHeight = Math.min(image.height, Math.round(image.width * targetHeight / LOGICAL_WIDTH));
  const sourceY = Math.max(0, Math.floor((image.height - sourceHeight) / 2));
  ctx.drawImage(image, 0, sourceY, image.width, sourceHeight, 0, 0, LOGICAL_WIDTH, targetHeight);
  drawBattleAmbient(arenaId);
  drawRect(0, targetHeight, LOGICAL_WIDTH, LOGICAL_HEIGHT - targetHeight, "#11101a");
}

function drawBattleAmbient(arenaId) {
  const frame = Math.floor(tick / 8) % 3;
  const glows = {
    "ash-quarter": [[223, 55, "#f0a14b"], [31, 73, "#c86435"]],
    "cinder-terrace": [[224, 52, "#f0a14b"], [34, 69, "#d27742"]],
    "lantern-tavern": [[211, 49, "#ef983c"], [44, 54, "#f0b34e"]],
    "lantern-stage": [[214, 47, "#ef983c"], [45, 59, "#f3bd62"]],
    "cinder-sunset": [[214, 43, "#f09b4a"], [123, 52, "#f2c176"]],
    "cinder-ruins": [[218, 49, "#df6734"], [48, 65, "#f09a45"]],
    "cinder-cataclysm": [[215, 45, "#f06b35"], [43, 61, "#ffc064"]],
    "reverie": [[205, 47, "#c382f2"], [51, 63, "#704fc3"]],
    "reverie-garden": [[207, 51, "#d0a3e9"], [48, 63, "#f1c079"]],
    "reverie-library": [[207, 49, "#8fcbe0"], [49, 61, "#e7c475"]],
    "guildspire": [[33, 45, "#f4cf73"]],
    "guildspire-marble": [[214, 47, "#d8edff"], [35, 56, "#f4cf73"]],
    "ember-hall": [[202, 48, "#ef8b38"], [46, 56, "#f0b34e"]],
    "false-dawn": [[213, 45, "#d9a04d"], [122, 67, "#7cd0d8"]],
    "fallen-dawn": [[214, 47, "#d9a04d"], [121, 61, "#cdd9e3"]]
  }[arenaId] || [];
  if (!glows.length) return;
  const active = glows[(Math.floor(tick / 24) + frame) % glows.length];
  const [x, y, colour] = active;
  drawRect(x, y - frame, 2, 2 + frame, colour);
  if (frame === 2) drawRect(x - 1, y + 1, 4, 1, "#fff0b0aa");
}

function battleOffset(u) {
  if (!u.flash) return 0;
  u.flash--;
  return Math.sin(tick * 2.4) * 3;
}

function drawNpcBattleEnemy(e, px, py) {
  const id = e.sprite || e.name;
  const sheet = npcBattleSheets[id] || animationSheets[id];
  if (!sheet || !animatedNpcFiles[id]) return false;
  const attacking = e.anim === "attack";
  const row = attacking
    ? (sheet.battleOnly ? 1 : e.attackStyle === "magic" ? (sheet.rows >= 7 ? 6 : sheet.rows >= 6 ? 5 : 0) : (sheet.rows >= 7 ? 4 : sheet.rows >= 6 ? 3 : 0))
    : 0;
  const duration = 24;
  const progress = attacking ? Math.min(1, (e.animTick || 0) / duration) : 0;
  const col = attacking
    ? Math.min(sheet.columns - 1, Math.floor(progress * sheet.columns))
    : [0, 0, Math.min(3, sheet.columns - 1), 0][Math.floor((tick + id.length * 3) / 16) % 4];
  const targetHeight = Math.round((animatedNpcHeights[id] || 26) * 1.9 * BATTLE_COMPOSITION_SCALE);
  const scale = targetHeight / Math.max(1, sheet.referenceHeight);
  const source = animationFrameRect(sheet, col, row);
  const sourceWidth = source.w;
  const sourceHeight = source.h;
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const lunge = attacking ? Math.round(Math.sin(progress * Math.PI) * 7) : 0;
  const anchorX = px + 8 - lunge;
  const baseline = py + 31 + (!attacking && Math.floor(tick / 18) % 3 === 1 ? -1 : 0);
  const destX = Math.round(anchorX - width / 2);
  const destY = Math.round(baseline - (sourceHeight - 2) * scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.image, source.x, source.y, sourceWidth, sourceHeight, destX, destY, width, height);
  ctx.restore();
  if (attacking && e.lastAnimDrawTick !== tick) {
    e.animTick = (e.animTick || 0) + 1;
    e.lastAnimDrawTick = tick;
  }
  return true;
}

function enemyAnimationKey(e) {
  if (battle?.hallStage === 50 && e.finalState === "enraged" && enemyAnimationSheets["Solinar Enraged"]) return "Solinar Enraged";
  if (enemyAnimationFiles[e.name]) return enemyAnimationFiles[e.name];
  if (enemyAnimationFiles[e.sprite]) return enemyAnimationFiles[e.sprite];
  return null;
}

function enemyAnimationSheetFor(e) {
  const key = enemyAnimationKey(e);
  return key ? enemyAnimationSheets[key] : null;
}

function drawAnimatedEnemy(e, px, py) {
  const key = enemyAnimationKey(e);
  const sheet = key ? enemyAnimationSheets[key] : null;
  if (!sheet) return false;
  const dying = e.hp <= 0 || e.anim === "death";
  const attacking = e.anim === "attack";
  const animation = dying
    ? "death"
    : attacking
      ? (e.attackStyle === "ultimate" && sheet.rowMap?.ultimate !== undefined ? "ultimate" : e.attackStyle === "melee" ? "melee" : "magic")
      : "idle";
  const row = sheet.rowMap?.[animation] ?? sheet.rowMap?.idle ?? 0;
  const sequence = sheet.frameSequences?.[animation] || [0, 1, 2, 3, 4];
  let sequenceIndex = Math.floor((tick + key.length * 3) / 18) % sequence.length;
  if (attacking) sequenceIndex = Math.min(sequence.length - 1, Math.floor(Math.min(24, e.animTick || 0) / 5));
  if (dying) sequenceIndex = Math.min(sequence.length - 1, Math.floor(Math.max(0, tick - (e.deathTick || tick)) / 5));
  const column = Math.max(0, Math.min(sheet.columns - 1, sequence[sequenceIndex] ?? 0));
  const targetHeight = (enemyAnimationHeights[key] || 46) * enemyBattleScale(key) * BATTLE_COMPOSITION_SCALE;
  const anchorX = px + 8;
  const baseline = py + 31;
  const scale = Math.min(
    targetHeight / Math.max(1, sheet.referenceHeight),
    (baseline - 2) / Math.max(1, sheet.baseline),
    (LOGICAL_WIDTH - 4) / Math.max(1, sheet.cellWidth)
  );
  const width = Math.max(1, Math.round(sheet.cellWidth * scale));
  const height = Math.max(1, Math.round(sheet.cellHeight * scale));
  const destX = Math.max(2, Math.min(LOGICAL_WIDTH - width - 2, Math.round(anchorX - width / 2)));
  const destY = Math.max(2, Math.round(baseline - sheet.baseline * scale));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet.image,
    column * sheet.cellWidth,
    row * sheet.cellHeight,
    sheet.cellWidth,
    sheet.cellHeight,
    destX,
    destY,
    width,
    height
  );
  ctx.restore();
  if (attacking && e.lastAnimDrawTick !== tick) {
    e.animTick = (e.animTick || 0) + 1;
    e.lastAnimDrawTick = tick;
  }
  return true;
}

function drawEnemy(e, px, py) {
  if (drawAnimatedEnemy(e, px, py)) return;
  if (drawNpcBattleEnemy(e, px, py)) return;
  const index = enemySpriteIndex(e.sprite || e.name);
  const source = e.anim === "attack" && enemyAttackSheet ? enemyAttackSheet : enemySheet;
  if (!source || !enemySheet) return;
  const cell = source.cells[index];
  const idleCell = enemySheet.cells[index];
  const row = Math.floor(index / 3);
  const col = index % 3;
  const boss = index >= 6;
  const construct = index === 4 || index === 5;
  const scale = BATTLE_COMPOSITION_SCALE;
  const rowTop = Math.floor(row * source.image.height / 3);
  const idleRowTop = Math.floor(row * enemySheet.image.height / 3);
  const cellLeft = Math.floor(col * source.image.width / 3);
  const cellRight = Math.floor((col + 1) * source.image.width / 3);
  const sourceCenterX = cellLeft + (cellRight - cellLeft) / 2;
  const idleBaseline = idleCell.y + idleCell.h - idleRowTop;
  const action = e.anim === "attack" ? Math.sin((Math.min(24, e.animTick || 0) / 24) * Math.PI) : 0;
  const bob = e.anim === "idle" && Math.floor(tick / 16) % 3 === 1 ? -1 : 0;
  const anchorX = px + 8 - Math.round(action * 7);
  const baseline = py + 31 + bob;
  const destX = Math.round(anchorX + (cell.x - sourceCenterX) * scale);
  const destY = Math.round(baseline + (cell.y - (rowTop + idleBaseline)) * scale);
  ctx.drawImage(source.image, cell.x, cell.y, cell.w, cell.h, destX, destY, Math.round(cell.w * scale), Math.round(cell.h * scale));
  if (e.anim === "attack") e.animTick = (e.animTick || 0) + 1;
}

function drawEffect() {
  if (!effect) return;
  if (effect.characterVfx) {
    effect.t++;
    drawCharacterVfx(effect);
    if (performance.now() - effect.startedAt > effect.timing.totalMs) effect = null;
    return;
  }
  effect.t++;
  const x = effect.toX ?? effect.x;
  const y = effect.toY ?? effect.y;
  if (effect.kind === "melee") {
    const progress = Math.min(1, effect.t / (effect.impactTicks || 24));
    const sweep = Math.round((1 - progress) * 22);
    drawRect(x - sweep - 12, y - 8, 24, 3, "#fff0bc");
    drawRect(x - Math.round(sweep * .6) - 9, y - 2, 18, 2, "#e07136");
  }
  if (effect.kind === "block") {
    ctx.strokeStyle = "#f5d68b";
    for (let i = 0; i < 3; i++) ctx.strokeRect(x - 12 - i * 3, y - 20 - i * 3, 24 + i * 6, 28 + i * 6);
  }
  if (effect.kind === "magic") {
    drawCharacterProjectile(effect);
  }
  if (effect.kind === "ultimate") {
    drawUltimateEffect(effect);
  }
  if (effect.t > (effect.duration || 24)) effect = null;
}

function enemyAbilityProfile(unit) {
  if (unit?.finalState === "enraged") return enemyAbilityProfiles["Solinar Enraged"];
  return enemyAbilityProfiles[unit?.name] || enemyAbilityProfiles[unit?.sprite] || null;
}

function echoProjectileCell(row, col) {
  if (!echoProjectileSheet) return null;
  const x = Math.floor(col * echoProjectileSheet.width / 4);
  const y = Math.floor(row * echoProjectileSheet.height / 8);
  const right = Math.floor((col + 1) * echoProjectileSheet.width / 4);
  const bottom = Math.floor((row + 1) * echoProjectileSheet.height / 8);
  return { x, y, w: right - x, h: bottom - y };
}

function drawEchoEnemyProjectile(fx) {
  if (!fx.enemyCaster || !Number.isFinite(fx.effectRow) || !echoProjectileSheet) return false;
  const impactTick = fx.impactTicks || 38;
  const travelling = fx.t <= impactTick;
  const point = travelling ? effectTravelPoint(fx) : { x: fx.toX, y: fx.toY };
  const progress = Math.min(1, fx.t / impactTick);
  const col = travelling ? (progress < .55 ? 0 : 1) : 2;
  const cell = echoProjectileCell(fx.effectRow, col);
  const width = travelling ? 46 : 62;
  const height = Math.round(width * cell.h / cell.w);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(echoProjectileSheet, cell.x, cell.y, cell.w, cell.h, Math.round(point.x - width / 2), Math.round(point.y - height / 2), width, height);
  ctx.restore();
  return true;
}

function drawEchoEnemyUltimate(fx) {
  if (!fx.enemyCaster || !Number.isFinite(fx.effectRow) || !echoProjectileSheet) return false;
  const cell = echoProjectileCell(fx.effectRow, 3);
  const pulse = Math.floor(fx.t / 7) % 2;
  const width = 104 + pulse * 8;
  const height = Math.round(width * cell.h / cell.w);
  drawRect(0, 0, LOGICAL_WIDTH, BATTLE_ARENA_HEIGHT, fx.t % 10 < 4 ? `${fx.color}22` : "#08081244");
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(echoProjectileSheet, cell.x, cell.y, cell.w, cell.h, Math.round((fx.toX ?? 82) - width / 2), Math.round((fx.toY ?? 92) - height / 2), width, height);
  ctx.restore();
  return true;
}

function effectTravelPoint(fx, lag = 0) {
  const progress = Math.max(0, Math.min(1, fx.t / (fx.impactTicks || 22) - lag));
  const eased = progress * progress * (3 - 2 * progress);
  return {
    x: Math.round((fx.fromX ?? 62) + ((fx.toX ?? fx.x) - (fx.fromX ?? 62)) * eased),
    y: Math.round((fx.fromY ?? 100) + ((fx.toY ?? fx.y) - (fx.fromY ?? 100)) * eased - Math.sin(progress * Math.PI) * 11)
  };
}

function drawCharacterProjectile(fx) {
  if (drawEchoEnemyProjectile(fx)) return;
  const point = effectTravelPoint(fx);
  for (let i = 1; i <= 3; i++) {
    const trail = effectTravelPoint(fx, i * .07);
    drawRect(trail.x - 1, trail.y - 1, 2, 2, i === 1 ? fx.color : "#ffffff88");
  }
  const x = point.x;
  const y = point.y;
  const direction = Math.sign((fx.toX ?? 198) - (fx.fromX ?? 62)) || 1;
  if (fx.caster === "Verseborn") {
    drawRect(x, y - 5, 2, 7, "#f1cf78");
    drawRect(x + direction * 2, y - 5, 4, 2, "#f1cf78");
    drawRect(x - 2, y + 1, 4, 3, "#c694ff");
    drawRect(x - direction * 6, y - 1, 3, 1, "#c694ff");
  } else if (fx.caster === "Mira") {
    drawRect(x - direction * 5, y - 4, 10, 2, "#a56dff");
    drawRect(x - direction * 4, y + 3, 9, 2, "#6840c7");
    drawRect(x + direction * 4, y - 5, 2, 4, "#fff2ff");
    drawRect(x + direction * 4, y + 2, 2, 4, "#e4c8ff");
  } else if (fx.caster === "Seerin") {
    drawRect(x - 5, y - 1, 11, 3, "#d04b31");
    drawRect(x - 1, y - 5, 3, 11, "#f3b44e");
    drawRect(x, y, 2, 2, "#fff4c0");
    drawRect(x - direction * 8, y, 4, 2, "#9c2d27");
  } else if (fx.caster === "Kael") {
    ctx.strokeStyle = "#fff0bf";
    ctx.strokeRect(x - 5, y - 5, 10, 10);
    ctx.strokeStyle = "#d8b06b";
    ctx.strokeRect(x - 2, y - 7, 4, 14);
    drawRect(x - 1, y - 1, 3, 3, "#ffffff");
  } else if (fx.caster === "Torren") {
    drawRect(x - 5, y - 3, 6, 6, "#8b6843");
    drawRect(x, y - 5, 5, 5, "#d28a45");
    drawRect(x + direction * 5, y + 2, 4, 4, "#5e4434");
    drawRect(x - 2, y - 2, 2, 2, "#f0a54b");
  } else if (fx.caster === "Glimmer") {
    drawRect(x - 5, y - 5, 11, 11, "#4c9e98");
    drawRect(x - 7, y - 2, 15, 5, "#b7823f");
    drawRect(x - 2, y - 7, 5, 15, "#b7823f");
    drawRect(x - 2, y - 2, 5, 5, "#9df4e6");
  } else if (fx.caster === "Sparky") {
    drawRect(x - 4, y - 4, 9, 9, "#30213e");
    drawRect(x - 2, y - 7, 5, 11, "#7f4ad1");
    drawRect(x, y - 9, 3, 7, "#c378ff");
    drawRect(x - direction * 7, y + 2, 5, 3, "#5b327d");
  } else {
    drawRect(x - 4, y - 4, 9, 9, fx.color);
    drawRect(x - 1, y - 1, 3, 3, "#ffffff");
  }
  const impactTick = fx.impactTicks || 22;
  if (fx.t > impactTick) {
    const burst = Math.min(10, fx.t - impactTick);
    for (let i = 0; i < 6; i++) {
      const dx = ((i % 3) - 1) * (burst + 2);
      const dy = (Math.floor(i / 3) * 2 - 1) * (burst + 1);
      drawRect((fx.toX ?? x) + dx, (fx.toY ?? y) + dy, 2, 2, i % 2 ? fx.color : "#fff0c0");
    }
  }
}

function drawUltimateEffect(fx) {
  if (drawEchoEnemyUltimate(fx)) return;
  drawRect(0, 0, LOGICAL_WIDTH, BATTLE_ARENA_HEIGHT, fx.t % 8 < 3 ? "#ffffff22" : "#09091255");
  if (fx.caster === "Torren") {
    for (let i = 0; i < 12; i++) drawRect(12 + i * 22, 139 - ((tick + i * 5) % 16), 6, 12, i % 2 ? "#8b6843" : "#d87536");
  } else if (fx.caster === "Glimmer") {
    for (let i = 0; i < 9; i++) {
      const px = 24 + i * 27;
      const py = 38 + (i % 3) * 32;
      ctx.strokeStyle = i % 2 ? "#7bd4c6" : "#b9823e";
      ctx.strokeRect(px - 5, py - 5, 10, 10);
      drawRect(px - 1, py - 1, 3, 3, "#fff2c4");
    }
  } else if (fx.caster === "Mira") {
    for (let i = 0; i < 14; i++) drawRect(74 + ((i * 19 + tick * 5) % 176), 28 + (i * 13) % 115, 10, 2, i % 2 ? "#a56dff" : "#ffffff");
  } else if (fx.caster === "Seerin" || fx.caster === "Kael") {
    const colour = fx.caster === "Seerin" ? "#f3b44e" : "#fff0bf";
    drawRect(126, 18, 5, 128, colour);
    drawRect(70, 74, 117, 5, colour);
    for (let i = 0; i < 12; i++) drawSpark(36 + i * 17, 34 + (i % 4) * 27, colour, tick + i);
  } else if (fx.caster === "Sparky") {
    for (let i = 0; i < 16; i++) drawSpark(18 + i * 15, 142 - ((tick * 2 + i * 11) % 95), i % 3 ? "#7f4ad1" : "#c378ff", tick + i);
  } else {
    for (let i = 0; i < 18; i++) {
      const px = (i * 31 + tick * 3) % LOGICAL_WIDTH;
      const py = 30 + ((i * 17 + tick) % 115);
      drawRect(px, py, 2, 6, i % 2 ? fx.color : "#f1cf78");
      drawRect(px - 2, py + 4, 4, 3, fx.color);
    }
  }
}

function drawAtlas() {
  drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, "#9eb3b3");
  const animations = ["idle", "walk", "melee", "block", "magic", "ultimate"];
  const activeAnimation = animations[Math.floor(tick / 90) % animations.length];
  drawText("ANIMATION ATLAS", 8, 14, "#1b2026", 9);
  drawText(activeAnimation.toUpperCase(), 248, 14, "#613b63", 9, "right");
  const ids = ["Verseborn", "Mira", "Seerin", "Kael", "Torren", "Glimmer", "Sparky"];
  ids.forEach((id, index) => {
    const row = index < 4 ? 0 : 1;
    const col = row === 0 ? index : index - 4;
    const x = 8 + col * 62;
    const y = 27 + row * 93;
    drawSprite(id, x + 23, y, col % 2, activeAnimation, tick + index * 2);
    drawText(id, x + 31, y + 67, "#20202a", 7, "center");
  });
  drawText("TAB: RETURN", 248, 214, "#20202a", 7, "right");
}

function drawMenuBack() {
  drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, "#111016");
  drawText("MENU", 12, 18, "#ffd27d", 12);
  state.activeParty.forEach((id, i) => {
    drawSprite(id, 8 + i * 34, 56, 0, "idle", tick + i * 3);
  });
}

function draw(now = performance.now()) {
  if (mode !== 'battle' && statusTooltip) statusTooltip.hidden = true;
  tick++;
  syncResponsiveMode();
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  if (mode !== "walk") fieldDestination = null;
  if (mode === "walk" && heldDirection && tick >= nextHeldMove) {
    handleControl(heldDirection);
    nextHeldMove = tick + PLAYER_STEP_TICKS;
  }
  if (mode === "walk" && !heldDirection && fieldDestination && tick >= nextFieldMove) advanceFieldDestination();
  if (mode === "walk") updateFieldEnemies();
  if (mode === "title") drawTitle(now);
  else if (mode === "atlas") drawAtlas();
  else if (mode === "battle" || mode === "battleResult") drawBattleScene();
  else if (mode === "menu") drawMenuBack();
  else drawTileMap();
  requestAnimationFrame(draw);
}

function updatePanels() {
  refreshHeroVitals();
  const q = currentQuest();
  const objective = objectiveTarget();
  const map = currentMap();
  if (state.gameMode === "hallBattles") {
    const progress = hallBattleProgress();
    const activeStage = battle?.hallStage || progress.unlockedStage;
    el.chapter.textContent = "Ember Hall Battle";
    el.place.textContent = mode === "battle" ? `${map.name} / Stage ${activeStage}` : "Ember Hall - Trial Room";
    el.questTitle.textContent = `Trial Gate ${progress.clearedStages.length}/${HALL_BATTLE_BLUEPRINTS.length}`;
    el.questText.textContent = progress.pendingRecruit ? "Choose a new Flameguard recruit." : `Next: ${objective.label}.`;
    el.beatTitle.textContent = `Stage ${progress.unlockedStage} Available`;
    el.beatText.textContent = "Cleared battle records remain open for normal XP.";
  } else {
    el.chapter.textContent = map.chapter;
    el.place.textContent = `${map.name} / ${zoneLevelText(state.map)}`;
    el.questTitle.textContent = q ? q[0] : "No active quest";
    el.questText.textContent = q ? `Next: ${objective.label}.` : "Speak with Marla at the counter.";
    el.beatTitle.textContent = map.beat[0];
    el.beatText.textContent = map.beat[1];
  }
  el.resonanceBar.style.width = `${Math.min(100, state.resonance)}%`;
  el.gold.textContent = `${state.gold} G`;
  el.partyPanel.innerHTML = state.activeParty.map(id => {
    const h = baseJobs[id], t = totals(id);
    const progress = progressFor(id);
    const combatUnit = battle?.party?.find(unit => unit.id === id);
    const hp = combatUnit ? combatUnit.hp : h.hp;
    const down = hp <= 0;
    return `<div class="hero-row ${down ? "is-down" : ""}"><span class="dot" style="background:${h.color}"></span><strong>${h.name}<small>LV ${progress.level} / ${h.title} / STR ${t.str} AGI ${t.agi} MAG ${t.mag} STAM ${t.stam}</small></strong><span>${hp}/${t.max}</span></div>`;
  }).join("");
  updateSkillPointNotice();
  queueSave();
}

function updateCodex() {
  const [name, file] = codex[codexIndex];
  el.codexImage.src = `assets/${file}`;
  el.codexName.textContent = name;
}

function terrainPassable(x, y, mapId = state.map) {
  if (x < 1 || x > 14 || y < 1 || y > 12) return false;
  const map = maps[mapId];
  const paths = map.panorama ? map.walkable : (fieldPathMasks[mapId] || map.walkable);
  const nearPanoramaExit = map.panorama && map.exits.some(exit => Math.abs(x - exit.x) <= 1 && Math.abs(y - exit.y) <= 1);
  if (!nearPanoramaExit && paths && !paths.some(([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2)) return false;
  if (!map.panorama && (collisionMasks[map.collision || mapId] || []).some(([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2)) return false;
  return true;
}

function nearestMapEntry(mapId, preferredX, preferredY) {
  return nearestMapTile(mapId, preferredX, preferredY);
}

function nearestMapTile(mapId, preferredX, preferredY, accepts = () => true) {
  const startX = Math.max(1, Math.min(14, Number.isFinite(preferredX) ? preferredX : 8));
  const startY = Math.max(1, Math.min(12, Number.isFinite(preferredY) ? preferredY : 8));
  if (terrainPassable(startX, startY, mapId) && accepts(startX, startY)) return { x: startX, y: startY };
  for (let radius = 1; radius <= 13; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
        const x = startX + dx;
        const y = startY + dy;
        if (terrainPassable(x, y, mapId) && accepts(x, y)) return { x, y };
      }
    }
  }
  return { x: 8, y: 8 };
}

function sanitizeWorldSpawns() {
  Object.entries(maps).forEach(([mapId, map]) => {
    const reserved = new Set([
      ...map.points.map(pointData => fieldTileKey(pointData.x, pointData.y)),
      ...map.exits.map(exit => fieldTileKey(exit.x, exit.y))
    ]);
    const occupied = new Set();
    (map.spawns || []).forEach(spawnPoint => {
      const accepts = (x, y) => !reserved.has(fieldTileKey(x, y)) && !occupied.has(fieldTileKey(x, y));
      const safe = nearestMapTile(mapId, spawnPoint.x, spawnPoint.y, accepts);
      spawnPoint.x = safe.x;
      spawnPoint.y = safe.y;
      spawnPoint.renderX = safe.x * TILE;
      spawnPoint.renderY = safe.y * TILE;
      occupied.add(fieldTileKey(safe.x, safe.y));
      if (!terrainPassable(spawnPoint.homeX, spawnPoint.homeY, mapId) || reserved.has(fieldTileKey(spawnPoint.homeX, spawnPoint.homeY))) {
        spawnPoint.homeX = safe.x;
        spawnPoint.homeY = safe.y;
      }
    });
  });
}

function passable(x, y) {
  if (!terrainPassable(x, y)) return false;
  if (visiblePoints().some(p => p.x === x && p.y === y)) return false;
  return !visibleSpawns().some(spawnPoint => Math.abs(spawnPoint.x - x) <= (spawnPoint.boss ? 1 : 0) && Math.abs(spawnPoint.y - y) <= (spawnPoint.boss ? 1 : 0));
}

function exitAtPosition(x, y) {
  return currentMap().exits.find(exit => {
    if (exit.needs && !state.flags[exit.needs]) return false;
    const direction = exitDirection(exit);
    if (direction === "left" || direction === "right") return x === exit.x && Math.abs(y - exit.y) <= 1;
    return y === exit.y && Math.abs(x - exit.x) <= 1;
  });
}

function enemyCanOccupy(spawnPoint, x, y, activeSpawns) {
  if (!terrainPassable(x, y)) return false;
  if (currentMap().exits.some(exit => exit.x === x && exit.y === y)) return false;
  if (visiblePoints().some(point => point.x === x && point.y === y)) return false;
  if (activeSpawns.some(other => other !== spawnPoint && other.x === x && other.y === y)) return false;
  return !(state.x === x && state.y === y);
}

function beginFieldEncounter(encounter) {
  if (!encounter || mode !== "walk") return false;
  heldDirection = null;
  fieldDestination = null;
  const enemies = encounter.enemies.map(unit => ({ ...unit, hp: unit.max, stagger: 0, anim: "idle", animTick: 0 }));
  const launch = () => startBattle(encounter.name, enemies, undefined, encounter);
  if (encounter.boss) showBossIntro(encounter.name, enemies[0], launch);
  else launch();
  return true;
}

function updateFieldEnemies() {
  const activeSpawns = visibleSpawns();
  for (const spawnPoint of activeSpawns) {
    const distance = Math.abs(spawnPoint.x - state.x) + Math.abs(spawnPoint.y - state.y);
    if (distance <= 1 && beginFieldEncounter(spawnPoint)) return;
    if (spawnPoint.behavior === "guard" || tick < spawnPoint.nextMoveTick) continue;

    const chasing = spawnPoint.behavior === "chase" && distance <= 5;
    spawnPoint.nextMoveTick = tick + (chasing ? 24 : 48 + spawnPoint.phase % 18);
    const dx = state.x - spawnPoint.x;
    const dy = state.y - spawnPoint.y;
    let directions;
    if (chasing) {
      const horizontal = [Math.sign(dx), 0];
      const vertical = [0, Math.sign(dy)];
      directions = Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal];
    } else {
      const patrol = [[1, 0], [0, 1], [-1, 0], [0, -1], [0, 0]];
      const index = (Math.floor(tick / 48) + spawnPoint.phase) % patrol.length;
      directions = [patrol[index], patrol[(index + 1) % patrol.length]];
    }

    for (const [stepX, stepY] of directions) {
      if (!stepX && !stepY) break;
      const nextX = spawnPoint.x + stepX;
      const nextY = spawnPoint.y + stepY;
      if (nextX === state.x && nextY === state.y) {
        beginFieldEncounter(spawnPoint);
        return;
      }
      if (!enemyCanOccupy(spawnPoint, nextX, nextY, activeSpawns)) continue;
      spawnPoint.x = nextX;
      spawnPoint.y = nextY;
      break;
    }
  }
}

function move(dx, dy, facing) {
  if (mode !== "walk") return false;
  state.facing = facing;
  const nx = state.x + dx, ny = state.y + dy;
  const exit = exitAtPosition(nx, ny);
  if (exit) {
    const from = currentMap();
    state.map = exit.to;
    const entry = nearestMapEntry(exit.to, exit.tx, exit.ty);
    state.x = entry.x;
    state.y = entry.y;
    state.renderX = state.x * TILE;
    state.renderY = state.y * TILE;
    screenSlide = { from, to: currentMap(), dx: Math.sign(dx), dy: Math.sign(dy), t: 0 };
    mode = "transition";
    discoverMap(state.map);
    checkSideQuestMap(state.map);
    updatePanels();
    updateMusic();
    return true;
  }
  const encounter = visibleSpawns().find(spawnPoint => spawnPoint.boss
    ? Math.abs(spawnPoint.x - nx) <= 1 && Math.abs(spawnPoint.y - ny) <= 1
    : spawnPoint.x === nx && spawnPoint.y === ny);
  if (encounter) {
    beginFieldEncounter(encounter);
    return true;
  }
  if (passable(nx, ny)) {
    state.x = nx;
    state.y = ny;
    state.walkUntil = tick + PLAYER_STEP_TICKS;
    queueSave();
    return true;
  }
  return false;
}

function interact() {
  unlockMusic();
  if (mode === "title") {
    activateTitleSelection();
    return;
  }
  if (mode === "talk") return nextTalk();
  if (mode !== "walk") return;
  const encounter = visibleSpawns().find(spawnPoint => Math.abs(spawnPoint.x - state.x) + Math.abs(spawnPoint.y - state.y) <= 1 + (spawnPoint.boss ? 1 : 0));
  if (encounter) return beginFieldEncounter(encounter);
  const p = visiblePoints().find(pt => Math.abs(pt.x - state.x) + Math.abs(pt.y - state.y) <= 1);
  if (p) {
    activePoint = p;
    const lines = [...pointDialogue(p), ...questPreview(p.quest)];
    const picturedSpeakers = [...new Set(lines.map(line => line[0]).filter(name => portraitSources[name]))];
    const portraits = p.recruit ? ["Verseborn", p.recruit] : picturedSpeakers.length > 1 ? picturedSpeakers.slice(0, 2) : picturedSpeakers.length ? [state.activeParty[0], picturedSpeakers[0]] : [];
    showTalk(lines, { portraits });
  }
}

function pointDialogue(p) {
  if (p.chest) {
    if (state.flags[`chest:${p.chest.id}`]) return [["Treasure Chest", "The chest is open and empty."]];
    return [["Treasure Chest", "An old field lock clicks open. Something useful survived inside."]];
  }
  const escort = questById("harlEscort");
  if (p.id === "Marla" && escort?.status === "ready") {
    return [["Marla", "Harl is home, breathing, and already trying to carry mugs. Good work."], ["Harl", "My name stayed with me the whole walk back."], ["Marla", "Then the escort is finished. Here: 125 gold and two Ash Wards, exactly as promised."]];
  }
  if (p.id === "Marla" && escort?.status === "completed") {
    return [["Marla", "Harl is home, breathing, and already carrying mugs. That means the escort is finished."], ["Harl", "My name stayed with me the whole walk back."], ["Marla", "Good. Your 125 gold and two Ash Wards are already in the ledger. The honest ledger."]];
  }
  return p.text;
}

function showTalk(lines, options = {}) {
  mode = "talk";
  updateSkillPointNotice();
  talkQueue = lines.slice();
  talkPortraits = (options.portraits || []).slice(0, 2);
  talkAfter = typeof options.after === "function" ? options.after : null;
  talkSkippable = Boolean(options.skippable);
  el.dialogueSkip.classList.toggle("hidden", !talkSkippable);
  renderDialoguePortraits();
  nextTalk();
}

function finishTalk() {
  el.dialogue.classList.add("hidden");
  el.dialogue.classList.remove("has-portraits");
  el.dialoguePortraits.classList.add("hidden");
  el.dialogueSkip.classList.add("hidden");
  mode = "walk";
  const completedPoint = activePoint;
  const after = talkAfter;
  activePoint = null;
  talkAfter = null;
  talkPortraits = [];
  talkSkippable = false;
  if (completedPoint && completedPoint.event) runEvent(completedPoint.event);
  if (completedPoint && completedPoint.quest) processQuestGiver(completedPoint.quest);
  if (completedPoint?.id === "Marla" && questById("harlEscort")?.status === "ready") completeSideQuest("harlEscort");
  if (completedPoint?.chest) openChest(completedPoint);
  if (completedPoint && completedPoint.vendor && mode === "walk") openVendor(completedPoint.vendor);
  if (after && mode === "walk") after();
  updateSkillPointNotice();
}

function skipTalk() {
  if (mode !== "talk" || !talkSkippable) return;
  talkQueue = [];
  finishTalk();
}

function applyRecruitSceneAction(action) {
  if (!activeRecruitScene || !action) return;
  [action, ...(Array.isArray(action.with) ? action.with : [])].forEach(actorAction => {
    const actor = activeRecruitScene.actors.find(entry => entry.id === actorAction.actor);
    if (!actor) return;
    if (Number.isFinite(actorAction.facing)) actor.facing = actorAction.facing;
    actor.actionDx = Number.isFinite(actorAction.dx) ? actorAction.dx : 0;
    actor.actionDy = Number.isFinite(actorAction.dy) ? actorAction.dy : 0;
    if (actor.actionDx) actor.x = Math.max(24, Math.min(FIELD_WORLD_WIDTH - 24, actor.x + actor.actionDx));
    if (actor.actionDy) actor.baseline = Math.max(96, Math.min(166, actor.baseline + actor.actionDy));
    actor.anim = actorAction.anim || "idle";
    actor.emote = actorAction.emote || "";
    actor.motion = actorAction.motion || "";
    actor.effect = actorAction.effect || "";
    actor.actionStarted = tick;
    actor.actionUntil = tick + (Number.isFinite(actorAction.duration) ? actorAction.duration : actorAction.anim === "walk" ? 36 : 54);
  });
}

function nextTalk() {
  const line = talkQueue.shift();
  if (!line) return finishTalk();
  el.speaker.textContent = line[0];
  const content = line[1];
  if (content && typeof content === "object" && typeof content.html === "string") el.line.innerHTML = content.html;
  else el.line.textContent = content;
  syncDialoguePortraitForSpeaker(line[0]);
  updateDialogueSpeaker(line[0]);
  applyRecruitSceneAction(line[2]);
  el.dialogue.classList.remove("hidden");
}

function renderDialoguePortraits() {
  const portraits = talkPortraits.map(normalizeDialoguePortrait).filter(Boolean);
  const slots = [
    [el.portraitLeft, el.portraitLeftImage, el.portraitLeftName],
    [el.portraitRight, el.portraitRightImage, el.portraitRightName]
  ];
  slots.forEach(([figure, image, caption], index) => {
    const portrait = portraits[index];
    figure.classList.toggle("hidden", !portrait);
    figure.classList.toggle("is-enemy", Boolean(portrait?.enemy));
    figure.classList.remove("is-speaking");
    figure.dataset.speaker = portrait?.label || "";
    if (!portrait) return;
    image.src = portrait.src;
    image.alt = `${portrait.label} pixel-art portret`;
    caption.textContent = portrait.label;
  });
  const visible = portraits.length > 0;
  el.dialogue.classList.toggle("has-portraits", visible);
  el.dialoguePortraits.classList.toggle("hidden", !visible);
}

function normalizeDialoguePortrait(entry) {
  if (!entry) return null;
  if (typeof entry === "string" && portraitSources[entry]) {
    return { label: entry, src: portraitSources[entry], enemy: false };
  }
  if (typeof entry === "object" && entry.enemy) {
    return {
      label: entry.label || entry.enemy,
      src: enemyPortraitDataUrl(entry.enemy),
      enemy: true
    };
  }
  return null;
}

function dialoguePortraitLabel(entry) {
  if (typeof entry === "string") return entry;
  return entry?.label || entry?.enemy || "";
}

function syncDialoguePortraitForSpeaker(speaker) {
  if (!portraitSources[speaker]) return;
  if (talkPortraits.some(entry => dialoguePortraitLabel(entry) === speaker)) return;
  if (!talkPortraits.length) {
    talkPortraits = [speaker];
  } else if (talkPortraits.length === 1) {
    talkPortraits.push(speaker);
  } else {
    const protectedIndex = talkPortraits.findIndex(entry => {
      const label = dialoguePortraitLabel(entry);
      return label === "Verseborn" || state.activeParty.includes(label);
    });
    const replaceIndex = protectedIndex === 0 ? 1 : protectedIndex === 1 ? 0 : 1;
    talkPortraits[replaceIndex] = speaker;
  }
  renderDialoguePortraits();
}

function updateDialogueSpeaker(speaker) {
  [el.portraitLeft, el.portraitRight].forEach(figure => {
    figure.classList.toggle("is-speaking", figure.dataset.speaker === speaker);
  });
}

function enemyPortraitDataUrl(name) {
  if (portraitSources[name]) return portraitSources[name];
  if (bossPortraitSources[name]) return bossPortraitSources[name];
  if (enemyPortraitCache.has(name)) return enemyPortraitCache.get(name);
  const animatedEnemySheet = enemyAnimationSheets[name];
  if (animatedEnemySheet) {
    const portrait = document.createElement("canvas");
    portrait.width = 96;
    portrait.height = 96;
    const paint = portrait.getContext("2d");
    paint.imageSmoothingEnabled = false;
    paint.fillStyle = "#10111a";
    paint.fillRect(0, 0, 96, 96);
    paint.fillStyle = "#30262d";
    paint.fillRect(5, 5, 86, 86);
    paint.fillStyle = "#171822";
    paint.fillRect(8, 8, 80, 80);
    const column = animatedEnemySheet.frameSequences?.idle?.[0] || 0;
    const row = animatedEnemySheet.rowMap?.idle || 0;
    const scale = 54 / Math.max(1, animatedEnemySheet.referenceHeight);
    const width = Math.max(1, Math.round(animatedEnemySheet.cellWidth * scale));
    const height = Math.max(1, Math.round(animatedEnemySheet.cellHeight * scale));
    paint.drawImage(
      animatedEnemySheet.image,
      column * animatedEnemySheet.cellWidth,
      row * animatedEnemySheet.cellHeight,
      animatedEnemySheet.cellWidth,
      animatedEnemySheet.cellHeight,
      Math.round((96 - width) / 2),
      Math.round(85 - animatedEnemySheet.baseline * scale),
      width,
      height
    );
    paint.fillStyle = "#d8b06b";
    paint.fillRect(8, 8, 80, 2);
    paint.fillRect(8, 86, 80, 2);
    const url = portrait.toDataURL("image/png");
    enemyPortraitCache.set(name, url);
    return url;
  }
  const npcSheet = animationSheets[name];
  if (npcSheet && animatedNpcFiles[name]) {
    const portrait = document.createElement("canvas");
    portrait.width = 96;
    portrait.height = 96;
    const paint = portrait.getContext("2d");
    paint.imageSmoothingEnabled = false;
    paint.fillStyle = "#10111a";
    paint.fillRect(0, 0, 96, 96);
    paint.fillStyle = "#30262d";
    paint.fillRect(5, 5, 86, 86);
    paint.fillStyle = "#171822";
    paint.fillRect(8, 8, 80, 80);
    const source = animationFrameRect(npcSheet, 0, 0);
    const sourceWidth = source.w;
    const sourceHeight = source.h;
    const height = 76;
    const scale = height / sourceHeight;
    const width = Math.round(sourceWidth * scale);
    paint.drawImage(npcSheet.image, source.x, source.y, sourceWidth, sourceHeight, Math.round((96 - width) / 2), 86 - height, width, height);
    paint.fillStyle = "#d8b06b";
    paint.fillRect(8, 8, 80, 2);
    paint.fillRect(8, 86, 80, 2);
    const url = portrait.toDataURL("image/png");
    enemyPortraitCache.set(name, url);
    return url;
  }
  if (!enemySheet?.image) return "assets/sprites/enemies-runtime.png";
  const cell = enemySheet.cells[enemySpriteIndex(name)];
  const portrait = document.createElement("canvas");
  portrait.width = 96;
  portrait.height = 96;
  const paint = portrait.getContext("2d");
  paint.imageSmoothingEnabled = false;
  paint.fillStyle = "#10111a";
  paint.fillRect(0, 0, 96, 96);
  paint.fillStyle = "#30262d";
  paint.fillRect(5, 5, 86, 86);
  paint.fillStyle = "#171822";
  paint.fillRect(8, 8, 80, 80);
  const scale = Math.max(1, Math.min(4, Math.floor(72 / Math.max(cell.w, cell.h))));
  const width = cell.w * scale;
  const height = cell.h * scale;
  paint.drawImage(enemySheet.image, cell.x, cell.y, cell.w, cell.h, Math.floor((96 - width) / 2), 84 - height, width, height);
  paint.fillStyle = "#d8b06b";
  paint.fillRect(8, 8, 80, 2);
  paint.fillRect(8, 86, 80, 2);
  const url = portrait.toDataURL("image/png");
  enemyPortraitCache.set(name, url);
  return url;
}

function showBossIntro(title, enemyUnit, launch) {
  const bossName = title.replace(/^Miniboss:\s*/, "");
  const lines = {
    "Dock Foreman": [["Dock Foreman", "The ledger closes with your names still inside."], ["Verseborn", "Then we will write in the margins."]],
    "Archive Custodian": [["Archive Custodian", "Unauthorized lives will be returned to their assigned shelves."], ["Verseborn", "People are not paperwork. Mira, remind it sharply."]],
    "Dawn Gate Sentinel": [["Dawn Gate Sentinel", "LOCAL VERSE DENIED. CENTRAL DAWN REMAINS."], ["Verseborn", "A song that cannot change is only an alarm."]],
    "False Dawn System": [["False Dawn System", "LOCAL MEMORY REJECTED. ALL NAMES WILL RETURN TO ORDER."], ["Glimmer", "It thinks order means nobody moves."], ["Verseborn", "Then let us introduce a chorus."]]
  }[bossName] || [[bossName, "Advance is prohibited."], ["Verseborn", "That has rarely stopped us."]];
  playSfx("boss");
  const portraitKey = bossPortraitSources[bossName] ? bossName : enemyUnit.sprite || enemyUnit.name;
  showTalk(lines, {
    portraits: ["Verseborn", { enemy: portraitKey, label: bossName }],
    after: launch
  });
}

function leastOwnedGearCandidates(pool) {
  if (!pool.length) return [];
  const lowestCopyCount = Math.min(...pool.map(gear => gearCopyCount(gear.name)));
  return pool.filter(gear => gearCopyCount(gear.name) === lowestCopyCount);
}

function rollNgPlusChestReward(chestData, mapId = state.map) {
  const loop = Math.max(1, state.ngPlus);
  const pool = [
    ...ngPlusChestGear,
    ...postgameGear,
    ...ngPlusGear.filter(gear => !ngPlusSignatureNames.has(gear.name)),
    ...chestGear,
    ...rareGear
  ];
  const candidates = leastOwnedGearCandidates(pool);
  const gear = candidates[Math.floor(Math.random() * candidates.length)];
  const legendaryChance = Math.min(.9, .36 + loop * .14);
  const rarity = loop >= 4 || Math.random() < legendaryChance ? "Legendary" : "Epic";
  const itemPool = ["Emberheart Stew", "Resonance Draught", "Ash Ward"];
  if (loop >= 2) itemPool.push("Royal Ember Stew", "Grand Resonance Draught");
  const items = {};
  const itemRolls = Math.min(2, 1 + Math.floor(loop / 2));
  for (let roll = 0; roll < itemRolls; roll++) {
    const name = itemPool[Math.floor(Math.random() * itemPool.length)];
    items[name] = (items[name] || 0) + 1 + Math.floor((loop - 1) / 2);
  }
  return {
    gold: (chestData?.reward?.gold || 45) + loop * 24 + Math.floor(Math.random() * 31),
    items,
    gear: gear?.name || ngPlusChestGear[0].name,
    rarity,
    theme: lootThemeForMap(mapId)
  };
}

function openChest(pointData) {
  const chestData = pointData?.chest;
  if (!chestData || state.flags[`chest:${chestData.id}`]) return;
  chestOpenTicks[chestData.id] = tick;
  state.flags[`chest:${chestData.id}`] = true;
  const fixedReward = chestData.reward || {};
  const reward = state.ngPlus > 0 ? rollNgPlusChestReward(chestData) : { ...fixedReward, rarity: "Epic", theme: lootThemeForMap() };
  const found = [];
  if (reward.gold) {
    state.gold += reward.gold;
  }
  Object.entries(reward.items || {}).forEach(([name, amount]) => {
    const stored = addInventoryItem(name, amount);
    found.push(lootItemDrop(name, amount, stored));
  });
  if (reward.gear) {
    const rarity = reward.rarity || "Epic";
    awardGearDrop(reward.gear, rarity, found, { theme: reward.theme || lootThemeForMap(), label: state.ngPlus > 0 ? `NG+ CHEST ${rarity.toUpperCase()}` : rarity.toUpperCase() });
  }
  playSfx("item");
  updatePanels();
  showTalk([["Treasure", reward.gold || found.length ? lootSummaryContent(reward.gold || 0, found) : "The chest contains only a faded Flameguard ribbon."]]);
}

function runEvent(event) {
  if (event === "hallBattleMap") return openHallBattleMap();
  if (event === "hallRest") {
    restoreHallParty();
    showHudNotice("MARLA'S REST - party HP and MP restored");
    updatePanels();
    return;
  }
  if (state.flags[event]) return;
  state.flags[event] = true;
  if (event === "acceptIssue1") { state.quest = 0; showTalk([["Quest", "Ash Boy's First Verse accepted."], ["Marla", "Follow the marked route east. Mira is watching the Ledger Docks."]]); }
  if (event === "harbor") {
    addParty("Mira");
    startBattle("Harbor Name-Thieves", [enemy("Slobbo", 58, 9, "Sound", "#71513e", 2), enemy("Brokk", 68, 10, "Shadow", "#4a4542", 1)], "harborWon");
  }
  if (event === "issue1") { state.quest = 1; state.resonance += 12; const xp = awardPartyXp(180, "Issue 1"); showTalk([["Mira", "Next stop: Reverie. This is no longer just a dock case."], ["Progress", xp]]); }
  if (event === "clergy") { addParty("Seerin"); startBattle("Fire Clergy Assessors", [enemy("Corrupt Clergy", 74, 10, "Shadow", "#9d5436", 1), enemy("High Administrator Thaddeus", 60, 8, "Sound", "#6d5948", 2)], "clergyWon"); }
  if (event === "issue2") { addParty("Kael"); state.quest = 2; state.resonance += 15; const xp = awardPartyXp(260, "Issue 2"); showTalk([["Kael", "Faith under pressure is still faith. Obedience under pressure is only fear."], ["Progress", xp]]); }
  if (event === "registry") { state.flags.registered = true; state.resonance += 10; showTalk([["Guild Clerk", "Flameguard: provisional rank assigned."], ["Verseborn", "Provisional is official for interesting."]]); }
  if (event === "torren") { addParty("Torren"); showTalk([["Torren", "An empty chair is not a debt."]]); }
  if (event === "ravaWave") {
    activateSideQuest("ravaWave");
    startBattle("Reverie Courtyard - Wave 1", [enemy("Corrupt Clergy", 68, 10, "Shadow", "#9d5436", 1)], "ravaWaveWon", null, [
      { name: "Reverie Courtyard - Wave 2", enemies: [enemy("High Administrator Thaddeus", 62, 9, "Sound", "#6d5948", 1), enemy("High Administrator Thaddeus", 62, 9, "Sound", "#6d5948", 2)] },
      { name: "Reverie Courtyard - Wave 3", enemies: [enemy("Corrupt Clergy", 92, 13, "Tech", "#9d5436", 1), enemy("High Administrator Thaddeus", 70, 10, "Sound", "#6d5948", 2)] }
    ]);
  }
  if (event === "ember") startBattle("Ember Hall Resonance", [enemy("Gorg", 86, 12, "Earth", "#6f5540", 1), enemy("Cracked Pillar", 76, 7, "Tech", "#55473c", 2)], "emberWon");
  if (event === "sparky") { addParty("Sparky"); state.quest = 3; state.resonance += 18; const xp = awardPartyXp(360, "Issue 3"); showTalk([["Sparky", "Prrrp!"], ["Verseborn", "Tiny dragon. Ancient heart. Family."], ["Progress", xp]]); }
  if (event === "dawn") {
    addParty("Glimmer");
    const enemies = [enemy("Clock Goblin", 82, 11, "Tech", "#a66a35", 2), enemy("Lord Sprocket", 78, 10, "Earth", "#58616b", 1), enemy("Red Dragon Lord", 72, 12, "Ancient Fire", "#5a2f52", 3)];
    showBossIntro("False Dawn System", enemies[2], () => startBattle("False Dawn System", enemies, "dawnWon"));
  }
  if (event === "ending") {
    state.resonance = 100;
    state.flags.endingComplete = true;
    const xp = awardPartyXp(600, "Issue 4");
    showTalk([["Narrator", "The Flameguard is complete."], ["Glimmer", "I can improve unstable."], ["Progress", xp], ["System", "Postgame Echo Hunts and New Game Plus are now available from the System menu."]]);
  }
  if (event === "ngStonewakeTrial") {
    activateSideQuest("stonewakeTrial");
    const kaeldrin = enemy("Kaeldrin", 185, 23, "Shadow", "#d9c07b", 2, "Kaeldrin");
    const lyrsa = enemy("Lysra", 160, 25, "Tech", "#8b6ac4", 1, "Lyrsa");
    kaeldrin.levelHint = lyrsa.levelHint = 20;
    kaeldrin.npcBoss = lyrsa.npcBoss = true;
    showTalk([["Kaeldrin", "Stonewake advances at full strength."], ["Lyrsa", "Order begins with precision. Let us measure yours."], ["Verseborn", "Flameguard, second verse."]], {
      portraits: ["Kaeldrin", "Lyrsa"],
      after: () => startBattle("Stonewake Full-Rank Trial", [kaeldrin, lyrsa], "ngStonewakeWon")
    });
  }
  if (event === "ngOrphanTrial") {
    activateSideQuest("orphanTrial");
    const nyx = enemy("Nyx Vael", 145, 22, "Holy Fire", "#473c62", 1, "Nyx");
    const rava = enemy("Rava", 180, 24, "Earth", "#43685a", 2, "Rava");
    const jory = enemy("Jory Bellwick", 170, 26, "Sound", "#755247", 3, "Jory");
    [nyx, rava, jory].forEach(unit => { unit.levelHint = 20; unit.npcBoss = true; });
    showTalk([["Nyx", "The first loop supplied adequate combat data."], ["Rava", "Translation: we know your tricks."], ["Jory", "Reverie trial begins now."]], {
      portraits: ["Nyx", "Rava"],
      after: () => startBattle("Reverie Counter-Trial", [nyx, rava, jory], "ngOrphanTrialWon")
    });
  }
  updatePanels();
}

function addParty(id) {
  const newlyRecruited = !state.party.includes(id);
  const recruitLevel = averagePartyLevel();
  if (newlyRecruited) state.party.push(id);
  if (!state.activeParty.includes(id) && state.activeParty.length < 3) state.activeParty.push(id);
  if (newlyRecruited) {
    state.heroProgress[id] = {
      level: recruitLevel,
      xp: 0,
      talents: [],
      pendingMilestones: []
    };
    Object.values(baseJobs[id].gear).forEach(name => {
      addOwnedGear(name);
    });
    const total = totals(id);
    baseJobs[id].hp = total.max;
    baseJobs[id].mp = total.mp;
  }
}

function enemy(name, hp, atk, weak, color, node, sprite = null) {
  const scaledHp = Math.round(hp * 3.15);
  const scaledAtk = atk;
  const stats = {
    str: scaledAtk,
    agi: Math.max(4, Math.round(5 + node * 3 + atk * .55)),
    mag: Math.max(3, Math.round(atk * .72 + (weak === "Tech" || weak === "Sound" ? 3 : 0))),
    stam: Math.max(5, Math.round(hp / 10 + node * 2))
  };
  return { name, hp: scaledHp, max: scaledHp, baseMax: scaledHp, baseAtk: atk, baseStats: { ...stats }, atk: scaledAtk, stats, weak, color, node, sprite, level: 1, stagger: 0, row: 1, anim: "idle", animTick: 0 };
}

function prepareEnemyForBattle(source, mapId = state.map) {
  const [low, high] = zoneBandForMap(mapId);
  const hintedLevel = Math.max(1, Math.min(MAX_LEVEL, Number(source.levelHint) || 1));
  const level = source.fixedLevel ? hintedLevel : Math.max(low, Math.min(MAX_LEVEL, source.levelHint || low + Math.min(high - low, Math.max(0, (source.node || 1) - 1))));
  const ngScale = 1 + state.ngPlus * .32;
  const levelScale = 1 + Math.max(0, level - 1) * .012;
  const baseMax = source.baseMax || source.max;
  const baseAtk = source.baseAtk || source.atk;
  const max = Math.round(baseMax * ngScale * levelScale);
  const atk = Math.round(baseAtk * (1 + state.ngPlus * .22) * (1 + Math.max(0, level - 1) * .01));
  const baseStats = source.baseStats || source.stats;
  const profile = enemyAbilityProfile(source);
  const identity = profile?.identity || { str: 100, mag: 100, stam: 100, agi: 100, mp: 72 };
  const maxmp = Math.max(0, Math.round(profile?.maxMp || identity.mp || 72));
  return {
    ...source,
    hp: max,
    max,
    atk,
    level,
    xp: 14 + level * 7,
    stats: {
      str: Math.max(1, Math.round(atk * (identity.str || 100) / 100)),
      agi: Math.max(1, Math.round(((baseStats.agi || 5) + level * .45 + state.ngPlus * 3) * (identity.agi || 100) / 100)),
      mag: Math.max(1, Math.round(((baseStats.mag || 3) + level * .35 + state.ngPlus * 2) * (identity.mag || 100) / 100)),
      stam: Math.max(1, Math.round(((baseStats.stam || 5) + level * .5 + state.ngPlus * 3) * (identity.stam || 100) / 100))
    },
    mp: maxmp,
    maxmp,
    crit: profile?.crit || .08,
    baseEvasion: Math.max(0, source.baseEvasion ?? profile?.baseEvasion ?? .05),
    role: profile?.role || "fighter",
    affixes: { ...(profile?.affixes || {}) },
    stagger: 0,
    statuses: [],
    resistanceTier: source.resistanceTier || (source.npcBoss ? "boss" : source.node >= 3 ? "elite" : "normal"),
    statusChances: { ...(source.statusChances || {}) },
    anim: "idle",
    animTick: 0
  };
}

function battleUnit(id) {
  const h = baseJobs[id], t = totals(id);
  return { id, name: h.name, hp: h.hp, max: t.max, mp: h.mp, maxmp: t.mp, baseEvasion: FLAMEGUARD_BASE_EVASION[id] ?? .05, statuses: [], down: h.hp <= 0, deathTick: h.hp <= 0 ? tick : null, row: id === "Mira" || id === "Glimmer" || id === "Kael" || id === "Sparky" ? 1 : 0, anim: h.hp <= 0 ? "death" : "idle" };
}

function normalizeHallBattleProgress(progress) {
  const maxStage = HALL_BATTLE_BLUEPRINTS.length;
  const normalized = progress && typeof progress === "object"
    ? progress
    : { unlockedStage: 1, clearedStages: [], recruitStages: [], pendingRecruit: 0 };
  normalized.clearedStages = Array.isArray(normalized.clearedStages)
    ? [...new Set(normalized.clearedStages.filter(stage => Number.isInteger(stage) && stage >= 1 && stage <= maxStage))].sort((a, b) => a - b)
    : [];
  const highestCleared = normalized.clearedStages.at(-1) || 0;
  const savedUnlock = Math.max(1, Math.min(maxStage, Number(normalized.unlockedStage) || 1));
  normalized.unlockedStage = Math.min(maxStage, Math.max(savedUnlock, highestCleared + 1));
  normalized.recruitStages = Array.isArray(normalized.recruitStages)
    ? [...new Set(normalized.recruitStages.filter(stage => Number.isInteger(stage) && stage >= 1 && stage <= 40))]
    : [];
  normalized.pendingRecruit = Number(normalized.pendingRecruit) || 0;
  normalized.startingCompanions = Array.isArray(normalized.startingCompanions)
    ? [...new Set(normalized.startingCompanions.filter(id => HALL_RECRUITS.includes(id)))].slice(0, 2)
    : [];
  normalized.startingWelcomeComplete = typeof normalized.startingWelcomeComplete === "boolean"
    ? normalized.startingWelcomeComplete
    : highestCleared > 0;
  normalized.shopStage = Math.max(0, Math.min(maxStage, Number(normalized.shopStage) || 0));
  normalized.shopOffers = normalized.shopOffers && typeof normalized.shopOffers === "object" ? { ...normalized.shopOffers } : {};
  normalized.purchasedShopStages = Array.isArray(normalized.purchasedShopStages)
    ? [...new Set(normalized.purchasedShopStages.filter(stage => Number.isInteger(stage) && stage >= 1 && stage <= maxStage))]
    : [];
  return normalized;
}

function hallBattleProgress() {
  state.hallBattles = normalizeHallBattleProgress(state.hallBattles);
  return state.hallBattles;
}

function hallBattleInfo(stage) {
  return HALL_BATTLE_BLUEPRINTS[Number(stage) - 1] || null;
}

function hallEnemiesForStage(stage, keys = null, phaseIndex = 0) {
  const info = hallBattleInfo(stage);
  if (!info) return [];
  const advanced = stage > 40;
  const healthScale = (1 + Math.max(0, stage - 1) * .052) * (advanced ? 1.12 + phaseIndex * .08 : 1);
  const attackScale = (1 + Math.max(0, stage - 1) * .024) * (advanced ? 1.08 + phaseIndex * .04 : 1);
  return (keys || info.enemies).map(key => {
    const profile = HALL_ENEMY_LIBRARY[key];
    const unit = enemy(profile.name, Math.round(profile.hp * healthScale), Math.round(profile.atk * attackScale), profile.weak, profile.color, profile.node, profile.sprite || null);
    if (profile.finalState) unit.finalState = profile.finalState;
    unit.levelHint = stage;
    unit.fixedLevel = true;
    if (info.boss || profile.node >= 3) {
      unit.npcBoss = true;
      unit.resistanceTier = info.boss && (!advanced || phaseIndex === info.waves.length) ? "boss" : "elite";
    }
    return unit;
  });
}

function openHallBattleMap() {
  if (state.gameMode !== "hallBattles") return;
  if (hallBattleProgress().pendingRecruit) return openHallRecruitment();
  mode = "hallMap";
  heldDirection = null;
  fieldDestination = null;
  el.menu.classList.remove("is-shop");
  document.querySelector(".menu-tabs").classList.add("hidden");
  el.menu.classList.remove("hidden");
  renderHallBattleMap();
  updateSkillPointNotice();
}

function hallEncounterDetails(info) {
  const profiles = [info.enemies, ...info.waves].flat().map(key => HALL_ENEMY_LIBRARY[key]);
  const counts = profiles.reduce((all, profile) => ({ ...all, [profile.name]: (all[profile.name] || 0) + 1 }), {});
  const enemies = info.waves.length
    ? [info.enemies, ...info.waves].map((wave, index) => `Phase ${index + 1}: ${wave.map(key => `${HALL_ENEMY_LIBRARY[key].name}${HALL_ENEMY_LIBRARY[key].finalState ? " (Enraged)" : ""}`).join(" + ")}`).join(" / ")
    : Object.entries(counts).map(([name, amount]) => amount > 1 ? `${name} x${amount}` : name).join(" + ");
  const weaknesses = [...new Set(profiles.map(profile => profile.weak))].join(" / ");
  const traits = [];
  if (info.boss) traits.push("Boss pattern and high status resistance");
  else if (profiles.some(profile => profile.node >= 3)) traits.push("Elite attack pattern");
  if (profiles.some(profile => enemyAbilityProfiles[profile.name]?.heal)) traits.push("Enemy healing");
  if (profiles.some(profile => profile.name === "Nyx Vael")) traits.push("Sleep pressure");
  else if (profiles.some(profile => enemyAbilityProfiles[profile.name]?.element === "Shadow")) traits.push("Poison pressure");
  if (profiles.some(profile => ["Earth", "Tech"].includes(enemyAbilityProfiles[profile.name]?.element))) traits.push("Stun pressure");
  if (profiles.length >= 3) traits.push("Three-enemy formation");
  else if (profiles.length === 2) traits.push("Dual formation");
  if (info.waves.length) traits.unshift(`${info.waves.length + 1} phases / one battle`);
  return { enemies, weaknesses, traits: traits.join(" / ") || "Straight combat" };
}

function renderHallBattleMap() {
  el.menu.dataset.menuView = "hall-records";
  const progress = hallBattleProgress();
  const cleared = new Set(progress.clearedStages);
  const stages = HALL_BATTLE_BLUEPRINTS.map(info => {
    const details = hallEncounterDetails(info);
    const isCleared = cleared.has(info.stage);
    const unlocked = info.stage <= progress.unlockedStage || isCleared;
    const stateLabel = isCleared ? "CLEARED / REPLAY" : unlocked ? "AVAILABLE" : "LOCKED";
    const lootLabel = `${hallNormalGearRarity(info.stage)} gear`;
    const thumbnail = (info.stage - 1) % 8;
    return `<button type="button" class="hall-stage hall-thumb-${thumbnail} ${info.boss ? "is-boss" : ""} ${isCleared ? "is-cleared" : ""} ${unlocked ? "" : "is-locked"}" data-hall-stage="${info.stage}" ${unlocked ? "" : "disabled"}><span>STAGE ${String(info.stage).padStart(2, "0")}${info.boss ? " / BOSS" : ""}</span><strong>${info.name}</strong><small>Enemy level ${Math.min(info.stage, MAX_LEVEL)} / ${lootLabel} / ${stateLabel}</small><em>${details.enemies}</em><i>Weak: ${details.weaknesses}</i><i>${details.traits}</i></button>`;
  }).join("");
  el.menuBody.innerHTML = `<section class="hall-map"><header><div><strong>Hall Battle Records</strong><p>${cleared.size}/${HALL_BATTLE_BLUEPRINTS.length} cleared / newest stage ${progress.unlockedStage}</p></div><button type="button" data-close-hall aria-label="Close battle records">X</button></header><div class="hall-stage-grid">${stages}</div></section>`;
  el.menuBody.querySelector("[data-close-hall]")?.addEventListener("click", closeHallOverlay);
  el.menuBody.querySelectorAll("[data-hall-stage]").forEach(button => button.addEventListener("click", () => startHallBattleStage(Number(button.dataset.hallStage))));
}

function closeHallOverlay() {
  if (mode !== "hallMap") return;
  mode = "walk";
  el.menu.classList.add("hidden");
  document.querySelector(".menu-tabs").classList.remove("hidden");
  updateSkillPointNotice();
}

function startHallBattleStage(stage) {
  const info = hallBattleInfo(stage);
  const progress = hallBattleProgress();
  if (!info || (stage > progress.unlockedStage && !progress.clearedStages.includes(stage))) return;
  ensureHallShopOffer(stage);
  saveGame(hallSaveKey());
  el.menu.classList.add("hidden");
  document.querySelector(".menu-tabs").classList.remove("hidden");
  state.map = info.mapId;
  const label = `Hall ${String(stage).padStart(2, "0")}/${HALL_BATTLE_BLUEPRINTS.length} - ${info.name}`;
  const waves = info.waves.map((keys, index) => ({ name: `${label} - Phase ${index + 2}/${info.waves.length + 1}${keys.includes("solinarEnraged") ? " / Enraged" : ""}`, enemies: hallEnemiesForStage(stage, keys, index + 1) }));
  startBattle(label, hallEnemiesForStage(stage), undefined, null, waves, { hallBoss: info.boss, hallFinale: stage === 50, roundCap: stage === 50 ? 40 : stage > 40 ? 32 : MAX_BATTLE_ROUNDS });
  battle.hallStage = stage;
  battle.hallBoss = info.boss;
  el.chapter.textContent = "Ember Hall Battle";
  el.place.textContent = `${currentMap().name} / Stage ${stage}`;
  updateMusic();
}

let hallStartingSelection = [];

function openHallStartingPartySelection() {
  hallStartingSelection = hallStartingSelection.filter(id => HALL_RECRUITS.includes(id)).slice(0, 2);
  mode = "hallMap";
  el.menu.classList.remove("is-shop");
  document.querySelector(".menu-tabs").classList.add("hidden");
  el.menu.classList.remove("hidden");
  const cards = HALL_RECRUITS.map(id => {
    const hero = baseJobs[id];
    const selected = hallStartingSelection.includes(id);
    return `<button type="button" class="hall-recruit ${selected ? "is-selected" : ""}" data-hall-start-recruit="${id}" aria-pressed="${selected}"><img src="${menuPortraitSource(id)}" alt=""><span><strong>${hero.name}</strong><small>${hero.title} / ${hero.element}</small><em>${(characterSpecialties[id] || []).join(" / ")}</em></span></button>`;
  }).join("");
  el.menuBody.innerHTML = `<section class="hall-recruitment"><header><div><strong>Choose Two Starting Companions</strong><p>Verseborn is ready. Select exactly two Flameguard to begin Ember Hall at level 1.</p></div></header><div class="hall-recruit-grid">${cards}</div><footer><span>${hallStartingSelection.length}/2 selected</span><button type="button" data-confirm-hall-start ${hallStartingSelection.length === 2 ? "" : "disabled"}>Confirm Starting Party</button></footer></section>`;
  el.menuBody.querySelectorAll("[data-hall-start-recruit]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.hallStartRecruit;
    hallStartingSelection = hallStartingSelection.includes(id)
      ? hallStartingSelection.filter(entry => entry !== id)
      : hallStartingSelection.length < 2 ? [...hallStartingSelection, id] : hallStartingSelection;
    openHallStartingPartySelection();
  }));
  el.menuBody.querySelector("[data-confirm-hall-start]")?.addEventListener("click", () => confirmHallStartingParty(hallStartingSelection));
}

function hallStartingWelcomeScenes(companions) {
  const [first, second] = companions;
  return [
    {
      id: "ember-hall-start-verseborn", recruit: "Verseborn", title: "Verseborn Enters Ember Hall", room: "trial-room", preferred: [], cast: ["Verseborn"], allowWithoutPartner: true,
      build: () => [["Verseborn", "Ember Hall. New run, first verse.", { actor: "Verseborn", anim: "walk", motion: "entrance", dx: 32, facing: 3, duration: 78 }]]
    },
    {
      id: `ember-hall-start-${first}`, recruit: first, title: `${baseJobs[first].name} Joins`, room: "trial-room", preferred: ["Verseborn"], cast: ["Verseborn", first],
      build: () => [[first, "I am with you. Let us begin.", { actor: first, anim: "walk", motion: "entrance", dx: 28, facing: 3, duration: 72 }], ["Verseborn", "Then the first line has harmony."]]
    },
    {
      id: `ember-hall-start-${second}`, recruit: second, title: `${baseJobs[second].name} Joins`, room: "trial-room", preferred: ["Verseborn", first], cast: ["Verseborn", first, second],
      build: () => [[second, "Make room. This trial has three names now.", { actor: second, anim: "walk", motion: "entrance", dx: 28, facing: 3, duration: 72 }], ["Verseborn", "Three Flameguard. Stage One awaits."]]
    }
  ];
}

function playHallStartingWelcomeSequence(companions) {
  const scenes = hallStartingWelcomeScenes(companions);
  let index = 0;
  const playNext = () => {
    if (index >= scenes.length) {
      hallBattleProgress().startingWelcomeComplete = true;
      saveGame(hallSaveKey());
      startHallBattleStage(1);
      return;
    }
    playRecruitScene(scenes[index++], { replay: true, after: playNext });
  };
  playNext();
}

function confirmHallStartingParty(companions) {
  const chosen = [...new Set(companions)].filter(id => HALL_RECRUITS.includes(id));
  if (chosen.length !== 2 || state.party.some(id => id !== "Verseborn")) return false;
  chosen.forEach(id => addParty(id));
  state.party = ["Verseborn", ...chosen];
  state.activeParty = [...state.party];
  state.party.forEach(id => {
    state.heroProgress[id] = { level: 1, xp: 0, talents: [], pendingMilestones: [] };
  });
  const progress = hallBattleProgress();
  progress.startingCompanions = [...chosen];
  progress.startingWelcomeComplete = false;
  restoreHallParty();
  saveGame(hallSaveKey());
  playSfx("item");
  playHallStartingWelcomeSequence(chosen);
  return true;
}

function hallRecruitCandidates() {
  return HALL_RECRUITS.filter(id => !state.party.includes(id));
}

function openHallRecruitment() {
  const progress = hallBattleProgress();
  const candidates = hallRecruitCandidates();
  if (!candidates.length) {
    progress.pendingRecruit = 0;
    return openHallBattleMap();
  }
  mode = "hallMap";
  el.menu.classList.remove("is-shop");
  document.querySelector(".menu-tabs").classList.add("hidden");
  el.menu.classList.remove("hidden");
  const cards = candidates.map(id => {
    const hero = baseJobs[id];
    return `<button type="button" class="hall-recruit" data-hall-recruit="${id}"><img src="${menuPortraitSource(id)}" alt=""><span><strong>${hero.name}</strong><small>${hero.title} / ${hero.element}</small><em>${(characterSpecialties[id] || []).join(" / ")}</em></span></button>`;
  }).join("");
  el.menuBody.innerHTML = `<section class="hall-recruitment"><header><div><strong>Choose a Flameguard Recruit</strong><p>Stage ${progress.pendingRecruit} cleared / the chosen hero joins at the roster's current level.</p></div></header><div class="hall-recruit-grid">${cards}</div></section>`;
  el.menuBody.querySelectorAll("[data-hall-recruit]").forEach(button => button.addEventListener("click", () => chooseHallRecruit(button.dataset.hallRecruit)));
}

function emptyRecruitSceneHistory() {
  return { seen: [], lastByRecruit: {} };
}

function loadRecruitSceneHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(hallSceneHistoryKey()) || "null");
    return {
      seen: Array.isArray(saved?.seen) ? [...new Set(saved.seen.filter(id => RECRUIT_SCENES.some(scene => scene.id === id)))] : [],
      lastByRecruit: saved?.lastByRecruit && typeof saved.lastByRecruit === "object" ? { ...saved.lastByRecruit } : {}
    };
  } catch {
    return emptyRecruitSceneHistory();
  }
}

function saveRecruitSceneHistory(history) {
  try { localStorage.setItem(hallSceneHistoryKey(), JSON.stringify(history)); } catch {}
}

function selectRecruitScene(recruit, history = loadRecruitSceneHistory()) {
  const scenes = RECRUIT_SCENES.filter(scene => scene.recruit === recruit);
  if (!scenes.length) return null;
  const hasMet = scenes.some(scene => history.seen.includes(scene.id));
  if (!hasMet) return scenes.find(scene => scene.variant === "welcome") || scenes[0];
  const laterScenes = scenes.filter(scene => scene.variant !== "welcome");
  const unseen = laterScenes.find(scene => !history.seen.includes(scene.id));
  if (unseen) return unseen;
  return laterScenes.find(scene => scene.id !== history.lastByRecruit[recruit]) || laterScenes[0];
}

function recruitScenePartner(scene) {
  const available = state.party.filter(id => id !== scene.recruit && baseJobs[id]);
  return scene.preferred.find(id => available.includes(id)) || available.find(id => id === "Verseborn") || available[0] || null;
}

function recruitSceneActorAllowed(scene, id) {
  return state.party.includes(id) || (scene.guests || []).includes(id);
}

function recruitSceneActors(scene, partner) {
  const requested = scene.cast?.length ? scene.cast : [partner, scene.recruit];
  const ids = requested.filter((id, index, all) => id && all.indexOf(id) === index && recruitSceneActorAllowed(scene, id));
  const positionSets = { 1: [128], 2: [82, 174], 3: [50, 128, 206], 4: [32, 96, 160, 224] };
  const positions = positionSets[ids.length] || ids.map((_, index) => 32 + index * 48);
  return ids.map((id, index) => ({
    id,
    x: positions[index],
    baseline: index % 2 ? 136 : 132,
    facing: index === 0 && ids.length > 1 ? 3 : 1,
    anim: "idle",
    emote: "",
    motion: "",
    effect: "",
    actionDx: 0,
    actionDy: 0,
    actionStarted: 0,
    actionUntil: 0
  }));
}

function completeRecruitScene(after = null) {
  activeRecruitScene = null;
  returnToHallAfterBattle();
  mode = "walk";
  updateMusic();
  updatePanels();
  queueSave();
  if (typeof after === "function") after();
}

function playRecruitScene(scene, options = {}) {
  if (!scene || !state.party.includes(scene.recruit)) return false;
  const history = loadRecruitSceneHistory();
  const partner = recruitScenePartner(scene);
  if (!partner && !scene.allowWithoutPartner) return false;
  const actors = recruitSceneActors(scene, partner);
  if (!actors.length || !actors.every(actor => recruitSceneActorAllowed(scene, actor.id))) return false;
  if (!options.replay) {
    if (!history.seen.includes(scene.id)) history.seen.push(scene.id);
    history.lastByRecruit[scene.recruit] = scene.id;
    saveRecruitSceneHistory(history);
  }
  activePoint = null;
  fieldDestination = null;
  returnToHallAfterBattle();
  activeRecruitScene = { ...scene, actors, replay: Boolean(options.replay) };
  el.menu.classList.add("hidden");
  document.querySelector(".menu-tabs").classList.remove("hidden");
  const lines = scene.build({ recruit: scene.recruit, partner, history, actors: actors.map(actor => actor.id) });
  showTalk(lines, { portraits: actors.map(actor => actor.id), skippable: true, after: () => completeRecruitScene(options.after) });
  updateMusic();
  return true;
}

function replayRecruitScene(id) {
  const history = loadRecruitSceneHistory();
  const scene = RECRUIT_SCENES.find(entry => entry.id === id);
  if (!scene || !history.seen.includes(id) || !state.party.includes(scene.recruit)) return false;
  return playRecruitScene(scene, { replay: true });
}

function playUnseenArrival(id) {
  const history = loadRecruitSceneHistory();
  const scene = RECRUIT_SCENES.find(entry => entry.id === id && entry.variant === "welcome");
  if (!scene || history.seen.includes(id) || !state.party.includes(scene.recruit)) return false;
  return playRecruitScene(scene);
}

function sceneMemoriesHtml() {
  if (state.gameMode !== "hallBattles") return "";
  const history = loadRecruitSceneHistory();
  const intro = RECRUIT_SCENES.find(scene => scene.id === EMBER_HALL_INTRO_ID);
  const unseenIntro = intro && !history.seen.includes(intro.id)
    ? `<button type="button" class="scene-memory-arrival scene-memory-arrival-hall" data-play-arrival-scene="${intro.id}"><span><strong>Ember Hall</strong><small>${intro.title}</small></span></button>`
    : "";
  const unseenArrivals = [unseenIntro, ...HALL_RECRUITS.map(recruit => {
    if (!state.party.includes(recruit)) return "";
    const welcome = RECRUIT_SCENES.find(scene => scene.recruit === recruit && scene.variant === "welcome");
    if (!welcome || history.seen.includes(welcome.id)) return "";
    return `<button type="button" class="scene-memory-arrival" data-play-arrival-scene="${welcome.id}"><img src="${menuPortraitSource(recruit)}" alt=""><span><strong>${recruit}</strong><small>${welcome.title}</small></span></button>`;
  })].filter(Boolean);
  const introGroup = intro && history.seen.includes(intro.id)
    ? `<section class="scene-memory-group scene-memory-hall"><strong>Ember Hall</strong><div><button type="button" data-replay-scene="${intro.id}">${intro.title}</button></div></section>`
    : "";
  const groups = introGroup + HALL_RECRUITS.map(recruit => {
    if (!state.party.includes(recruit)) return "";
    const scenes = RECRUIT_SCENES.filter(scene => scene.recruit === recruit && history.seen.includes(scene.id));
    if (!scenes.length) return "";
    const buttons = scenes.map(scene => `<button type="button" data-replay-scene="${scene.id}">${scene.title} / ${scene.variant}</button>`).join("");
    return `<section class="scene-memory-group scene-memory-character"><img src="${menuPortraitSource(recruit)}" alt=""><strong>${recruit}</strong><div>${buttons}</div></section>`;
  }).join("");
  const arrivals = unseenArrivals.length ? `<section class="scene-memory-group scene-memory-arrivals"><strong>Unseen Arrivals</strong><p>These recruits joined before scenes were added. Play their first welcome whenever you are ready.</p><div>${unseenArrivals.join("")}</div></section>` : "";
  const memories = groups ? `<div class="scene-memory-grid">${groups}</div>` : `<div class="menu-card"><p>No recruitment scenes have been seen yet.</p></div>`;
  return `<section class="scene-memory-panel"><header><strong>Scene Memories</strong><p>Play missed arrivals or revisit recruitment moments from this Hall history.</p></header>${arrivals}${memories}</section>`;
}

function chooseHallRecruit(id) {
  const progress = hallBattleProgress();
  if (!HALL_RECRUITS.includes(id) || state.party.includes(id)) return;
  addParty(id);
  if (progress.pendingRecruit) progress.recruitStages.push(progress.pendingRecruit);
  progress.recruitStages = [...new Set(progress.recruitStages)];
  progress.pendingRecruit = 0;
  restoreHallParty();
  playSfx("item");
  updatePanels();
  queueSave();
  const scene = selectRecruitScene(id);
  if (!playRecruitScene(scene)) openHallBattleMap();
}

function restoreHallParty() {
  state.party.forEach(id => {
    const total = totals(id);
    baseJobs[id].hp = total.max;
    baseJobs[id].mp = total.mp;
  });
}

function returnToHallAfterBattle() {
  restoreHallParty();
  state.map = "emberHallBattles";
  state.x = 8;
  state.y = 9;
  state.renderX = state.x * TILE;
  state.renderY = state.y * TILE;
  state.facing = 2;
}

function returnAfterDefeat() {
  restoreHallParty();
  if (state.gameMode === "hallBattles") {
    returnToHallAfterBattle();
    return;
  }
  if (state.flags.registered) {
    state.map = "emberYard";
    state.x = 8;
    state.y = 9;
  }
  state.renderX = state.x * TILE;
  state.renderY = state.y * TILE;
  state.facing = 2;
}

function markBattleUnitDown(unit) {
  if (!unit || unit.hp > 0) return false;
  const newlyDown = !unit.down;
  unit.hp = 0;
  unit.down = true;
  unit.guarding = false;
  unit.anim = "death";
  if (newlyDown || !Number.isFinite(unit.deathTick)) unit.deathTick = tick;
  return newlyDown;
}

function reviveBattleUnit(unit, ratio) {
  if (!unit || unit.hp > 0) return 0;
  unit.hp = Math.max(1, Math.round(unit.max * ratio));
  unit.down = false;
  unit.anim = "idle";
  unit.deathTick = null;
  return unit.hp;
}

function partyIsDefeated() {
  return Boolean(battle?.party?.length && battle.party.every(unit => unit.hp <= 0));
}

function battleResultRowsHtml(entries) {
  return entries.map(entry => {
    const rarity = entry.rarity ? ` rarity-${entry.rarity.toLowerCase()}` : "";
    return `<div class="battle-result-row"><span class="battle-result-icon ${entry.kind || "item"}">${entry.icon || "*"}</span><span><strong class="${rarity.trim()}">${escapeMarkup(entry.label)}</strong>${entry.detail ? `<small>${escapeMarkup(entry.detail)}</small>` : ""}</span><b>${escapeMarkup(entry.value || "")}</b></div>`;
  }).join("");
}

function showBattleResult(kind, entries = [], after = null) {
  battleResultState = { kind, after };
  mode = "battleResult";
  hideBattlePreview();
  el.turnOrder.innerHTML = "";
  el.battle.classList.add("hidden");
  el.battleResult.classList.remove("hidden", "is-victory", "is-defeat");
  el.battleResult.classList.add(kind === "victory" ? "is-victory" : "is-defeat");
  el.battleResultArt.src = kind === "victory" ? "assets/ui/battle-victory.png" : "assets/ui/battle-defeat.png";
  el.battleResultArt.alt = kind === "victory" ? "Victory. The trial is cleared." : "The Flameguard fell. You awaken again in Ember Hall.";
  el.battleResultRewards.classList.toggle("hidden", kind !== "victory");
  el.battleResultRewards.innerHTML = kind === "victory" ? battleResultRowsHtml(entries) : "";
  el.battleResultContinue.setAttribute("aria-label", kind === "victory" ? "Continue" : "Return to Ember Hall");
}

function completeBattleResult() {
  if (mode !== "battleResult" || !battleResultState) return;
  const { after } = battleResultState;
  battleResultState = null;
  el.battleResult.classList.add("is-leaving");
  setTimeout(() => {
    el.battleResult.classList.add("hidden");
    el.battleResult.classList.remove("is-victory", "is-defeat", "is-leaving");
    document.querySelector(".game")?.classList.remove("battle-final-fall");
    effect = null;
    battleFloaters = [];
    battle = null;
    mode = "walk";
    if (typeof after === "function") after();
    updateMusic();
    updatePanels();
    queueSave();
  }, 220);
}

function triggerPartyDefeat(log = "") {
  if (!battle || battle.defeatPending || battleResultState) return false;
  battle.defeatPending = true;
  battle.resolving = true;
  battle.party.forEach(markBattleUnitDown);
  state.resonance = Number.isFinite(battle.startingResonance) ? battle.startingResonance : state.resonance;
  if (battle.retryEvent) delete state.flags[battle.retryEvent];
  renderBattle(`${log} The Flameguard has fallen.`);
  document.querySelector(".game")?.classList.add("battle-final-fall");
  playSfx("block");
  setTimeout(() => {
    if (!battle?.defeatPending || battleResultState) return;
    showBattleResult("defeat", [], returnAfterDefeat);
  }, 1150);
  return true;
}

function recordHallBattleClear(stage) {
  const progress = hallBattleProgress();
  const firstClear = !progress.clearedStages.includes(stage);
  progress.unlockedStage = Math.min(HALL_BATTLE_BLUEPRINTS.length, Math.max(progress.unlockedStage, stage + 1));
  if (!firstClear) return false;
  progress.clearedStages.push(stage);
  progress.clearedStages.sort((a, b) => a - b);
  const remainingRecruit = HALL_RECRUITS.some(id => !state.party.includes(id));
  if (remainingRecruit && HALL_RECRUIT_STAGES.includes(stage) && !progress.recruitStages.includes(stage)) progress.pendingRecruit = stage;
  return true;
}

function startBattle(name, enemies, winFlag, spawnRef = null, waves = [], options = {}) {
  mode = "battle";
  el.battle.dataset.hallFinale = options.hallFinale ? "true" : "false";
  battleResultState = null;
  el.battleResult.classList.add("hidden");
  el.battleResult.classList.remove("is-victory", "is-defeat", "is-leaving");
  document.querySelector(".game")?.classList.remove("battle-final-fall");
  updateSkillPointNotice();
  battleFloaters = [];
  const preparedWard = Boolean(state.fieldWard);
  const startingResonance = state.resonance;
  state.fieldWard = false;
  const scriptedBoss = ["dawnWon", "endgameHuntWon", "ngStonewakeWon", "ngOrphanTrialWon"].includes(winFlag);
  const preparedEnemies = enemies.map((unit, index) => {
    const prepared = prepareEnemyForBattle(unit);
    if ((spawnRef?.boss && index === 0) || (scriptedBoss && (unit.npcBoss || unit.node >= 3 || enemies.length === 1))) prepared.resistanceTier = "boss";
    else if (scriptedBoss) prepared.resistanceTier = "elite";
    return prepared;
  });
  const preparedWaves = waves.map(wave => ({ ...wave, enemies: wave.enemies.map(unit => prepareEnemyForBattle(unit)) }));
  const hallBoss = Boolean(options.hallBoss);
  const musicTrack = battleMusicForEncounter(hallBoss);
  battle = { name, enemies: preparedEnemies, party: state.activeParty.slice(0, 3).map(battleUnit), winFlag, retryEvent: BATTLE_RETRY_EVENTS[winFlag] || null, spawnRef, waves: preparedWaves, defeated: [], ward: preparedWard, resolving: false, itemMode: false, targetMode: false, pendingSkill: null, turnQueue: [], turnIndex: 0, round: 1, roundCap: options.roundCap || MAX_BATTLE_ROUNDS, startingResonance, enemyResonance: 0, usedOnce: {}, lastSupport: null, extraTurns: 0, hallBoss, musicTrack };
  const opening = battle.party.reduce((sum, unit) => sum + effectValue(unit.id, "openingResonance"), 0);
  state.resonance = Math.min(100, state.resonance + opening);
  el.dialogue.classList.add("hidden");
  el.battle.classList.remove("hidden");
  el.battleName.textContent = name;
  updateMusic(musicTrack);
  buildTurnOrder();
  const openingNotes = [
    opening ? `Rare gear sings: +${opening} Resonance.` : "Turn order begins.",
    preparedWard ? "A prepared ward protects the party's opening turn." : ""
  ].filter(Boolean).join(" ");
  runCurrentTurn(openingNotes);
}

function buildTurnOrder() {
  battle.turnQueue = [
    ...battle.party.filter(unit => unit.hp > 0).map(unit => ({ side: "party", id: unit.id, name: unit.name, agi: effectiveAgility(unit, totals(unit.id).agi) })),
    ...battle.enemies.map((unit, index) => ({ side: "enemy", index, name: unit.name, agi: effectiveAgility(unit, unit.stats.agi) })).filter(turn => battle.enemies[turn.index].hp > 0)
  ].sort((a, b) => b.agi - a.agi || (a.side === "party" ? -1 : 1));
  battle.turnIndex = 0;
}

function currentTurn() {
  return battle?.turnQueue?.[battle.turnIndex] || null;
}

function turnIsAlive(turn) {
  if (!turn) return false;
  if (turn.side === "party") return battle.party.find(unit => unit.id === turn.id)?.hp > 0;
  return battle.enemies[turn.index]?.hp > 0;
}

function renderTurnOrder() {
  if (!battle?.turnQueue) return;
  const remaining = battle.turnQueue.slice(battle.turnIndex).filter(turnIsAlive);
  el.turnOrder.innerHTML = remaining.map((turn, index) => `<span class="turn-chip ${turn.side} ${index === 0 ? "is-current" : ""}">${index === 0 ? "NOW " : ""}${turn.name}<small>AGI ${turn.agi}</small></span>`).join("");
}

function battleRoundLimitReached(currentBattle = battle) {
  return Boolean(currentBattle && currentBattle.round >= (currentBattle.roundCap || MAX_BATTLE_ROUNDS));
}

function runCurrentTurn(log) {
  while (currentTurn() && !turnIsAlive(currentTurn())) battle.turnIndex++;
  if (!currentTurn()) {
    if (battleRoundLimitReached()) return endBattleDraw(log);
    battle.round++;
    buildTurnOrder();
    if (!currentTurn()) return;
    log = `Round ${battle.round}. ${log}`;
  }
  const turn = currentTurn();
  battle.itemMode = false;
  battle.targetMode = false;
  battle.pendingSkill = null;
  battleActionIndex = 0;
  const unit = turn.side === "party"
    ? battle.party.find(member => member.id === turn.id)
    : battle.enemies[turn.index];
  const start = processTurnStart(unit);
  if (turn.side === "party" && unit.hp <= 0) markBattleUnitDown(unit);
  battle.turnStartMessage = start.notes.length ? `${unit.name}: ${start.notes.join(" ")}` : "";
  if (start.notes.length) log = `${log} ${unit.name}: ${start.notes.join(" ")}`;
  if (partyIsDefeated()) return triggerPartyDefeat(log);
  if (unit.hp <= 0 && turn.side === "enemy" && battle.enemies.every(enemyUnit => enemyUnit.hp <= 0)) {
    renderBattle(log);
    return setTimeout(() => winBattle(log), 520);
  }
  if (start.skip) {
    battle.resolving = true;
    renderBattle(log);
    return setTimeout(() => finishTurn(log), 620);
  }
  if (turn.side === "enemy") {
    battle.resolving = true;
    renderBattle(`${log} ${turn.name} prepares to act...`);
    setTimeout(() => resolveEnemyTurn(turn, log), 680);
    return;
  }
  battle.resolving = false;
  if (unit) unit.guarding = false;
  renderBattle(`${log} ${turn.name}: choose a command.`);
}

function finishTurn(log) {
  transferDeadSparkyBurns();
  const actor = currentTurn();
  if (actor?.side === "party") log += finishMechTalentAction(battle.party.find(member => member.id === actor.id));
  battle.itemMode = false;
  battle.targetMode = false;
  battle.pendingSkill = null;
  hideBattlePreview();
  const turn = currentTurn();
  const unit = turn?.side === "party" ? battle.party.find(member => member.id === turn.id) : battle.enemies[turn?.index];
  const faded = unit ? processTurnEnd(unit) : [];
  if (faded.length) log = `${log} ${faded.join(" ")}`;
  battle.turnIndex++;
  runCurrentTurn(log);
}

function endBattleDraw(log = "") {
  if (!battle || mode !== "battle") return false;
  const hallStage = Number(battle.hallStage) || 0;
  battle.resolving = true;
  battle.party.forEach(unit => {
    const hero = baseJobs[unit.id];
    if (!hero) return;
    hero.hp = Math.max(1, Math.min(totals(unit.id).max, unit.hp));
    hero.mp = Math.max(0, Math.min(totals(unit.id).mp, unit.mp));
  });
  if (hallStage) returnToHallAfterBattle();
  state.resonance = Number.isFinite(battle.startingResonance) ? battle.startingResonance : state.resonance;
  if (battle.retryEvent) delete state.flags[battle.retryEvent];
  hideBattlePreview();
  effect = null;
  el.turnOrder.innerHTML = "";
  el.battle.classList.add("hidden");
  mode = "walk";
  updateMusic();
  updatePanels();
  playSfx("block");
  showTalk([
    ["Draw", `Round ${battle.roundCap || MAX_BATTLE_ROUNDS} ends with both sides still standing. The battle is a draw.`],
    ["System", `No XP, gold, loot or victory progress was awarded.${log ? " You can prepare and challenge the fight again." : ""}`]
  ]);
  return true;
}

function finishAttackDamageSummary(actionLog = "") {
  const hits = battle.attackDamage || [];
  const statuses = [...new Set(battle.attackStatuses || [])];
  delete battle.attackDamage;
  delete battle.attackStatuses;
  if (!hits.length) {
    const prefix = battle.turnStartMessage ? `${battle.turnStartMessage} ` : "";
    battle.lastAttackDamage = prefix && actionLog.startsWith(prefix) ? actionLog.slice(prefix.length) : actionLog;
    return;
  }
  const groups = new Map();
  hits.forEach(hit => {
    const key = `${hit.type}:${hit.crit}`;
    const group = groups.get(key) || { ...hit, amount: 0 };
    group.amount += hit.amount;
    groups.set(key, group);
  });
  battle.lastAttackDamage = [...groups.values()].map(hit => `${hit.crit ? "CRIT " : ""}${hit.amount} ${hit.type}`).join(" / ");
  if (statuses.length) battle.lastAttackDamage += ` / ${statuses.join(" / ")}`;
}

function renderBattle(log) {
  el.battleLog.textContent = battle.lastAttackDamage || "";
  el.battleLog.title = battle.lastAttackDamage || "";
  el.battleResonance.style.width = `${Math.max(0, Math.min(100, state.resonance))}%`;
  const enemyResonance = Math.max(0, Math.min(100, battle.enemyResonance || 0));
  el.enemyBattleResonance.style.width = `${enemyResonance}%`;
  el.enemyBattleResonance.parentElement?.setAttribute("aria-valuenow", enemyResonance);
  const turn = currentTurn();
  renderTurnOrder();
  el.partyRows.innerHTML = battle.party.map(unit => unitHtml({ ...unit, name: unit.form ? `${unit.name} - ${unit.form === "mech" ? "MECH" : "SHADOWPRIEST"} ${unit.formTurns}` : unit.name }, turn?.side === "party" && turn.id === unit.id ? "is-active" : "")).join("");
  if (partyCanSeeWeaknesses()) battle.enemies.forEach(rememberWeakness);
  el.enemyRows.innerHTML = battle.enemies.map(e => unitHtml({ name: `${e.name} Lv ${e.level} - Weak: ${knownWeakness(e) ? e.weak : "???"}`, hp: e.hp, max: e.max, stagger: e.stagger, statuses: e.statuses })).join("");
  el.actions.innerHTML = "";
  el.actions.classList.toggle("is-items", battle.itemMode);
  el.actions.classList.toggle("is-targets", battle.targetMode);
  if (battle.resolving) return;
  if (!turn || turn.side !== "party") return;
  const u = battle.party.find(unit => unit.id === turn.id);
  if (!u || u.hp <= 0) return finishTurn("A fallen ally loses their turn.");
  if (battle.itemMode) return renderBattleItems(u);
  if (battle.targetMode) return renderBattleTargets(u);
  battleSkills(u.id, u).forEach(sk => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = sk.name;
    const onceUsed = sk.oncePerBattle && battle.usedOnce[sk.oncePerBattle];
    const noEncore = sk.encore && !battle.lastSupport;
    const extraUnavailable = (sk.immediateTurn || (sk.encore && battle.lastSupport?.immediateTurn)) && !canGrantImmediateTurn();
    b.disabled = Boolean(onceUsed || noEncore || extraUnavailable || (sk.anim === "ultimate" ? state.resonance < 100 : skillMpCost(u.id, sk, u) > u.mp));
    setBattlePreview(b, sk.name, skillPreview(u, sk));
    b.onclick = () => chooseSkillTarget(u, sk);
    el.actions.appendChild(b);
  });
  const defendBtn = document.createElement("button");
  defendBtn.type = "button";
  defendBtn.textContent = "Defend / Skip";
  defendBtn.title = "Use the block animation, gain 6 Resonance and reduce the next hit against this hero.";
  setBattlePreview(defendBtn, "Defend / Skip", `Block ${defendReduction(u)}% of the next hit | +6 Resonance | 0 MP.`);
  defendBtn.onclick = () => useDefend(u);
  el.actions.appendChild(defendBtn);
  const itemBtn = document.createElement("button");
  itemBtn.type = "button";
  const carried = carriedBattleItems();
  const usable = carried.filter(([name, info]) => canUseBattleItem(u, info));
  const itemCount = carried.reduce((sum, [name]) => sum + state.inventory[name], 0);
  itemBtn.textContent = carried.length ? `Items (${itemCount})` : "Items (Empty)";
  itemBtn.disabled = !usable.length;
  itemBtn.title = carried.length && !usable.length ? "No carried item can affect this hero right now." : "Choose a carried battle item.";
  itemBtn.onclick = () => openBattleItems(u);
  el.actions.appendChild(itemBtn);
  battleActionIndex = Math.min(battleActionIndex, Math.max(0, el.actions.children.length - 1));
  highlightBattleAction();
}

function highlightBattleAction() {
  [...el.actions.children].forEach((button, index) => button.classList.toggle("is-selected", index === battleActionIndex));
  const selected = el.actions.children[battleActionIndex];
  if (selected?.dataset.preview) showBattlePreview(selected.dataset.previewTitle, selected.dataset.preview);
}

function skillPreview(u, sk, target = null) {
  const t = totals(u.id);
  const heal = healingAmount(u.id, sk, u);
  const mpCost = skillMpCost(u.id, sk, u);
  const cost = sk.anim === "ultimate" ? "100 Resonance" : sk.basicAttack ? "0 MP / +6% Max MP" : `${mpCost} MP`;
  const targetLabel = battleSkillTargetLabel(u.id, sk);
  if (sk.dispel) return `Remove one positive buff | ${targetLabel} | ${cost}. ${sk.desc}`;
  if (sk.statusOnly) return `Debuff / no direct damage | ${targetLabel} | ${cost}. ${sk.desc}`;
  if (sk.power < 0) return `Heal ${heal} HP | ${targetLabel} | ${cost}. ${sk.desc}`;
  if (!skillTargetsEnemies(sk)) {
    const kind = sk.transform ? `Transform ${(TRANSFORMATION_CONFIG[sk.transform]?.duration || 4) + typedTalentValue(u.id, "transformDuration")} turns` : "Support";
    const extra = sk.immediateTurn ? ` Extra actions: ${battle?.extraTurns || 0}/2 used.` : "";
    return `${kind} | ${targetLabel}${target ? `: ${target.name}` : ""} | ${cost}. ${sk.desc}${extra}`;
  }
  const statName = skillScalingLabel(u.id, sk);
  const statKey = skillScaling(sk);
  const stat = skillOffensiveStat(u.id, sk, u, t);
  const progression = skillDamageTalentMultiplier(u, sk, target) * (sk.anim === "ultimate" ? ultimatePotencyMultiplier(u.id, sk) : 1);
  const low = (sk.coefficient ? stat * sk.coefficient : sk.power + stat) * progression;
  const high = low + 5;
  const hitsWeakness = skillHitsElementWeakness(target, sk);
  const naturalWeakness = target && target.weak === sk.element;
  const revealWeakness = target ? knownWeakness(target) : partyCanSeeWeaknesses();
  const displayWeakness = hitsWeakness && (naturalWeakness ? revealWeakness : Boolean(statusOf(target, "shadowExposed")));
  const multiplier = outgoingDamageMultiplier(u, statKey === "str" ? "melee" : "magic", target)
    * (sk.element === "Shadow" ? 1 + statusValue(target, "shadowVulnerability") : 1)
    * (sk.rank0BreakPayoff && target && (statusOf(target, "broken") || (target.stagger || 0) >= 2) ? 1 + sk.rank0BreakPayoff : 1)
    * (target && hasNegativeStatus(target) ? 1 + (sk.afflictedBonus || 0) : 1)
    * (1 + (sk.buffScaling || 0) * ensureStatuses(u).filter(status => STATUS_DEFS[status.type]?.buff).length);
  const defenseDebuff = statusValue(target, "defenseDown") + (statKey === "mag" ? statusValue(target, "magicDefenseDown") : 0);
  const defense = Math.max(0, statusValue(target, "defenseUp") - defenseDebuff) * (1 - (sk.pierce || 0));
  const targetRoll = roll => Math.max(1, Math.round((displayWeakness ? Math.floor(roll * skillWeaknessMultiplier(u.id, sk, target)) : roll) * multiplier * (1 - defense)));
  const targetLow = targetRoll(low);
  const targetHigh = targetRoll(high);
  const weaknessText = displayWeakness ? ` | Weakness included${sk.shadowExposureBonus && statusOf(target, "shadowExposed") ? " + Voidthorn payoff" : ""}` : "";
  const basicEffect = sk.basicAttack ? weaponBasicAttackEffect(gearByName(baseJobs[u.id].gear.weapon))?.label : "";
  return `${sk.element} ${statName} | ${targetLow}-${targetHigh} damage${weaknessText} | ${targetLabel} | ${cost}. ${basicEffect ? `${basicEffect}. ` : ""}${sk.desc}`;
}

function battleSkillTargetLabel(id, sk) {
  if (skillTargetsEnemies(sk)) return skillHitsAll(id, sk) ? "All enemies" : "One enemy";
  if (sk.partyWide || sk.targetSide === "party") return "Whole party";
  if (sk.targetSide === "ally") return "One ally";
  if (sk.targetSide === "self") return "Self";
  if (sk.power < 0) return "Lowest-HP ally";
  return "Self";
}

function setBattlePreview(button, title, description) {
  button.dataset.previewTitle = title;
  button.dataset.preview = description;
  button.addEventListener("mouseenter", () => showBattlePreview(title, description));
  button.addEventListener("focus", () => showBattlePreview(title, description));
}

function showBattlePreview(title, description) {
  el.battlePreview.classList.remove("hidden");
  el.battlePreview.innerHTML = `<strong>${title}</strong><span>${description}</span>`;
}

function hideBattlePreview() {
  el.battlePreview.classList.add("hidden");
  el.battlePreview.innerHTML = "";
}

function moveBattleAction(delta) {
  const buttons = [...el.actions.children].filter(button => !button.disabled);
  if (!buttons.length) return;
  const current = buttons.indexOf(el.actions.children[battleActionIndex]);
  const next = buttons[(Math.max(0, current) + delta + buttons.length) % buttons.length];
  battleActionIndex = [...el.actions.children].indexOf(next);
  highlightBattleAction();
}

function confirmBattleAction() {
  if (!battle || battle.resolving) return;
  const button = el.actions.children[battleActionIndex];
  if (button && !button.disabled) button.click();
}

function unitHtml(u, className = "") {
  const pct = Math.max(0, Math.round((u.hp / u.max) * 100));
  const mp = Number.isFinite(u.maxmp) ? `<small>MP ${u.mp}/${u.maxmp}</small>` : "";
  const down = u.hp <= 0 || u.down;
  return `<div class="unit ${className} ${down ? "is-down" : ""}"><strong>${u.name}</strong><span>${Math.max(0, u.hp)}/${u.max}</span>${mp}<div class="bar"><span style="width:${pct}%"></span></div>${statusBadgesHtml(u)}</div>`;
}

function chooseSkillTarget(u, sk) {
  const live = battle.enemies.filter(enemyUnit => enemyUnit.hp > 0);
  const allies = battle.party.filter(ally => ally.hp > 0);
  if (sk.targetSide === "ally" && allies.length > 1) {
    battle.targetMode = true;
    battle.pendingSkill = sk;
    battleActionIndex = 0;
    return renderBattle(`${u.name}: choose an ally for ${sk.name}.`);
  }
  if (skillTargetsEnemies(sk) && live.length > 1 && !skillHitsAll(u.id, sk)) {
    battle.targetMode = true;
    battle.pendingSkill = sk;
    battleActionIndex = 0;
    return renderBattle(`${u.name}: choose a target for ${sk.name}.`);
  }
  useSkill(u, sk, sk.targetSide === "ally" ? allies[0] : skillTargetsEnemies(sk) ? live[0] : u);
}

function renderBattleTargets(u) {
  const sk = battle.pendingSkill;
  if (sk.targetSide === "ally") {
    battle.party.filter(ally => ally.hp > 0).forEach(ally => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${ally.name} | HP ${ally.hp}/${ally.max} | MP ${ally.mp}/${ally.maxmp}`;
      setBattlePreview(button, `${sk.name} -> ${ally.name}`, skillPreview(u, sk, ally));
      button.onclick = () => useSkill(u, sk, ally);
      el.actions.appendChild(button);
    });
  } else battle.enemies.filter(enemyUnit => enemyUnit.hp > 0).forEach(enemyUnit => {
    const revealWeakness = knownWeakness(enemyUnit);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${enemyUnit.name} Lv ${enemyUnit.level} | HP ${enemyUnit.hp}/${enemyUnit.max} | Weak: ${revealWeakness ? enemyUnit.weak : "???"}`;
    setBattlePreview(button, `${sk.name} -> ${enemyUnit.name}`, `${skillPreview(u, sk, enemyUnit)} Target weakness: ${revealWeakness ? enemyUnit.weak : "hidden"}.`);
    button.onclick = () => useSkill(u, sk, enemyUnit);
    el.actions.appendChild(button);
  });
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back to Commands";
  setBattlePreview(back, "Cancel target", "Return to the command list without spending the turn.");
  back.onclick = closeTargetSelection;
  el.actions.appendChild(back);
  highlightBattleAction();
}

function closeTargetSelection() {
  battle.targetMode = false;
  battle.pendingSkill = null;
  battleActionIndex = 0;
  renderBattle("Choose a class command.");
}

function defendReduction(u) {
  return Math.round((1 - Math.max(.15, .45 - effectValue(u.id, "blockPower") - talentValue(u.id, "blockTalent"))) * 100);
}

function useDefend(u) {
  if (battle.resolving) return;
  const timing = battleActionTiming("block");
  battle.resolving = true;
  u.anim = "block";
  u.guarding = true;
  state.resonance = Math.min(100, state.resonance + 6);
  effect = makeBattleEffect(u, { anim: "block", name: "Defend", element: baseJobs[u.id].element }, u);
  playSfx("block");
  setTimeout(() => u.anim = "idle", timing.totalMs - 100);
  updatePanels();
  const log = `${u.name} defends, reducing the next direct hit by ${defendReduction(u)}% and gaining 6 Resonance.`;
  renderBattle(log);
  setTimeout(() => {
    if (battle && mode === "battle") finishTurn(log);
  }, timing.totalMs);
}

function battleActionTiming(anim) {
  return {
    melee: { effectTicks: 44, impactTicks: 26, impactMs: 430, totalMs: 900 },
    magic: { effectTicks: 64, impactTicks: 38, impactMs: 640, totalMs: 1200 },
    ultimate: { effectTicks: 104, impactTicks: 62, impactMs: 1030, totalMs: 1900 },
    block: { effectTicks: 48, impactTicks: 28, impactMs: 460, totalMs: 900 }
  }[anim] || { effectTicks: 48, impactTicks: 28, impactMs: 460, totalMs: 950 };
}

function characterVfxRow(caster, sk) {
  if (sk.transform || sk.basicAttack || sk.name === "Defend") return null;
  if (sk.power < 0) return "heal";
  if (!skillTargetsEnemies(sk)) return "heal";
  if (sk.anim === "ultimate") return "ultimate";
  return "projectile";
}

function skillVisualTiming(caster, sk) {
  const timing = battleActionTiming(sk.anim);
  const row = characterVfxRow(caster, sk);
  if (!row || !characterVfxSheets[battleVisualId(caster)]) return timing;
  if (row === "ultimate") {
    const impactMs = Math.round(timing.impactMs * .75);
    return { ...timing, impactMs, totalMs: impactMs + timing.totalMs - timing.impactMs };
  }
  if (row !== "heal") return timing;
  // Guard/heal poses share the existing animation, but give the healing effect time to travel.
  return { ...timing, impactMs: Math.max(780, timing.impactMs), totalMs: Math.max(1320, timing.totalMs) };
}

function battleVfxAnchor(unit) {
  const partyIndex = battle.party.indexOf(unit);
  if (partyIndex >= 0) {
    const [x, baseline] = partyBattlePosition(partyIndex, battle.party.length);
    return { x, y: baseline - 27 };
  }
  const enemyIndex = battle.enemies.indexOf(unit);
  const [x, baseline] = enemyBattlePosition(Math.max(0, enemyIndex), battle.enemies.length);
  const key = enemyAnimationKey(unit);
  const height = (enemyAnimationHeights[key] || 44) * enemyBattleScale(key);
  return { x, y: baseline - Math.max(17, height * .48) };
}

function characterVfxTargets(caster, sk, target) {
  if (!(sk.power < 0) && !skillTargetsEnemies(sk)) {
    if (sk.partyWide || sk.targetSide === "party") return battle.party.filter(ally => ally.hp > 0);
    return [sk.targetSide === "ally" ? target : caster];
  }
  if (sk.power < 0) {
    const living = battle.party.filter(ally => ally.hp > 0 || sk.revive);
    const healthRatio = ally => ally.hp > 0 ? ally.hp / ally.max : sk.revive;
    const wounded = living.slice().sort((a, b) => healthRatio(a) - healthRatio(b))[0] || caster;
    const healed = sk.partyWide || talentValue(caster.id, "partyHeal", sk.name) > 0
      ? living : sk.targetSide === "self" ? [caster] : [wounded];
    return [...new Set([...healed, ...(sk.revive ? battle.party.filter(ally => ally.hp <= 0) : [])])];
  }
  return skillHitsAll(caster.id, sk) ? battle.enemies.filter(enemy => enemy.hp > 0) : [target];
}

function characterVfxSample(fx, target, elapsed) {
  const from = battleVfxAnchor(fx.source);
  const to = battleVfxAnchor(target);
  const launchMs = fx.vfxRow === "ultimate" ? 180 : 100;
  const progress = Math.max(0, Math.min(1, (elapsed - launchMs) / (fx.timing.impactMs - launchMs)));
  const phase = elapsed >= fx.timing.impactMs ? 'impact' : elapsed < launchMs ? 'begin' : 'travel';
  const frame = phase === 'impact' ? 3 : phase === 'begin' ? 0 : progress < .5 ? 1 : 2;
  return { from, to, frame, phase, progress, x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
}

function drawCharacterVfx(fx) {
  const sheet = characterVfxSheets[fx.characterVfx];
  if (!sheet) return;
  const elapsed = performance.now() - fx.startedAt;
  if (elapsed < 0) return;
  const row = sheet.rows[fx.vfxRow];
  fx.targets.forEach(target => {
    const sample = characterVfxSample(fx, target, elapsed);
    const impact = sample.phase === 'impact';
    const connected = sheet.modes[row] === 'connected';
    const cell = sheet.rects[row][connected ? 0 : sample.frame];
    const size = fx.vfxRow === "ultimate" ? (impact ? 92 : 76) : fx.vfxRow === "heal" ? (impact ? 64 : 48) : (impact ? 62 : 52);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 20, LOGICAL_WIDTH, BATTLE_ARENA_HEIGHT - 20);
    ctx.clip();
    ctx.translate(sample.x, sample.y);
    // Healing circles remain upright; offensive projectiles follow the actual diagonal.
    const angle = !impact && fx.vfxRow !== "heal" ? Math.atan2(sample.to.y - sample.from.y, sample.to.x - sample.from.x) : 0;
    ctx.rotate(angle);
    const fadeStart = fx.timing.totalMs - 180;
    ctx.globalAlpha = elapsed > fadeStart ? Math.max(0, (fx.timing.totalMs - elapsed) / 180) : 1;
    ctx.imageSmoothingEnabled = true;
    const anchorX = connected ? cell.anchorX : .5;
    const anchorY = connected ? cell.anchorY : .5;
    const stretch = connected ? (sample.phase === 'begin' ? 1 : impact ? 2.2 : 1.6 + sample.progress * .6) : sample.phase === 'travel' ? 1.6 : 1;
    let scale = size / Math.max(cell.h, cell.w / stretch);
    // Fit the entire rotated image, including the tail behind its impact anchor.
    for (const x of [-cell.w * anchorX, cell.w * (1 - anchorX)]) {
      for (const y of [-cell.h * anchorY, cell.h * (1 - anchorY)]) {
        const dx = x * Math.cos(angle) - y * Math.sin(angle);
        const dy = x * Math.sin(angle) + y * Math.cos(angle);
        if (dx) scale = Math.min(scale, (dx < 0 ? sample.x : LOGICAL_WIDTH - sample.x) / Math.abs(dx));
        if (dy) scale = Math.min(scale, (dy < 0 ? sample.y - 20 : BATTLE_ARENA_HEIGHT - sample.y) / Math.abs(dy));
      }
    }
    scale = Math.max(0, scale);
    const width = cell.w * scale, height = cell.h * scale;
    ctx.drawImage(sheet.image, cell.x, cell.y, cell.w, cell.h, -width * anchorX, -height * anchorY, width, height);
    ctx.restore();
  });
}

function makeBattleEffect(caster, skillData, target) {
  const vfxRow = characterVfxRow(caster, skillData);
  const spriteId = battleVisualId(caster);
  if (vfxRow && characterVfxSheets[spriteId]) {
    return {
      characterVfx: spriteId, vfxRow, source: caster,
      targets: characterVfxTargets(caster, skillData, target),
      timing: skillVisualTiming(caster, skillData), startedAt: performance.now(),
      kind: skillData.anim, caster: caster.id, skill: skillData.name,
      t: 0, duration: battleActionTiming(skillData.anim).effectTicks,
      impactTicks: battleActionTiming(skillData.anim).impactTicks
    };
  }
  const casterIndex = Math.max(0, battle.party.indexOf(caster));
  const [fromX, fromBaseline] = partyBattlePosition(casterIndex, battle.party.length);
  const partyTargetIndex = battle.party.indexOf(target);
  const enemyTargetIndex = battle.enemies.indexOf(target);
  let toX = fromX;
  let toY = fromBaseline - 26;
  if (partyTargetIndex >= 0) {
    const [anchorX, baseline] = partyBattlePosition(partyTargetIndex, battle.party.length);
    toX = anchorX;
    toY = baseline - 27;
  } else if (enemyTargetIndex >= 0) {
    const [anchorX, baseline] = enemyBattlePosition(enemyTargetIndex, battle.enemies.length);
    toX = anchorX;
    toY = baseline - 17;
  }
  const timing = battleActionTiming(skillData.anim);
  return {
    kind: skillData.anim,
    caster: caster.id,
    skill: skillData.name,
    element: skillData.element,
    color: elementColor(skillData.element),
    t: 0,
    fromX,
    fromY: fromBaseline - 27,
    toX,
    toY,
    x: toX,
    y: toY,
    duration: timing.effectTicks,
    impactTicks: timing.impactTicks
  };
}

function canGrantImmediateTurn() {
  return Boolean(battle && battle.extraTurns < 2 && battle.party.some(unit => unit.hp > 0 && !statusOf(unit, "overheated")));
}

function grantImmediateTurn(caster, sourceSkill) {
  if (battle.extraTurns >= 2) return "Extra-turn limit reached.";
  const candidates = battle.party.filter(unit => unit.hp > 0 && !statusOf(unit, "overheated"));
  if (!candidates.length) return "No ally can be overclocked.";
  const others = candidates.filter(unit => unit !== caster);
  const target = (others.length ? others : candidates)
    .sort((a, b) => effectiveAgility(b, totals(b.id).agi) - effectiveAgility(a, totals(a.id).agi))[0];
  const extraTurn = { side: "party", id: target.id, name: target.name, agi: effectiveAgility(target, totals(target.id).agi), extra: true };
  battle.turnQueue.splice(battle.turnIndex + 1, 0, extraTurn);
  battle.extraTurns++;
  if (sourceSkill.appliesOverheated) applyStatus(target, "overheated", caster, { duration: 2, force: true });
  return `${target.name} gains an immediate action.`;
}

function applyWeaponBasicAttackEffect(source, target) {
  const gear = gearByName(baseJobs[source.id]?.gear?.weapon);
  const basic = weaponBasicAttackEffect(gear);
  if (!basic) return "";
  const duration = (basic.duration || 2) + typedTalentValue(source.id, "basicDebuffDuration");
  if (typedTalentValue(source.id, "weaponSongBoost")) source.nextSongBoost = Math.max(source.nextSongBoost || 0, typedTalentValue(source.id, "weaponSongBoost"));
  if (basic.type === "status" && target?.hp > 0) {
    const result = applyStatus(target, basic.status, source, { ...basic, duration, force: true, scaling: basic.status === "poison" ? "str" : "mag" });
    return result.applied ? basic.label : "";
  }
  if (basic.type === "barrier") applyStatus(source, "barrier", source, { duration, value: basic.value, force: true });
  if (basic.type === "echoPower") applyStatus(source, "echoPower", source, { duration, value: basic.value, force: true });
  if (basic.type === "resonance") state.resonance = Math.min(100, state.resonance + basic.value);
  if (basic.type === "songCharge") source.nextSongBoost = Math.max(source.nextSongBoost || 0, basic.value + typedTalentValue(source.id, "weaponSongBoost"));
  if (basic.type === "heal") {
    const restored = Math.min(Math.max(1, Math.round(source.max * basic.value)), source.max - source.hp);
    source.hp += restored;
    if (restored) addBattleFloater(source, restored, { kind: "heal" });
  }
  return basic.label;
}

function gainEnemyResonance(unit, amount) {
  if (!battle || !unit || amount <= 0) return 0;
  const locked = battle.enemies.some(enemyUnit => enemyUnit.hp > 0 && statusOf(enemyUnit, "resonanceLocked"));
  if (locked) return 0;
  const before = battle.enemyResonance || 0;
  const generation = 1 + (unit.affixes?.resonanceGeneration || 0);
  battle.enemyResonance = Math.min(100, before + Math.max(1, Math.round(amount * generation)));
  return battle.enemyResonance - before;
}

function applyEnemyResonanceControl(source, target, sk) {
  if (!target || target.hp <= 0) return "";
  const before = battle?.enemyResonance || 0;
  let removed = 0;
  if (sk.enemyResonanceClear) {
    removed = before;
    battle.enemyResonance = 0;
  } else if (sk.enemyResonanceDrainRatio) {
    removed = Math.round(before * sk.enemyResonanceDrainRatio);
    battle.enemyResonance = Math.max(0, before - removed);
  } else if (sk.enemyResonanceDrain) {
    removed = Math.min(before, sk.enemyResonanceDrain);
    battle.enemyResonance = Math.max(0, before - removed);
  }
  if (sk.enemyResonanceLock) {
    applyStatus(target, "resonanceLocked", source, { duration: sk.enemyResonanceLock, force: true });
  }
  const transferred = Math.round(removed * (sk.resonanceTransfer || 0));
  if (transferred) {
    state.resonance = Math.min(100, state.resonance + transferred);
  }
  if (!removed && !sk.enemyResonanceLock) return "";
  const lockText = sk.enemyResonanceLock ? ` and seals new gains for ${sk.enemyResonanceLock} action${sk.enemyResonanceLock === 1 ? "" : "s"}` : "";
  return `${sk.name} removes ${removed} Resonance${transferred ? ` and grants the party ${transferred}` : ""}${lockText}.`;
}

function skillDamageTalentMultiplier(source, sk, target, zeroResonance = battle?.enemyResonance === 0) {
  if (!source?.id) return 1;
  let bonus = 0;
  if (sk.element === "Holy Fire") bonus += typedTalentValue(source.id, "holyFireDamage");
  if (sk.element === "Tech") bonus += typedTalentValue(source.id, "techDamage");
  if (sk.element === "Ancient Fire") bonus += typedTalentValue(source.id, "ancientFireDamage");
  if (source.form === "shadowpriest") bonus += typedTalentValue(source.id, "shadowpriestDamage");
  if (sk.allEnemies) bonus += typedTalentValue(source.id, "aoeDamage");
  if (!sk.allEnemies && sk.element === "Ancient Fire") bonus += typedTalentValue(source.id, "burstCapstone");
  if (target && statusOf(target, "burn") && sk.element === "Ancient Fire") bonus += typedTalentValue(source.id, "burningDamage");
  if (source.id === "Glimmer" && sk.element === "Tech" && statusOf(target, "disrupted")) bonus += typedTalentValue(source.id, "systemCrash");
  if (source.id === "Seerin") {
    if (sk.element === "Holy Fire" && zeroResonance) bonus += typedTalentValue(source.id, "purifyingOath");
    if (sk.basicAttack && statusOf(target, "broken")) bonus += typedTalentValue(source.id, "shieldBash");
    if (sk.anim === "ultimate" && !sk.transform && (zeroResonance || statusOf(target, "holyVulnerability"))) bonus += typedTalentValue(source.id, "oathfireAscendant");
  }
  if (source.form === "mech") bonus += typedTalentValue(source.id, "mechOverload") + typedTalentValue(source.id, "mechCapstone");
  return 1 + bonus;
}

function restoreTalentHp(target, amount) {
  if (!target || target.hp <= 0) return 0;
  const restored = Math.min(Math.max(0, Math.round(amount)), target.max - target.hp);
  target.hp += restored;
  if (restored) addBattleFloater(target, restored, { kind: "heal" });
  return restored;
}

function woundedLivingAlly(exclude = null) {
  return battle.party.filter(ally => ally.hp > 0 && ally !== exclude).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
}

function transferDeadSparkyBurns() {
  if (!battle?.enemies) return;
  const dead = battle.enemies.filter(enemy => enemy.hp <= 0 && !enemy.wildfireTransferred && statusOf(enemy, "burn")?.source?.id === "Sparky");
  if (!dead.length || !typedTalentValue("Sparky", "deathBurnTransfer")) return;
  dead.forEach(enemy => {
    const burn = statusOf(enemy, "burn");
    if (burn?.source?.id !== "Sparky" || burn.remaining <= 0) return;
    enemy.wildfireTransferred = true;
    const next = battle.enemies.find(target => target.hp > 0 && !statusOf(target, "burn")) || battle.enemies.find(target => target.hp > 0);
    if (!next) return;
    next.statuses = ensureStatuses(next).filter(status => status.type !== "burn");
    // Copy the applied duration/potency without reapplying Smolder or Old Flame.
    next.statuses.push({ ...burn, source: { ...burn.source }, value: Math.max(1, Math.round(burn.value * .75)) });
    addBattleFloater(next, 0, { kind: "status", text: "BURN TRANSFERRED" });
  });
}

function combatDroneFollowUp(source, totalDamage, targetCount) {
  const drone = statusOf(source, "combatDrone");
  const carrier = source.id === "Glimmer" && source.form === "mech" ? typedTalentValue(source.id, "mechCarrier") : 0;
  if ((!drone && !carrier) || (!carrier && totalDamage <= 0)) return "";
  const ownerId = baseJobs[drone?.source?.id] ? drone.source.id : source.id;
  const dual = typedTalentValue(ownerId, "dronePower");
  const base = (drone?.value ?? .25) + typedTalentValue(ownerId, "droneBaseBonus");
  const damage = Math.max(1, Math.round((totals(ownerId).mag * base + totalDamage / Math.max(1, targetCount) * .15) * (1 + dual) * (1 + carrier)));
  const enemies = battle.enemies.filter(enemy => enemy.hp > 0);
  let log = "";
  function strike(enemy, ratio) {
    if (!enemy || enemy.hp <= 0) return;
    const crash = ownerId === "Glimmer" && statusOf(enemy, "disrupted") ? typedTalentValue(ownerId, "systemCrash") : 0;
    const amount = Math.max(1, Math.round(damage * ratio * (1 + crash)));
    enemy.hp = Math.max(0, enemy.hp - amount);
    enemy.flash = 10;
    addBattleFloater(enemy, amount, { damageType: "Drone Tech" });
    if (enemy.hp <= 0 && !enemy.defeatUntil) {
      enemy.anim = "death"; enemy.deathTick = tick;
      enemy.defeatUntil = tick + (enemyAnimationSheetFor(enemy) ? 30 : 12);
    }
    log += ` Combat Drone hits ${enemy.name} for ${amount}.`;
  }
  strike(enemies[0], 1);
  if (dual) strike(enemies[1], .5);
  const swarm = typedTalentValue(ownerId, "droneSwarm");
  if (swarm) {
    const living = battle.enemies.filter(enemy => enemy.hp > 0);
    strike(dual ? living.find(enemy => enemy !== enemies[0]) || living[0] : living[0], swarm);
  }
  return log;
}

function finishMechTalentAction(unit) {
  if (unit?.id !== "Glimmer" || unit.form !== "mech" || unit.mechClinicResolved || !typedTalentValue(unit.id, "mechClinic")) return "";
  unit.mechClinicResolved = true;
  const ally = woundedLivingAlly();
  if (!ally) return "";
  const belowHalf = ally.hp / ally.max < .5;
  const hospital = typedTalentValue(unit.id, "mobileHospital");
  const restored = restoreTalentHp(ally, totals(unit.id).mag * (hospital || .25));
  if (hospital && belowHalf) applyStatus(ally, "barrier", unit, { duration: 2, value: .15, force: true });
  return ` Mobile ${hospital ? "Hospital" : "Clinic"} heals ${ally.name} for ${restored} HP.`;
}

function successfulSparkyIntercept(unit) {
  if (unit.id !== "Sparky") return;
  state.resonance = Math.min(100, state.resonance + typedTalentValue(unit.id, "interceptResonance"));
  if (unit.hp <= 0) return;
  if (typedTalentValue(unit.id, "interceptEvasion")) applyStatus(unit, "evasion", unit, { duration: 1, incomingCharges: 1, value: .3, force: true });
  if (typedTalentValue(unit.id, "interceptPrrrp")) unit.prrrpWindow = 2;
}

function guardedTalentBreak(source, enemy) {
  if (source.id !== "Seerin" || enemy.hp <= 0) return;
  const result = addBreakProgress(source, enemy, 1);
  if (result.breaks) {
    enemy.hp = Math.max(0, enemy.hp - result.bonusDamage);
    applyStatus(enemy, "broken", source, { duration: 1, force: true });
    addBattleFloater(enemy, result.bonusDamage, { damageType: "Break" });
  }
}

function useSkill(u, selectedSkill, chosenTarget = null) {
  if (battle.resolving) return;
  if (selectedSkill.oncePerBattle && battle.usedOnce[selectedSkill.oncePerBattle]) return renderBattle(`${selectedSkill.name} was already used this battle.`);
  const selectedCost = skillMpCost(u.id, selectedSkill, u);
  if (selectedSkill.anim !== "ultimate" && selectedCost > u.mp) return renderBattle(`${u.name} needs more MP.`);
  let sk = selectedSkill;
  if (selectedSkill.encore) {
    if (!battle.lastSupport) return renderBattle("Encore needs an earlier support song.");
    sk = { ...battle.lastSupport, name: `Encore: ${battle.lastSupport.name}`, anim: selectedSkill.anim, cost: selectedSkill.cost, encoreResolved: true };
  }
  if (sk.immediateTurn && !canGrantImmediateTurn()) return renderBattle("No extra action available: maximum 2 per battle, and Overheated allies cannot receive one. No MP spent.");
  if (selectedSkill.anim === "ultimate" && state.resonance < 100) return renderBattle("An ultimate requires 100 Resonance.");
  const liveAtStart = battle.enemies.filter(e => e.hp > 0);
  const target = sk.targetSide === "ally"
    ? (chosenTarget?.hp > 0 ? chosenTarget : battle.party.find(ally => ally.hp > 0) || u)
    : skillTargetsEnemies(sk)
      ? (chosenTarget?.hp > 0 ? chosenTarget : liveAtStart[0])
      : u;
  const timing = skillVisualTiming(u, sk);
  battle.targetMode = false;
  battle.pendingSkill = null;
  battle.resolving = true;
  u.anim = battleAnimationName(sk, u);
  if (selectedSkill.anim !== "ultimate") {
    u.mp -= selectedCost;
    if (u.nextSkillDiscount && selectedCost > 0) delete u.nextSkillDiscount;
    if (selectedSkill.element === "Sound") battle.usedOnce[`firstSong:${u.id}`] = true;
  }
  else state.resonance = 0;
  if (selectedSkill.oncePerBattle) battle.usedOnce[selectedSkill.oncePerBattle] = true;
  playSfx(sk.anim);
  updatePanels();
  const livingAtStart = battle.party.filter(p => p.hp > 0);
  const woundedAtStart = livingAtStart.slice().sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0] || u;
  effect = makeBattleEffect(u, sk, sk.power < 0 ? woundedAtStart : sk.targetSide === "ally" ? target : skillTargetsEnemies(sk) ? target || u : u);
  renderBattle(`${u.name} prepares ${sk.name}...`);
  setTimeout(() => { if (u) u.anim = "idle"; }, timing.totalMs - 100);

  setTimeout(() => {
    if (!battle || mode !== "battle") return;
    battle.attackDamage = [];
    let feedbackUsed = false;
    let purifyingUsed = false;
    const refreshedBurns = new Set();
    const zeroResonanceAtStart = battle.enemyResonance === 0;
    let log = `${battle.turnStartMessage ? `${battle.turnStartMessage} ` : ""}${u.name} uses ${sk.name}.`;
    const supportTargets = sk.targetSide === "self"
      ? [u]
      : sk.targetSide === "ally"
        ? [target]
      : sk.partyWide || sk.targetSide === "party"
        ? battle.party.filter(ally => ally.hp > 0)
        : [u];

    if (sk.revive) {
      battle.party.filter(ally => ally.hp <= 0).forEach(ally => {
        const revivedHp = reviveBattleUnit(ally, sk.revive);
        addBattleFloater(ally, revivedHp, { kind: "heal" });
        log += ` ${ally.name} returns with ${revivedHp} HP.`;
      });
    }

    if (sk.power < 0) {
      const living = battle.party.filter(p => p.hp > 0);
      const wounded = living.slice().sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0] || u;
      const healing = healingAmount(u.id, sk, u);
      const healTargets = sk.partyWide || talentValue(u.id, "partyHeal", sk.name) > 0 ? living : sk.targetSide === "self" ? [u] : [wounded];
      let totalRestored = 0;
      let criticalHeals = 0;
      healTargets.forEach(ally => {
        const belowHalf = ally.hp / ally.max < .5;
        const protector = ally.hp / ally.max < .35 ? 1 + typedTalentValue(u.id, "woundedProtection") : 1;
        const critical = Math.random() < healingCritChance(u);
        const restored = Math.min(Math.round((critical ? healing * 2 : healing) * protector), ally.max - ally.hp);
        ally.hp += restored;
        totalRestored += restored;
        if (critical && restored) criticalHeals++;
        addBattleFloater(ally, restored, { kind: "heal", crit: critical });
        const barrier = sk.name === "Patch Job" ? typedTalentValue(u.id, "patchBarrier") : sk.name === "Prrrp" ? typedTalentValue(u.id, "prrrpBarrier") : 0;
        if (barrier && belowHalf) applyStatus(ally, "barrier", u, { duration: 2, value: barrier * protector, force: true });
      });
      if (sk.name === "Prrrp") delete u.prrrpWindow;
      if (sk.cleanse || /Oath Unbound/.test(sk.name)) {
        let cleansed = 0;
        healTargets.forEach(ally => cleansed += cleanseWithTalent(u, ally));
        if (cleansed) log += ` PURIFY removed ${cleansed} negative effect${cleansed === 1 ? "" : "s"}.`;
      }
      battle.ward = battle.ward || sk.anim === "block" || sk.grantsWard || /Oath Unbound/.test(sk.name);
      const buffNotes = applySkillBuffs(u, healTargets, sk);
      if (buffNotes.length) log += ` ${buffNotes.join(" ")}.`;
      state.resonance = Math.min(100, state.resonance + 5);
      log += ` ${healTargets.length > 1 ? "The party recovers" : `${healTargets[0].name} recovers`} ${totalRestored} HP.`;
      if (criticalHeals) log += ` ${criticalHeals === 1 ? "CRITICAL HEAL!" : `${criticalHeals} CRITICAL HEALS!`}`;
    } else if (!skillTargetsEnemies(sk)) {
      if (sk.transform && activateTransformation(u, sk.transform)) {
        log += ` ${sk.transform === "mech" ? "Mech Form" : "Shadowpriest"} engaged for ${u.formTurns} actions.`;
      }
      if (sk.cleanse) {
        let cleansed = 0;
        supportTargets.forEach(ally => {
          cleansed += cleanseWithTalent(u, ally);
        });
        log += cleansed ? ` PURIFY removed ${cleansed} negative effect${cleansed === 1 ? "" : "s"}.` : " No negative effects were present.";
      }
      if (sk.grantsWard || sk.anim === "block") {
        battle.ward = true;
        log += " Party Guard is active.";
      }
      const buffNotes = applySkillBuffs(u, supportTargets, sk);
      if (buffNotes.length) log += ` ${buffNotes.join(" ")}.`;
      if (sk.immediateTurn) log += ` ${grantImmediateTurn(u, sk)}`;
      state.resonance = Math.min(100, state.resonance + (sk.anim === "block" ? 12 : 6));
    } else if (sk.statusOnly && target) {
      const notes = applySkillStatuses(u, target, sk);
      log += ` ${target.name}: ${notes.join(", ")}.`;
      state.resonance = Math.min(100, state.resonance + 6);
    } else if (sk.dispel && target) {
      const removed = dispelStatus(target);
      if (removed) addBattleFloater(target, 0, { kind: "dispel", text: `DISPELLED: ${removed.toUpperCase()}` });
      log += removed ? ` ${target.name} loses ${removed}.` : ` ${target.name} has no removable buff.`;
      if (u.id === "Seerin" && sk.name === "Radiant Purge" && typedTalentValue(u.id, "radiantJudgment")) {
        battle.enemyResonance = Math.max(0, battle.enemyResonance - 25);
        applyStatus(u, "holyFollowUp", u, { duration: 1, value: .15, force: true });
        log += " Enemy Resonance -25. Seerin gains Holy Follow-up 15%.";
      }
      state.resonance = Math.min(100, state.resonance + 6);
      playSfx("magic");
    } else if (target) {
      const live = battle.enemies.filter(e => e.hp > 0);
      const t = totals(u.id);
      const hitTargets = skillHitsAll(u.id, sk) ? live : [target];
      let totalDamageDealt = 0;
      let directDamageDealt = 0;
      const holyFollowUpPower = statusValue(u, "holyFollowUp");
      let holyFollowUpTriggered = false;
      hitTargets.forEach(hitTarget => {
        if (tryEvadeAttack(hitTarget)) {
          addBattleFloater(hitTarget, 0, { kind: "evade", text: "EVADE!" });
          log += ` ${hitTarget.name}: EVADE!`;
          return;
        }
        const brokenAtHitStart = Boolean(statusOf(hitTarget, "broken"));
        const disruptedAtHitStart = Boolean(statusOf(hitTarget, "disrupted"));
        if (u.id === "Seerin" && sk.element === "Holy Fire" && zeroResonanceAtStart && !purifyingUsed && typedTalentValue(u.id, "purifyingOath")) {
          purifyingUsed = true;
          const removed = removeCleanseStatus(u);
          if (removed) log += ` Purifying Oath removes ${removed}.`;
        }
        const rank0BreakPayoff = sk.rank0BreakPayoff && (brokenAtHitStart || (hitTarget.stagger || 0) >= 2) ? 1 + sk.rank0BreakPayoff : 1;
        const afflicted = hasNegativeStatus(hitTarget);
        const critChance = Math.min(.65, heroCritChance(u.id, afflicted) + statusValue(u, "critUp") + statusValue(hitTarget, "marked") + statusValue(hitTarget, "critExposed"));
        const statKey = skillScaling(sk);
        const offensiveStat = skillOffensiveStat(u.id, sk, u, t);
        let dmg = (sk.coefficient ? offensiveStat * sk.coefficient : sk.power + offensiveStat) + Math.floor(Math.random() * 6);
        dmg *= skillDamageTalentMultiplier(u, sk, hitTarget, zeroResonanceAtStart);
        if (sk.anim === "ultimate") dmg *= ultimatePotencyMultiplier(u.id, sk);
        if (sk.element === "Sound" && u.nextSongBoost) {
          dmg *= 1 + u.nextSongBoost;
          delete u.nextSongBoost;
        }
        const weaknessHit = skillHitsElementWeakness(hitTarget, sk);
        const breakGain = canGenerateBreak(u) ? (sk.staggerPower || (weaknessHit ? 2 : 1))
          + typedTalentValue(u.id, "staggerBonus")
          + (sk.rank0Break || 0)
          + (u.id === "Seerin" && sk.anim === "ultimate" && hitTarget === target ? typedTalentValue(u.id, "flameguardCharge") : 0)
          + (sk.basicAttack ? typedTalentValue(u.id, "basicBreak") : 0) : 0;
        const breakResult = addBreakProgress(u, hitTarget, breakGain);
        if (weaknessHit) {
          if (hitTarget.weak === sk.element && rememberWeakness(hitTarget)) log += " Weakness discovered: " + hitTarget.name + " / " + hitTarget.weak + "!";
          dmg = Math.floor(dmg * skillWeaknessMultiplier(u.id, sk, hitTarget));
          state.resonance = Math.min(100, state.resonance + 14);
          log += ` ${hitTarget.name}: Weakness!${sk.shadowExposureBonus && statusOf(hitTarget, "shadowExposed") ? " VOIDTHORN RUPTURE!" : ""}`;
        } else {
          state.resonance = Math.min(100, state.resonance + 5);
        }
        if (afflicted && sk.afflictedBonus) dmg *= 1 + sk.afflictedBonus;
        dmg *= rank0BreakPayoff;
        if (sk.buffScaling) dmg *= 1 + ensureStatuses(u).filter(status => STATUS_DEFS[status.type]?.buff).length * sk.buffScaling;
        const critical = Boolean(critChance && Math.random() < critChance);
        if (critical) {
          dmg *= sk.criticalMultiplier || 2;
          if (statusOf(hitTarget, "marked")) dmg *= 1 + typedTalentValue(u.id, "markedCritDamage") + typedTalentValue(u.id, "assassinSynergy");
          if (typedTalentValue(u.id, "critCostReduction")) u.nextSkillDiscount = typedTalentValue(u.id, "critCostReduction");
          log += ` ${hitTarget.name}: CRITICAL!`;
        }
        if (sk.basicAttack && typedTalentValue(u.id, "basicTwinStrike") && Math.random() < typedTalentValue(u.id, "basicTwinStrike")) {
          const twinDamage = Math.max(1, Math.round(dmg * .45));
          dmg += twinDamage;
          log += ` ${hitTarget.name}: Twin Fang +${twinDamage}!`;
        }
        if (sk.element === "Holy Fire") dmg *= 1 + statusValue(hitTarget, "holyVulnerability");
        if (sk.element === "Shadow") dmg *= 1 + statusValue(hitTarget, "shadowVulnerability");
        const defenseDebuff = statusValue(hitTarget, "defenseDown") + (statKey === "mag" ? statusValue(hitTarget, "magicDefenseDown") : 0);
        const wordPierce = u.id === "Verseborn" && sk.element === "Sound" ? typedTalentValue(u.id, "wordPierce") : 0;
        const defense = Math.max(0, statusValue(hitTarget, "defenseUp") - defenseDebuff) * (1 - Math.min(.8, (sk.pierce || 0) + wordPierce));
        dmg = Math.max(1, Math.round(dmg * outgoingDamageMultiplier(u, statKey === "str" ? "melee" : "magic", hitTarget) * (1 - defense)));
        if (brokenAtHitStart) dmg = Math.max(1, Math.round(dmg * brokenPhysicalDamageMultiplier(u, statKey, hitTarget)));
        if (breakResult.breaks) {
          dmg += breakResult.bonusDamage;
          if (!brokenAtHitStart) {
            applyStatus(hitTarget, "broken", u, { duration: 1, force: true });
            addBattleFloater(hitTarget, 0, { kind: "broken", text: "BROKEN!" });
            log += ` ${hitTarget.name}: BROKEN! +${breakResult.bonusDamage} Break damage; ${breakResult.remainder}/${BREAK_THRESHOLD} Break remains.`;
          }
        }
        const sleepBreak = breakSleepFromDamage(hitTarget);
        if (sleepBreak) log += ` ${hitTarget.name}: ${sleepBreak}`;
        if (sk.name.includes("Silent Step")) hitTarget.node = Math.min(3, hitTarget.node + 1);
        hitTarget.hp -= dmg;
        totalDamageDealt += dmg;
        directDamageDealt += dmg;
        const holyDamage = holyFollowUpPower ? Math.max(1, Math.round(dmg * holyFollowUpPower)) : 0;
        if (holyDamage) {
          hitTarget.hp -= holyDamage;
          totalDamageDealt += holyDamage;
          holyFollowUpTriggered = true;
        }
        gainEnemyResonance(hitTarget, critical ? 14 : 8);
        hitTarget.flash = 10;
        if (sk.multiHit > 1) {
          const baseHit = Math.floor(dmg / sk.multiHit);
          let remainder = dmg - baseHit * sk.multiHit;
          for (let hit = 0; hit < sk.multiHit; hit++) {
            const amount = baseHit + (remainder-- > 0 ? 1 : 0);
            addBattleFloater(hitTarget, amount, { damageType: sk.element, crit: critical && hit === sk.multiHit - 1, delayTicks: hit * 4 });
          }
        } else {
          addBattleFloater(hitTarget, dmg, { damageType: sk.element, crit: critical });
        }
        if (holyDamage) addBattleFloater(hitTarget, holyDamage, { damageType: "Holy Fire", delayTicks: sk.multiHit > 1 ? sk.multiHit * 4 : 4 });
        const statusNotes = hitTarget.hp > 0 ? applySkillStatuses(u, hitTarget, sk) : [];
        if (u.id === "Glimmer" && sk.element === "Tech" && disruptedAtHitStart && !feedbackUsed && typedTalentValue(u.id, "techResonanceDrain")) {
          feedbackUsed = true;
          const drain = typedTalentValue(u.id, "systemCrash") ? 20 : 10;
          battle.enemyResonance = Math.max(0, battle.enemyResonance - drain);
          statusNotes.push(`Feedback Loop: Resonance -${drain}`);
        }
        if (u.id === "Glimmer" && u.form === "mech" && hitTarget === target && typedTalentValue(u.id, "mechEmp") && hitTarget.hp > 0) applyStatus(hitTarget, "disrupted", u, { duration: 2, value: .2, force: true });
        if (u.id === "Sparky" && sk.element === "Ancient Fire" && typedTalentValue(u.id, "burnRefresh") && !refreshedBurns.has(hitTarget)) {
          const burn = statusOf(hitTarget, "burn");
          if (burn) { burn.remaining = burn.initialRemaining; refreshedBurns.add(hitTarget); }
        }
        const resonanceControl = applyEnemyResonanceControl(u, hitTarget, sk);
        if (resonanceControl) statusNotes.push(resonanceControl);
        if (critical && hitTarget.hp > 0 && typedTalentValue(u.id, "critBleed") && Math.random() < typedTalentValue(u.id, "critBleed")) {
          const bleed = applyStatus(hitTarget, "bleed", u, { force: true, duration: 3, scaling: "str" });
          if (bleed.message) statusNotes.push(bleed.message);
        }
        if (sk.basicAttack) {
          const weaponNote = applyWeaponBasicAttackEffect(u, hitTarget);
          if (weaponNote) statusNotes.push(weaponNote);
        }
        if (statusNotes.length) log += ` ${hitTarget.name}: ${statusNotes.join(" / ")}.`;
        if (hitTarget.hp <= 0 && !hitTarget.defeatUntil) {
          hitTarget.hp = 0;
          hitTarget.anim = "death";
          hitTarget.deathTick = tick;
          hitTarget.defeatUntil = tick + (enemyAnimationSheetFor(hitTarget) ? 30 : 12);
          if (typedTalentValue(u.id, "killEvasion")) applyStatus(u, "evasion", u, { duration: 2, incomingCharges: 2, value: typedTalentValue(u.id, "killEvasion"), force: true });
        }
        log += ` ${hitTarget.name} takes ${dmg}${holyDamage ? ` + ${holyDamage} Holy` : ""}.`;
      });
      if (u.id === "Mira" && sk.doublesStunChance) {
        applyStatus(u, "stunFocus", u, { duration: 1, force: true });
        log += " Mira's Stun chance remains doubled for her next turn.";
      }
      if (holyFollowUpTriggered) u.statuses = ensureStatuses(u).filter(status => status.type !== "holyFollowUp");
      if (!sk.allEnemies && sk.element === "Sound" && typedTalentValue(u.id, "splashDamage") && totalDamageDealt > 0) {
        battle.enemies.filter(enemy => enemy.hp > 0 && !hitTargets.includes(enemy)).forEach(enemy => {
          const splash = Math.max(1, Math.round(totalDamageDealt * typedTalentValue(u.id, "splashDamage")));
          enemy.hp = Math.max(0, enemy.hp - splash);
          addBattleFloater(enemy, splash, { damageType: "Sound" });
          log += ` Echoing Verse splashes ${enemy.name} for ${splash}.`;
        });
      }
      if (sk.element === "Earth" && (sk.staggerPower || 0) >= 3 && typedTalentValue(u.id, "aftershock") && totalDamageDealt > 0) {
        battle.enemies.filter(enemy => enemy.hp > 0 && !hitTargets.includes(enemy)).forEach(enemy => {
          const shock = Math.max(1, Math.round(totalDamageDealt * typedTalentValue(u.id, "aftershock")));
          enemy.hp = Math.max(0, enemy.hp - shock);
          addBattleFloater(enemy, shock, { damageType: "Earth" });
          log += ` Aftershock hits ${enemy.name} for ${shock}.`;
        });
      }
      const vampiric = statusValue(u, "vampiric");
      if (vampiric && directDamageDealt > 0) {
        const restored = Math.min(Math.max(1, Math.round(directDamageDealt * vampiric)), u.max - u.hp);
        u.hp += restored;
        if (restored) {
          addBattleFloater(u, restored, { kind: "heal" });
          log += ` VAMPIRIC restores ${restored} HP to ${u.name}.`;
          if (statusOf(u, "vampiric")?.source?.id === "Sparky") {
            const sparky = battle.party.find(ally => ally.id === "Sparky" && ally.hp > 0);
            if (sparky && typedTalentValue("Sparky", "emberBond")) restoreTalentHp(sparky, restored * .25);
            if (sparky && typedTalentValue("Sparky", "hearthfire")) restoreTalentHp(woundedLivingAlly(u), restored * .25);
          }
        }
      }
      if (sk.selfGuard) {
        u.guarding = true;
        log += ` ${u.name} remains Guarded.`;
      }
      if (u.id === "Seerin" && sk.anim === "ultimate" && !sk.transform) {
        if (typedTalentValue(u.id, "flameguardCharge")) u.guarding = true;
        if (typedTalentValue(u.id, "oathfireAscendant") && hitTargets.some(enemy => zeroResonanceAtStart || statusOf(enemy, "holyVulnerability"))) battle.enemyResonance = 0;
      }
      if (u.id === "Verseborn" && sk.anim === "ultimate" && sk.ultimateIndex === 1 && typedTalentValue(u.id, "ultimateBoost")) {
        battle.party.filter(ally => ally.hp > 0).forEach(ally => applyStatus(ally, "echoPower", u, { duration: 3, value: .2, force: true }));
        log += " Maestro of Flame grants Echo Power.";
      }
      if (sk.basicAttack) {
        const restored = Math.min(Math.max(1, Math.round(u.maxmp * .06)), u.maxmp - u.mp);
        u.mp += restored;
        if (restored) log += ` Normal Attack restores ${restored} MP (6% Max MP).`;
      }
      if (sk.element === "Holy Fire" && typedTalentValue(u.id, "selfCleanse")) {
        const negative = ensureStatuses(u).find(status => STATUS_DEFS[status.type]?.negative);
        if (negative) {
          u.statuses = u.statuses.filter(status => status !== negative);
          log += ` Cleansing Flame removes ${STATUS_DEFS[negative.type]?.label || negative.type}.`;
        }
      }
      if (["Holy Fire", "Ancient Fire"].includes(sk.element) && typedTalentValue(u.id, "fireEvasion") && Math.random() < typedTalentValue(u.id, "fireEvasion")) {
        applyStatus(u, "evasion", u, { duration: 2, incomingCharges: 2, value: typedTalentValue(u.id, "fireEvasion"), force: true });
        log += ` ${u.name} gains +${Math.round(typedTalentValue(u.id, "fireEvasion") * 100)}% Evasion for 2 incoming attacks.`;
      }
      if (sk.element === "Ancient Fire" && typedTalentValue(u.id, "ultimateGain")) {
        state.resonance = Math.min(100, state.resonance + 3);
      }
      const burningTarget = hitTargets.find(enemy => statusOf(enemy, "burn"));
      const spreadTarget = battle.enemies.find(enemy => enemy.hp > 0 && enemy !== burningTarget && !statusOf(enemy, "burn"));
      const spreadChance = typedTalentValue(u.id, "burnSpread") * (1 + typedTalentValue(u.id, "livingWildfire"));
      if (burningTarget && spreadTarget && spreadChance && Math.random() < spreadChance) {
        applyStatus(spreadTarget, "burn", u, { force: true, duration: 3, scaling: "mag", element: "Ancient Fire" });
        log += ` Wildfire spreads to ${spreadTarget.name}.`;
      }
      log += combatDroneFollowUp(u, totalDamageDealt, hitTargets.length);
      if (sk.selfHealRatio && totalDamageDealt > 0) {
        const restored = Math.min(Math.max(1, Math.round(totalDamageDealt * sk.selfHealRatio)), u.max - u.hp);
        u.hp += restored;
        if (restored) {
          addBattleFloater(u, restored, { kind: "heal" });
          log += ` ${u.name} drains ${restored} HP.`;
        }
      }
      playSfx("hit");
      if (state.gameMode === "hallBattles") {
        const sustain = resolveActionSustain(u, sk, directDamageDealt);
        if (sustain.hp) log += ` Leeching restores ${sustain.hp} HP to ${u.name}.`;
        if (sustain.mp) log += ` Siphoning restores ${sustain.mp} MP to ${u.name}.`;
      } else {
        const hpOnHit = effectValue(u.id, "hpOnHit");
        const mpOnHit = effectValue(u.id, "mpOnHit");
        if (hpOnHit) {
          const restored = Math.min(hpOnHit, u.max - u.hp);
          u.hp += restored;
          addBattleFloater(u, restored, { kind: "heal" });
          if (restored) log += ` ${u.name} restores ${restored} HP.`;
        }
        if (mpOnHit) {
          const restored = Math.min(scaledMpOnHitRecovery(u, mpOnHit), u.maxmp - u.mp);
          u.mp += restored;
          if (restored) log += ` ${u.name} restores ${restored} MP.`;
        }
      }
    }

    log += finishMechTalentAction(u);
    transferDeadSparkyBurns();
    if (sk.grantsWard) battle.ward = true;
    if (!selectedSkill.encore && !skillTargetsEnemies(sk) && sk.anim !== "ultimate") battle.lastSupport = { ...sk };
    const echoChance = effectValue(u.id, "echoing");
    const echoKey = `echoing:${u.id}`;
    if (echoChance && !battle.usedOnce[echoKey] && canGrantImmediateTurn() && Math.random() < echoChance) {
      battle.usedOnce[echoKey] = true;
      log += ` ECHOING: ${grantImmediateTurn(u, { appliesOverheated: true })}`;
    }
    updatePanels();
    finishAttackDamageSummary(log);
    renderBattle(log);
    const tailDelay = Math.max(260, timing.totalMs - timing.impactMs);
    if (battle.enemies.every(e => e.hp <= 0)) {
      setTimeout(() => {
        if (battle?.enemies.every(e => e.hp <= 0)) winBattle(log);
      }, Math.max(540, tailDelay));
      return;
    }
    setTimeout(() => {
      if (battle && mode === "battle") finishTurn(log);
    }, tailDelay);
  }, timing.impactMs);
}

function elementColor(element) {
  return { Sound: "#d9b8ff", Shadow: "#7250a8", "Holy Fire": "#ffd27d", Sigil: "#e9e0c7", Earth: "#d87536", Tech: "#7bd4c6", "Ancient Fire": "#b66cff", Heart: "#ff8cb3" }[element] || "#fff";
}

function carriedBattleItems() {
  return Object.entries(inventoryDb).filter(([name, info]) => info.battle && (state.inventory[name] || 0) > 0);
}

function canUseBattleItem(u, info) {
  if (info.battle === "hp") return u.hp > 0 && u.hp < u.max;
  if (info.battle === "mp") return u.hp > 0 && u.mp < u.maxmp;
  if (info.battle === "guard") return !battle.ward;
  return false;
}

function battleItemState(u, info) {
  if (info.battle === "hp" && u.hp >= u.max) return "HP Full";
  if (info.battle === "mp" && u.mp >= u.maxmp) return "MP Full";
  if (info.battle === "guard" && battle.ward) return "Guard Active";
  return info.short;
}

function openBattleItems(u) {
  if (!carriedBattleItems().some(([, info]) => canUseBattleItem(u, info))) return;
  battle.itemMode = true;
  battleActionIndex = 0;
  renderBattle(`${u.name}: choose one carried item.`);
}

function renderBattleItems(u) {
  const items = carriedBattleItems();
  items.forEach(([name, info]) => {
    const button = document.createElement("button");
    button.type = "button";
    const icon = inventoryIcon(name);
    button.innerHTML = `${pixelIconHtml(icon.sheet, icon.index, "battle-item-icon")}<span>${name} x${state.inventory[name]} | ${battleItemState(u, info)}</span>`;
    button.classList.add("battle-item-button");
    button.title = info.desc;
    setBattlePreview(button, name, `${battleItemState(u, info)} | Uses 1 item | Ends turn.`);
    button.disabled = !canUseBattleItem(u, info);
    button.onclick = () => useBattleItem(u, name);
    el.actions.appendChild(button);
  });
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back to Skills";
  setBattlePreview(back, "Back to Skills", "Return to the command list without using an item.");
  back.onclick = closeBattleItems;
  el.actions.appendChild(back);
  const firstUsable = [...el.actions.children].findIndex(button => !button.disabled);
  battleActionIndex = Math.max(0, firstUsable);
  highlightBattleAction();
}

function closeBattleItems() {
  if (!battle) return;
  battle.itemMode = false;
  battleActionIndex = 0;
  renderBattle("Choose a class command.");
}

function useBattleItem(u, name) {
  const info = inventoryInfo(name);
  if (!info.battle || !state.inventory[name] || !canUseBattleItem(u, info)) return;
  state.inventory[name]--;
  battle.itemMode = false;
  let log = `${u.name} uses ${name}.`;
  if (info.battle === "hp") {
    const before = u.hp;
    u.hp = Math.min(u.max, u.hp + info.value);
    const restored = u.hp - before;
    addBattleFloater(u, restored, { kind: "heal" });
    log += ` HP +${restored}.`;
    playSfx("item");
  } else if (info.battle === "mp") {
    const before = u.mp;
    u.mp = Math.min(u.maxmp, u.mp + info.value);
    log += ` MP +${u.mp - before}.`;
    playSfx("item");
  } else if (info.battle === "guard") {
    battle.ward = true;
    log += " Party Guard is active for the next enemy turn.";
    playSfx("block");
  }
  updatePanels();
  finishAttackDamageSummary(log);
  finishTurn(log);
}

function enemyMagicElement(unit) {
  const profile = enemyAbilityProfile(unit);
  if (profile?.element) return profile.element;
  return {
    "Holy Fire": "Shadow",
    Shadow: "Holy Fire",
    Sound: "Tech",
    Tech: "Sound",
    Earth: "Ancient Fire",
    "Ancient Fire": "Earth"
  }[unit.weak] || "Sigil";
}

function enemyCanHeal(unit) {
  const profile = enemyAbilityProfile(unit);
  return Boolean(profile && Object.values(profile.moves || {}).some(move => move.healing));
}

function enemyStatusFor(unit, actionKind) {
  const profile = enemyAbilityProfile(unit);
  const element = profile?.element || enemyMagicElement(unit);
  const type = element === "Shadow" ? (["Nyx", "Nyx Vael"].includes(unit.name) ? "sleep" : "poison") : ["Earth", "Tech"].includes(element) ? "stun" : null;
  if (!type) return null;
  return { type, chance: actionKind === "ultimate" ? .8 : .48 };
}

function enemyActionForKind(unit, kind, target = null) {
  const profile = enemyAbilityProfile(unit);
  const configured = profile?.moves?.[kind];
  if (configured) {
    const statusPotency = 1 + (unit.affixes?.statusPotency || 0);
    const enhance = status => status ? { ...status, chance: Math.min(.95, (status.chance ?? 1) * statusPotency) } : null;
    return {
      ...configured,
      status: enhance(configured.status),
      extraStatuses: (configured.extraStatuses || []).map(enhance),
      target
    };
  }
  if (kind === "ultimate") return { kind, name: profile?.ultimate || "Resonant Rupture", element: profile?.element || enemyMagicElement(unit), coefficient: unit.node >= 3 ? 1.12 : 1.55, allTargets: unit.node >= 3, target };
  if (kind === "magic") {
    const element = enemyMagicElement(unit);
    return { kind, name: profile?.magic || `${element} Pulse`, element, mpCost: 18, coefficient: .92, status: enemyStatusFor(unit, kind), target };
  }
  return { kind: "melee", name: profile?.melee || "Melee Strike", element: "Physical", mpCost: 0, coefficient: .92, target };
}

function enemyActionHitsAll(unit, action) {
  return Boolean(action.allTargets);
}

function enemyActionDealsDamage(action) {
  return ["melee", "magic", "ultimate"].includes(action.kind) && !action.healing || Boolean(action.damaging || action.coefficient);
}

function enemyActionMpCost(unit, action) {
  if (!action || action.kind === "ultimate") return 0;
  return Math.max(0, Math.round((action.mpCost || 0) * (1 - (unit.affixes?.mpEfficiency || 0))));
}

function enemyCanAfford(unit, action) {
  return enemyActionMpCost(unit, action) <= (unit.mp || 0);
}

function enemyPayoffMatches(action, target) {
  if (!action?.payoff || !target) return false;
  if (action.payoff === "broken") return Boolean(statusOf(target, "broken"));
  if (action.payoff === "marked") return Boolean(statusOf(target, "marked"));
  if (action.payoff === "burning") return Boolean(statusOf(target, "burn"));
  if (action.payoff === "afflicted") return hasNegativeStatus(target);
  if (action.payoff === "afflictedOrBroken") return hasNegativeStatus(target) || Boolean(statusOf(target, "broken"));
  return false;
}

function chooseEnemyTarget(unit, action, candidates = battle.party.filter(member => member.hp > 0)) {
  let valid = candidates.filter(member => member.hp > 0);
  if (!valid.length) return null;
  if (enemyActionHitsAll(unit, action)) return valid[Math.floor(Math.random() * valid.length)];
  const awake = valid.filter(member => !statusOf(member, "sleep"));
  if (awake.length) valid = awake;
  const payoffTargets = valid.filter(member => enemyPayoffMatches(action, member));
  if (payoffTargets.length) valid = payoffTargets;
  if (action.status?.type) {
    const unaffected = valid.filter(member => !statusOf(member, action.status.type));
    if (unaffected.length) valid = unaffected;
  }
  return valid[Math.floor(Math.random() * valid.length)];
}

function enemyTargetsForAction(unit, action, target) {
  return enemyActionHitsAll(unit, action)
    ? battle.party.filter(member => member.hp > 0)
    : [target].filter(member => member?.hp > 0);
}

function enemyCleanseStatus(unit) {
  return removableStatus(unit, CLEANSE_PRIORITY);
}

function enemyDispelStatus(unit) {
  return removableStatus(unit, DISPEL_PRIORITY);
}

function chooseEnemyHealTarget() {
  return battle.enemies.filter(ally => ally.hp > 0 && ally.hp < ally.max)
    .sort((a, b) => a.hp / a.max - b.hp / b.max)[0] || null;
}

function chooseEnemyCleanseTarget() {
  return battle.enemies.filter(ally => ally.hp > 0 && enemyCleanseStatus(ally))
    .sort((a, b) => (CLEANSE_PRIORITY[enemyCleanseStatus(b)?.type] || 0) - (CLEANSE_PRIORITY[enemyCleanseStatus(a)?.type] || 0))[0] || null;
}

function chooseEnemyDispelTarget() {
  return battle.party.filter(hero => hero.hp > 0 && enemyDispelStatus(hero))
    .sort((a, b) => (DISPEL_PRIORITY[enemyDispelStatus(b)?.type] || 0) - (DISPEL_PRIORITY[enemyDispelStatus(a)?.type] || 0))[0] || null;
}

function enemyBuffTarget(unit, action) {
  const living = battle.enemies.filter(ally => ally.hp > 0);
  const buffs = action.buffs || [];
  if (action.targetSide === "self") return buffs.some(buff => (statusOf(unit, buff.type)?.remaining || 0) <= 1) ? unit : null;
  const useful = living.filter(ally => buffs.some(buff => (statusOf(ally, buff.type)?.remaining || 0) <= 1));
  const candidates = useful.length ? useful : [];
  if (!candidates.length) return null;
  if (action.targetRole === "physical") return candidates.sort((a, b) => b.stats.str - a.stats.str)[0];
  if (action.targetRole === "caster") return candidates.sort((a, b) => b.stats.mag - a.stats.mag)[0];
  if (action.targetRole === "fast") return candidates.sort((a, b) => b.stats.agi - a.stats.agi)[0];
  if (action.targetRole === "tech") return candidates.find(ally => enemyAbilityProfile(ally)?.element === "Tech") || candidates.sort((a, b) => b.stats.mag - a.stats.mag)[0];
  if (action.targetRole === "threatened") return candidates.sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function enemyActionUseful(unit, action) {
  if (!action || !enemyCanAfford(unit, action)) return false;
  if (action.requiresEnemyStatus && !battle.party.some(hero => hero.hp > 0 && statusOf(hero, action.requiresEnemyStatus))) return false;
  if (action.requiresFallenAlly && !battle.defeated.length && !battle.enemies.some(ally => ally.hp <= 0)) return false;
  if (action.healing) {
    const target = chooseEnemyHealTarget();
    if (!target || target.hp / target.max >= .78) return false;
    action.target = target;
    return true;
  }
  if (action.cleanse && action.kind === "cleanse") {
    action.target = chooseEnemyCleanseTarget();
    return Boolean(action.target);
  }
  if (action.dispel && action.kind === "dispel") {
    action.target = chooseEnemyDispelTarget();
    return Boolean(action.target);
  }
  if (action.kind === "buff") {
    action.target = enemyBuffTarget(unit, action);
    return Boolean(action.target);
  }
  return true;
}

function enemyProfileAction(unit, key) {
  return enemyActionForKind(unit, key);
}

function chooseEnemyAction(unit) {
  const profile = enemyAbilityProfile(unit);
  if (statusOf(unit, "silence")) return enemyActionForKind(unit, "melee");
  if ((battle.enemyResonance || 0) >= 100) {
    return enemyActionForKind(unit, "ultimate");
  }
  const wounded = chooseEnemyHealTarget();
  const healingKey = Object.keys(profile?.moves || {}).find(key => profile.moves[key].healing && enemyCanAfford(unit, profile.moves[key]));
  if (wounded && wounded.hp / wounded.max < .35 && healingKey) {
    const action = enemyProfileAction(unit, healingKey);
    action.target = wounded;
    return action;
  }
  const cleanseKey = Object.keys(profile?.moves || {}).find(key => profile.moves[key].kind === "cleanse");
  if (cleanseKey) {
    const cleanse = enemyProfileAction(unit, cleanseKey);
    if (enemyActionUseful(unit, cleanse)) return cleanse;
  }
  const pattern = profile?.pattern || ["magic", "melee"];
  if (pattern.length) {
    const patternIndex = (unit.patternStep || 0) % pattern.length;
    unit.patternStep = (unit.patternStep || 0) + 1;
    for (let offset = 0; offset < pattern.length; offset++) {
      const action = enemyProfileAction(unit, pattern[(patternIndex + offset) % pattern.length]);
      if (enemyActionUseful(unit, action)) return action;
    }
  }
  return enemyActionForKind(unit, "melee");
}

function makeEnemyBattleEffect(unit, target, action) {
  const enemyIndex = Math.max(0, battle.enemies.indexOf(unit));
  const [fromX, fromBaseline] = enemyBattlePosition(enemyIndex, battle.enemies.length);
  const partyIndex = battle.party.indexOf(target);
  const enemyTargetIndex = battle.enemies.indexOf(target);
  let toX = fromX;
  let toY = fromBaseline - 24;
  if (partyIndex >= 0) {
    const [anchorX, baseline] = partyBattlePosition(partyIndex, battle.party.length);
    toX = action.kind === "ultimate" && (unit.npcBoss || unit.node >= 3) ? 62 : anchorX;
    toY = action.kind === "ultimate" && (unit.npcBoss || unit.node >= 3) ? 100 : baseline - 27;
  } else if (enemyTargetIndex >= 0) {
    const [anchorX, baseline] = enemyBattlePosition(enemyTargetIndex, battle.enemies.length);
    toX = anchorX;
    toY = baseline - 24;
  }
  const visualKind = action.kind === "melee" || action.kind === "ultimate" ? action.kind : "magic";
  const timing = battleActionTiming(visualKind);
  const profile = enemyAbilityProfile(unit);
  return {
    kind: visualKind,
    actionKind: action.kind,
    caster: unit.sprite || unit.name,
    enemyCaster: true,
    effectRow: profile?.row,
    skill: action.name,
    element: action.element,
    color: elementColor(action.element),
    t: 0,
    fromX,
    fromY: fromBaseline - 25,
    toX,
    toY,
    x: toX,
    y: toY,
    duration: timing.effectTicks,
    impactTicks: timing.impactTicks
  };
}

function enemyActionScalingStat(unit, action) {
  if (action.scaling === "hybrid") return (unit.stats.str + unit.stats.mag) / 2;
  if (action.scaling === "str" || action.kind === "melee" || action.element === "Physical") return unit.stats.str;
  return unit.stats.mag;
}

function enemyActionCrit(unit, action, target) {
  const exposed = statusValue(target, "marked") + statusValue(target, "critExposed");
  const chance = Math.min(.75, (unit.crit || .08) + statusValue(unit, "critUp") + (action.critBonus || 0) + exposed);
  return Math.random() < chance;
}

function enemyDamageRoll(unit, action, target) {
  const random = Math.floor(Math.random() * 6);
  let damage = enemyActionScalingStat(unit, action) * (action.coefficient || .9) + Math.max(0, unit.level - 1) * .35 + random;
  const physical = action.scaling === "str" || action.kind === "melee" || action.element === "Physical";
  const damageKind = physical ? "melee" : "magic";
  damage *= outgoingDamageMultiplier(unit, damageKind, target);
  if (!physical) damage *= 1 + (unit.affixes?.elementDamage || 0);
  else damage *= 1 + (unit.affixes?.physicalDamage || 0);
  if (hasNegativeStatus(target)) damage *= 1 + (unit.affixes?.damageAfflicted || 0);
  if (statusOf(target, "broken")) damage *= 1 + (unit.affixes?.damageBroken || 0);
  if (enemyPayoffMatches(action, target)) damage *= action.payoffMultiplier || 1.2;
  damage *= 1 + (physical ? statusValue(target, "physicalVulnerability") : statusValue(target, "magicVulnerability"));
  if (action.element === "Holy Fire") damage *= 1 + statusValue(target, "holyVulnerability");
  const critical = enemyActionCrit(unit, action, target);
  if (critical) damage *= 2 + (unit.affixes?.critDamage || 0);
  damage = Math.max(1, Math.round(damage * incomingDamageMultiplier(target)));
  return { damage, critical };
}

function enemyApplyBuffs(source, targets, buffs) {
  const notes = [];
  targets.filter(Boolean).forEach(target => {
    (buffs || []).forEach(buff => {
      if ((statusOf(target, buff.type)?.remaining || 0) > 1) return;
      let value = buff.value ?? STATUS_DEFS[buff.type]?.value;
      if (buff.type === "barrier") value *= 1 + (source.affixes?.barrierPotency || 0);
      const duration = (buff.duration || STATUS_DEFS[buff.type]?.duration || 1) + (source.affixes?.buffDuration || 0);
      const result = applyStatus(target, buff.type, source, { ...buff, value, duration, force: true });
      if (result.applied) notes.push(`${target.name}: ${result.message}`);
    });
  });
  return notes;
}

function enemyCleanseOne(target) {
  const status = enemyCleanseStatus(target);
  if (!status) return null;
  target.statuses = ensureStatuses(target).filter(entry => entry !== status);
  const removed = STATUS_DEFS[status.type]?.label || status.type;
  addBattleFloater(target, 0, { kind: "cleanse", text: `CLEANSED: ${removed.toUpperCase()}` });
  return removed;
}

function enemyDispelOne(target) {
  const removed = dispelStatus(target);
  if (removed) addBattleFloater(target, 0, { kind: "dispel", text: `DISPELLED: ${removed.toUpperCase()}` });
  return removed;
}

function enemyApplyActionStatuses(source, target, action) {
  const applications = [];
  let statuses = [action.status, ...(action.extraStatuses || [])].filter(Boolean);
  if (action.randomMinorDebuff) {
    const choices = [
      { type: "agilityDown", chance: .45, duration: 3, value: .15 },
      { type: "disrupted", chance: .45, duration: 3, value: .15 },
      { type: "marked", chance: .45, duration: 4, value: .12 }
    ];
    statuses = [choices[Math.floor(Math.random() * choices.length)]];
  }
  statuses.forEach(status => applications.push(applyStatus(target, status.type, source, status)));
  return applications.filter(result => result.applied).map(result => result.message);
}

function enemyResonanceGainForAction(unit, action) {
  if (unit.role === "boss") return 20;
  if (action.healing || ["buff", "cleanse", "dispel", "utility"].includes(action.kind)) return 13;
  return action.kind === "magic" ? 14 : 11;
}

function resolveEnemyTurn(turn, prev) {
  const liveParty = battle.party.filter(p => p.hp > 0);
  if (!liveParty.length) return triggerPartyDefeat(prev);
  const e = battle.enemies[turn.index];
  if (!e || e.hp <= 0) {
    battle.resolving = false;
    return finishTurn(prev);
  }
  let action = chooseEnemyAction(e);
  let target = action.target || (action.healing ? chooseEnemyHealTarget() || e : chooseEnemyTarget(e, action, liveParty));
  if (!target) {
    action = enemyActionForKind(e, "melee");
    target = chooseEnemyTarget(e, action, liveParty);
  }
  const taunter = liveParty.find(ally => ally.holdTheLine);
  if (taunter && enemyActionDealsDamage(action) && !enemyActionHitsAll(e, action)) target = taunter;
  if (!taunter && enemyActionDealsDamage(action) && liveParty.includes(target) && target.hp / target.max < .35) {
    const interceptor = liveParty.find(ally => ally !== target && !statusOf(ally, "sleep") && typedTalentValue(ally.id, "intercept") && Math.random() < typedTalentValue(ally.id, "intercept"));
    if (interceptor) target = interceptor;
  }
  const timingKey = action.kind === "melee" || action.kind === "ultimate" ? action.kind : "magic";
  const timing = battleActionTiming(timingKey);
  const mpCost = enemyActionMpCost(e, action);
  e.mp = Math.max(0, e.mp - mpCost);
  e.anim = "attack";
  e.animTick = 0;
  e.attackStyle = action.kind === "melee" ? "melee" : action.kind === "ultimate" ? "ultimate" : "magic";
  effect = makeEnemyBattleEffect(e, target, action);
  playSfx(action.kind === "melee" ? (e.npcBoss ? "boss" : "melee") : "magic");
  renderBattle(`${e.name} prepares ${action.name}${action.kind === "ultimate" ? " - ULTIMATE" : ""}...`);

  setTimeout(() => {
    if (!battle || mode !== "battle" || e.hp <= 0) return;
    battle.attackDamage = [];
    let actionLog = `${battle.turnStartMessage ? `${battle.turnStartMessage} ` : ""}${e.name} uses ${action.name}.`;
    if (action.healing) {
      const healTargets = action.allAllies || action.kind === "ultimate" ? battle.enemies.filter(ally => ally.hp > 0) : [target].filter(ally => ally?.hp > 0);
      let total = 0;
      healTargets.forEach(ally => {
        let amount = (e.stats.mag * (action.healCoefficient || 1.35) + e.stats.stam * .22 + e.level * 1.4) * (1 + (e.affixes?.healPotency || 0));
        const critical = enemyActionCrit(e, action, ally);
        if (critical) amount *= 2 + (e.affixes?.critDamage || 0);
        amount = Math.max(1, Math.round(amount));
        const restored = Math.min(amount, ally.max - ally.hp);
        ally.hp += restored;
        total += restored;
        addBattleFloater(ally, restored, { kind: "heal", crit: critical });
        const buffs = action.randomBuff
          ? [{ type: ["magicUp", "agilityUp", "critUp"][Math.floor(Math.random() * 3)], duration: 3 }]
          : action.buffs;
        const buffNotes = enemyApplyBuffs(e, [ally], buffs);
        if (buffNotes.length) actionLog += ` ${buffNotes.join(", ")}.`;
        if (action.cleanse || action.conditionalCleanse) {
          const removed = enemyCleanseOne(ally);
          if (removed) actionLog += ` ${ally.name} is cleansed of ${removed}.`;
        }
      });
      actionLog += ` ${healTargets.length > 1 ? "The enemy formation restores" : `${target.name} restores`} ${total} HP.`;
      playSfx("item");
    } else if (action.kind === "buff") {
      const buffTargets = action.allAllies ? battle.enemies.filter(ally => ally.hp > 0) : [target];
      const buffs = action.randomBuff
        ? [{ type: ["magicUp", "agilityUp", "critUp"][Math.floor(Math.random() * 3)], duration: 3 }]
        : action.buffs;
      const notes = enemyApplyBuffs(e, buffTargets, buffs);
      actionLog += ` ${notes.join("; ")}.`;
      playSfx("item");
    } else if (action.kind === "cleanse") {
      const removed = enemyCleanseOne(target);
      actionLog += removed ? ` ${target.name} is cleansed of ${removed}.` : " No removable condition remains.";
      playSfx("item");
    } else if (action.kind === "dispel") {
      const removed = enemyDispelOne(target);
      actionLog += removed ? ` ${target.name} loses ${removed}.` : " No removable buff remains.";
      playSfx("magic");
    } else if (!enemyActionDealsDamage(action)) {
      const notes = enemyApplyActionStatuses(e, target, action);
      if (action.partyResonanceDrain) {
        const drained = Math.min(state.resonance, action.partyResonanceDrain);
        state.resonance -= drained;
        actionLog += ` Party Resonance -${drained}.`;
      }
      if (notes.length) actionLog += ` ${target.name}: ${notes.join(", ")}.`;
      playSfx("magic");
    } else {
      const allTargets = enemyActionHitsAll(e, action);
      const intercepted = new Set();
      const hitTargets = enemyTargetsForAction(e, action, target).map(defender => {
        const protector = rank0Protector(defender, allTargets);
        if (protector) { intercepted.add(protector); actionLog += ` ${protector.name} protects ${defender.name}.`; }
        return protector || defender;
      });
      hitTargets.forEach(defender => {
        if (tryEvadeAttack(defender)) {
          addBattleFloater(defender, 0, { kind: "evade", text: "EVADE!" });
          actionLog += ` ${defender.name}: EVADE!`;
          return;
        }
        const rolled = enemyDamageRoll(e, action, defender);
        let dmg = rolled.damage;
        if (intercepted.has(defender)) dmg = Math.ceil(dmg * (1 - typedTalentValue(defender.id, "interceptReduction")));
        let defenseText = "";
        const personallyGuarded = Boolean(defender.guarding);
        if (defender.guarding) {
          const reduction = defendReduction(defender);
          dmg = Math.ceil(dmg * (1 - reduction / 100));
          defender.guarding = false;
          defenseText = ` ${defender.name} blocks ${reduction}%.`;
          playSfx("block");
          const counter = typedTalentValue(defender.id, "guardCounter");
          if (counter && e.hp > 0) {
            const basic = battleSkills(defender.id, defender).find(sk => sk.basicAttack) || baseJobs[defender.id].skills[0];
            const counterDamage = Math.max(1, Math.round((basic.power + skillOffensiveStat(defender.id, basic, defender)) * counter));
            e.hp = Math.max(0, e.hp - counterDamage);
            addBattleFloater(e, counterDamage, { damageType: "Counter" });
            defenseText += ` Counter -${counterDamage}.`;
            guardedTalentBreak(defender, e);
          }
        } else if (battle.ward) {
          dmg = Math.ceil(dmg * Math.max(.2, .5 - effectValue(defender.id, "blockPower")));
          defenseText = " Party Guard softens the hit.";
        }
        const brokenAtHitStart = Boolean(statusOf(defender, "broken"));
        const breakPower = Math.max(0, action.breakPower || 0) + (action.kind === "ultimate" ? (e.affixes?.breakPower || 0) : 0);
        const breakResult = breakPower ? addBreakProgress(e, defender, breakPower) : null;
        if (breakResult?.breaks) {
          dmg += breakResult.bonusDamage;
          if (!brokenAtHitStart) {
            applyStatus(defender, "broken", e, { duration: 1, force: true });
            addBattleFloater(defender, 0, { kind: "broken", text: "BROKEN!" });
            defenseText += ` ${defender.name} is BROKEN; ${breakResult.remainder}/${BREAK_THRESHOLD} Break remains.`;
          }
        } else if (breakResult?.gain) {
          defenseText += ` Break ${defender.stagger}/${BREAK_THRESHOLD}.`;
        }
        if (brokenAtHitStart && action.payoff === "broken" && action.payoffStatus) applyStatus(defender, action.payoffStatus.type, e, action.payoffStatus);
        const sleepBreak = breakSleepFromDamage(defender);
        const lastBastion = battle.party.find(ally => ally.hp > 0 && typedTalentValue(ally.id, "lastBastion") && !battle.usedOnce[`lastBastion:${ally.id}`]);
        if (dmg >= defender.hp && lastBastion) {
          dmg = Math.max(0, defender.hp - 1);
          battle.usedOnce[`lastBastion:${lastBastion.id}`] = true;
          defenseText += ` ${lastBastion.name}'s Last Bastion leaves ${defender.name} at 1 HP.`;
        }
        defender.hp = Math.max(0, defender.hp - dmg);
        const thorns = personallyGuarded ? typedTalentValue(defender.id, "thorns") : 0;
        if (thorns && action.kind === "melee" && e.hp > 0 && dmg > 0) {
          const reflected = Math.max(1, Math.round(dmg * thorns));
          e.hp = Math.max(0, e.hp - reflected);
          addBattleFloater(e, reflected, { damageType: "Holy Fire" });
          defenseText += ` Burning Aegis -${reflected}.`;
          guardedTalentBreak(defender, e);
        }
        if (intercepted.has(defender)) successfulSparkyIntercept(defender);
        const fell = markBattleUnitDown(defender);
        if (defender.hp > 0 && typedTalentValue(defender.id, "damageResonance")) state.resonance = Math.min(100, state.resonance + Math.max(1, Math.round(4 * (1 + typedTalentValue(defender.id, "damageResonance")))));
        defender.flash = 12;
        addBattleFloater(defender, dmg, { damageType: action.element || "Physical", crit: rolled.critical });
        const statuses = defender.hp > 0 ? enemyApplyActionStatuses(e, defender, action) : [];
        actionLog += ` ${defender.name} takes ${dmg}${rolled.critical ? " CRITICAL" : ""}.${fell ? ` ${defender.name} falls.` : ""}${sleepBreak ? ` ${sleepBreak}` : ""}${defenseText}${statuses.length ? ` ${statuses.join(", ")}.` : ""}`;
      });
      battle.ward = false;
      if (action.partyResonanceDrain) {
        const drained = Math.min(state.resonance, action.partyResonanceDrain);
        state.resonance -= drained;
        actionLog += ` Party Resonance -${drained}.`;
      }
      playSfx(action.kind === "ultimate" ? "boss" : "hit");
    }
    if (action.teamBuffs?.length) {
      const notes = enemyApplyBuffs(e, battle.enemies.filter(ally => ally.hp > 0), action.teamBuffs);
      if (notes.length) actionLog += ` ${notes.join("; ")}.`;
    }
    if (action.kind === "ultimate") battle.enemyResonance = 0;
    else gainEnemyResonance(e, enemyResonanceGainForAction(e, action));
    if (e.hp <= 0) {
      e.anim = "death";
      e.deathTick = tick;
      e.defeatUntil = tick + (enemyAnimationSheetFor(e) ? 30 : 12);
    }
    updatePanels();
    finishAttackDamageSummary(actionLog);
    renderBattle(actionLog);
    if (partyIsDefeated()) return triggerPartyDefeat(actionLog);
    if (battle.enemies.every(enemyUnit => enemyUnit.hp <= 0)) {
      return setTimeout(() => winBattle(actionLog), 620);
    }
    setTimeout(() => {
      if (!battle || mode !== "battle") return;
      e.anim = "idle";
      e.animTick = 0;
      finishTurn(actionLog);
    }, action.kind === "ultimate" ? 820 : 560);
  }, timing.impactMs);
}

function winBattle(log) {
  if (!battle || battle.ended || battle.defeatPending || battle.phaseTransition) return;
  battle.defeated.push(...battle.enemies);
  if (battle.waves.length) {
    if (battleRoundLimitReached()) return endBattleDraw(log);
    const total = battle.phaseTotal || battle.waves.length + 1;
    const nextWave = battle.waves.shift();
    const activeBattle = battle;
    const advanceWave = () => {
      if (battle !== activeBattle || mode !== "battle") return;
      battle.phaseTransition = null;
      battle.name = nextWave.name;
      battle.enemies = nextWave.enemies;
      battle.enemyResonance = 0;
      battle.ward = false;
      el.battleName.textContent = nextWave.name;
      state.resonance = Math.min(100, state.resonance + 10);
      battle.round++;
      buildTurnOrder();
      runCurrentTurn(`${log} The next wave enters.`);
    };
    if (!battle.hallStage) {
      advanceWave();
      return;
    }
    battle.enemies.forEach(unit => {
      unit.anim = "death";
      if (!Number.isFinite(unit.deathTick)) unit.deathTick = tick;
      unit.defeatUntil = Math.max(unit.defeatUntil || 0, tick + 60);
    });
    battle.phaseTransition = {
      step: "fallen",
      number: total - battle.waves.length,
      total,
      enemies: nextWave.enemies,
      advance: advanceWave
    };
    battle.resolving = true;
    renderBattle(`${log} The defeated phase falls.`);
    setTimeout(() => {
      if (battle !== activeBattle || mode !== "battle" || battle.phaseTransition?.step !== "fallen") return;
      battle.phaseTransition.step = "incoming";
      renderBattle(`Phase ${battle.phaseTransition.number}/${total} approaches.`);
    }, 900);
    return;
  }
  const hallStage = Number(battle.hallStage) || 0;
  const hallProgress = hallStage ? hallBattleProgress() : null;
  const firstHallClear = Boolean(hallStage && recordHallBattleClear(hallStage));
  if (battle.winFlag) state.flags[battle.winFlag] = true;
  const resonanceBeforeVictory = state.resonance;
  state.resonance = Math.min(100, state.resonance + 15);
  const resonanceEarned = state.resonance - resonanceBeforeVictory;
  battle.party.forEach(u => {
    const h = baseJobs[u.id];
    const gearVictoryRegen = state.gameMode === "hallBattles" ? 0 : effectValue(u.id, "battleRegen");
    h.hp = Math.max(1, Math.min(totals(u.id).max, u.hp + 10 + gearVictoryRegen + talentValue(u.id, "battleRegenTalent")));
    h.mp = u.mp;
  });
  const echoHuntBattle = Boolean(battle.echoHuntRank || battle.winFlag === "endgameHuntWon" || /^Echo Hunt\s+\d+:/i.test(battle.name));
  const rewards = rollBattleLoot(battle.defeated, {
    forceGearRarity: echoHuntBattle ? "Legendary" : null,
    allowGearLoot: !hallStage
  });
  const bossBattle = Boolean(battle.hallBoss || battle.spawnRef?.boss || ["dawnWon", "endgameHuntWon", "ngStonewakeWon", "ngOrphanTrialWon"].includes(battle.winFlag));
  const battleXp = battle.defeated.reduce((sum, unit) => sum + (unit.xp || 20), 0) + (bossBattle ? 120 + Math.max(...battle.defeated.map(unit => unit.level || 1)) * 12 : 0);
  const earnedXp = Math.max(0, Math.round(battleXp * XP_MULTIPLIER));
  awardPartyXp(battleXp, bossBattle ? "boss victory" : "battle");
  if (hallStage) {
    const hallGold = 12 + hallStage * 4 + (battle.hallBoss ? 40 + hallStage * 2 : 0);
    state.gold += hallGold;
    rewards.gold += hallGold;
    guaranteeHallBattleGearReward(rewards, hallStage);
  }
  if (echoHuntBattle) {
    state.endgameRank++;
    state.echoForgeRank = Math.max(state.echoForgeRank || 0, state.endgameRank);
    const echoGold = 100 + state.endgameRank * 35;
    const cogs = 1 + Math.floor(state.endgameRank / 3);
    state.gold += echoGold;
    rewards.gold += echoGold;
    const cogsStored = addInventoryItem("False Dawn Cog", cogs);
    rewards.drops.push(lootItemDrop("False Dawn Cog", cogs, cogsStored));
    guaranteeEchoHuntGearReward(rewards, battle.echoHuntRank || state.endgameRank);
  }
  if (battle.spawnRef) {
    battle.spawnRef.available = false;
    if (battle.spawnRef.boss) state.flags[`spawn:${battle.spawnRef.id}`] = true;
    else battle.spawnRef.returnAt = Date.now() + battle.spawnRef.respawn * 1000;
  }
  if (!hallStage) {
    updateSideQuestKills(battle.defeated, battle.spawnRef);
    if (battle.winFlag === "ravaWaveWon") completeSideQuest("ravaWave");
    if (battle.winFlag === "ngStonewakeWon") completeSideQuest("stonewakeTrial");
    if (battle.winFlag === "ngOrphanTrialWon") completeSideQuest("orphanTrial");
  }
  battle.ended = true;
  updatePanels();
  playSfx("coin");
  const resultEntries = [];
  if (rewards.gold) resultEntries.push({ kind: "gold", icon: "G", label: "Gold", value: `+${rewards.gold}` });
  rewards.drops.forEach(drop => {
    if (typeof drop === "string") resultEntries.push({ kind: "item", icon: "*", label: drop, value: "x1" });
    else resultEntries.push({
      kind: drop.kind || "item",
      icon: drop.kind === "gear" ? "E" : "*",
      label: drop.name,
      detail: `${drop.type}${drop.stored === false ? " / Marla's Stash" : ""}`,
      value: `x${drop.amount || 1}`,
      rarity: drop.rarity
    });
  });
  if (resonanceEarned) resultEntries.push({ kind: "resonance", icon: "R", label: "Resonance", value: `+${resonanceEarned}` });
  resultEntries.push({ kind: "xp", icon: "EXP", label: "EXP", value: `+${earnedXp}` });
  if (hallStage && firstHallClear) resultEntries.push({ kind: "record", icon: "#", label: "Hall Record", detail: hallStage >= HALL_BATTLE_BLUEPRINTS.length ? "All battle records cleared" : `Stage ${hallStage + 1} unlocked`, value: `${hallStage}/${HALL_BATTLE_BLUEPRINTS.length}` });
  showBattleResult("victory", resultEntries, () => {
    if (hallStage) returnToHallAfterBattle();
    if (hallStage && hallProgress.pendingRecruit) openHallRecruitment();
  });
}

function confirmPhaseTransition() {
  if (!battle || mode !== "battle" || battle.phaseTransition?.step !== "incoming") return false;
  const advance = battle.phaseTransition.advance;
  if (typeof advance !== "function") return false;
  advance();
  return true;
}

function awardGearDrop(name, requestedRarity, drops, options = {}) {
  const ref = addOwnedGear(name, 1, {
    rarity: requestedRarity,
    rollAffixes: !Array.isArray(options.affixes),
    theme: options.theme || lootThemeForMap(),
    separateCopy: options.separateCopy,
    affixes: options.affixes,
    stats: options.stats
  })[0] || name;
  const currentRarity = gearRarity(ref);
  if (RARITY_ORDER.indexOf(requestedRarity) > RARITY_ORDER.indexOf(currentRarity)) {
    const instance = gearInstance(ref);
    if (instance) instance.rarity = requestedRarity;
    else state.gearRarities[name] = requestedRarity;
  }
  const rarity = gearRarity(ref);
  if (!Array.isArray(options.affixes)) topUpGearAffixes(ref, rarity, options.theme || "dragon");
  const gear = gearByName(ref);
  drops.push({ kind: "gear", name: gearDisplayName(ref), baseName: name, rarity, type: gearSlotLabel(gear?.slot), amount: 1, stored: true });
  return { name, rarity, ref };
}

const HALL_BASE_STAT_RULES = Object.freeze({
  Rare: { min: 2, max: 5, budget: 12 },
  Epic: { min: 6, max: 10, budget: 24 },
  Legendary: { min: 11, max: 15, budget: 39 },
  Mythic: { min: 16, max: 20, budget: 54 },
  Artifact: { min: 21, max: 30, budget: 78 }
});
const HALL_GENERATED_AFFIX_COUNTS = Object.freeze({ Rare: 1, Epic: 2, Legendary: 3, Mythic: 4, Artifact: RARITY_AFFIX_COUNTS.Artifact });
const HALL_BASE_STATS = ["str", "stam", "mag", "agi", "echo"];
const HALL_GEAR_NAMES = new Set([
  ...HALL_RARE_GEAR_POOL,
  ...HALL_EPIC_GEAR_POOL,
  ...HALL_LEGENDARY_GEAR_POOL,
  ...MYTHIC_GEAR,
  ...HALL_ARTIFACT_GEAR
].map(gear => gear.name));

function hallRandomInt(min, max, random = Math.random) {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffledHallStats(random = Math.random) {
  const stats = [...HALL_BASE_STATS];
  for (let index = stats.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [stats[index], stats[swap]] = [stats[swap], stats[index]];
  }
  return stats;
}

function hallBaseStatCount(random = Math.random) {
  const roll = random();
  if (roll < .05) return 1;
  if (roll < .1) return 2;
  if (roll < .9) return 3;
  if (roll < .95) return 4;
  return 5;
}

function rollHallBaseStatProfile(rarity, random = Math.random) {
  const rule = HALL_BASE_STAT_RULES[rarity];
  if (!rule) return { stats: {}, statCount: 0, outlier: null, total: 0 };
  const statCount = hallBaseStatCount(random);
  const chosen = shuffledHallStats(random).slice(0, statCount);
  if (!chosen.includes("str") && !chosen.includes("mag")) {
    chosen[chosen.length - 1] = random() < .5 ? "str" : "mag";
  }
  const uniqueStats = [...new Set(chosen)];
  while (uniqueStats.length < statCount) {
    const replacement = HALL_BASE_STATS.find(stat => !uniqueStats.includes(stat));
    if (!replacement) break;
    uniqueStats.push(replacement);
  }

  const broad = statCount >= 4;
  const hasOutlier = random() < .5;
  const outlierIndex = hasOutlier ? Math.floor(random() * statCount) : -1;
  const direction = hasOutlier ? (random() < .5 ? "high" : "low") : null;
  const lower = uniqueStats.map(() => broad ? 1 : rule.min);
  const upper = uniqueStats.map(() => rule.max);
  if (hasOutlier && direction === "high") {
    lower[outlierIndex] = rule.max + 1;
    upper[outlierIndex] = rule.max + 5;
  } else if (hasOutlier) {
    const low = hallRandomInt(Math.max(1, rule.min - 5), Math.max(1, rule.min - 1), random);
    lower[outlierIndex] = low;
    upper[outlierIndex] = low;
  }

  const minimum = lower.reduce((sum, value) => sum + value, 0);
  const maximum = Math.min(rule.budget, upper.reduce((sum, value) => sum + value, 0));
  const preferredMinimum = Math.min(maximum, Math.max(minimum, Math.floor(rule.budget * .8)));
  const target = hallRandomInt(preferredMinimum, maximum, random);
  const values = [...lower];
  let remaining = target - minimum;
  while (remaining > 0) {
    const available = values.map((value, index) => value < upper[index] ? index : -1).filter(index => index >= 0);
    if (!available.length) break;
    const index = available[Math.floor(random() * available.length)];
    values[index]++;
    remaining--;
  }
  const stats = Object.fromEntries(uniqueStats.map((stat, index) => [stat, values[index]]));
  return {
    stats,
    statCount,
    outlier: hasOutlier ? { stat: uniqueStats[outlierIndex], direction } : null,
    total: values.reduce((sum, value) => sum + value, 0)
  };
}

function rollHallBaseStats(rarity, random = Math.random) {
  return rollHallBaseStatProfile(rarity, random).stats;
}

function hallSeededRandom(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function migrateHallBaseStatsV1() {
  state.flags ||= {};
  if (state.flags.hallBaseStatsV1) return false;
  if (state.gameMode === "hallBattles") {
    const equippedLegacy = Object.values(baseJobs).flatMap(hero => Object.entries(hero.gear || {})
      .filter(([, ref]) => ref && !gearInstance(ref) && HALL_GEAR_NAMES.has(gearBaseName(ref)))
      .map(([slot, ref]) => ({ hero, slot, name: gearBaseName(ref) })));
    const legacyNames = new Set([
      ...state.ownedGear.filter(ref => !gearInstance(ref) && HALL_GEAR_NAMES.has(gearBaseName(ref))).map(gearBaseName),
      ...equippedLegacy.map(entry => entry.name)
    ]);
    legacyNames.forEach(name => {
      let refs = echoGearInstanceRefs(name);
      const directEquipped = equippedLegacy.filter(entry => entry.name === name);
      const wanted = Math.max(1, Number(state.gearCopies[name]) || 0, refs.length + directEquipped.length);
      const rarity = state.gearRarities[name] || defaultGearRarity(name);
      const affixes = Array.isArray(state.gearAffixes[name]) ? state.gearAffixes[name].map(entry => ({ ...entry })) : [];
      while (refs.length < wanted) {
        createEchoGearInstance(name, { allowAny: true, rarity, affixes, rollAffixes: false });
        refs = echoGearInstanceRefs(name);
      }
      const used = new Set(Object.values(baseJobs).flatMap(hero => Object.values(hero.gear || {})).filter(ref => gearInstance(ref)?.name === name));
      directEquipped.forEach(entry => {
        const ref = refs.find(candidate => !used.has(candidate)) || refs[0];
        entry.hero.gear[entry.slot] = ref;
        used.add(ref);
      });
      syncEchoForgeCopies(name);
    });
  }
  Object.entries(gearInstances).forEach(([ref, instance]) => {
    if (!ref.startsWith("hall_") || !HALL_BASE_STAT_RULES[instance?.rarity]) return;
    instance.stats = rollHallBaseStats(instance.rarity, hallSeededRandom(`instance:${ref}:${instance.name}:${instance.rarity}`));
  });
  Object.entries(state.hallBattles?.shopOffers || {}).forEach(([stage, offer]) => {
    if (!offer?.name || !HALL_BASE_STAT_RULES[offer.rarity]) return;
    offer.stats = rollHallBaseStats(offer.rarity, hallSeededRandom(`offer:${stage}:${offer.name}:${offer.rarity}`));
  });
  state.flags.hallBaseStatsV1 = true;
  return true;
}

function hallNormalGearRarity(stage = 1) {
  const value = Math.max(1, Number(stage) || 1);
  if (value >= 31) return "Mythic";
  if (value >= 21) return "Legendary";
  if (value >= 11) return "Epic";
  return "Rare";
}

function hallShopGearRarity(stage = 1) {
  const value = Math.max(1, Number(stage) || 1);
  if (value >= 41) return "Artifact";
  if (value >= 31) return "Mythic";
  if (value >= 21) return "Legendary";
  if (value >= 11) return "Epic";
  return "Rare";
}

function rollHallGearRarity(stage = 1) {
  return hallNormalGearRarity(stage);
}

function hallGearPoolForRarity(rarity, stage = 1) {
  if (rarity === "Rare") return HALL_RARE_GEAR_POOL;
  if (rarity === "Epic") return HALL_EPIC_GEAR_POOL;
  if (rarity === "Legendary") return HALL_LEGENDARY_GEAR_POOL;
  if (rarity === "Mythic") return HALL_MYTHIC_LOOT_TABLES[stage] || MYTHIC_GEAR;
  return [];
}

function hallGearRewardCandidates(stage, rarity = rollHallGearRarity(stage)) {
  return hallGearPoolForRarity(rarity, stage).filter(gear => !echoForgeGearNames.has(gear.name) && !/^Echo(?:-|\s)/i.test(gear.name));
}

function guaranteeHallBattleGearReward(rewards, stage = 1) {
  if (!Array.isArray(rewards.gearDrops)) rewards.gearDrops = [];
  if (!Array.isArray(rewards.drops)) rewards.drops = [];
  const rarity = rollHallGearRarity(stage);
  const candidates = hallGearRewardCandidates(stage, rarity);
  const gear = candidates[Math.floor(Math.random() * candidates.length)];
  if (!gear) return null;
  const themes = ["swamp", "ruins", "mountain", "dragon"];
  const theme = HALL_MYTHIC_THEMES[stage] || themes[Math.floor(Math.random() * themes.length)];
  const affixes = rollGearAffixes(gear, rarity, theme, HALL_GENERATED_AFFIX_COUNTS[rarity]);
  const awarded = awardGearDrop(gear.name, rarity, rewards.drops, {
    theme,
    separateCopy: true,
    affixes,
    stats: rollHallBaseStats(rarity)
  });
  rewards.gearDrops.push(awarded);
  return awarded;
}

function guaranteeEchoHuntGearReward(rewards, rank = state.endgameRank || 1) {
  if (!Array.isArray(rewards.gearDrops)) rewards.gearDrops = [];
  if (!Array.isArray(rewards.drops)) rewards.drops = [];
  const candidates = leastOwnedGearCandidates(postgameGear);
  const gear = candidates[(Math.max(1, rank) - 1) % candidates.length];
  const awarded = awardGearDrop(gear.name, "Legendary", rewards.drops, { theme: "dragon", label: "GUARANTEED ECHO HUNT LEGENDARY" });
  rewards.gearDrops.push(awarded);
  return awarded;
}

function rollBattleLoot(enemies, options = {}) {
  let gold = 0;
  const drops = [];
  const gearDrops = [];
  enemies.forEach(enemyUnit => {
    const tables = [lootTables[enemyUnit.name]].filter(Boolean);
    tables.forEach(table => {
      gold += table.gold[0] + Math.floor(Math.random() * (table.gold[1] - table.gold[0] + 1));
      table.common.forEach(([name, chance, amount]) => {
        if (Math.random() > chance) return;
        const stored = addInventoryItem(name, amount);
        drops.push(lootItemDrop(name, amount, stored));
      });
      if (options.allowGearLoot !== false) {
        table.rare.forEach(([name, chance]) => {
          if (Math.random() > chance || gearCopyCount(name) >= 3) return;
          const rarity = options.forceGearRarity || rollEquipmentRarity(enemyUnit);
          gearDrops.push(awardGearDrop(name, rarity, drops, { theme: options.forceGearRarity ? "dragon" : lootThemeForMap() }));
        });
      }
    });
    if (state.ngPlus > 0 && options.allowNgPlusLoot !== false) {
      gold += rollNgPlusRandomLoot(enemyUnit, drops, gearDrops, { allowGearLoot: options.allowGearLoot });
    }
  });
  state.gold += gold;
  return { gold, drops, gearDrops };
}

function rollNgPlusRandomLoot(enemyUnit, drops, gearDrops = [], options = {}) {
  const loop = Math.max(1, state.ngPlus);
  const commonPool = [
    ["Loopglass Shard", 1 + Math.floor(loop / 2)],
    ["Orphan Ember Thread", 1 + Math.floor(loop / 3)],
    ["Stonewake Medal", 1],
    ["Emberheart Stew", 1],
    ["Resonance Draught", 1],
    ["Royal Ember Stew", Math.max(1, Math.floor(loop / 2))],
    ["Grand Resonance Draught", Math.max(1, Math.floor(loop / 2))]
  ];
  const rolls = Math.min(3, 1 + Math.floor((loop - 1) / 2));
  for (let roll = 0; roll < rolls; roll++) {
    const [name, amount] = commonPool[Math.floor(Math.random() * commonPool.length)];
    const stored = addInventoryItem(name, amount);
    drops.push(lootItemDrop(name, amount, stored));
  }
  const randomGear = [
    ...ngPlusChestGear,
    ...ngPlusGear.filter(gear => !ngPlusSignatureNames.has(gear.name)),
    ...postgameGear
  ];
  const gearChance = Math.min(.68, .18 + loop * .07 + (state.endgameRank || 0) * .012);
  if (options.allowGearLoot !== false && randomGear.length && Math.random() < gearChance) {
    const candidates = leastOwnedGearCandidates(randomGear);
    const gear = candidates[Math.floor(Math.random() * candidates.length)];
    gearDrops.push(awardGearDrop(gear.name, "Legendary", drops, { theme: "dragon", label: "NG+ RANDOM LEGENDARY" }));
  }
  const level = enemyUnit.level || 1;
  return 22 + level * 4 + Math.floor(Math.random() * (18 + loop * 8));
}

function inventoryUsed() {
  return Object.values(state.inventory).reduce((sum, amount) => sum + amount, 0);
}

function addInventoryItem(name, amount = 1) {
  if (inventoryUsed() + amount <= state.inventorySlots) {
    state.inventory[name] = (state.inventory[name] || 0) + amount;
    return true;
  }
  state.stash[name] = (state.stash[name] || 0) + amount;
  return false;
}

function bagUpgradePrice(basePrice) {
  return Math.round(basePrice * Math.pow(1.7, state.bagUpgrades));
}

function questById(id) {
  return sideQuests.find(quest => quest.id === id);
}

function activateSideQuest(id) {
  const quest = questById(id);
  if (!quest || quest.requiresNgPlus && state.ngPlus < 1 || !["unseen", "available"].includes(quest.status)) return;
  quest.status = "active";
  if (quest.type === "escort") state.escort = quest.giver;
}

function questPreview(id) {
  if (!id) return [];
  const quest = questById(id);
  if (!quest) return [];
  if (quest.requiresNgPlus && state.ngPlus < 1) return [];
  if (id === "nyxInk" && quest.status === "completed") {
    const followup = questById("rareLore");
    if (followup && (followup.status === "unseen" || followup.status === "available")) return [["Nyx", `Quest offered: ${followup.title}. ${followup.desc}`]];
  }
  if (quest.status === "unseen" || quest.status === "available") return [[quest.giver, `Quest offered: ${quest.title}. ${quest.desc}`]];
  if (quest.status === "completed") return [[quest.giver, `${quest.title} is settled.`]];
  if (quest.type === "fetch") {
    const have = state.inventory[quest.target.item] || 0;
    return [[quest.giver, `${quest.title}: ${Math.min(have, quest.target.amount)}/${quest.target.amount} ${quest.target.item}.`]];
  }
  return [[quest.giver, `${quest.title}: ${sideQuestProgress(quest)}.`]];
}

function processQuestGiver(id) {
  const quest = questById(id);
  if (!quest || quest.requiresNgPlus && state.ngPlus < 1) return;
  if (quest.status === "unseen" || quest.status === "available") activateSideQuest(id);
  if (quest.status === "active" && quest.type === "fetch") {
    const have = state.inventory[quest.target.item] || 0;
    if (have >= quest.target.amount) {
      state.inventory[quest.target.item] -= quest.target.amount;
      completeSideQuest(id);
    }
  }
  if (id === "nyxInk" && quest.status === "completed") activateSideQuest("rareLore");
}

function updateSideQuestKills(enemies, spawnRef) {
  sideQuests.filter(quest => quest.status === "active" && quest.type === "kill").forEach(quest => {
    quest.progress += enemies.filter(unit => quest.target.names.includes(unit.name)).length;
    if (quest.progress >= quest.target.amount) completeSideQuest(quest.id);
  });
  const rareQuest = questById("rareLore");
  if (rareQuest?.status === "active" && spawnRef?.rare) {
    rareQuest.progress++;
    if (rareQuest.progress >= rareQuest.target.amount) completeSideQuest(rareQuest.id);
  }
}

function checkSideQuestMap(mapId) {
  const quest = sideQuests.find(entry => entry.status === "active" && entry.type === "escort" && entry.target.map === mapId);
  if (quest && state.escort === quest.giver) {
    quest.status = "ready";
    quest.progress = 1;
    state.escort = null;
    state.flags[`quest:${quest.id}`] = true;
    playSfx("menu");
    updatePanels();
  }
}

function completeSideQuest(id) {
  const quest = questById(id);
  if (!quest || quest.status === "completed") return;
  quest.status = "completed";
  quest.progress = quest.target.amount || quest.target.waves || 1;
  state.gold += quest.reward.gold || 0;
  const xpSummary = quest.reward.xp ? awardPartyXp(quest.reward.xp, quest.title) : "";
  Object.entries(quest.reward.items || {}).forEach(([name, amount]) => addInventoryItem(name, amount));
  if (quest.reward.gear && !state.ownedGear.includes(quest.reward.gear)) addOwnedGear(quest.reward.gear, 1, { rarity: "Rare", rollAffixes: true, theme: lootThemeForMap() });
  (quest.reward.gears || []).forEach(name => {
    if (!state.ownedGear.includes(name)) addOwnedGear(name, 1, { rarity: "Legendary", rollAffixes: true, theme: "dragon" });
  });
  if (state.escort === quest.giver) state.escort = null;
  state.flags[`quest:${id}`] = true;
  playSfx("coin");
  if (xpSummary) showHudNotice(`QUEST COMPLETE - ${xpSummary}`);
  updatePanels();
}

function sideQuestProgress(quest) {
  if (quest.type === "fetch") return `${state.inventory[quest.target.item] || 0}/${quest.target.amount}`;
  if (quest.type === "escort") {
    if (quest.status === "completed") return "escort complete / reward paid";
    if (quest.status === "ready") return "Harl is safe / report to Marla";
    return state.escort ? "escort active" : "waiting";
  }
  if (quest.type === "wave") return quest.status === "completed" ? "3/3 waves" : "awaiting defense";
  if (quest.type === "boss") return quest.status === "completed" ? "trial defeated" : "boss trial awaiting victory";
  return `${Math.min(quest.progress, quest.target.amount)}/${quest.target.amount}`;
}

function toggleMenu() {
  if (mode === "hallMap") return closeHallOverlay();
  if (mode === "shop") return closeVendor();
  if (mode === "menu") {
    mode = "walk";
    el.menu.classList.add("hidden");
    updateSkillPointNotice();
    return;
  }
  if (mode !== "walk" && mode !== "atlas") return;
  mode = "menu";
  el.menu.classList.remove("is-shop");
  document.querySelector(".menu-tabs").classList.remove("hidden");
  el.menu.classList.remove("hidden");
  renderMenu();
  updateSkillPointNotice();
}

function openSkillPointMenu() {
  const pending = pendingSkillPoints();
  if (!pending.length) return;
  if (mode === "battle" || !el.dialogue.classList.contains("hidden")) {
    showHudNotice("SKILL POINT READY - open Skills after the current scene");
    return;
  }
  if (mode !== "walk" && mode !== "atlas" && mode !== "menu") return;
  selectedSkillHero = pending[0].id;
  menuTab = "skills";
  mode = "menu";
  el.menu.classList.remove("is-shop");
  document.querySelector(".menu-tabs").classList.remove("hidden");
  el.menu.classList.remove("hidden");
  renderMenu();
  updateSkillPointNotice();
}

function xpProgressHtml(id) {
  const progress = progressFor(id);
  const required = xpForNextLevel(progress.level);
  const percent = required ? Math.min(100, Math.round(progress.xp / required * 100)) : 100;
  const copy = required ? `${progress.xp} / ${required} XP` : "MAX LEVEL";
  return `<div class="xp-progress"><span><b>Level ${progress.level}</b><small>${copy}</small></span><i><em style="width:${percent}%"></em></i></div>`;
}

const characterSpecialties = {
  Verseborn: ["Party buffer", "Resonance support", "Tempo control"],
  Mira: ["Fast physical damage", "Status setup", "Afflicted execution"],
  Seerin: ["Paladin guard", "Defensive support", "Stun control"],
  Kael: ["Dedicated healing", "Cleanse", "Magic support"],
  Torren: ["Front-line tank", "Break control", "Retaliation"],
  Glimmer: ["Tech magic", "Speed manipulation", "Stun support"],
  Sparky: ["Magic burst", "Ancient fire", "Area damage"]
};

const characterBios = {
  Verseborn: "A young Songweaver who refuses to let the False Dawn erase names, memories or promises. Their living Verse holds the Flameguard together and turns shared conviction into power.",
  Mira: "The Whispering Arrow of House Veln is a swift shadow operative who marks weaknesses before exploiting them. Her dry precision hides a fierce loyalty to the people she has chosen.",
  Seerin: "Once shaped to be an obedient shield, Seerin now places people before doctrine. She anchors the front line with sword, shield and Holy Fire, protecting allies while opening paths for their counterattack.",
  Kael: "A quiet sigil healer bound by the Silent Oath. Kael turns disciplined faith into restoration and wards, while the Shadowpriest within him offers a more dangerous answer to the same promise.",
  Torren: "The Stoneheart is a veteran guardian who meets every blow head-on. Torren controls the front line through endurance, Break pressure and retaliation, carrying old losses without allowing them to define the living.",
  Glimmer: "The Gearmind engineer treats every impossible problem as an unfinished prototype. Her wrenchwork, drones and Mech form combine technical magic with fast battlefield support.",
  Sparky: "A tiny Emberborn carrying an ancient dragon memory. Sparky looks playful until that remembered flame awakens, turning concentrated magic into burns, bursts and sweeping Ancient Fire.",
};

const statusStatHelp = [
  ["STR", "+1 base damage per point for most physical and melee skills."],
  ["AGI", "Turn order plus 0.10 percentage point CRIT per point. Mira also adds half her AGI to every damaging skill. AGI never creates an extra normal turn."],
  ["MAG", "+1 base damage per point for most magic skills, +0.3 healing before bonuses, and +1 Max MP per 2 MAG. MP costs stay fixed, so MAG increases casting endurance."],
  ["STAM", "+4 maximum HP per point. Every hero also has 30 base HP."],
  ["ECHO", "+0.15% Ultimate, Echo and transformation potency per point."],
  ["HP / MP", "HP keeps a hero standing. MP pays fixed skill costs; Normal Attack restores exactly 6% Max MP."],
  ["CRIT", "Starts at 5%, then adds AGI, gear and talents. A critical hit deals double damage."],
  ["DMG / ACTION", "Expected damage from the strongest non-ultimate command, including average critical damage."],
  ["HEAL / ALLY", "HP restored to one ally by the strongest non-ultimate heal. Group heals restore this to each ally."]
];

function skillFormula(sk, id = null) {
  if (sk.statusOnly) return "Debuff / no direct damage";
  if (sk.power < 0) return `${Math.abs(sk.power)} + ${sk.healScaling ?? .3} x MAG healing`;
  if (sk.dispel) return "Dispel / no damage scaling";
  if (!skillTargetsEnemies(sk)) return "Support / no damage scaling";
  const scaling = skillScalingLabel(id, sk);
  return sk.coefficient ? `${sk.coefficient} x (${scaling}) + 0-5` : `${sk.power} + ${scaling} + 0-5`;
}

function skillExpectedOutput(id, sk, unit = { id, statuses: [] }, afflicted = false) {
  if (sk.statusOnly) return 0;
  if (sk.power < 0) return healingAmount(id, sk, unit);
  if (sk.dispel) return 0;
  if (!skillTargetsEnemies(sk)) return 0;
  const statKey = skillScaling(sk);
  const stat = skillOffensiveStat(id, sk, unit);
  let base = sk.coefficient ? stat * sk.coefficient : sk.power + stat;
  const target = { statuses: afflicted ? [{ type: "poison" }] : [] };
  base *= skillDamageTalentMultiplier(unit, sk, target);
  if (sk.anim === "ultimate") base *= ultimatePotencyMultiplier(id, sk);
  const multiplier = outgoingDamageMultiplier(unit, statKey === "str" ? "melee" : "magic", target)
    * (afflicted ? 1 + (sk.afflictedBonus || 0) : 1)
    * (1 + (sk.buffScaling || 0) * ensureStatuses(unit).filter(status => STATUS_DEFS[status.type]?.buff).length);
  const crit = heroCritChance(id, afflicted);
  return Array.from({ length: 6 }, (_, roll) => Math.max(1, Math.round((base + roll) * multiplier)) * (1 - crit)
    + Math.max(1, Math.round((base + roll) * multiplier * (sk.criticalMultiplier || 2))) * crit).reduce((sum, value) => sum + value, 0) / 6;
}

function skillOutputBreakdown(id, sk, unit = { id, statuses: [] }) {
  if (sk.statusOnly) return { kind: "support", scaling: "NONE" };
  if (sk.power < 0) {
    return { kind: "healing", scaling: "MAG", healing: healingAmount(id, sk, unit) };
  }
  if (sk.dispel) return { kind: "support", scaling: "NONE" };
  if (!skillTargetsEnemies(sk)) return { kind: "support", scaling: "NONE" };
  const statKey = skillScaling(sk);
  const stat = skillOffensiveStat(id, sk, unit);
  let base = sk.coefficient ? stat * sk.coefficient : sk.power + stat;
  const target = { statuses: [] };
  base *= skillDamageTalentMultiplier(unit, sk, target);
  if (sk.anim === "ultimate") base *= ultimatePotencyMultiplier(id, sk);
  const multiplier = outgoingDamageMultiplier(unit, statKey === "str" ? "melee" : "magic", target)
    * (1 + (sk.buffScaling || 0) * ensureStatuses(unit).filter(status => STATUS_DEFS[status.type]?.buff).length);
  const normal = Array.from({ length: 6 }, (_, roll) => Math.max(1, Math.round((base + roll) * multiplier)))
    .reduce((sum, value) => sum + value, 0) / 6;
  const critical = Array.from({ length: 6 }, (_, roll) => Math.max(1, Math.round((base + roll) * multiplier * (sk.criticalMultiplier || 2))))
    .reduce((sum, value) => sum + value, 0) / 6;
  const critChance = heroCritChance(id);
  return {
    kind: "damage",
    scaling: skillScalingLabel(id, sk),
    normal: Math.round(normal),
    critical: Math.round(critical),
    average: Math.round(normal * (1 - critChance) + critical * critChance),
    critChance
  };
}

function statusAbilityMetricsHtml(id, sk, unit) {
  const output = skillOutputBreakdown(id, sk, unit);
  if (output.kind === "healing") {
    return `<div class="status-ability-metrics"><span><b>SCALING</b>${output.scaling}</span><span><b>HPS</b>${output.healing} / ally</span><span><b>OUTPUT</b>per use</span></div>`;
  }
  if (output.kind === "support") {
    return `<div class="status-ability-metrics"><span><b>SCALING</b>None</span><span><b>OUTPUT</b>Utility skill</span></div>`;
  }
  return `<div class="status-ability-metrics"><span><b>SCALING</b>${output.scaling}</span><span><b>NORMAL</b>${output.normal}</span><span><b>CRIT</b>${output.critical}</span><span><b>AVG DPS</b>${output.average} (${Math.round(output.critChance * 100)}% CRIT)</span></div>`;
}

function skillCatalogueHtml(id) {
  const normal = battleSkills(id, { id });
  const form = id === "Glimmer" ? "mech" : id === "Kael" ? "shadowpriest" : null;
  const sections = [{ title: "Current skills", skills: normal, unit: { id, statuses: [] } }];
  if (form && normal.some(sk => sk.transform === form)) sections.push({ title: form === "mech" ? "Mech Form skills" : "Shadowpriest skills", skills: TRANSFORMED_SKILLS[form], unit: { id, form, statuses: [] } });
  return sections.map(section => `<details class="skill-catalogue"><summary>${section.title}</summary><div class="skill-catalogue-list">${section.skills.map(sk => `<article><strong>${sk.name}</strong><small>${sk.anim === "ultimate" ? `100 Resonance / Rank ${ultimateRank(id)}` : sk.basicAttack ? "0 MP / restores 6% Max MP" : `${skillMpCost(id, sk, section.unit)} fixed MP`} / ${sk.element} / ${skillFormula(sk, id)}</small><p>${sk.desc}</p><small>${sk.power < 0 ? "Heal / ally" : "Average damage / target"}: ${Math.round(skillExpectedOutput(id, sk, section.unit))}${skillTargetsEnemies(sk) ? ` / ${Math.round(skillExpectedOutput(id, sk, section.unit, true))} vs afflicted` : ""}</small></article>`).join("")}</div><p class="shop-note">Estimates include current gear, talents, ECHO, Ultimate rank and form stats, but no enemy defense, weakness, Break bonus or temporary buffs. Area damage is per target.</p></details>`).join("");
}

function estimatedHeroOutput(id) {
  const t = totals(id);
  const skills = battleSkills(id, { id });
  const critInfo = heroCritBreakdown(id);
  const crit = critInfo.total;
  const afflictedCrit = Math.min(.65, crit + typedTalentValue(id, "afflictedCrit"));
  const damageOptions = skills.filter(sk => sk.anim !== "ultimate" && (sk.power > 0 || sk.coefficient) && skillTargetsEnemies(sk)).map(sk => {
    const statKey = skillScaling(sk);
    const stat = skillOffensiveStat(id, sk, { id }, t);
    const statContribution = sk.coefficient ? stat * sk.coefficient : stat;
    const base = (sk.coefficient ? statContribution : sk.power + statContribution) + 2.5;
    const damageType = statKey === "mag" ? "magicDamage" : "physicalDamage";
    const gearDamageBonus = effectValue(id, damageType) + typedTalentValue(id, damageType);
    const damageBeforeCrit = base * (1 + gearDamageBonus);
    const damageWithoutAgiCrit = damageBeforeCrit * (1 + critInfo.base);
    const value = skillExpectedOutput(id, sk);
    return {
      name: sk.name,
      value,
      damageBeforeCrit,
      damageWithoutAgiCrit,
      statName: skillScalingLabel(id, sk),
      statValue: stat,
      statContribution,
      statShare: base ? statContribution / base : 0,
      gearDamageBonus
    };
  });
  const healingOptions = skills.filter(sk => sk.anim !== "ultimate" && sk.power < 0).map(sk => {
    const value = healingAmount(id, sk);
    return { name: sk.name, value };
  });
  const bestDamage = damageOptions.sort((a, b) => b.value - a.value)[0] || {
    name: "None",
    value: 0,
    damageBeforeCrit: 0,
    damageWithoutAgiCrit: 0,
    statName: "STR",
    statValue: t.str,
    statContribution: 0,
    statShare: 0,
    gearDamageBonus: 0
  };
  const bestHealing = healingOptions.sort((a, b) => b.value - a.value)[0] || { name: "None", value: 0 };
  const agiDamageGain = Math.max(0, bestDamage.value - bestDamage.damageWithoutAgiCrit);
  const agiDamagePercent = bestDamage.damageWithoutAgiCrit ? agiDamageGain / bestDamage.damageWithoutAgiCrit : 0;
  return {
    crit,
    afflictedCrit,
    critInfo,
    dps: Math.round(bestDamage.value),
    dpsSkill: bestDamage.name,
    damageBeforeCrit: Math.round(bestDamage.damageBeforeCrit),
    agiDamageGain: Math.round(agiDamageGain),
    agiDamagePercent,
    damageStatName: bestDamage.statName,
    damageStatValue: bestDamage.statValue,
    damageStatContribution: Math.round(bestDamage.statContribution),
    damageStatPercent: bestDamage.statShare,
    gearDamageBonus: bestDamage.gearDamageBonus,
    hps: Math.round(bestHealing.value),
    hpsSkill: bestHealing.name
  };
}

function statusStatImpactHtml(t, output) {
  const baseHp = 30 + t.stam * 4;
  const bonusHp = t.max - baseHp;
  const agiCrit = (output.critInfo.agilityBonus * 100).toFixed(1);
  const appliedAgiCrit = (output.critInfo.agilityApplied * 100).toFixed(1);
  const baseCrit = Math.round(output.critInfo.base * 100);
  const totalCrit = Math.round(output.crit * 100);
  const agiCapNote = appliedAgiCrit < agiCrit ? ` (${appliedAgiCrit}% applied at the 65% total cap)` : "";
  const gearDamage = Math.round(output.gearDamageBonus * 100);
  const hpBonusText = bonusHp ? ` Equipment HP bonuses add ${bonusHp > 0 ? "+" : ""}${bonusHp}.` : "";
  return `<div class="status-stat-impact"><span><b>OFFENSE</b><small><strong>${output.damageStatName} ${output.damageStatValue}</strong> contributes ${output.damageStatContribution} base damage to ${output.dpsSkill} (${Math.round(output.damageStatPercent * 100)}% of its pre-crit output). ${gearDamage ? `Damage gear and talents add +${gearDamage}%. ` : ""}${output.damageBeforeCrit} before crit becomes ${output.dps} average damage.</small></span><span><b>AGI + CRIT</b><small><strong>AGI ${t.agi}</strong> grants +${agiCrit}% CRIT${agiCapNote}. Base, gear and talent CRIT provide ${baseCrit}%, for ${totalCrit}% total. AGI adds about ${output.agiDamageGain} damage/action (+${Math.round(output.agiDamagePercent * 100)}%).</small></span><span><b>VITALS + ECHO</b><small><strong>STAM ${t.stam}</strong> supplies ${t.stam * 4} HP plus 30 base HP.${hpBonusText} <strong>MAG ${t.mag}</strong> supplies ${Math.floor(t.mag / 2)} MP plus 12 base MP and ${(t.mag * .3).toFixed(1)} healing. <strong>ECHO ${t.echo}</strong> adds ${(t.echo * .15).toFixed(1)}% Ultimate/Echo/form potency.</small></span></div>`;
}

function equippedProcChances(id) {
  return ["poison", "sleep", "stun"].map(type => {
    const applicationBonus = typedTalentValue(id, "statusChance", type) + effectValue(id, "statusChance");
    const raw = effectValue(id, "statusOnHit", type);
    const normalChance = Math.min(.95, raw * (STATUS_TIER_CHANCES.normal[type] || 1) * (1 + applicationBonus));
    return { type, raw, normalChance };
  }).filter(entry => entry.raw > 0);
}

function statusEquipmentHtml(id) {
  return Object.entries(baseJobs[id].gear).map(([slot, name]) => {
    const gear = gearByName(name);
    if (!gear) return `<div class="status-gear-row"><span><b>${slot.toUpperCase()}</b><strong>Empty</strong></span><div><small>No equipment.</small></div></div>`;
    return `<div class="status-gear-row is-hoverable" ${gearHoverAttribute({ heroId: id, ref: name })}><span><b>${slot.toUpperCase()}</b><strong>${gearDisplayName(name)}</strong>${gearRarityHtml(name)}</span><div><small class="status-gear-base"><b>Base stats:</b> ${statLine(gear.stats)}</small><small>Hover for exact affixes, Specials and formula impact.</small></div></div>`;
  }).join("");
}

function statusGearOverviewHtml(id) {
  const refs = Object.values(baseJobs[id].gear).filter(Boolean);
  const stats = Object.fromEntries(HALL_BASE_STATS.map(stat => [stat, 0]));
  const affixes = new Map();
  const specials = [];
  refs.forEach(ref => {
    const gear = gearByName(ref);
    Object.entries(gear?.stats || {}).forEach(([stat, value]) => {
      if (stat in stats) stats[stat] += Number(value) || 0;
    });
    gearAffixes(ref).filter(entry => !isGenericBreakGearAffix(entry)).forEach(entry => {
      const key = affixComparisonKey(entry);
      const current = affixes.get(key);
      if (current) current.value += Number(entry.value) || 0;
      else affixes.set(key, { ...entry, value: Number(entry.value) || 0 });
    });
    gearEffectLabels(gear).forEach(label => specials.push({ item: gearDisplayName(ref), label }));
  });
  const statHtml = HALL_BASE_STATS.map(stat => `<span><small>${stat.toUpperCase()}</small><strong>+${stats[stat]}</strong></span>`).join("");
  const affixHtml = [...affixes.values()].map(entry => affixDetailHtml(entry)).join("") || `<p class="status-empty">No random affix contributions equipped.</p>`;
  const specialHtml = specials.map(entry => `<span><b>${entry.item}</b><small>${entry.label}</small></span>`).join("") || `<p class="status-empty">No unique Specials equipped.</p>`;
  return `<div class="status-gear-totals"><div class="status-gear-stat-total">${statHtml}</div><div class="status-gear-affix-total"><h5>Combined affixes</h5>${affixHtml}</div><div class="status-gear-special-total"><h5>Unique Specials</h5>${specialHtml}</div></div>`;
}

function abilityUnlockLabel(id, sk) {
  if (sk.rank0) return "Rank 0 choice";
  const base = baseJobs[id].skills.find(entry => entry.name === sk.name);
  if (base) return base.transform ? `Level ${TRANSFORMATION_UNLOCK_LEVEL}` : "Level 1";
  const talentEntry = activeTalents(id).find(entry => entry.type === "newSkill" && entry.value?.name === sk.name);
  if (talentEntry) {
    const earliestLevel = TALENT_POINT_LEVELS[Math.min(TALENT_POINT_LEVELS.length - 1, (talentEntry.tier - 1) * 2)];
    return `Talent T${talentEntry.tier} / Lv ${earliestLevel}+`;
  }
  return "Talent upgrade";
}

function statusAbilityRowsHtml(id, skills, unit = { id, statuses: [] }, originLabel = "") {
  return skills.map(sk => {
    const cost = sk.anim === "ultimate" ? "100 Resonance" : sk.basicAttack ? "0 MP / +6% MP" : `${skillMpCost(id, sk, unit)} MP`;
    const target = battleSkillTargetLabel(id, sk);
    return `<div class="status-ability-row"><span><strong>${sk.name}</strong><small>${sk.element} / ${target} / ${cost}</small></span><p>${sk.desc}</p><b>${originLabel || abilityUnlockLabel(id, sk)}</b>${statusAbilityMetricsHtml(id, sk, unit)}</div>`;
  }).join("");
}

function statusAbilitiesHtml(id) {
  const normalUnit = { id, statuses: [] };
  const normal = battleSkills(id, normalUnit);
  const transform = normal.find(sk => sk.transform)?.transform;
  const form = transform ? battleSkills(id, { id, form: transform, statuses: [] }) : [];
  const formTitle = transform === "mech" ? "Mech Form kit" : transform === "shadowpriest" ? "Shadowpriest kit" : "";
  return `<section class="status-detail-section status-abilities"><h4>Available abilities (${normal.length})</h4><div class="status-ability-list">${statusAbilityRowsHtml(id, normal, normalUnit)}</div>${form.length ? `<details><summary>${formTitle} (${form.length})</summary><div class="status-ability-list">${statusAbilityRowsHtml(id, form, { id, form: transform, statuses: [] }, "Form kit")}</div></details>` : ""}</section>`;
}

function statusCardHtml(id) {
  const h = baseJobs[id];
  const t = totals(id);
  const chosen = activeTalents(id);
  const output = estimatedHeroOutput(id);
  const procs = equippedProcChances(id);
  const activeLabel = state.activeParty.includes(id) ? `ACTIVE SLOT ${state.activeParty.indexOf(id) + 1}` : "RESERVE";
  const portrait = menuPortraitSource(id);
  const specialties = characterSpecialties[id] || [h.title];
  const biography = characterBios[id] || `${h.name} serves the Flameguard as ${h.title}.`;
  const procHtml = procs.length ? procs.map(entry => `<span><b>${entry.type.toUpperCase()}</b><strong>${Math.round(entry.raw * 100)}%</strong><small>${Math.round(entry.normalChance * 100)}% vs normal foes</small></span>`).join("") : `<p class="status-empty">No Poison, Sleep or Stun proc equipped.</p>`;
  const baseCrit = Math.round(output.critInfo.base * 100);
  const agiCrit = (output.critInfo.agilityBonus * 100).toFixed(1);
  const afflictedText = output.afflictedCrit > output.crit ? ` / ${Math.round(output.afflictedCrit * 100)}% vs afflicted` : "";
  const combatUnit = battle?.party?.find(unit => unit.id === id);
  const evasionUnit = combatUnit || { id, baseEvasion: FLAMEGUARD_BASE_EVASION[id] ?? .05, statuses: [] };
  const activeEvasion = statusValue(evasionUnit, "evasion");
  const currentEvasion = combatEvasionChance(evasionUnit);
  const evasionCharges = statusOf(evasionUnit, "evasion")?.incomingCharges || 0;
  const evasionHtml = `<span><small>EVASION</small><strong>${Math.round(currentEvasion * 100)}%</strong><em>${Math.round(baseEvasionValue(evasionUnit) * 100)}% base${activeEvasion ? ` + ${Math.round(activeEvasion * 100)}% temporary / ${evasionCharges} incoming attacks` : ""}</em></span>`;
  return `<article class="menu-card status-card"><header class="status-card-head"><img src="${portrait}" alt="${h.name} portrait"><div><small>${activeLabel}</small><strong>${h.name}</strong><span>${h.title} / ${h.element}</span><p>${specialties.join(" / ")}</p></div></header><section class="status-biography"><h4>Biography</h4><p>${biography}</p></section>${xpProgressHtml(id)}<div class="status-core-stats"><span><small>STR</small><strong>${t.str}</strong></span><span><small>AGI</small><strong>${t.agi}</strong></span><span><small>MAG</small><strong>${t.mag}</strong></span><span><small>STAM</small><strong>${t.stam}</strong></span><span><small>ECHO</small><strong>${t.echo}</strong></span><span><small>HP</small><strong>${h.hp}/${t.max}</strong></span><span><small>MP</small><strong>${h.mp}/${t.mp}</strong></span></div><div class="status-output"><span><small>CRIT RATE</small><strong>${Math.round(output.crit * 100)}%</strong><em>${baseCrit}% base/gear/talents + ${agiCrit}% AGI${afflictedText}</em></span><span><small>DMG / ACTION</small><strong>${output.dps}</strong><em>${output.dpsSkill} / ${output.damageBeforeCrit} before crit</em></span><span><small>HEAL / ALLY</small><strong>${output.hps}</strong><em>${output.hpsSkill}</em></span>${evasionHtml}</div><section class="status-detail-section"><h4>Equipment slots</h4><div class="status-gear-list">${statusEquipmentHtml(id)}</div></section><section class="status-detail-section"><h4>Total equipped gear contribution</h4>${statusGearOverviewHtml(id)}</section><section class="status-detail-section status-talents"><h4>Chosen talents</h4><p>${chosen.length ? chosen.map(entry => `<b>${entry.name}</b>`).join(" / ") : "No talent points spent yet."}</p></section><details class="status-reference status-combat-detail"><summary>Abilities and combat detail</summary>${statusAbilitiesHtml(id)}<section class="status-detail-section"><h4>What these stats add</h4>${statusStatImpactHtml(t, output)}</section><section class="status-detail-section"><h4>Equipped proc chances</h4><div class="status-procs">${procHtml}</div></section></details></article>`;
}

function toggleTalent(value) {
  const separator = value.indexOf(":");
  const id = value.slice(0, separator);
  const name = value.slice(separator + 1);
  const progress = progressFor(id);
  const entry = (talentTrees[id] || []).find(option => option.name === name);
  if (!entry || mode === "battle") return;
  if (progress.talents.includes(name)) return;
  const existingCapstone = entry.tier === 5 ? activeTalents(id).find(option => option.tier === 5) : null;
  const spentBefore = progress.talents.length - (existingCapstone ? 1 : 0);
  const requirement = (entry.tier - 1) * 2;
  if (spentBefore < requirement || (!existingCapstone && spentBefore >= talentPointsEarned(progress.level))) return;
  if (existingCapstone) progress.talents = progress.talents.filter(chosen => chosen !== existingCapstone.name);
  progress.talents.push(name);
  spendPendingSkillPoint(id, entry.level);
  playSfx("menu");
  updatePanels();
  renderMenu();
}

function resetTalents(id) {
  if (mode === "battle") return;
  const progress = progressFor(id);
  progress.talents = [];
  progressFor(id);
  playSfx("menu");
  updatePanels();
  renderMenu();
}

function capsHtml(id) {
  const crit = heroCritBreakdown(id);
  return `<div class="combat-caps"><strong>${id} / Combat limits</strong><span>CRIT ${Math.round(crit.total * 100)}% / 65% max</span><span>AGI CRIT +${(crit.agilityBonus * 100).toFixed(1)}% (0.10 percentage point per AGI)</span><span>Status application: 95% max after resistance</span><span>Normal Attack: restores 6% Max MP</span><span>Extra actions: 2 per battle (shared by party)</span><span>Boss Poison: 1.5% max HP per tick; refreshes, never stacks</span></div>`;
}

let gearHoverRegistry = [];
let gearHoverTooltip = null;
let gearHoverHideTimer = 0;

function gearHoverAttribute(context) {
  const index = gearHoverRegistry.push(context) - 1;
  return `data-gear-hover="${index}"`;
}

function gearComparisonHero(gear, preferred = selectedGearHero) {
  if (preferred && state.party.includes(preferred) && canEquip(preferred, gear)) return preferred;
  return state.activeParty.find(id => canEquip(id, gear)) || state.party.find(id => canEquip(id, gear)) || state.activeParty[0] || state.party[0];
}

function withTemporaryGearMetadata(ref, options, callback) {
  const hasAffixes = Object.prototype.hasOwnProperty.call(state.gearAffixes, ref);
  const hasRarity = Object.prototype.hasOwnProperty.call(state.gearRarities, ref);
  const hasStats = temporaryGearStats.has(ref);
  const previousAffixes = state.gearAffixes[ref];
  const previousRarity = state.gearRarities[ref];
  const previousStats = temporaryGearStats.get(ref);
  try {
    if (Array.isArray(options?.affixes) && !gearInstance(ref)) state.gearAffixes[ref] = options.affixes.map(entry => ({ ...entry }));
    if (options?.rarity && !gearInstance(ref)) state.gearRarities[ref] = options.rarity;
    if (options?.stats && !gearInstance(ref)) temporaryGearStats.set(ref, { ...options.stats });
    return callback();
  } finally {
    if (hasAffixes) state.gearAffixes[ref] = previousAffixes;
    else delete state.gearAffixes[ref];
    if (hasRarity) state.gearRarities[ref] = previousRarity;
    else delete state.gearRarities[ref];
    if (hasStats) temporaryGearStats.set(ref, previousStats);
    else temporaryGearStats.delete(ref);
  }
}

function comparisonNumber(value, percent = false, forceSign = true) {
  const amount = percent ? Math.round(value * 1000) / 10 : Math.round(value * 100) / 100;
  return `${forceSign && amount > 0 ? "+" : ""}${amount}${percent ? "%" : ""}`;
}

function affixComparisonKey(entry) {
  return `${entry.type}:${entry.stat || ""}:${entry.status || ""}:${entry.key || ""}`;
}

function affixComparisonValue(entry, value = entry?.value || 0) {
  const percent = ["statPct", "hpPct", "statusOnHit", "statusResistance", "critChance", "afflictedDamage", "physicalDamage", "magicDamage", "poisonReduction", "statusChance", "allStatusResistance", "echoing", "openingTurnProgress", "leeching", "siphoning"].includes(entry?.type);
  const turns = ["statusDuration", "statusDurationReduction", "buffDuration"].includes(entry?.type);
  return turns ? `${comparisonNumber(value)} turn${Math.abs(value) === 1 ? "" : "s"}` : comparisonNumber(value, percent);
}

function affixIconHtml(entry) {
  const labels = {
    statPct: entry?.stat?.toUpperCase() || "STAT",
    hpPct: "HP",
    statusOnHit: (entry?.status || "PROC").slice(0, 3).toUpperCase(),
    statusResistance: "RES",
    allStatusResistance: "RES",
    critChance: "CRT",
    afflictedDamage: "DMG",
    physicalDamage: "PHY",
    magicDamage: "MAG",
    statusChance: "FX",
    poisonReduction: "PSN",
    statusDurationReduction: "DUR",
    buffDuration: "BUF",
    statusDuration: "HEX",
    echoing: "ECH",
    openingTurnProgress: "AGI",
    leeching: "HP",
    siphoning: "MP"
  };
  return `<i class="affix-icon affix-${entry?.type || "other"}" aria-hidden="true">${labels[entry?.type] || "FX"}</i>`;
}

function affixDescription(entry) {
  const percent = Math.round((Number(entry?.value) || 0) * 100);
  if (entry?.type === "statPct") return `Increases ${entry.stat.toUpperCase()} by ${percent}%.`;
  if (entry?.type === "hpPct") return `Increases maximum HP by ${percent}%.`;
  if (entry?.type === "statusOnHit") return `${percent}% chance to inflict ${(entry.status || "a status").toUpperCase()} on an eligible hit.`;
  if (entry?.type === "statusResistance") return `Increases ${(entry.status || "status").toUpperCase()} resistance by ${percent}%.`;
  if (entry?.type === "allStatusResistance") return `Increases resistance to all eligible statuses by ${percent}%.`;
  if (entry?.type === "critChance") return `Increases Crit chance by ${percent} percentage points.`;
  if (entry?.type === "afflictedDamage") return `Increases damage against afflicted targets by ${percent}%.`;
  if (entry?.type === "physicalDamage") return `Increases physical damage by ${percent}%.`;
  if (entry?.type === "magicDamage") return `Increases magical damage by ${percent}%.`;
  if (entry?.type === "statusChance") return `Increases eligible status application chance by ${percent}%.`;
  if (entry?.type === "poisonReduction") return `Reduces Poison damage taken by ${percent}%.`;
  if (entry?.type === "statusDurationReduction") return `Shortens eligible negative statuses received by ${entry.value} turn.`;
  if (entry?.type === "buffDuration") return `Buffs you apply last ${entry.value} additional turn.`;
  if (entry?.type === "statusDuration") return `Negative statuses you inflict last ${entry.value} additional turn.`;
  if (entry?.type === "echoing") return `${percent}% chance after acting to grant an immediate ally action; once per wearer per battle and subject to the party cap.`;
  if (entry?.type === "openingTurnProgress") return `Adds ${percent}% initiative during round 1 only.`;
  if (entry?.type === "leeching") return `Heals ${percent}% of direct damage dealt by the action.`;
  if (entry?.type === "siphoning") return `After a damaging skill, restores MP equal to ${percent}% of its STR or MAG scaling stat.`;
  return formatAffix(entry);
}

function affixDetailHtml(entry, prefix = "") {
  return `<span class="affix-detail">${affixIconHtml(entry)}<b>${prefix}${entry.label || entry.type}</b><strong>${affixComparisonValue(entry)}</strong><small>${affixDescription(entry)}</small></span>`;
}

function gearComparisonContentHtml(id, slot, ref, options = {}) {
  const baseGear = gearByName(ref);
  const gear = baseGear && options.stats ? { ...baseGear, stats: { ...options.stats } } : baseGear;
  if (!gear || !baseJobs[id]) return "<p>Comparison unavailable.</p>";
  const equippedRef = baseJobs[id].gear[slot];
  const equippedGear = gearByName(equippedRef);
  const hoveredAffixes = Array.isArray(options.affixes) ? options.affixes : gearAffixes(ref);
  const equippedAffixes = equippedRef ? gearAffixes(equippedRef) : [];
  const statOrder = ["str", "mag", "stam", "agi", "echo", "hp", "mp"];
  const statKeys = [...new Set([...statOrder, ...Object.keys(gear.stats || {}), ...Object.keys(equippedGear?.stats || {})])]
    .filter(key => (gear.stats?.[key] || 0) !== 0 || (equippedGear?.stats?.[key] || 0) !== 0);
  const statRows = statKeys.map(key => {
    const value = gear.stats?.[key] || 0;
    const difference = value - (equippedGear?.stats?.[key] || 0);
    return `<tr><th>${key.toUpperCase()}</th><td>${comparisonNumber(value)}</td><td class="comparison-delta ${difference > 0 ? "is-positive" : difference < 0 ? "is-negative" : ""}">${comparisonNumber(difference)}</td></tr>`;
  }).join("");

  const hoveredByKey = new Map(hoveredAffixes.filter(entry => !isGenericBreakGearAffix(entry)).map(entry => [affixComparisonKey(entry), entry]));
  const equippedByKey = new Map(equippedAffixes.filter(entry => !isGenericBreakGearAffix(entry)).map(entry => [affixComparisonKey(entry), entry]));
  const sharedAffixKeys = [...hoveredByKey.keys()].filter(key => equippedByKey.has(key));
  const affixRows = sharedAffixKeys.map(key => {
    const hovered = hoveredByKey.get(key);
    const equipped = equippedByKey.get(key);
    const definition = hovered || equipped;
    const value = hovered?.value || 0;
    const difference = value - (equipped?.value || 0);
    return `<tr><th>${definition.label || definition.type}</th><td>${affixComparisonValue(definition, value)}</td><td class="comparison-delta ${difference > 0 ? "is-positive" : difference < 0 ? "is-negative" : ""}">${affixComparisonValue(definition, difference)}</td></tr>`;
  }).join("");
  const gainedAffixes = [...hoveredByKey.entries()].filter(([key]) => !equippedByKey.has(key)).map(([, entry]) => entry);
  const lostAffixes = [...equippedByKey.entries()].filter(([key]) => !hoveredByKey.has(key)).map(([, entry]) => entry);
  const affixDetails = hoveredAffixes.filter(entry => !isGenericBreakGearAffix(entry)).map(entry => affixDetailHtml(entry)).join("");
  const affixChanges = `${gainedAffixes.length ? `<section><b>Gained affixes</b>${gainedAffixes.map(entry => affixDetailHtml(entry, "+ ")).join("")}</section>` : ""}${lostAffixes.length ? `<section class="is-lost"><b>Lost affixes</b>${lostAffixes.map(entry => affixDetailHtml(entry, "- ")).join("")}</section>` : ""}`;

  const unit = { id, statuses: [] };
  const commands = battleSkills(id, unit).map(sk => ({ sk, unit }));
  commands.filter(({ sk }) => sk.transform).forEach(({ sk }) => {
    TRANSFORMED_SKILLS[sk.transform].forEach(formSkill => commands.push({ sk: formSkill, unit: { ...unit, form: sk.transform } }));
  });
  const meaningful = commands.filter(({ sk }) => sk.power < 0 || skillTargetsEnemies(sk));
  const before = meaningful.map(({ sk, unit: source }) => [skillExpectedOutput(id, sk, source), skillExpectedOutput(id, sk, source, true)]);
  const original = baseJobs[id].gear[slot];
  let rows;
  let nextValues;
  let nextCrit;
  try {
    withTemporaryGearMetadata(ref, options, () => {
      baseJobs[id].gear[slot] = ref;
      nextCrit = Math.round(heroCritBreakdown(id).total * 100);
      nextValues = meaningful.map(({ sk, unit: source }) => [skillExpectedOutput(id, sk, source), skillExpectedOutput(id, sk, source, true)]);
      rows = meaningful.map(({ sk, unit: source }, index) => {
        const next = Math.round(nextValues[index][0]);
        const old = Math.round(before[index][0]);
        const afflicted = Math.round(nextValues[index][1]);
        return `<tr><th>${sk.name}<small>${source.form || skillFormula(sk, id)}</small></th><td>${next}</td><td class="comparison-delta ${next > old ? "is-positive" : next < old ? "is-negative" : ""}">${next - old >= 0 ? "+" : ""}${next - old}</td><td>${sk.power < 0 ? "Heal / ally" : `${afflicted} vs afflicted`}</td></tr>`;
      }).join("");
    });
  } finally {
    baseJobs[id].gear[slot] = original;
  }
  const damageIndexes = meaningful.map(({ sk }, index) => skillTargetsEnemies(sk) ? index : -1).filter(index => index >= 0);
  const average = (values, afflicted = false) => damageIndexes.length ? damageIndexes.reduce((sum, index) => sum + values[index][afflicted ? 1 : 0], 0) / damageIndexes.length : 0;
  const percentDelta = (next, previous) => previous ? (next / previous - 1) * 100 : 0;
  const normalImpact = percentDelta(average(nextValues), average(before));
  const afflictedImpact = percentDelta(average(nextValues, true), average(before, true));
  const uniqueEffects = gearEffectLabels(gear);
  const set = mythicSetDefinition(gear);
  if (set) uniqueEffects.push(`${set.name} 3-piece: ${set.bonus.label}`);
  const currentUnique = equippedGear ? gearEffectLabels(equippedGear) : [];
  const rarity = options.rarity || gearRarity(ref);
  return `<div class="gear-compare-head"><strong>${gearDisplayName(ref)}</strong><small>${rarity.toUpperCase()} &bull; ${gearSlotLabel(gear.slot).toUpperCase()}</small><small>Compared with ${equippedRef ? gearDisplayName(equippedRef) : "empty slot"} on ${id}</small></div><div class="comparison-scroll"><table class="gear-value-comparison"><thead><tr><th>Base stat</th><th>Hovered item</th><th>Difference</th></tr></thead><tbody>${statRows || `<tr><td colspan="3">No base stat difference.</td></tr>`}</tbody></table>${affixRows ? `<table class="gear-value-comparison"><thead><tr><th>Matching affix</th><th>Hovered item</th><th>Difference</th></tr></thead><tbody>${affixRows}</tbody></table>` : ""}</div>${affixDetails ? `<div class="gear-affix-details"><strong>Affixes</strong>${affixDetails}</div>` : ""}${affixChanges ? `<div class="gear-affix-changes">${affixChanges}</div>` : ""}<div class="gear-unique-comparison"><strong>Unique effects</strong>${uniqueEffects.length ? uniqueEffects.map(label => `<small>${label}</small>`).join("") : "<small>None</small>"}${currentUnique.length ? `<em>Equipped item: ${currentUnique.join(" / ")}</em>` : ""}</div><div class="gear-impact-summary"><strong>Estimated combat impact</strong><span>Crit-adjusted direct damage <b class="${normalImpact > 0 ? "is-positive" : normalImpact < 0 ? "is-negative" : ""}">${comparisonNumber(normalImpact / 100, true)}</b></span><span>Vs afflicted <b class="${afflictedImpact > 0 ? "is-positive" : afflictedImpact < 0 ? "is-negative" : ""}">${comparisonNumber(afflictedImpact / 100, true)}</b></span><span>CRIT <b>${Math.round(heroCritBreakdown(id).total * 100)}% to ${nextCrit}%</b></span></div><details class="gear-skill-impact"><summary>Skill-by-skill formula impact</summary><div class="comparison-scroll"><table><thead><tr><th>Skill / scaling</th><th>Hovered</th><th>Difference</th><th>Conditional</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

function gearComparisonHtml(id, slot, ref, options = {}) {
  return `<summary>Detailed comparison</summary>${gearComparisonContentHtml(id, slot, ref, options)}`;
}

function gearHoverPopupHtml(context) {
  const gear = gearByName(context.ref);
  if (!gear) return "";
  return gearComparisonContentHtml(context.heroId, gear.slot, context.ref, context);
}

function hideGearHoverTooltip() {
  clearTimeout(gearHoverHideTimer);
  gearHoverHideTimer = window.setTimeout(() => {
    if (gearHoverTooltip) gearHoverTooltip.hidden = true;
  }, 140);
}

function keepGearHoverTooltipOpen() {
  clearTimeout(gearHoverHideTimer);
}

function fitGearHoverTooltipToViewport() {
  if (!gearHoverTooltip || gearHoverTooltip.hidden) return;
  gearHoverTooltip.style.setProperty("--gear-tooltip-scale", "1");
  const margin = window.innerWidth < 700 ? 8 : 20;
  const availableWidth = Math.max(1, window.innerWidth - margin * 2);
  const availableHeight = Math.max(1, window.innerHeight - margin * 2);
  const scale = Math.min(
    1,
    availableWidth / Math.max(1, gearHoverTooltip.scrollWidth),
    availableHeight / Math.max(1, gearHoverTooltip.scrollHeight)
  );
  gearHoverTooltip.style.setProperty("--gear-tooltip-scale", Math.max(.1, scale).toFixed(3));
}

function showGearHoverTooltip(element, context) {
  if (!context || !gearByName(context.ref)) return;
  keepGearHoverTooltipOpen();
  if (!gearHoverTooltip) {
    gearHoverTooltip = document.createElement("div");
    gearHoverTooltip.className = "gear-hover-tooltip";
    gearHoverTooltip.setAttribute("role", "tooltip");
    gearHoverTooltip.addEventListener("pointerenter", keepGearHoverTooltipOpen);
    gearHoverTooltip.addEventListener("pointerleave", hideGearHoverTooltip);
    window.addEventListener("resize", fitGearHoverTooltipToViewport);
    document.body.appendChild(gearHoverTooltip);
  }
  gearHoverTooltip.innerHTML = gearHoverPopupHtml(context);
  gearHoverTooltip.hidden = false;
  gearHoverTooltip.style.left = "50%";
  gearHoverTooltip.style.top = "50%";
  fitGearHoverTooltipToViewport();
}

function bindGearHoverTooltips(root = el.menuBody) {
  root.querySelectorAll("[data-gear-hover]").forEach(element => {
    const context = gearHoverRegistry[Number(element.dataset.gearHover)];
    element.addEventListener("pointerenter", () => showGearHoverTooltip(element, context));
    element.addEventListener("pointerleave", hideGearHoverTooltip);
    element.addEventListener("focusin", () => showGearHoverTooltip(element, context));
    element.addEventListener("focusout", hideGearHoverTooltip);
  });
}

function favoriteGearButton(ref) {
  return `<label class="gear-favorite"><input type="checkbox" data-favorite="${ref}" ${state.favoriteGear[ref] ? "checked" : ""}> Lock favorite</label>`;
}

function renderMenu() {
  gearHoverRegistry = [];
  hideGearHoverTooltip();
  el.menu.dataset.menuView = menuTab;
  document.querySelectorAll(".menu-tabs button").forEach(btn => btn.classList.toggle("is-active", btn.dataset.tab === menuTab));
  if (menuTab === "status") {
    if (!state.party.includes(selectedStatusHero)) selectedStatusHero = state.party[0];
    const id = selectedStatusHero;
    const glossary = statusStatHelp.map(([stat, detail]) => `<span><b>${stat}</b><small>${detail}</small></span>`).join("");
    const roster = state.party.map(heroId => {
      const hero = baseJobs[heroId];
      const activeIndex = state.activeParty.indexOf(heroId);
      return `<button type="button" class="status-hero ${heroId === id ? "is-selected" : ""}" data-status-hero="${heroId}"><img src="${menuPortraitSource(heroId)}" alt=""><span><strong>${hero.name}</strong><small>${hero.title} / Level ${progressFor(heroId).level}</small></span><b>${activeIndex >= 0 ? `ACTIVE ${activeIndex + 1}` : "RESERVE"}</b></button>`;
    }).join("");
    el.menuBody.innerHTML = `<nav class="status-roster" aria-label="Choose character">${roster}</nav><div class="status-scroll-region"><div class="status-menu-grid">${statusCardHtml(id)}</div><details class="status-reference" open><summary>Stat guide and combat limits</summary>${capsHtml(id)}<div class="status-glossary">${glossary}</div><p class="status-estimate-note">AGI changes turn order and critical chance, but does not create extra normal turns. Damage/action uses the average random roll and total CRIT, including damage gear; it excludes enemy defense, weakness, temporary buffs, afflicted bonuses and extra area targets. Proc rates show the equipped chance and the expected rate against a normal enemy.</p></details></div>`;
    el.menuBody.querySelectorAll("[data-status-hero]").forEach(button => button.onclick = () => {
      selectedStatusHero = button.dataset.statusHero;
      renderMenu();
    });
    bindGearHoverTooltips();
  }
  if (menuTab === "party") {
    const activeSlots = Array.from({ length: 3 }, (_, index) => {
      const id = state.activeParty[index];
      if (!id) return `<div class="party-slot ${selectedPartySlot === index ? "is-selected" : ""}"><button type="button" data-party-slot="${index}"><span>Slot ${index + 1}</span><strong>Empty</strong><small>Choose a reserve member below.</small></button></div>`;
      const h = baseJobs[id], t = totals(id);
      return `<div class="party-slot ${selectedPartySlot === index ? "is-selected" : ""}"><button type="button" class="party-slot-main" data-party-slot="${index}"><img src="${menuPortraitSource(id)}" alt=""><span>Slot ${index + 1}</span><strong>${h.name}</strong><small>${h.title} / AGI ${t.agi} / HP ${h.hp}/${t.max}</small></button><button type="button" class="party-remove" data-party-remove="${index}" ${state.activeParty.length <= 1 ? "disabled" : ""}>Remove</button></div>`;
    }).join("");
    const roster = state.party.map(id => {
      const h = baseJobs[id], t = totals(id);
      const activeIndex = state.activeParty.indexOf(id);
      return `<button type="button" class="party-member ${activeIndex >= 0 ? "is-active" : ""}" ${activeIndex >= 0 ? `data-party-focus="${activeIndex}"` : `data-party-add="${id}"`}><img src="${menuPortraitSource(id)}" alt=""><strong>${h.name}</strong><small>${h.title}</small><b>${activeIndex >= 0 ? `ACTIVE ${activeIndex + 1}` : "ADD"}</b><span>AGI ${t.agi}</span></button>`;
    }).join("");
    el.menuBody.innerHTML = `<div class="party-head"><strong>Active Battle Party</strong><span>Maximum 3 members. Select a slot, then choose a reserve.</span></div><div class="party-active-slots">${activeSlots}</div><h3>Flameguard Roster</h3><div class="party-roster">${roster}</div>`;
    el.menuBody.querySelectorAll("[data-party-slot]").forEach(button => button.onclick = () => {
      selectedPartySlot = Number(button.dataset.partySlot);
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-party-focus]").forEach(button => button.onclick = () => {
      selectedPartySlot = Number(button.dataset.partyFocus);
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-party-add]").forEach(button => button.onclick = () => setActivePartyMember(button.dataset.partyAdd));
    el.menuBody.querySelectorAll("[data-party-remove]").forEach(button => button.onclick = () => removeActivePartyMember(Number(button.dataset.partyRemove)));
  }
  if (menuTab === "skills") {
    if (!state.party.includes(selectedSkillHero)) selectedSkillHero = state.party[0];
    const id = selectedSkillHero;
    const hero = baseJobs[id];
    const progress = progressFor(id);
    const chosen = new Set(progress.talents);
    const roster = state.party.map(heroId => {
      const current = progressFor(heroId);
      const available = talentPointsEarned(current.level) - current.talents.length;
      const ready = available ? ` / ${available} READY` : "";
      return `<button type="button" class="skill-hero ${heroId === id ? "is-selected" : ""}" data-skill-hero="${heroId}"><img src="${menuPortraitSource(heroId)}" alt=""><strong>${heroId}</strong><small>Level ${current.level} / ${current.talents.length}/${talentPointsEarned(current.level)} spent${ready}</small></button>`;
    }).join("");
    const earned = talentPointsEarned(progress.level);
    const available = earned - progress.talents.length;
    const choices = rank0ChoicesHtml(id) + [1, 2, 3, 4, 5].map(tier => {
      const requirement = (tier - 1) * 2;
      const tierLocked = progress.talents.length < requirement;
      return `<section class="talent-tier ${tierLocked ? "is-locked" : ""}"><header><strong>Tier ${tier}${tier === 5 ? " / CAPSTONE" : ""}</strong><span>${tier === 1 ? "Open" : `Requires ${requirement} spent points`}${tier === 5 ? " / choose only one" : ""}</span></header><div class="talent-tier-grid">${talentTrees[id].filter(entry => entry.tier === tier).map(entry => {
      const selected = chosen.has(entry.name);
      const capstoneChosen = tier === 5 && activeTalents(id).some(option => option.tier === 5);
      const locked = !selected && (tierLocked || (available <= 0 && !capstoneChosen));
      const stateText = selected ? "CHOSEN" : tierLocked ? `SPEND ${requirement} POINTS FIRST` : capstoneChosen ? "SWAP CAPSTONE" : available > 0 ? "AVAILABLE" : "NO POINT AVAILABLE";
      return `<button type="button" class="talent-choice ${selected ? "is-active" : ""} ${locked ? "is-locked" : ""}" data-talent="${id}:${entry.name}" aria-pressed="${selected}" ${locked ? "disabled" : ""}><span><strong>${entry.name}</strong><p>${entry.unlockDesc}</p>${entry.type === "newSkill" ? `<small>${skillFormula(entry.value, id)} / ${entry.value.anim === "ultimate" ? "100 Resonance" : `${entry.value.cost} fixed MP`}</small>` : ""}<small>${stateText}</small></span><b>${selected ? "ON" : locked ? "LOCK" : capstoneChosen ? "SWAP" : "+"}</b></button>`;
      }).join("")}</div></section>`;
    }).join("");
    el.menuBody.innerHTML = `<div class="skill-head"><div><strong>Flameguard Talents</strong><p>Gain 1 point at levels 4, 8, 12, 16, 20, 24, 28, 32, 36 and 40. Spend 2 points to open each next tier; choose only one Tier 5 capstone.</p></div><span>${hero.name} / ${progress.talents.length} spent / ${available} ready</span></div><div class="skill-roster">${roster}</div><section class="skill-tree-panel"><header><img class="skill-profile-portrait" src="${menuPortraitSource(id)}" alt=""><div><strong>${hero.name}</strong><small>${hero.title} / ${hero.element}</small><button type="button" class="talent-reset" data-reset-talents="${id}" ${progress.talents.length ? "" : "disabled"}>Reset talents</button></div>${xpProgressHtml(id)}</header><div class="talent-tiers">${choices}</div></section>${skillCatalogueHtml(id)}`;
    el.menuBody.querySelectorAll("[data-skill-hero]").forEach(button => button.onclick = () => {
      selectedSkillHero = button.dataset.skillHero;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-talent]").forEach(button => button.onclick = () => toggleTalent(button.dataset.talent));
    el.menuBody.querySelectorAll("[data-rank0]").forEach(button => button.onclick = () => {
      const [heroId, name] = button.dataset.rank0.split(":");
      selectRank0(heroId, name);
    });
    el.menuBody.querySelector("[data-reset-talents]").onclick = () => resetTalents(id);
  }
  if (menuTab === "gear") {
    if (!state.party.includes(selectedGearHero)) selectedGearHero = state.party[0];
    const id = selectedGearHero;
    const h = baseJobs[id];
    const totalsNow = totals(id);
    const roster = state.party.map(heroId => {
      const hero = baseJobs[heroId];
      const heroTotals = totals(heroId);
      return `<button type="button" class="gear-hero ${heroId === id ? "is-selected" : ""}" data-gear-hero="${heroId}"><img src="${menuPortraitSource(heroId)}" alt=""><strong>${hero.name}</strong><small>${hero.title}</small><span>HP ${hero.hp}/${heroTotals.max}</span></button>`;
    }).join("");
    const allGearChoices = ownedGearRefs().map(ref => ({ ref, gear: gearByName(ref) })).filter(entry => entry.gear);
    const slotChoices = filteredSortedGear(allGearChoices);
    const choiceIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[selectedGearSlot];
    if (selectedGearRef !== "__EMPTY__" && !slotChoices.some(entry => entry.ref === selectedGearRef)) selectedGearRef = null;
    if (!selectedGearRef) selectedGearRef = h.gear[selectedGearSlot] || slotChoices[0]?.ref || "__EMPTY__";
    const slotTabs = Object.entries(h.gear).map(([slot, equippedRef]) => {
      const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[slot];
      const gear = gearByName(equippedRef);
      return `<button type="button" class="selection-tab ${selectedGearSlot === slot ? "is-active" : ""}" data-gear-slot="${slot}">${gear ? gearIconHtml(gear, id, iconIndex, "selection-tab-icon", equippedRef) : pixelIconHtml("gear-empty", iconIndex, "selection-tab-icon")}<span><strong>${gearSlotLabel(slot)}</strong><small>${equippedRef ? gearDisplayName(equippedRef) : "Empty"}</small></span><b>${ownedGearRefs(slot, id).length}</b></button>`;
    }).join("");
    const choiceList = `${slotChoices.map(({ ref, gear }, index) => {
      const equipped = h.gear[selectedGearSlot] === ref;
      const holders = equippedGearUsers(ref);
      const copies = gearCopyCount(ref);
      const location = holders.length ? `Equipped: ${holders.join(", ")}` : gearInstance(ref) ? "Separate copy" : `Owned x${copies}`;
      const rowIconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot];
      return `<button type="button" class="selection-row ${selectedGearRef === ref ? "is-selected" : ""} ${equipped ? "is-equipped" : ""}" data-gear-preview="${index}" ${gearHoverAttribute({ heroId: id, ref })}>${gearIconHtml(gear, id, rowIconIndex, "selection-row-icon", ref)}<span><strong>${gearDisplayName(ref)}</strong><small>${gearRarity(ref)} &bull; ${gearSlotLabel(gear.slot)} &bull; ${statLine(gear.stats)}</small><small>${location}</small></span><b>${equipped ? "ON" : ""}</b></button>`;
    }).join("") || `<p class="selection-list-empty">No gear matches these filters.</p>`}${gearBrowser.slot === "all" ? "" : `<button type="button" class="selection-row ${selectedGearRef === "__EMPTY__" ? "is-selected" : ""}" data-gear-empty>${pixelIconHtml("gear-empty", choiceIndex, "selection-row-icon")}<span><strong>Unequip slot</strong><small>No equipment bonus</small></span></button>`}`;
    const selectedGear = selectedGearRef === "__EMPTY__" ? null : gearByName(selectedGearRef);
    const selectedSlot = selectedGear?.slot || selectedGearSlot;
    const equipped = h.gear[selectedSlot] === selectedGearRef;
    const usable = selectedGear ? canEquip(id, selectedGear) : true;
    const selectedHolders = selectedGear ? equippedGearUsers(selectedGearRef) : [];
    const detailIconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[selectedSlot];
    const detail = selectedGear ? `<article class="selection-detail"><header class="selection-detail-head">${gearIconHtml(selectedGear, id, detailIconIndex, "selection-detail-icon", selectedGearRef)}<div><small>${gearSlotLabel(selectedGear.slot)}</small><strong>${gearDisplayName(selectedGearRef)}</strong>${gearRarityHtml(selectedGearRef)}</div></header><div class="selection-stat-line">${statLine(selectedGear.stats)}</div><p>${selectedGear.desc}</p><small class="gear-access">${gearAccessLabel(selectedGear)}</small>${gearEffectHtml(selectedGear, "item-effect")}${gearAffixHtml(selectedGearRef)}<p class="selection-location">${selectedHolders.length ? `Equipped by ${selectedHolders.join(", ")}` : "Unequipped"}</p><div class="selection-actions"><button type="button" data-equip="${id}:${selectedSlot}:${selectedGearRef}" ${equipped || !usable ? "disabled" : ""}>${equipped ? "Equipped" : usable ? "Equip on " + h.name : "Not usable by " + h.name}</button>${favoriteGearButton(selectedGearRef)}</div><details class="gear-comparison" open>${gearComparisonHtml(id, selectedSlot, selectedGearRef)}</details></article>` : `<article class="selection-detail selection-empty"><header><small>${gearBrowser.slot === "all" ? "Gear results" : gearSlotLabel(selectedGearSlot)}</small><strong>${slotChoices.length ? "Select gear" : "No matching gear"}</strong></header><p>${slotChoices.length ? "Choose an item to inspect its stats, effects and affixes." : "Adjust the search or clear the active filters."}</p></article>`;
    el.menuBody.innerHTML = `<div class="gear-roster">${roster}</div><div class="gear-scroll-region"><section class="gear-summary gear-summary-strip"><img class="gear-profile-portrait" src="${menuPortraitSource(id)}" alt=""><strong>${h.name}</strong><small>${h.title} / ${h.element}</small><div class="gear-stat-grid"><span>STR <b>${totalsNow.str}</b></span><span>AGI <b>${totalsNow.agi}</b></span><span>MAG <b>${totalsNow.mag}</b></span><span>STAM <b>${totalsNow.stam}</b></span><span>ECHO <b>${totalsNow.echo}</b></span><span>HP <b>${h.hp}/${totalsNow.max}</b></span><span>MP <b>${h.mp}/${totalsNow.mp}</b></span></div></section>${autoEquipToolbarHtml(id)}${gearBrowserToolbarHtml(slotChoices.length, allGearChoices.length)}<div class="selection-workspace gear-selection-workspace"><section class="selection-list-panel"><nav class="selection-tabs gear-slot-tabs">${slotTabs}</nav><header><strong>${gearBrowser.slot === "all" ? "All Gear" : gearSlotLabel(gearBrowser.slot)}</strong><small>${slotChoices.length} matching</small></header><div class="selection-list">${choiceList}</div></section>${detail}</div></div>`;
    el.menuBody.querySelectorAll("[data-gear-hero]").forEach(btn => btn.onclick = () => {
      selectedGearHero = btn.dataset.gearHero;
      selectedGearRef = null;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-gear-slot]").forEach(btn => btn.onclick = () => {
      selectedGearSlot = btn.dataset.gearSlot;
      gearBrowser.slot = selectedGearSlot;
      selectedGearRef = null;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-gear-preview]").forEach(btn => btn.onclick = () => {
      const selected = slotChoices[Number(btn.dataset.gearPreview)];
      selectedGearRef = selected?.ref || null;
      if (selected?.gear?.slot) selectedGearSlot = selected.gear.slot;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-gear-empty]").forEach(btn => btn.onclick = () => {
      selectedGearRef = "__EMPTY__";
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-equip]").forEach(btn => btn.onclick = () => equipGear(btn.dataset.equip));
    el.menuBody.querySelectorAll("[data-auto-equip-pool]").forEach(btn => btn.onclick = () => {
      autoEquipPool = btn.dataset.autoEquipPool;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-auto-equip]").forEach(btn => btn.onclick = () => runAutoEquip(btn.dataset.autoEquip));
    el.menuBody.querySelectorAll("[data-favorite]").forEach(input => input.onchange = () => {
      if (input.checked) state.favoriteGear[input.dataset.favorite] = true;
      else delete state.favoriteGear[input.dataset.favorite];
      updatePanels();
    });
    bindGearBrowserControls();
  }
  if (menuTab === "items") {
    const stash = Object.entries(state.stash).filter(([, amount]) => amount > 0);
    const bag = Object.entries(state.inventory).filter(([, amount]) => amount > 0);
    const inventoryEntries = bag.map(([name, amount]) => ({ key: `item:${name}`, kind: "item", name, amount }));
    const allEquipment = ownedGearRefs().map(ref => ({ key: `gear:${ref}`, kind: "gear", ref, gear: gearByName(ref) })).filter(entry => entry.gear);
    const equipment = selectedItemCategory === "gear" ? filteredSortedGear(allEquipment) : allEquipment;
    const fieldSkills = state.party.flatMap(casterId => baseJobs[casterId].skills
      .filter(sk => sk.anim !== "ultimate" && (sk.power < 0 || sk.anim === "block"))
      .map(sk => ({ key: `skill:${casterId}:${baseJobs[casterId].skills.indexOf(sk)}`, kind: "skill", casterId, sk, skillIndex: baseJobs[casterId].skills.indexOf(sk) })));
    const stashEntries = stash.map(([name, amount]) => ({ key: `stash:${name}`, kind: "stash", name, amount }));
    const categories = {
      consumables: inventoryEntries.filter(entry => inventoryCategory(entry.name) === "consumables"),
      gear: equipment,
      treasure: inventoryEntries.filter(entry => inventoryCategory(entry.name) === "treasure"),
      quest: inventoryEntries.filter(entry => inventoryCategory(entry.name) === "quest"),
      skills: fieldSkills,
      stash: stashEntries
    };
    const categoryLabels = { consumables: "Consumables", gear: "Gear", treasure: "Treasure", quest: "Quest Items", skills: "Field Skills", stash: "Stash" };
    if (!categories[selectedItemCategory]) selectedItemCategory = "consumables";
    const currentEntries = categories[selectedItemCategory];
    if (!currentEntries.some(entry => entry.key === selectedItemRef)) selectedItemRef = currentEntries[0]?.key || null;
    const selectedEntry = currentEntries.find(entry => entry.key === selectedItemRef) || null;
    const categoryTabs = Object.entries(categories).filter(([key, entries]) => key !== "stash" || entries.length).map(([key, entries]) => {
      const count = key === "gear" ? allEquipment.length : entries.length;
      return `<button type="button" class="selection-tab ${selectedItemCategory === key ? "is-active" : ""}" data-item-category="${key}"><span><strong>${categoryLabels[key]}</strong><small>${count} owned</small></span><b>${count}</b></button>`;
    }).join("");
    const listRows = currentEntries.map((entry, index) => {
      if (entry.kind === "gear") {
        const holders = equippedGearUsers(entry.ref);
        const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[entry.gear.slot];
        const iconHero = holders[0] || gearOwners[entry.gear.name]?.[0] || state.activeParty[0];
        const comparisonHero = gearComparisonHero(entry.gear, selectedGearHero);
        return `<button type="button" class="selection-row ${selectedItemRef === entry.key ? "is-selected" : ""}" data-item-preview="${index}" ${gearHoverAttribute({ heroId: comparisonHero, ref: entry.ref })}>${gearIconHtml(entry.gear, iconHero, iconIndex, "selection-row-icon", entry.ref)}<span><strong>${gearDisplayName(entry.ref)}</strong><small>${gearRarity(entry.ref)} &bull; ${gearSlotLabel(entry.gear.slot)} &bull; ${statLine(entry.gear.stats)}</small></span><b>${holders.length ? "ON" : ""}</b></button>`;
      }
      if (entry.kind === "skill") return `<button type="button" class="selection-row ${selectedItemRef === entry.key ? "is-selected" : ""}" data-item-preview="${index}"><span class="selection-letter-icon">S</span><span><strong>${entry.sk.name}</strong><small>${entry.casterId} / ${entry.sk.cost} MP</small></span></button>`;
      const icon = inventoryIcon(entry.name);
      return `<button type="button" class="selection-row ${selectedItemRef === entry.key ? "is-selected" : ""}" data-item-preview="${index}">${pixelIconHtml(icon.sheet, icon.index, "selection-row-icon")}<span><strong>${entry.name}</strong><small>${entry.kind === "stash" ? "Stored" : inventoryTypeLabel(entry.name)}</small></span><b>x${entry.amount}</b></button>`;
    }).join("") || `<p class="selection-list-empty">Nothing in this list.</p>`;
    let detail = `<article class="selection-detail selection-empty"><strong>${categoryLabels[selectedItemCategory]}</strong><p>Nothing in this list.</p></article>`;
    if (selectedEntry?.kind === "item" || selectedEntry?.kind === "stash") {
      const { name, amount } = selectedEntry;
      const info = inventoryInfo(name);
      const icon = inventoryIcon(name);
      const category = selectedEntry.kind === "stash" ? inventoryTypeLabel(name) : categoryLabels[selectedItemCategory].replace(/s$/, "");
      const targets = selectedEntry.kind === "item" && info.field ? `<div class="field-targets"><span>Use on</span>${state.party.map(id => {
        const hero = baseJobs[id], total = totals(id);
        const canUse = canUseFieldItem(name, id);
        const value = info.field === "hp" ? `${hero.hp}/${total.max} HP` : info.field === "mp" ? `${hero.mp}/${total.mp} MP` : state.fieldWard ? "Ward ready" : "Prepare ward";
        return `<button type="button" class="field-target" data-field-item="${name}:${id}" ${canUse ? "" : "disabled"}><img src="${menuPortraitSource(id)}" alt=""><span>${hero.name}<small>${value}</small></span></button>`;
      }).join("")}</div>` : "";
      const trade = selectedEntry.kind === "stash" ? "Stored safely with Marla." : selectedItemCategory === "treasure" ? `Sell value: ${inventorySellPrice(name)} G each at a vendor.` : selectedItemCategory === "quest" ? "Protected quest item. Cannot be sold." : info.short || "";
      detail = `<article class="selection-detail"><header class="selection-detail-head">${pixelIconHtml(icon.sheet, icon.index, "selection-detail-icon")}<div><small>${category}</small><strong>${name}</strong><span>x${amount}</span></div></header><p>${info.desc}</p>${trade ? `<p class="selection-location">${trade}</p>` : ""}${targets}</article>`;
    }
    if (selectedEntry?.kind === "gear") {
      const { ref, gear } = selectedEntry;
      const holders = equippedGearUsers(ref);
      const copies = gearCopyCount(ref);
      const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot];
      const iconHero = holders[0] || gearOwners[gear.name]?.[0] || state.activeParty[0];
      detail = `<article class="selection-detail"><header class="selection-detail-head">${gearIconHtml(gear, iconHero, iconIndex, "selection-detail-icon", ref)}<div><small>${gearSlotLabel(gear.slot)}</small><strong>${gearDisplayName(ref)}</strong>${gearRarityHtml(ref)}</div></header><div class="selection-stat-line">${statLine(gear.stats)}</div><p>${gear.desc}</p><small class="gear-access">${gearAccessLabel(gear)}</small>${gearEffectHtml(gear, "item-effect")}${gearAffixHtml(ref)}<p class="selection-location">${holders.length ? `Equipped by ${holders.join(", ")}` : `Unequipped / ${gearInstance(ref) ? "separate copy" : `${copies} owned`}`}</p><div class="selection-actions"><button type="button" data-open-gear="${ref}">Open in Gear</button>${favoriteGearButton(ref)}</div></article>`;
    }
    if (selectedEntry?.kind === "skill") {
      const { casterId, sk, skillIndex } = selectedEntry;
      const caster = baseJobs[casterId];
      const heal = sk.power < 0 ? Math.round((Math.abs(sk.power) + totals(casterId).mag * .6) * (1 + talentValue(casterId, "healBoost"))) : 0;
      const partyHeal = sk.partyWide || talentValue(casterId, "partyHeal", sk.name) > 0;
      const effectText = [heal ? `Heals about ${heal} HP${partyHeal ? " for all living allies" : ""}` : "", sk.anim === "block" ? "prepares an opening party ward" : ""].filter(Boolean).join(" and ");
      detail = `<article class="selection-detail"><header><small>Field Skill / ${sk.cost} MP</small><strong>${caster.name}: ${sk.name}</strong></header><p>${sk.desc}</p><p class="selection-location">${effectText}</p><div class="field-targets"><span>Cast on</span>${(partyHeal && heal ? [state.party[0]] : state.party).map(targetId => {
        const target = baseJobs[targetId], targetTotal = totals(targetId);
        const anyoneNeedsHealing = state.party.some(heroId => baseJobs[heroId].hp > 0 && baseJobs[heroId].hp < totals(heroId).max);
        const canUse = caster.mp >= sk.cost && (sk.anim === "block" && !state.fieldWard || heal > 0 && (partyHeal ? anyoneNeedsHealing : target.hp < targetTotal.max));
        return `<button type="button" class="field-target" data-field-skill="${casterId}:${skillIndex}:${targetId}" ${canUse ? "" : "disabled"}><img src="${menuPortraitSource(targetId)}" alt=""><span>${partyHeal && heal ? "All allies" : target.name}<small>${partyHeal && heal ? "Party heal" : `${target.hp}/${targetTotal.max} HP`}</small></span></button>`;
      }).join("")}</div></article>`;
    }
    const gearTools = selectedItemCategory === "gear" ? gearBrowserToolbarHtml(equipment.length, allEquipment.length) : "";
    el.menuBody.innerHTML = `<div class="wallet-line"><span>Wallet</span><strong>${state.gold} G</strong><span>Bag ${inventoryUsed()}/${state.inventorySlots}</span><span>${state.fieldWard ? "Opening ward prepared" : "No field ward"}</span></div>${gearTools}<div class="selection-workspace item-selection-workspace"><section class="selection-list-panel"><nav class="selection-tabs">${categoryTabs}</nav><header><strong>${categoryLabels[selectedItemCategory]}</strong><small>${currentEntries.length} entries</small></header><div class="selection-list">${listRows}</div></section>${detail}</div>`;
    el.menuBody.querySelectorAll("[data-item-category]").forEach(button => button.onclick = () => {
      selectedItemCategory = button.dataset.itemCategory;
      selectedItemRef = null;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-item-preview]").forEach(button => button.onclick = () => {
      selectedItemRef = currentEntries[Number(button.dataset.itemPreview)]?.key || null;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-field-item]").forEach(button => button.onclick = () => useFieldItem(button.dataset.fieldItem));
    el.menuBody.querySelectorAll("[data-field-skill]").forEach(button => button.onclick = () => useFieldSkill(button.dataset.fieldSkill));
    el.menuBody.querySelectorAll("[data-open-gear]").forEach(button => button.onclick = () => {
      const ref = button.dataset.openGear;
      const gear = gearByName(ref);
      if (!gear) return;
      menuTab = "gear";
      selectedGearHero = equippedGearUsers(ref)[0] || state.party.find(id => canEquip(id, gear)) || state.party[0];
      selectedGearSlot = gear.slot;
      selectedGearRef = ref;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-favorite]").forEach(input => input.onchange = () => {
      if (input.checked) state.favoriteGear[input.dataset.favorite] = true;
      else delete state.favoriteGear[input.dataset.favorite];
      updatePanels();
    });
    bindGearBrowserControls();
  }
  if (menuTab === "quests") {
    const main = currentQuest();
    const tracked = sideQuests.filter(quest => ["active", "ready", "completed"].includes(quest.status));
    el.menuBody.innerHTML = `<div class="menu-card main-quest"><strong>${main ? `Main: ${main[0]}` : "No active main quest"}</strong><p>${main ? main[1] : "Speak with people marked by a gold exclamation point."}</p></div><div class="menu-grid">${tracked.length ? tracked.map(quest => { const rewardGear = [quest.reward.gear, ...(quest.reward.gears || [])].filter(Boolean); return `<div class="menu-card quest-${quest.status}"><strong>${quest.title}</strong><small>${quest.status.toUpperCase()} / ${quest.giver}</small><p>${quest.desc}</p><p>${sideQuestProgress(quest)}</p><p>Reward: ${quest.reward.gold || 0} G / ${quest.reward.xp || 0} XP${rewardGear.length ? ` / ${rewardGear.join(", ")}` : ""}</p></div>`; }).join("") : `<div class="menu-card"><strong>No side quests yet</strong><p>They appear here after an NPC gives them to you.</p></div>`}</div>`;
  }
  if (menuTab === "world") {
    const region = mapRegion(state.map);
    const entries = Object.entries(maps).filter(([id]) => mapRegion(id) === region);
    const size = currentMap().gridSize || [5, 5];
    el.menuBody.innerHTML = `<div class="wallet-line"><span>${region}</span><strong>${size[0]} x ${size[1]} field grid / ${zoneLevelText()}</strong></div><div class="world-grid" style="--world-cols:${size[0]}">${Array.from({ length: size[0] * size[1] }, (_, index) => {
      const x = index % size[0], y = Math.floor(index / size[0]);
      const match = entries.find(([, field]) => field.grid?.[0] === x && field.grid?.[1] === y);
      if (!match) return `<div class="world-cell is-empty"></div>`;
      const [id, field] = match;
      return `<div class="world-cell ${id === state.map ? "is-current" : ""} ${state.discoveredMaps.includes(id) ? "" : "is-undiscovered"}"><span>${x + 1}.${y + 1} / ${zoneLevelText(id)}</span><strong>${state.discoveredMaps.includes(id) ? field.name : "Undiscovered"}</strong></div>`;
    }).join("")}</div>`;
  }
  if (menuTab === "lore") {
    const fieldNotes = Object.values(maps).flatMap(field => field.spawns || []).filter(spawnPoint => spawnPoint.rare || spawnPoint.boss);
    const knownIssues = quests.slice(0, Math.max(0, state.quest + 1));
    el.menuBody.innerHTML = `${sceneMemoriesHtml()}<h3>Issue Chronicle</h3><div class="menu-grid">${knownIssues.length ? knownIssues.map((q, i) => `<div class="menu-card"><strong>Issue ${i + 1}: ${q[0]}</strong><p>${q[2]}</p><p>${q[1]}</p></div>`).join("") : `<div class="menu-card"><strong>No issue recorded</strong><p>Your chronicle begins when someone entrusts you with a quest.</p></div>`}</div><h3>Rare & Miniboss Field Notes</h3><div class="menu-grid">${fieldNotes.map(spawnPoint => `<div class="menu-card"><strong>${spawnPoint.name}</strong><small>${spawnPoint.rare ? "RARE SPAWN" : "ONE-TIME MINIBOSS"} / ${state.flags[`spawn:${spawnPoint.id}`] ? "DEFEATED" : spawnPoint.available ? "ACTIVE" : "DORMANT"}</small><p>${spawnPoint.lore}</p><p>${spawnPoint.boss ? "Does not respawn." : `Rare return window: roughly ${spawnPoint.respawn}-${spawnPoint.respawn + 30}s.`}</p></div>`).join("")}</div>`;
    el.menuBody.querySelectorAll("[data-play-arrival-scene]").forEach(button => button.addEventListener("click", () => playUnseenArrival(button.dataset.playArrivalScene)));
    el.menuBody.querySelectorAll("[data-replay-scene]").forEach(button => button.addEventListener("click", () => replayRecruitScene(button.dataset.replayScene)));
  }
  if (menuTab === "system") {
    const postgame = state.flags.endingComplete ? `<section class="postgame-panel"><header><strong>Postgame Unlocked</strong><span>Echo Hunt Rank ${state.endgameRank} / New Game Plus ${state.ngPlus}</span></header><p>Echo Hunts grow stronger every clear and guarantee at least one Legendary gear drop with four affixes. New Game Plus carries levels, talent builds, companions, equipment, items and gold into zones that scale toward level 40, expanded legendary loot tables and new Stonewake and Reverie boss quests.</p><div><button type="button" data-endgame-hunt>Start Echo Hunt ${state.endgameRank + 1}</button><button type="button" data-new-game-plus>Begin New Game Plus</button></div></section>` : `<section class="postgame-panel is-locked"><strong>Postgame</strong><p>Complete Issue 4 to unlock repeatable Echo Hunts and New Game Plus.</p></section>`;
    el.menuBody.innerHTML = `<div class="menu-grid"><div class="menu-card"><strong>Combat</strong><p>Normal Attack triggers the equipped weapon's unique setup effect and restores 6% Max MP. Skills use fixed MP costs; AGI controls initiative and contributes CRIT.</p></div><div class="menu-card"><strong>Levels & Talents</strong><p>The level cap is 40. Gain 10 talent points from level 4 through 40, unlock five tiers, and choose one capstone. Respec is free outside combat.</p></div><div class="menu-card"><strong>Loot & Gold</strong><p>Each weapon changes Normal Attack as well as stats. Dropped equipment can also gain readable rarity-based affixes.</p></div><div class="menu-card"><strong>World</strong><p>Regions keep their story level bands; New Game Plus and Echo Hunts grow toward level 40.</p></div></div>${postgame}`;
    el.menuBody.querySelector("[data-endgame-hunt]")?.addEventListener("click", startEndgameHunt);
    el.menuBody.querySelector("[data-new-game-plus]")?.addEventListener("click", beginNewGamePlus);
  }
  bindGearHoverTooltips();
}

function canUseFieldItem(name, id) {
  const info = inventoryInfo(name);
  const hero = baseJobs[id];
  if (!info.field || !hero || (state.inventory[name] || 0) < 1) return false;
  const total = totals(id);
  if (info.field === "hp") return hero.hp > 0 && hero.hp < total.max;
  if (info.field === "mp") return hero.hp > 0 && hero.mp < total.mp;
  if (info.field === "guard") return !state.fieldWard;
  return false;
}

function useFieldItem(value) {
  const separator = value.lastIndexOf(":");
  const name = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!canUseFieldItem(name, id)) return;
  const info = inventoryInfo(name);
  const hero = baseJobs[id];
  const total = totals(id);
  state.inventory[name]--;
  if (info.field === "hp") hero.hp = Math.min(total.max, hero.hp + info.value);
  if (info.field === "mp") hero.mp = Math.min(total.mp, hero.mp + info.value);
  if (info.field === "guard") state.fieldWard = true;
  playSfx(info.field === "guard" ? "block" : "item");
  updatePanels();
  renderMenu();
}

function useFieldSkill(value) {
  const [casterId, skillIndexText, targetId] = value.split(":");
  const caster = baseJobs[casterId];
  const target = baseJobs[targetId];
  const sk = caster?.skills[Number(skillIndexText)];
  if (!caster || !target || !sk || sk.anim === "ultimate" || (sk.power >= 0 && sk.anim !== "block") || caster.mp < sk.cost) return;
  const targetTotal = totals(targetId);
  const heal = sk.power < 0 ? Math.round((Math.abs(sk.power) + totals(casterId).mag * .6) * (1 + talentValue(casterId, "healBoost"))) : 0;
  const partyHeal = sk.partyWide || talentValue(casterId, "partyHeal", sk.name) > 0;
  const needsHeal = heal > 0 && (partyHeal ? state.party.some(id => baseJobs[id].hp > 0 && baseJobs[id].hp < totals(id).max) : target.hp < targetTotal.max);
  const needsWard = sk.anim === "block" && !state.fieldWard;
  if (!needsHeal && !needsWard) return;
  caster.mp -= sk.cost;
  if (needsHeal && partyHeal) state.party.forEach(id => {
    const ally = baseJobs[id];
    if (ally.hp > 0) ally.hp = Math.min(totals(id).max, ally.hp + heal);
  });
  else if (needsHeal) target.hp = Math.min(targetTotal.max, target.hp + heal);
  if (sk.anim === "block") state.fieldWard = true;
  playSfx(sk.anim === "block" ? "block" : "magic");
  updatePanels();
  renderMenu();
}

function equipGear(value) {
  const [id, slot, name] = value.split(":");
  const currentName = baseJobs[id]?.gear[slot] || null;
  if (!baseJobs[id] || !Object.hasOwn(baseJobs[id].gear, slot)) return;
  if (name === "__EMPTY__") {
    baseJobs[id].gear[slot] = null;
    clampHeroVitals(id);
    playSfx("menu");
    updatePanels();
    return renderMenu();
  }
  const gear = gearByName(name);
  if (!gear || gear.slot !== slot || !ownsGearRef(name) || !canEquip(id, gear)) return;
  const holders = state.party.filter(heroId => heroId !== id && baseJobs[heroId].gear[slot] === name);
  const usedCopies = state.party.filter(heroId => baseJobs[heroId].gear[slot] === name).length;
  if (holders.length && usedCopies >= gearCopyCount(name)) {
    const otherId = holders[0];
    const currentGear = gearByName(currentName);
    baseJobs[otherId].gear[slot] = currentGear && canEquip(otherId, currentGear) ? currentName : null;
    clampHeroVitals(otherId);
  }
  baseJobs[id].gear[slot] = name;
  clampHeroVitals(id);
  playSfx("menu");
  updatePanels();
  renderMenu();
}

function clampHeroVitals(id) {
  const h = baseJobs[id];
  const t = totals(id);
  h.hp = Math.max(1, Math.min(h.hp, t.max));
  h.mp = Math.max(0, Math.min(h.mp, t.mp));
}

function setActivePartyMember(id) {
  if (!state.party.includes(id)) return;
  const existingIndex = state.activeParty.indexOf(id);
  if (existingIndex >= 0) {
    selectedPartySlot = existingIndex;
    return renderMenu();
  }
  if (selectedPartySlot < state.activeParty.length) state.activeParty[selectedPartySlot] = id;
  else if (state.activeParty.length < 3) state.activeParty.push(id);
  state.activeParty = state.activeParty.filter(Boolean).slice(0, 3);
  selectedPartySlot = Math.min(selectedPartySlot, state.activeParty.length - 1);
  updatePanels();
  renderMenu();
}

function removeActivePartyMember(index) {
  if (state.activeParty.length <= 1 || !state.activeParty[index]) return;
  state.activeParty.splice(index, 1);
  selectedPartySlot = Math.max(0, Math.min(index, state.activeParty.length));
  updatePanels();
  renderMenu();
}

function startEndgameHunt() {
  if (!state.flags.endingComplete) return;
  const rank = state.endgameRank + 1;
  const boost = 1 + rank * .14;
  const rankedEnemy = (name, hp, atk, weak, color, node, sprite, npcBoss = false) => {
    const unit = enemy(name, hp, atk, weak, color, node, sprite);
    unit.baseMax = unit.hp = unit.max = Math.round(unit.baseMax * boost);
    unit.baseAtk = unit.atk = Math.round(unit.baseAtk * (1 + rank * .08));
    unit.baseStats.agi += Math.ceil(rank * 1.5);
    unit.baseStats.stam += rank * 2;
    unit.levelHint = Math.min(MAX_LEVEL, 19 + rank);
    unit.npcBoss = npcBoss;
    return unit;
  };
  const formations = [
    { name: "Reginald's Retinue", enemies: [rankedEnemy("Baron Revus Veln", 92, 14, "Sound", "#4f6570", 2, "Clock Goblin"), rankedEnemy("Sir Reginald", 82, 13, "Holy Fire", "#413044", 1, "High Administrator Thaddeus")] },
    { name: "Elder Plumpin", enemies: [rankedEnemy("Elder Plumpin", 116, 16, "Shadow", "#6a3552", 2, "Red Dragon Lord"), rankedEnemy("Saint Justin", 96, 15, "Tech", "#8a6640", 1, "Corrupt Clergy")] },
    { name: "Dawn Gate Recalibration", enemies: [rankedEnemy("Dawn Gate Sentinel", 148, 19, "Ancient Fire", "#58616b", 2, "Lord Sprocket")] },
    { name: "Stonewake Shadows", enemies: [rankedEnemy("Shade", 104, 18, "Holy Fire", "#4b2633", 2, "Shade", true), rankedEnemy("Grumm", 132, 20, "Sound", "#755034", 1, "Grumm", true)] },
    { name: "Lantern Name-Runners", enemies: [rankedEnemy("Marla", 110, 17, "Shadow", "#8a5b3d", 2, "Marla", true), rankedEnemy("Harl", 118, 19, "Tech", "#5b4a40", 1, "Harl", true)] },
    { name: "Stonewake Command", enemies: [rankedEnemy("Kaeldrin", 138, 22, "Sound", "#62554a", 2, "Kaeldrin", true), rankedEnemy("Lysra", 124, 21, "Shadow", "#4c556b", 1, "Lyrsa", true)] },
    { name: "Reverie Counter-Echo", enemies: [rankedEnemy("Nyx Vael", 106, 20, "Holy Fire", "#473c62", 1, "Nyx", true), rankedEnemy("Rava", 126, 21, "Earth", "#43685a", 2, "Rava", true), rankedEnemy("Jory Bellwick", 116, 23, "Sound", "#755247", 3, "Jory", true)] },
    { name: "Crown and Winter", enemies: [rankedEnemy("King Maeric", 166, 24, "Shadow", "#d4a94f", 3, "King Maeric", true), rankedEnemy("Tja", 122, 22, "Ancient Fire", "#4c88a8", 2, "Tja", true)] }
  ];
  const formation = formations[(rank - 1) % formations.length];
  el.menu.classList.add("hidden");
  startBattle(`Echo Hunt ${rank}: ${formation.name}`, formation.enemies, "endgameHuntWon");
  battle.echoHuntRank = rank;
}

function beginNewGamePlus() {
  if (!state.flags.endingComplete) return;
  state.ngPlus++;
  state.map = "lantern";
  state.x = 8;
  state.y = 8;
  state.renderX = state.x * TILE;
  state.renderY = state.y * TILE;
  state.quest = -1;
  state.resonance = 25;
  state.escort = null;
  state.endgameRank = 0;
  state.flags = { newGamePlus: true };
  state.discoveredMaps = ["lantern"];
  sideQuests.forEach(quest => {
    quest.status = "unseen";
    quest.progress = 0;
  });
  Object.values(maps).flatMap(mapData => mapData.spawns || []).forEach(spawnPoint => {
    spawnPoint.available = true;
    spawnPoint.returnAt = 0;
    spawnPoint.x = spawnPoint.homeX;
    spawnPoint.y = spawnPoint.homeY;
  });
  state.party.forEach(id => {
    const total = totals(id);
    baseJobs[id].hp = total.max;
    baseJobs[id].mp = total.mp;
  });
  mode = "walk";
  el.menu.classList.add("hidden");
  updateMusic();
  updatePanels();
  showTalk([["New Game Plus", `Loop ${state.ngPlus} begins. Companions, inventory, gear and gold carry forward.`], ["Narrator", "Enemies have stronger HP, attack and AGI. The story and every one-time boss can be challenged again."]]);
}

function openVendor(id) {
  const vendor = vendors[id];
  if (!vendor) return;
  if (id === "workshop" && state.gameMode === "hallBattles") {
    const progress = hallBattleProgress();
    hallShopOffersThrough(Math.max(progress.unlockedStage, progress.shopStage, 1));
    saveGame(hallSaveKey());
  }
  activeVendor = id;
  vendorTab = "buy";
  rerollNotice = "";
  heldDirection = null;
  mode = "shop";
  el.menu.classList.add("is-shop");
  document.querySelector(".menu-tabs").classList.add("hidden");
  el.menu.classList.remove("hidden");
  renderVendor();
}

function closeVendor() {
  activeVendor = null;
  mode = "walk";
  el.menu.classList.remove("is-shop");
  el.menu.classList.add("hidden");
  document.querySelector(".menu-tabs").classList.remove("hidden");
}

function hallShopPrice(stage, rarity = hallNormalGearRarity(stage)) {
  const value = Math.max(1, Number(stage) || 1);
  if (rarity === "Rare") return 195 + value * 7;
  if (rarity === "Epic") return 450 + Math.max(0, value - 10) * 24;
  if (rarity === "Legendary") return 1300 + Math.max(0, value - 20) * 55;
  if (rarity === "Artifact") return 5000 + Math.max(0, value - 41) * 250;
  return 3500 + Math.max(0, value - 41) * 120;
}

function hallShopGearPool(rarity, stage) {
  return rarity === "Artifact" ? HALL_ARTIFACT_GEAR : hallGearPoolForRarity(rarity, stage);
}

const HALL_SHOP_AFFIX_COUNTS = HALL_GENERATED_AFFIX_COUNTS;

function hallShopAffixTheme(stage) {
  return HALL_MYTHIC_THEMES[stage] || ["swamp", "ruins", "mountain", "dragon"][(Math.max(1, stage) - 1) % 4];
}

function ensureHallShopOfferAffixes(offer, gear, stage) {
  if (!offer || !gear) return [];
  const wanted = HALL_SHOP_AFFIX_COUNTS[offer.rarity] || 0;
  const existing = Array.isArray(offer.affixes) ? offer.affixes.map(entry => ({ ...entry })) : [];
  let attempts = 0;
  while (existing.length < wanted && attempts++ < 24) {
    const rolls = rollGearAffixes(gear, offer.rarity, hallShopAffixTheme(stage), wanted);
    const next = rolls.find(candidate => !existing.some(entry => entry.key === candidate.key));
    if (next) existing.push(next);
  }
  offer.affixes = existing;
  return offer.affixes;
}

function ensureHallShopOffer(stage) {
  const value = Math.max(1, Math.min(HALL_BATTLE_BLUEPRINTS.length, Number(stage) || 1));
  const progress = hallBattleProgress();
  const rarity = hallShopGearRarity(value);
  const existing = progress.shopOffers[value];
  const availablePool = hallShopGearPool(rarity, value);
  let created = false;
  if (!existing || !gearByName(existing.name)) {
    const startingNames = new Set(Object.values(STARTING_HERO_GEAR).flatMap(slots => Object.values(slots)));
    const previousName = progress.shopOffers[value - 1]?.name;
    const usedArtifactNames = rarity === "Artifact"
      ? new Set(Object.entries(progress.shopOffers).filter(([offerStage]) => Number(offerStage) !== value).map(([, offer]) => offer?.name).filter(Boolean))
      : new Set();
    const pool = availablePool.filter(gear => !startingNames.has(gear.name)
      && !echoForgeGearNames.has(gear.name) && !/^Echo(?:-|\s)/i.test(gear.name) && gear.name !== previousName
      && (rarity !== "Artifact" || !usedArtifactNames.has(gear.name)));
    const candidates = pool.length ? pool : availablePool;
    const gear = candidates[Math.floor(Math.random() * candidates.length)];
    if (!gear) return null;
    progress.shopOffers[value] = {
      name: gear.name,
      rarity,
      price: hallShopPrice(value, rarity),
      affixes: rollGearAffixes(gear, rarity, hallShopAffixTheme(value), HALL_SHOP_AFFIX_COUNTS[rarity]),
      stats: rollHallBaseStats(rarity)
    };
    created = true;
  }
  progress.shopStage = value;
  const offer = progress.shopOffers[value];
  if (created && !offer.affixes.length) ensureHallShopOfferAffixes(offer, gearByName(offer.name), value);
  return { kind: "gear", ...offer, hallStage: value };
}

function hallShopOffersThrough(stage) {
  const limit = Math.max(1, Math.min(HALL_BATTLE_BLUEPRINTS.length, Number(stage) || 1));
  return Array.from({ length: limit }, (_, index) => ensureHallShopOffer(index + 1)).filter(Boolean);
}

function vendorWares(id) {
  const vendor = vendors[id];
  if (!vendor) return [];
  if (id === "workshop" && state.gameMode === "hallBattles") {
    const progress = hallBattleProgress();
    return hallShopOffersThrough(Math.max(progress.unlockedStage, progress.shopStage, 1));
  }
  const wares = [...vendor.wares];
  if (id !== "workshop") return wares;
  if (state.ngPlus > 0) {
    wares.push(
      { kind: "item", name: "Emberheart Stew", price: 82, desc: inventoryDb["Emberheart Stew"].desc },
      { kind: "item", name: "Resonance Draught", price: 96, desc: inventoryDb["Resonance Draught"].desc }
    );
  }
  if (state.ngPlus > 1) {
    wares.push(
      { kind: "item", name: "Royal Ember Stew", price: 136, desc: inventoryDb["Royal Ember Stew"].desc },
      { kind: "item", name: "Grand Resonance Draught", price: 154, desc: inventoryDb["Grand Resonance Draught"].desc }
    );
  }
  const unlockedRank = Math.min(40, Math.max(state.echoForgeRank || 0, state.endgameRank || 0));
  echoForgeGear.filter(gear => gear.echoRank <= unlockedRank).forEach(gear => {
    wares.push({ kind: "gear", name: gear.name, price: gear.price });
  });
  return wares;
}

const AFFIX_REROLL_COST = 250;
let rerollNotice = "";

function canRerollGear(ref) {
  return Boolean(ownedGearRefs().includes(ref) && !state.favoriteGear[ref] && gearAffixes(ref).length
    && (gearInstance(ref) || gearCopyCount(ref) === 1));
}

function rerollGearAffix(ref, index) {
  if (activeVendor !== "workshop" || !canRerollGear(ref) || state.gold < AFFIX_REROLL_COST) return false;
  const entries = gearAffixes(ref);
  if (!Number.isInteger(index) || !entries[index]) return false;
  const gear = gearByName(ref);
  const pool = gearAffixPool(gear);
  const candidates = pool.filter(candidate => !entries.some(entry => entry.key === candidate.key));
  if (!candidates.length) return false;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const replacement = { ...chosen, value: randomAffixValue(chosen) };
  replacement.text = formatAffix(replacement);
  const previous = formatAffix(entries[index]);
  entries[index] = replacement;
  state.gold -= AFFIX_REROLL_COST;
  Object.keys(baseJobs).forEach(id => {
    const total = totals(id);
    baseJobs[id].hp = Math.min(baseJobs[id].hp, total.max);
    baseJobs[id].mp = Math.min(baseJobs[id].mp, total.mp);
  });
  rerollNotice = `${gearDisplayName(ref)}: ${previous} replaced by ${replacement.text}. Other affixes and fixed effects unchanged.`;
  return true;
}

function rerollPanelHtml() {
  const refs = ownedGearRefs().filter(ref => gearAffixes(ref).length);
  return `<section class="forge-reroll"><h3>Reforge one affix</h3><p>${AFFIX_REROLL_COST} G per roll. Select one affix to replace with a random different affix. All other affixes, rarity and fixed Echo effects stay unchanged.</p><p role="status">${rerollNotice}</p>${refs.map((ref, index) => `<div class="reroll-row"><strong>${gearDisplayName(ref)}</strong>${canRerollGear(ref) ? `<label>Replace<select data-reroll-slot="${index}">${gearAffixes(ref).map((entry, slot) => `<option value="${slot}">${formatAffix(entry)}</option>`).join("")}</select></label><button type="button" data-reroll-ref="${ref}" data-reroll-index="${index}" ${state.gold < AFFIX_REROLL_COST ? "disabled" : ""}>Reforge / ${AFFIX_REROLL_COST} G</button>` : `<small>${state.favoriteGear[ref] ? "Favorite locked. Unlock in Gear before reforging." : "Legacy stack shares its affixes. Reforging requires a single item or a separate Echo-Forge copy."}</small>`}</div>`).join("") || "<p>No items with random affixes owned.</p>"}</section>`;
}

function shopWareRowHtml(ware, index, purchased = false) {
  const gear = ware.kind === "gear" ? gearByName(ware.name) : null;
  const repeatableEcho = gear && echoForgeGearNames.has(gear.name);
  const hallOfferPurchased = Number.isInteger(ware.hallStage) && hallBattleProgress().purchasedShopStages.includes(ware.hallStage);
  const owned = purchased || ware.kind === "gear" && (hallOfferPurchased || (state.ownedGear.includes(ware.name) && !repeatableEcho && !ware.hallStage));
  const price = ware.kind === "upgrade" ? bagUpgradePrice(ware.basePrice) : ware.price;
  const full = ware.kind === "item" && inventoryUsed() >= state.inventorySlots;
  const displayedRarity = gear ? (ware.rarity || (repeatableEcho ? defaultGearRarity(gear.name) : gearRarity(gear.name))) : "Common";
  const icon = gear
    ? gearIconHtml({ ...gear, rarity: displayedRarity }, gearOwners[gear.name]?.[0] || state.party[0], { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot], "shop-icon")
    : (() => { const itemIcon = inventoryIcon(ware.name); return pixelIconHtml(itemIcon.sheet, itemIcon.index, "shop-icon"); })();
  const ownedCount = repeatableEcho ? gearCopyCount(gear.name) : 0;
  const displayedStats = ware.stats && typeof ware.stats === "object" ? ware.stats : gear?.stats;
  const comparisonHero = gear ? gearComparisonHero(gear, ware.hallStage ? selectedShopHero : selectedGearHero) : null;
  const hover = gear ? gearHoverAttribute({
    heroId: comparisonHero,
    ref: gear.name,
    rarity: displayedRarity,
    affixes: ware.hallStage ? (ware.affixes || []).map(entry => ({ ...entry })) : null,
    stats: displayedStats ? { ...displayedStats } : null
  }) : "";
  const metadata = gear
    ? `<small class="shop-gear-metadata">${displayedRarity.toUpperCase()} &bull; ${gearSlotLabel(gear.slot).toUpperCase()}${ware.hallStage ? ` &bull; STAGE ${ware.hallStage}` : ""}</small><small>${statLine(displayedStats)}</small>`
    : `<small>${ware.desc}</small>`;
  const buttonLabel = purchased ? "Purchased" : owned ? "Owned" : full ? "Full" : ownedCount ? "Buy another" : "Buy";
  return `<div class="shop-row ${gear ? "is-gear-row" : ""}" ${hover}>${icon}<div><strong>${ware.name}${ownedCount ? ` <small>OWNED x${ownedCount}</small>` : ""}</strong>${metadata}</div><span>${price} G</span><button type="button" ${purchased ? "" : `data-buy="${index}"`} ${owned || full || state.gold < price ? "disabled" : ""}>${buttonLabel}</button></div>`;
}

function renderVendor() {
  const vendor = vendors[activeVendor];
  if (!vendor) return closeVendor();
  gearHoverRegistry = [];
  hideGearHoverTooltip();
  el.menu.dataset.menuView = activeVendor === "workshop" ? "glimmer-shop" : "shop";
  const wares = vendorWares(activeVendor);
  const stashEntries = Object.entries(state.stash).filter(([, amount]) => amount > 0);
  const indexedWares = wares.map((ware, index) => ({ ware, index }));
  const hallShop = activeVendor === "workshop" && state.gameMode === "hallBattles";
  if (hallShop && !state.party.includes(selectedShopHero)) selectedShopHero = state.party[0];
  const availableWares = hallShop ? indexedWares.filter(({ ware }) => !hallBattleProgress().purchasedShopStages.includes(ware.hallStage)) : indexedWares;
  const purchasedWares = hallShop ? indexedWares.filter(({ ware }) => hallBattleProgress().purchasedShopStages.includes(ware.hallStage)) : [];
  const shopSections = hallShop
    ? `<section class="shop-offer-section"><h3>Available</h3><div class="shop-list">${availableWares.map(({ ware, index }) => shopWareRowHtml(ware, index)).join("") || `<div class="shop-empty"><strong>No offers available</strong><p>New persistent offers unlock with Ember Hall stages.</p></div>`}</div></section><details class="shop-purchased"><summary>Purchased (${purchasedWares.length})</summary><div class="shop-list">${purchasedWares.map(({ ware, index }) => shopWareRowHtml(ware, index, true)).join("") || `<div class="shop-empty"><p>No purchased offers yet.</p></div>`}</div></details>`
    : `<div class="shop-list">${availableWares.map(({ ware, index }) => shopWareRowHtml(ware, index)).join("")}</div>`;
  const comparisonSelector = hallShop
    ? `<nav class="shop-character-selector" aria-label="Comparison character"><span>Compare for</span>${state.party.map(id => `<button type="button" data-shop-hero="${id}" class="${selectedShopHero === id ? "is-active" : ""}"><img src="${menuPortraitSource(id)}" alt=""><b>${id}</b></button>`).join("")}</nav>`
    : "";
  const buyList = `${shopSections}${activeVendor === "marla" && stashEntries.length ? `<h3>Safe Stash</h3><div class="shop-list">${stashEntries.map(([name, amount], index) => {
    const stashIcon = inventoryIcon(name);
    return `<div class="shop-row">${pixelIconHtml(stashIcon.sheet, stashIcon.index, "shop-icon")}<div><strong>${name}</strong><small>Stored after a full inventory.</small></div><span>x${amount}</span><button type="button" data-take-stash="${index}" ${inventoryUsed() >= state.inventorySlots ? "disabled" : ""}>Take</button></div>`;
  }).join("")}</div>` : ""}`;
  const sellItems = Object.entries(state.inventory).filter(([name, amount]) => amount > 0 && inventorySellPrice(name) > 0);
  const sellGear = ownedGearRefs().map(ref => ({ ref, gear: gearByName(ref) })).filter(({ ref, gear }) => gear && !state.favoriteGear[ref] && gearSellPrice(gear) > 0 && gearCopyCount(ref) > equippedGearUsers(ref).length);
  const sellList = `<div class="shop-list">${sellItems.map(([name, amount]) => {
    const info = inventoryInfo(name);
    const icon = inventoryIcon(name);
    return `<div class="shop-row">${pixelIconHtml(icon.sheet, icon.index, "shop-icon")}<div><strong>${name} x${amount}</strong><small>${inventoryTypeLabel(name)}. ${info.desc}</small></div><span>${inventorySellPrice(name)} G</span><button type="button" data-sell-kind="item" data-sell-name="${name}">Sell 1</button></div>`;
  }).join("")}${sellGear.map(({ ref, gear }) => {
    const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot];
    const available = gearCopyCount(ref) - equippedGearUsers(ref).length;
    const comparisonHero = gearComparisonHero(gear, selectedGearHero);
    return `<div class="shop-row is-gear-row" ${gearHoverAttribute({ heroId: comparisonHero, ref })}>${gearIconHtml(gear, state.party[0], iconIndex, "shop-icon", ref)}<div><strong>${gearDisplayName(ref)}${gearInstance(ref) ? "" : ` x${available} spare`}</strong><small>${gearRarity(ref)} &bull; ${gearSlotLabel(gear.slot)} &bull; ${statLine(gear.stats)}</small></div><span>${gearSellPrice(gear)} G</span><button type="button" data-sell-kind="gear" data-sell-name="${ref}">Sell 1</button></div>`;
  }).join("")}${!sellItems.length && !sellGear.length ? `<div class="shop-empty"><strong>Nothing sellable</strong><p>Key items, quest materials, equipped pieces and character-bound signature gear stay with the Flameguard.</p></div>` : ""}</div>`;
  const forgeRank = Math.min(40, Math.max(state.echoForgeRank || 0, state.endgameRank || 0));
  const shopNote = activeVendor === "workshop" && state.gameMode === "hallBattles"
    ? `${wares.length} stage offer${wares.length === 1 ? "" : "s"} available. One fixed item per unlocked stage through Stage ${Math.max(hallBattleProgress().unlockedStage, hallBattleProgress().shopStage, 1)}.`
    : activeVendor === "workshop"
    ? `Echo Forge rank ${forgeRank}/40. Every unlocked Echo-Forged item can be bought repeatedly. Each purchase is a separate copy with its own completely rerolled set of four affixes. NG+ also unlocks improved consumables.`
    : "Rare effect gear normally comes from battles and quests. Spare general gear can be sold after it is unequipped.";
  el.menuBody.innerHTML = `<div class="shop-head">${activeVendor === "workshop" ? `<img class="shopkeeper-portrait" src="${menuPortraitSource("Glimmer")}" alt="">` : ""}<div><strong>${vendor.name}</strong><p>${vendor.blurb}</p></div><div class="shop-wallet">${state.gold} G / BAG ${inventoryUsed()}/${state.inventorySlots}</div><button type="button" data-close-shop aria-label="Close shop">X</button></div>${comparisonSelector}<div class="shop-mode-tabs"><button type="button" data-shop-tab="buy" class="${vendorTab === "buy" ? "is-active" : ""}">Buy</button><button type="button" data-shop-tab="sell" class="${vendorTab === "sell" ? "is-active" : ""}">Sell</button></div><div class="shop-scroll-region">${vendorTab === "buy" ? buyList : sellList}<p class="shop-note">${shopNote}</p></div>`;
  el.menuBody.querySelector("[data-close-shop]").onclick = closeVendor;
  if (activeVendor === "workshop" && state.gameMode !== "hallBattles") {
    el.menuBody.querySelector(".shop-mode-tabs").insertAdjacentHTML("beforeend", `<button type="button" data-shop-tab="reforge" class="${vendorTab === "reforge" ? "is-active" : ""}">Reforge</button>`);
    if (vendorTab === "reforge") {
      el.menuBody.querySelector(".shop-list").outerHTML = rerollPanelHtml();
      el.menuBody.querySelectorAll("[data-reroll-ref]").forEach(button => button.onclick = () => {
        const selected = el.menuBody.querySelector(`[data-reroll-slot="${button.dataset.rerollIndex}"]`);
        if (rerollGearAffix(button.dataset.rerollRef, Number(selected.value))) {
          playSfx("coin");
          updatePanels();
          renderVendor();
        }
      });
    }
  }
  el.menuBody.querySelectorAll("[data-shop-tab]").forEach(button => button.onclick = () => {
    vendorTab = button.dataset.shopTab;
    renderVendor();
  });
  el.menuBody.querySelectorAll("[data-shop-hero]").forEach(button => button.onclick = () => {
    selectedShopHero = button.dataset.shopHero;
    renderVendor();
  });
  el.menuBody.querySelectorAll("[data-buy]").forEach(button => button.onclick = () => buyWare(Number(button.dataset.buy)));
  el.menuBody.querySelectorAll("[data-sell-kind]").forEach(button => button.onclick = () => sellVendorItem(button.dataset.sellKind, button.dataset.sellName));
  el.menuBody.querySelectorAll("[data-take-stash]").forEach(button => button.onclick = () => takeFromStash(stashEntries[Number(button.dataset.takeStash)]?.[0]));
  bindGearHoverTooltips();
}

function inventorySellPrice(name) {
  if (inventoryCategory(name) === "quest") return 0;
  const shopWare = Object.values(vendors).flatMap(vendor => vendor.wares).find(ware => ware.kind === "item" && ware.name === name);
  if (shopWare) return Math.max(1, Math.floor(shopWare.price * .4));
  const values = {
    "Emberheart Stew": 33,
    "Resonance Draught": 38,
    "Royal Ember Stew": 54,
    "Grand Resonance Draught": 62,
    "Ledger Scrap": 6,
    "Broken Wax Seal": 8,
    "Ash Ink": 10,
    "Resonant Stone": 16,
    "False Dawn Cog": 24,
    "Tempered Lockplate": 20,
    "Ancient Ember Scale": 32,
    "Living Ash Ink": 28,
    "Unclaimed Sigil": 30,
    "Redacted Testimony": 34,
    "Null Calibration Shard": 38,
    "Loopglass Shard": 28,
    "Stonewake Medal": 46,
    "Orphan Ember Thread": 34,
    "Foreman's Black Ledger": 42,
    "Custodian Seal": 48,
    "Sentinel Core": 64
  };
  return values[name] || 0;
}

function gearSellPrice(gear) {
  if (!gear || gearOwners[gear.name] || gear.name === "Echo-Thread Lute") return 0;
  const shopWare = Object.values(vendors).flatMap(vendor => vendor.wares).find(ware => ware.kind === "gear" && ware.name === gear.name);
  const rarityBonus = Math.max(0, RARITY_ORDER.indexOf(gearRarity(gear.name))) * 35;
  const effectBonus = gearEffects(gear).length * 45;
  const value = shopWare?.price || Object.values(gear.stats).reduce((sum, stat) => sum + stat, 0) * 14 + effectBonus + rarityBonus;
  return Math.max(1, Math.floor(value * .45));
}

function sellVendorItem(kind, name) {
  if (kind === "item") {
    const price = inventorySellPrice(name);
    if (!price || !state.inventory[name]) return;
    state.inventory[name]--;
    state.gold += price;
  } else if (kind === "gear") {
    const ref = name;
    const gear = gearByName(ref);
    const price = gearSellPrice(gear);
    if (!price || state.favoriteGear[ref] || gearCopyCount(ref) <= equippedGearUsers(ref).length) return;
    const instance = gearInstance(ref);
    if (instance) {
      const baseName = instance.name;
      delete gearInstances[ref];
      syncEchoForgeCopies(baseName);
    } else {
      state.gearCopies[ref] = Math.max(0, gearCopyCount(ref) - 1);
      if (!state.gearCopies[ref]) state.ownedGear = state.ownedGear.filter(ownedName => ownedName !== ref);
    }
    state.gold += price;
  } else return;
  playSfx("coin");
  updatePanels();
  renderVendor();
}

function buyWare(index) {
  const ware = vendorWares(activeVendor)[index];
  const price = ware?.kind === "upgrade" ? bagUpgradePrice(ware.basePrice) : ware?.price;
  if (!ware || state.gold < price) return;
  const repeatableEcho = ware.kind === "gear" && echoForgeGearNames.has(ware.name);
  const hallOffer = ware.kind === "gear" && Number.isInteger(ware.hallStage);
  if (hallOffer && hallBattleProgress().purchasedShopStages.includes(ware.hallStage)) return;
  if (ware.kind === "gear" && state.ownedGear.includes(ware.name) && !repeatableEcho && !hallOffer) return;
  if (ware.kind === "item" && inventoryUsed() >= state.inventorySlots) return;
  state.gold -= price;
  if (ware.kind === "gear") {
    const gear = gearByName(ware.name);
    const gearOptions = { rarity: ware.rarity || defaultGearRarity(ware.name), rollAffixes: !hallOffer, theme: repeatableEcho ? "" : activeVendor === "shelter" ? "ruins" : activeVendor === "workshop" ? "dragon" : activeVendor === "guild" ? "mountain" : "swamp", separateCopy: hallOffer };
    if (hallOffer) {
      gearOptions.affixes = (ware.affixes || []).map(entry => ({ ...entry }));
      if (ware.stats && typeof ware.stats === "object") gearOptions.stats = { ...ware.stats };
    }
    const refs = addOwnedGear(ware.name, 1, gearOptions);
    const ref = refs[0] || gear?.name;
    if (gear && (postgameGearNames.has(gear.name) || echoForgeGearNames.has(gear.name))) topUpGearAffixes(ref, gearRarity(ref), repeatableEcho ? "" : "dragon");
    if (hallOffer) hallBattleProgress().purchasedShopStages.push(ware.hallStage);
  }
  else if (ware.kind === "upgrade") {
    state.inventorySlots += 10;
    state.bagUpgrades++;
  } else addInventoryItem(ware.name, 1);
  playSfx("coin");
  updatePanels();
  if (hallOffer) queueSave();
  renderVendor();
}

function takeFromStash(name) {
  if (!name || !state.stash[name] || inventoryUsed() >= state.inventorySlots) return;
  state.stash[name]--;
  state.inventory[name] = (state.inventory[name] || 0) + 1;
  playSfx("item");
  updatePanels();
  renderVendor();
}

function mapRegion(id) {
  if (["lantern", "ashLane", "sootMarket", "ashDock", "ledgerHouse"].includes(id)) return "Cindervale / Ash Quarter";
  if (id.startsWith("reverie")) return "Reverie Orphanage";
  if (id.startsWith("guild")) return "Guildspire";
  if (id.startsWith("ember")) return "Ember Hall";
  return "False Dawn";
}

function toggleAtlas() {
  if (mode === "atlas") mode = "walk";
  else if (mode === "walk") mode = "atlas";
}

function cycleLeader(direction) {
  if (mode !== "walk" || state.activeParty.length < 2) return;
  if (direction > 0) state.activeParty.push(state.activeParty.shift());
  else state.activeParty.unshift(state.activeParty.pop());
  updatePanels();
}

async function toggleMobileFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
  } catch {}
}

function handleControl(control) {
  if (control === "music") return toggleMusic();
  if (control === "fullscreen") return toggleMobileFullscreen();
  unlockMusic();
  if (mode === "battle" && battle?.phaseTransition?.step === "incoming" && control === "confirm") return confirmPhaseTransition();
  if (mode === "battleResult") {
    if (control === "confirm" || control === "cancel") completeBattleResult();
    return;
  }
  if (mode === "title") {
    if (control === "confirm") activateTitleSelection();
    else if (control === "cancel") closeTitleSubmenu();
    else if (control === "up" || control === "left" && titleMenuState === "main") moveTitleSelection(-1);
    else if (control === "down") moveTitleSelection(1);
    else if (control === "left") closeTitleSubmenu();
    else if (control === "right" && titleMenuState === "main") openTitleSubmenu();
    return;
  }
  if (mode === "hallMap") {
    if (control === "menu" || control === "party" || control === "cancel") closeHallOverlay();
    return;
  }
  fieldDestination = null;
  if (control === "cancel") {
    if (mode === "battle" && battle?.targetMode) closeTargetSelection();
    else if (mode === "battle" && battle?.itemMode) closeBattleItems();
    else if (mode === "menu" || mode === "shop") toggleMenu();
    else if (mode === "atlas") toggleAtlas();
    return;
  }
  if (control === "confirm") return mode === "battle" ? confirmBattleAction() : interact();
  if (control === "menu") return toggleMenu();
  if (control === "party") return toggleAtlas();
  if (mode === "battle") {
    if (control === "left" || control === "up") moveBattleAction(-1);
    if (control === "right" || control === "down") moveBattleAction(1);
    return;
  }
  if (control === "up") move(0, -1, 2);
  if (control === "down") move(0, 1, 0);
  if (control === "left") move(-1, 0, 1);
  if (control === "right") move(1, 0, 3);
}

function startHeldDirection(control) {
  if (mode === "battle") return handleControl(control);
  if (mode === "hallMap") return;
  fieldDestination = null;
  heldDirection = control;
  handleControl(control);
  nextHeldMove = tick + PLAYER_STEP_TICKS;
}

function stopHeldDirection(control) {
  if (heldDirection === control) heldDirection = null;
}

function canvasLogicalPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * LOGICAL_WIDTH / rect.width,
    y: (event.clientY - rect.top) * LOGICAL_HEIGHT / rect.height
  };
}

function directionToward(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? [1, 0, 3] : [-1, 0, 1];
  return dy > 0 ? [0, 1, 0] : [0, -1, 2];
}

const fieldDirections = [[0, -1, 2], [-1, 0, 1], [1, 0, 3], [0, 1, 0]];

function fieldTileKey(x, y) {
  return `${x},${y}`;
}

function fieldPathTo(targetX, targetY, interactionRadius = 0) {
  const startKey = fieldTileKey(state.x, state.y);
  const queue = [{ x: state.x, y: state.y }];
  const parents = new Map([[startKey, null]]);
  let closest = queue[0];
  let closestScore = Math.max(0, Math.abs(state.x - targetX) + Math.abs(state.y - targetY) - interactionRadius);
  let endpoint = null;

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const score = Math.max(0, Math.abs(current.x - targetX) + Math.abs(current.y - targetY) - interactionRadius);
    if (score < closestScore) {
      closest = current;
      closestScore = score;
    }
    if (score === 0) {
      endpoint = current;
      break;
    }

    for (const [dx, dy, facing] of fieldDirections) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = fieldTileKey(x, y);
      if (parents.has(key) || x < 1 || x > 14 || y < 1 || y > 12) continue;
      const activeExit = exitAtPosition(x, y);
      if (activeExit && (x !== targetX || y !== targetY || interactionRadius > 0)) continue;
      if (!passable(x, y) && !activeExit) continue;
      parents.set(key, { key: fieldTileKey(current.x, current.y), step: [dx, dy, facing] });
      queue.push({ x, y });
    }
  }

  endpoint ||= closest;
  const path = [];
  let key = fieldTileKey(endpoint.x, endpoint.y);
  while (key !== startKey) {
    const parent = parents.get(key);
    if (!parent) return [];
    path.unshift(parent.step);
    key = parent.key;
  }
  return path;
}

function destinationTarget() {
  if (!fieldDestination?.target) return fieldDestination;
  if (fieldDestination.kind === "point" && !visiblePoints().includes(fieldDestination.target)) return null;
  if (fieldDestination.kind === "spawn" && !visibleSpawns().includes(fieldDestination.target)) return null;
  return { ...fieldDestination, x: fieldDestination.target.x, y: fieldDestination.target.y };
}

function advanceFieldDestination() {
  if (!fieldDestination || fieldDestination.map !== state.map || mode !== "walk") {
    fieldDestination = null;
    return;
  }
  const destination = destinationTarget();
  if (!destination) {
    fieldDestination = null;
    return;
  }
  const dx = destination.x - state.x;
  const dy = destination.y - state.y;
  const distance = Math.abs(dx) + Math.abs(dy);
  if (distance <= destination.radius) {
    if (dx || dy) state.facing = directionToward(dx, dy)[2];
    const shouldInteract = destination.interact;
    fieldDestination = null;
    if (shouldInteract) interact();
    return;
  }

  const path = fieldPathTo(destination.x, destination.y, destination.radius);
  if (!path.length) {
    fieldDestination = null;
    return;
  }
  const [stepX, stepY, facing] = path[0];
  const moved = move(stepX, stepY, facing);
  nextFieldMove = tick + PLAYER_STEP_TICKS;
  if (!moved || mode !== "walk") fieldDestination = null;
}

function handleFieldTap(x, y) {
  const targetX = Math.max(1, Math.min(14, Math.floor(x / TILE)));
  const targetY = Math.max(1, Math.min(12, Math.floor((y - fieldRenderOffsetY()) / TILE)));
  const tappedPoint = visiblePoints().find(point => point.x === targetX && point.y === targetY);
  const tappedSpawn = visibleSpawns().find(spawnPoint => Math.abs(spawnPoint.x - targetX) <= (spawnPoint.boss ? 1 : 0) && Math.abs(spawnPoint.y - targetY) <= (spawnPoint.boss ? 1 : 0));
  if (targetX === state.x && targetY === state.y) return interact();
  fieldDestination = {
    map: state.map,
    x: targetX,
    y: targetY,
    target: tappedSpawn || tappedPoint || null,
    kind: tappedSpawn ? "spawn" : tappedPoint ? "point" : "ground",
    radius: tappedSpawn ? (tappedSpawn.boss ? 2 : 1) : tappedPoint ? 1 : 0,
    interact: Boolean(tappedPoint || tappedSpawn)
  };
  nextFieldMove = tick;
  advanceFieldDestination();
}

window.addEventListener("keydown", e => {
  if (e.target?.closest?.(".forge-reroll, .gear-favorite, .gear-comparison")) return;
  const key = e.key.toLowerCase();
  const movement = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key);
  if (movement || [" ", "tab", "enter", "escape"].includes(key)) e.preventDefault();
  if (e.repeat && !movement) return;
  if ((key === "arrowup" || key === "w") && !e.repeat) startHeldDirection("up");
  else if ((key === "arrowdown" || key === "s") && !e.repeat) startHeldDirection("down");
  else if ((key === "arrowleft" || key === "a") && !e.repeat) startHeldDirection("left");
  else if ((key === "arrowright" || key === "d") && !e.repeat) startHeldDirection("right");
  else if (key === "z" || key === "enter" || key === " ") handleControl("confirm");
  else if (key === "c" || key === "m") handleControl("menu");
  else if (key === "tab") handleControl("party");
  else if (key === "q") cycleLeader(-1);
  else if (key === "e") cycleLeader(1);
  else if (key === "x" || key === "escape") {
    if (mode === "battle" && battle?.targetMode) closeTargetSelection();
    else if (mode === "battle" && battle?.itemMode) closeBattleItems();
    else if (mode === "menu" || mode === "shop" || mode === "hallMap") toggleMenu();
    else if (mode === "atlas") toggleAtlas();
  }
}, { capture: true });

window.addEventListener("keyup", e => {
  const controls = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
  const control = controls[e.key.toLowerCase()];
  if (control) stopHeldDirection(control);
});
window.addEventListener("blur", () => { heldDirection = null; });

canvas.addEventListener("pointerdown", event => {
  canvas.focus();
  unlockMusic();
});

canvas.addEventListener("click", event => {
  if (mode === "title") {
    const target = titleMenuPointerTarget(event);
    if (target?.kind === "mode") {
      titleMenuIndex = target.index;
      titleSubmenuIndex = 0;
      openTitleSubmenu();
    } else if (target?.kind === "action") {
      titleSubmenuIndex = target.index;
      activateTitleSelection();
    } else if (target?.kind === "confirm") {
      activateTitleSelection();
    }
    return;
  }
  if (mode === "talk") {
    interact();
    return;
  }
  if (mode === "walk") {
    const point = canvasLogicalPoint(event);
    handleFieldTap(point.x * FIELD_WORLD_WIDTH / LOGICAL_WIDTH, point.y);
    return;
  }
  if (mode === "battle") {
    const { x, y } = canvasLogicalPoint(event);
    if (battle?.phaseTransition?.step === "incoming") {
      confirmPhaseTransition();
      return;
    }
    if (x >= 4 && x <= 98 && y >= 168 && y <= 218) {
      const index = Math.floor((y - 168) / 9);
      if (index >= 0 && index < el.actions.children.length) {
        battleActionIndex = index;
        highlightBattleAction();
        confirmBattleAction();
      }
    }
  }
});

document.querySelectorAll("[data-control]").forEach(button => {
  const control = button.dataset.control;
  if (["up", "down", "left", "right"].includes(control)) {
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      canvas.focus();
      startHeldDirection(control);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => button.addEventListener(type, () => stopHeldDirection(control)));
  } else {
    button.addEventListener("click", event => {
      event.preventDefault();
      canvas.focus();
      handleControl(control);
    });
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) Object.values(music).forEach(track => track.pause());
  else updateMusic();
});

document.querySelectorAll(".menu-tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    menuTab = btn.dataset.tab;
    renderMenu();
  });
});

el.skillPointNotice.addEventListener("click", openSkillPointMenu);
el.battleResultContinue.addEventListener("click", completeBattleResult);
el.dialogueSkip.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  skipTalk();
});
el.dialogue.addEventListener("click", event => {
  if (event.target.closest?.("#dialogueSkip")) return;
  if (mode === "talk") interact();
});

el.codexPrev.onclick = () => { codexIndex = (codexIndex + codex.length - 1) % codex.length; updateCodex(); };
el.codexNext.onclick = () => { codexIndex = (codexIndex + 1) % codex.length; updateCodex(); };

if (new URLSearchParams(location.search).has("qa")) {
  window.__versebornTest = {
    snapshot: () => ({
      mode,
      maxLevel: MAX_LEVEL,
      maxBattleRounds: MAX_BATTLE_ROUNDS,
      milestones: [...SKILL_MILESTONE_LEVELS],
      state: JSON.parse(JSON.stringify(state)),
      heroes: Object.fromEntries(Object.keys(baseJobs).map(id => [id, { ...baseJobs[id], gear: { ...baseJobs[id].gear } }])),
      battle: battle ? {
        round: battle.round,
        turnIndex: battle.turnIndex,
        turnQueue: battle.turnQueue.map(turn => ({ ...turn })),
        party: battle.party.map(unit => ({ ...unit, statuses: ensureStatuses(unit).map(status => ({ ...status })) })),
        enemies: battle.enemies.map(unit => ({ ...unit, statuses: ensureStatuses(unit).map(status => ({ ...status })) }))
      } : null
    }),
    setHeroLevel: (id, level) => {
      const progress = progressFor(id);
      progress.level = Math.max(1, Math.min(MAX_LEVEL, level));
      progress.xp = 0;
      progressFor(id);
      return { ...progress };
    },
    chooseTalent: (id, name) => {
      toggleTalent(`${id}:${name}`);
      return [...progressFor(id).talents];
    },
    startBattle: (enemyOptions = {}) => {
      mode = "walk";
      const testEnemy = enemy("QA Sentinel", 70, 9, "Shadow", "#555", enemyOptions.node || 1);
      Object.assign(testEnemy, enemyOptions);
      startBattle("QA Battle", [testEnemy], null);
      return true;
    },
    applyStatus: (side, index, type, options = {}) => {
      const target = side === "party" ? battle.party[index] : battle.enemies[index];
      const source = side === "party" ? battle.enemies[0] : battle.party[0];
      return applyStatus(target, type, source, { ...options, force: options.force ?? true });
    },
    processTurnStart: (side, index) => processTurnStart(side === "party" ? battle.party[index] : battle.enemies[index]),
    processTurnEnd: (side, index) => processTurnEnd(side === "party" ? battle.party[index] : battle.enemies[index]),
    directDamage: (side, index, amount) => {
      const target = side === "party" ? battle.party[index] : battle.enemies[index];
      const wake = breakSleepFromDamage(target);
      target.hp = Math.max(0, target.hp - amount);
      return wake;
    },
    showBattleResult: kind => showBattleResult(kind, [
      { kind: "gold", icon: "G", label: "Gold", value: "+145" },
      { kind: "gear", icon: "E", label: "QA Legendary Cloak", detail: "Armour", value: "x1", rarity: "Legendary" },
      { kind: "item", icon: "*", label: "Ember Dust", detail: "Treasure", value: "x3" },
      { kind: "resonance", icon: "R", label: "Resonance", value: "+15" },
      { kind: "xp", icon: "EXP", label: "EXP", value: "+220" }
    ], returnAfterDefeat),
    defeatParty: () => {
      battle.party.forEach(unit => { unit.hp = 0; markBattleUnitDown(unit); });
      return triggerPartyDefeat("QA final hit.");
    },
    completeBattleResult,
    applyBuff: (side, index, type, duration = 3) => {
      const target = side === "party" ? battle.party[index] : battle.enemies[index];
      return applyStatus(target, type, target, { duration, force: true });
    },
    hallGear: {
      dropRarity: hallNormalGearRarity,
      shopRarity: hallShopGearRarity,
      rollBaseStats: (rarity, seed = "qa") => rollHallBaseStatProfile(rarity, hallSeededRandom(seed)),
      migrateBaseStats: migrateHallBaseStatsV1,
      rules: HALL_BASE_STAT_RULES
    },
    rollAffixes: (name, rarity = "Epic", theme = "mountain") => rollGearAffixes(gearByName(name), rarity, theme),
    heroStats: id => ({ totals: totals(id), crit: heroCritBreakdown(id), output: estimatedHeroOutput(id) }),
    save: saveGame,
    load: loadGame
  };
}

function runQaChecks() {
  const results = {};
  const check = (name, pass, detail = "") => { results[name] = { pass: Boolean(pass), detail }; };
  try {
    check("level-cap", MAX_LEVEL === 40, MAX_LEVEL);
    check("battle-round-cap", MAX_BATTLE_ROUNDS === 20, MAX_BATTLE_ROUNDS);
    check("battle-round-limit-boundary", !battleRoundLimitReached({ round: 19 }) && battleRoundLimitReached({ round: 20 }) && battleRoundLimitReached({ round: 21 }));
    check("battle-draw-retry-mapping", BATTLE_RETRY_EVENTS.dawnWon === "dawn" && BATTLE_RETRY_EVENTS.ngOrphanTrialWon === "ngOrphanTrial");
    check("talent-point-levels", JSON.stringify(TALENT_POINT_LEVELS) === JSON.stringify([4, 8, 12, 16, 20, 24, 28, 32, 36, 40]), TALENT_POINT_LEVELS.join(","));
    check("five-tier-talent-trees", Object.keys(baseJobs).every(id => talentTrees[id].length === 15 && [1, 2, 3, 4, 5].every(tier => talentTrees[id].filter(entry => entry.tier === tier).length === 3)));

    const qaEnemy = prepareEnemyForBattle(enemy("QA Sentinel", 70, 9, "Shadow", "#555", 1));
    const qaHero = battleUnit("Verseborn");
    battle = { name: "QA", enemies: [qaEnemy], party: [qaHero], round: 1, turnQueue: [], turnIndex: 0, usedOnce: {}, extraTurns: 0 };
    mode = "battle";

    applyStatus(qaEnemy, "poison", qaHero, { force: true, duration: 5, value: 7 });
    statusOf(qaEnemy, "poison").remaining = 2;
    applyStatus(qaEnemy, "poison", qaHero, { force: true, duration: 5, value: 7 });
    const poisonBefore = qaEnemy.hp;
    const poisonStart = processTurnStart(qaEnemy);
    processTurnEnd(qaEnemy);
    check("poison-refresh-no-stack", qaEnemy.statuses.filter(status => status.type === "poison").length === 1 && statusOf(qaEnemy, "poison").remaining === 4);
    check("poison-turn-damage", poisonBefore - qaEnemy.hp === 7 && poisonStart.notes.includes("POISON -7 HP"));

    applyStatus(qaEnemy, "sleep", qaHero, { force: true, duration: 5 });
    const sleepSkip = processTurnStart(qaEnemy).skip;
    const wake = breakSleepFromDamage(qaEnemy);
    check("sleep-skip-and-break", sleepSkip && wake === "SLEEP BROKEN!" && !statusOf(qaEnemy, "sleep"));

    applyStatus(qaEnemy, "stun", qaHero, { force: true });
    const stunSkip = processTurnStart(qaEnemy).skip;
    processTurnEnd(qaEnemy);
    check("stun-one-action", stunSkip && !statusOf(qaEnemy, "stun"));

    applyStatus(qaHero, "strengthUp", qaHero, { force: true, duration: 3 });
    applyStatus(qaHero, "strengthUp", qaHero, { force: true, duration: 3 });
    applyStatus(qaHero, "damageUp", qaHero, { force: true, duration: 3 });
    check("buff-refresh-and-coexist", qaHero.statuses.filter(status => status.type === "strengthUp").length === 1 && qaHero.statuses.some(status => status.type === "damageUp"));
    check("buff-multipliers", Math.abs(outgoingDamageMultiplier(qaHero, "melee") - 1.4375) < .0001);
    applyStatus(qaHero, "agilityUp", qaHero, { force: true, duration: 3 });
    check("agility-buff", effectiveAgility(qaHero, 20) === 25);
    check("boss-status-rates", STATUS_TIER_CHANCES.boss.poison === .5 && STATUS_TIER_CHANCES.boss.sleep === .1 && STATUS_TIER_CHANCES.boss.stun === .2);
    const poisonScaleSource = { atk: 100, stats: { str: 100, mag: 100 } };
    const poisonScaleTarget = { max: 100, resistanceTier: "normal" };
    check("poison-potency-scaling", ["weak", "normal", "strong"].map(potency => poisonValueFor(poisonScaleTarget, poisonScaleSource, { potency, damageKind: "melee" })).join(",") === "20,30,40");
    check("poison-boss-cap", poisonValueFor({ max: 1000, resistanceTier: "boss" }, { atk: 10000, stats: { str: 10000, mag: 10000 } }, { potency: "strong", damageKind: "melee" }) === 15);
    check("transformation-config", TRANSFORMATION_CONFIG.mech.duration === 4 && TRANSFORMATION_CONFIG.mech.visual === "GlimmerMech" && TRANSFORMATION_CONFIG.shadowpriest.duration === 4 && TRANSFORMATION_CONFIG.shadowpriest.visual === "KaelShadow");
    check("transformation-skill-kits", TRANSFORMED_SKILLS.mech.length === 5 && TRANSFORMED_SKILLS.shadowpriest.length === 5 && TRANSFORMED_SKILLS.mech.some(entry => entry.name === "Maximum Overdrive") && TRANSFORMED_SKILLS.shadowpriest.some(entry => entry.name === "Eclipse"));

    const affixCounts = RARITY_ORDER.map(rarity => [rarity, rollGearAffixes(gearByName("Ashrunner Knife"), rarity, "mountain").length]);
    check("affix-counts", affixCounts.every(([rarity, count]) => count === RARITY_AFFIX_COUNTS[rarity]), JSON.stringify(affixCounts));
    check("rarity-progression", JSON.stringify(RARITY_AFFIX_COUNTS) === JSON.stringify({ Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5, Artifact: 5 }));
    const rangedAffixes = Array.from({ length: 20 }, () => rollGearAffixes(gearByName("Ashrunner Knife"), "Epic", "mountain")).flat();
    check("affix-ranges", rangedAffixes.every(entry => entry.value >= entry.min && entry.value <= entry.max));
    check("early-status-gear", zoneStarterGear.filter(gear => gear.slot === "weapon").every(gear => gearEffects(gear).some(effect => effect.type === "statusOnHit")) && zoneStarterGear.some(gear => gear.slot === "armour" && gearEffects(gear).some(effect => effect.type === "statusOnHit")));
    check("status-affix-slots", [affixPools.weapon, affixPools.armour, affixPools.accessory].every(pool => ["poison", "sleep", "stun"].every(status => pool.some(entry => entry.type === "statusOnHit" && entry.status === status))));

    const profileIds = Object.keys(baseJobs);
    check("status-profiles", profileIds.every(id => characterSpecialties[id]?.length >= 3 && portraitSources[id]));
    check("status-output-estimates", profileIds.every(id => {
      const output = estimatedHeroOutput(id);
      return Number.isFinite(output.dps) && output.dps >= 0 && Number.isFinite(output.hps) && output.hps >= 0 && output.crit >= 0 && output.crit <= .65;
    }));
    check("agility-crit-scale", [[0, 0], [50, .05], [90, .09], [130, .13], [137, .137]].every(([agi, expected]) => Math.abs(agilityCritBonusFromAgi(agi) - expected) < .0001));
    check("status-output-per-action", profileIds.every(id => {
      const output = estimatedHeroOutput(id);
      return Math.abs(output.dps - Math.round(output.damageBeforeCrit * (1 + output.crit))) <= 1 && output.agiDamageGain >= 0 && output.agiDamagePercent >= 0;
    }));
    check("status-stat-impact", profileIds.every(id => statusStatImpactHtml(totals(id), estimatedHeroOutput(id)).includes("AGI + CRIT")));
    check("status-equipment-breakdown", ["WEAPON", "ARMOUR", "RING", "HELMET"].every(slot => statusEquipmentHtml("Verseborn").includes(slot)));
    const oldStatusWeapon = baseJobs.Verseborn.gear.weapon;
    baseJobs.Verseborn.gear.weapon = "Ashrunner Knife";
    const poisonProc = equippedProcChances("Verseborn").find(entry => entry.type === "poison");
    check("status-proc-breakdown", poisonProc?.raw >= .1 && poisonProc.normalChance > 0);
    baseJobs.Verseborn.gear.weapon = oldStatusWeapon;

    const echoIdentity = echoForgeGear.every(gear => {
      const base = gearByName(gear.echoBase);
      const tier = Math.floor((gear.echoRank - 1) / echoForgeSlots.length);
      const blueprint = echoForgeBlueprints[gear.slot][(tier * 2 + gear.echoVariant) % echoForgeBlueprints[gear.slot].length];
      const unique = gearEffects(gear).filter(effect => effect.echoUnique);
      const inherited = gearEffects(gear).filter(effect => effect.label?.startsWith("Inherited:"));
      return base && gear.echoRarity === "Legendary" && blueprint?.base === gear.echoBase && unique.length === 1 && inherited.length === gearEffects(base).length && Object.entries(base.stats).every(([stat, value]) => gear.stats[stat] > value);
    });
    check("echo-upgrade-identity", echoIdentity);
    check("echo-forge-two-per-rank", echoForgeGear.length === 80 && new Set(echoForgeGear.map(gear => gear.name)).size === 80 && Array.from({ length: 40 }, (_, index) => echoForgeGear.filter(gear => gear.echoRank === index + 1).length === 2).every(Boolean));
    check("echo-forge-all-legendary", echoForgeGear.every(gear => defaultGearRarity(gear.name) === "Legendary"));
    const echoInstanceBackup = {
      ownedGear: [...state.ownedGear],
      gearCopies: { ...state.gearCopies },
      gearInstances: structuredClone(state.gearInstances),
      nextGearInstance: state.nextGearInstance,
      echoForgeRank: state.echoForgeRank,
      gold: state.gold,
      activeVendor
    };
    const repeatableEchoWeapon = echoForgeGear.find(gear => gear.slot === "weapon");
    const originalEchoRefs = new Set(echoGearInstanceRefs(repeatableEchoWeapon.name));
    state.echoForgeRank = Math.max(1, state.echoForgeRank || 0);
    state.gold = repeatableEchoWeapon.price * 3;
    activeVendor = "workshop";
    const repeatableWareIndex = vendorWares("workshop").findIndex(ware => ware.kind === "gear" && ware.name === repeatableEchoWeapon.name);
    buyWare(repeatableWareIndex);
    buyWare(repeatableWareIndex);
    const [echoCopyA, echoCopyB] = echoGearInstanceRefs(repeatableEchoWeapon.name).filter(ref => !originalEchoRefs.has(ref));
    check("echo-forge-repeatable-shop", repeatableWareIndex >= 0 && Boolean(echoCopyA) && Boolean(echoCopyB));
    check("echo-forge-separate-copy-ids", echoCopyA !== echoCopyB && gearInstance(echoCopyA)?.name === repeatableEchoWeapon.name && gearInstance(echoCopyB)?.name === repeatableEchoWeapon.name);
    check("echo-forge-separate-affix-storage", gearAffixes(echoCopyA) !== gearAffixes(echoCopyB) && gearAffixes(echoCopyA).length === 4 && gearAffixes(echoCopyB).length === 4);
    check("echo-forge-fresh-affix-rolls", gearAffixSignature(gearAffixes(echoCopyA)) !== gearAffixSignature(gearAffixes(echoCopyB)));
    check("echo-forge-picker-sees-copies", ownedGearRefs("weapon", "Verseborn").includes(echoCopyA) && ownedGearRefs("weapon", "Verseborn").includes(echoCopyB));
    state.ownedGear = echoInstanceBackup.ownedGear;
    state.gearCopies = echoInstanceBackup.gearCopies;
    state.gearInstances = echoInstanceBackup.gearInstances;
    state.nextGearInstance = echoInstanceBackup.nextGearInstance;
    state.echoForgeRank = echoInstanceBackup.echoForgeRank;
    state.gold = echoInstanceBackup.gold;
    activeVendor = echoInstanceBackup.activeVendor;
    gearInstances = state.gearInstances;
    check("legendary-echo-unique", postgameGear.every(gear => gearEffects(gear).filter(effect => effect.echoUnique).length === 1));
    check("echo-hunt-legendary-variety", postgameGear.length >= 15 && echoForgeSlots.every(slot => postgameGear.filter(gear => gear.slot === slot).length >= 3));
    check("ngplus-chest-variety", ngPlusChestGear.length >= 20 && echoForgeSlots.every(slot => ngPlusChestGear.filter(gear => gear.slot === slot).length >= 4));

    const echoLootBackup = {
      ownedGear: [...state.ownedGear],
      gearCopies: { ...state.gearCopies },
      gearRarities: { ...state.gearRarities },
      gearAffixes: structuredClone(state.gearAffixes),
      inventory: { ...state.inventory },
      stash: { ...state.stash },
      gold: state.gold,
      ngPlus: state.ngPlus
    };
    const guaranteedEchoRewards = { drops: [], gearDrops: [] };
    const guaranteedEchoGear = guaranteeEchoHuntGearReward(guaranteedEchoRewards);
    check("echo-hunt-guaranteed-drop", guaranteedEchoRewards.gearDrops.length === 1 && guaranteedEchoGear?.rarity === "Legendary");
    check("echo-hunt-four-affixes", guaranteedEchoGear && gearAffixes(guaranteedEchoGear.name).length === RARITY_AFFIX_COUNTS.Legendary);
    const mixedEchoRewards = { drops: ["EPIC: QA DROP"], gearDrops: [{ name: "QA Drop", rarity: "Epic" }] };
    const mixedEchoGuarantee = guaranteeEchoHuntGearReward(mixedEchoRewards, 2);
    check("echo-hunt-guarantee-survives-other-loot", mixedEchoRewards.gearDrops.length === 2 && mixedEchoGuarantee?.rarity === "Legendary" && mixedEchoRewards.drops.some(drop => drop?.kind === "gear" && drop.rarity === "Legendary"));
    state.gearCopies["Stonewake Oathblade"] = 0;
    const forcedEchoLoot = rollBattleLoot([{ name: "Kaeldrin", resistanceTier: "normal", level: 30 }], { forceGearRarity: "Legendary", allowNgPlusLoot: false });
    check("echo-hunt-legendary-only", forcedEchoLoot.gearDrops.length >= 1 && forcedEchoLoot.gearDrops.every(drop => drop.rarity === "Legendary" && gearAffixes(drop.name).length === RARITY_AFFIX_COUNTS.Legendary));
    state.ngPlus = 1;
    const loopOneChestRolls = Array.from({ length: 24 }, () => rollNgPlusChestReward({ reward: { gold: 40 } }, "ashQuarter"));
    check("ngplus-chest-always-gear", loopOneChestRolls.every(reward => gearByName(reward.gear) && ["Epic", "Legendary"].includes(reward.rarity) && Object.keys(reward.items).length >= 1));
    const chestSample = loopOneChestRolls[0];
    const chestSampleDrops = [];
    const chestSampleGear = awardGearDrop(chestSample.gear, chestSample.rarity, chestSampleDrops, { theme: chestSample.theme, label: "QA NG+ CHEST" });
    check("ngplus-chest-affixes", gearAffixes(chestSampleGear.name).length === RARITY_AFFIX_COUNTS[chestSampleGear.rarity]);
    state.ngPlus = 4;
    const loopFourChestRolls = Array.from({ length: 12 }, () => rollNgPlusChestReward({ reward: {} }, "dawnCore"));
    check("ngplus-late-loop-legendary", loopFourChestRolls.every(reward => reward.rarity === "Legendary"));
    const ngPlusRarityRolls = Array.from({ length: 20 }, () => rollEquipmentRarity({ resistanceTier: "normal" }));
    check("ngplus-affix-quality-floor", ngPlusRarityRolls.every(rarity => ["Epic", "Legendary"].includes(rarity)));
    state.ownedGear = echoLootBackup.ownedGear;
    state.gearCopies = echoLootBackup.gearCopies;
    state.gearRarities = echoLootBackup.gearRarities;
    state.gearAffixes = echoLootBackup.gearAffixes;
    state.inventory = echoLootBackup.inventory;
    state.stash = echoLootBackup.stash;
    state.gold = echoLootBackup.gold;
    state.ngPlus = echoLootBackup.ngPlus;

    const routeEntries = Object.entries(maps).flatMap(([mapId, map]) => map.exits.map(exit => ({ mapId, exit, entry: maps[exit.to] ? nearestMapEntry(exit.to, exit.tx, exit.ty) : null })));
    const invalidEntries = routeEntries.filter(({ exit, entry }) => !maps[exit.to] || !entry || !terrainPassable(entry.x, entry.y, exit.to));
    check("map-entry-safety", invalidEntries.length === 0, invalidEntries.map(({ mapId, exit }) => `${mapId}->${exit.to}`).join(","));

    const intendedBranchRoutes = [
      ["ashLane", "ledgerHouse", null],
      ["reverieCourt", "reverieArchive", "clergyWon"],
      ["guildRegistry", "guildCouncil", "registered"],
      ["emberHearth", "emberCellar", "torren"]
    ];
    const branchRouteProblems = intendedBranchRoutes.flatMap(([fieldId, roomId, needs]) => {
      const fieldLinks = maps[fieldId].exits.filter(exit => exit.to === roomId);
      const roomLinks = maps[roomId].exits.filter(exit => exit.to === fieldId);
      const outsideLinks = maps[roomId].exits.filter(exit => exit.to !== fieldId);
      const gatedCorrectly = needs === null || fieldLinks[0]?.needs === needs;
      return fieldLinks.length === 1 && roomLinks.length === 1 && outsideLinks.length === 0 && gatedCorrectly
        ? []
        : [`${fieldId}<->${roomId}`];
    });
    check("map-branch-single-visible-entry", branchRouteProblems.length === 0, branchRouteProblems.join(","));

    const cardinalTiles = (x, y) => fieldDirections.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
    const routeTilePassable = (mapId, x, y) => terrainPassable(x, y, mapId)
      && !maps[mapId].points.some(pointData => pointData.x === x && pointData.y === y);
    const passableApproaches = (mapId, x, y) => cardinalTiles(x, y).filter(tile => routeTilePassable(mapId, tile.x, tile.y));
    const exitApproaches = (mapId, exit) => {
      const triggerTiles = [];
      const direction = exitDirection(exit);
      if (direction === "left" || direction === "right") {
        for (let y = exit.y - 1; y <= exit.y + 1; y++) triggerTiles.push({ x: exit.x, y });
      } else {
        for (let x = exit.x - 1; x <= exit.x + 1; x++) triggerTiles.push({ x, y: exit.y });
      }
      const seen = new Set();
      return triggerTiles.flatMap(tile => cardinalTiles(tile.x, tile.y)).filter(tile => {
        const key = fieldTileKey(tile.x, tile.y);
        if (seen.has(key) || !routeTilePassable(mapId, tile.x, tile.y)) return false;
        seen.add(key);
        return true;
      });
    };
    const reachableFrom = (mapId, start) => {
      const reachable = new Set([fieldTileKey(start.x, start.y)]);
      const queue = [start];
      for (let index = 0; index < queue.length; index++) {
        cardinalTiles(queue[index].x, queue[index].y).forEach(tile => {
          const key = fieldTileKey(tile.x, tile.y);
          if (reachable.has(key) || !routeTilePassable(mapId, tile.x, tile.y)) return;
          reachable.add(key);
          queue.push(tile);
        });
      }
      return reachable;
    };
    const routeProblems = [];
    const pointProblems = [];
    const exitProblems = [];
    Object.entries(maps).forEach(([mapId, map]) => {
      const groups = [
        ...map.exits.map(exit => ({ label: `exit:${exit.to}`, tiles: exitApproaches(mapId, exit) })),
        ...map.points.map(pointData => ({ label: `point:${pointData.id}`, tiles: passableApproaches(mapId, pointData.x, pointData.y) })),
        ...(map.spawns || []).map(spawnPoint => ({ label: `spawn:${spawnPoint.id}`, tiles: terrainPassable(spawnPoint.x, spawnPoint.y, mapId) ? [{ x: spawnPoint.x, y: spawnPoint.y }] : [] }))
      ];
      map.points.forEach(pointData => {
        if (!passableApproaches(mapId, pointData.x, pointData.y).length) pointProblems.push(`${mapId}:${pointData.id}`);
      });
      map.exits.forEach(exit => {
        if (!exitApproaches(mapId, exit).length) exitProblems.push(`${mapId}->${exit.to}`);
      });
      const start = groups.find(group => group.tiles.length)?.tiles[0];
      if (!start) {
        routeProblems.push(`${mapId}:no-entry`);
        return;
      }
      const reachable = reachableFrom(mapId, start);
      groups.forEach(group => {
        if (!group.tiles.some(tile => reachable.has(fieldTileKey(tile.x, tile.y)))) routeProblems.push(`${mapId}:${group.label}`);
      });
    });
    check("map-point-approaches", pointProblems.length === 0, pointProblems.join(","));
    check("map-exit-approaches", exitProblems.length === 0, exitProblems.join(","));
    check("map-route-connectivity", routeProblems.length === 0, routeProblems.join(","));
    const staleForegroundMaps = ["reverieArchive", "alarm"].filter(mapId => mapForegroundZones[mapId]?.length);
    check("map-no-stale-foreground-overlays", staleForegroundMaps.length === 0, staleForegroundMaps.join(","));
    const stationHarl = maps.dawnStation.points.find(pointData => pointData.id === "Harl");
    check("map-harl-sprite-and-vendor", stationHarl?.vendor === "dawn");

    const broadPathProblems = Object.entries(maps).flatMap(([mapId, map]) => {
      if (!map.panorama || !map.walkable) return [];
      return map.walkable.flatMap(([x1, y1, x2, y2]) => {
        const blocked = [];
        for (let y = y1; y <= y2; y++) {
          for (let x = x1; x <= x2; x++) {
            if (!terrainPassable(x, y, mapId)) blocked.push(`${mapId}:${x},${y}`);
          }
        }
        return blocked;
      });
    });
    check("map-broad-world-pathing", broadPathProblems.length === 0, broadPathProblems.join(","));

    const armorySpawn = maps.emberArmory.spawns.find(spawnPoint => spawnPoint.id === "armory-pillar");
    const armoryReachable = reachableFrom("emberArmory", { x: 6, y: 4 });
    const armoryApproaches = armorySpawn ? passableApproaches("emberArmory", armorySpawn.x, armorySpawn.y) : [];
    check("map-armory-enemy-reachable", armoryApproaches.some(tile => armoryReachable.has(fieldTileKey(tile.x, tile.y))));

    const clickRouteBackup = {
      mode,
      battle,
      map: state.map,
      x: state.x,
      y: state.y,
      renderX: state.renderX,
      renderY: state.renderY,
      destination: fieldDestination
    };
    mode = "walk";
    battle = null;
    state.map = "emberHearth";
    state.x = 9;
    state.y = 9;
    state.renderX = state.x * TILE;
    state.renderY = state.y * TILE;
    fieldDestination = null;
    const clickExit = maps.emberHearth.exits.find(exit => exit.to === "emberWorkshop");
    handleFieldTap(clickExit.x * TILE + TILE / 2, clickExit.y * TILE + fieldRenderOffsetY() + TILE / 2);
    const clickStepDistance = Math.abs(state.x - 9) + Math.abs(state.y - 9);
    check("map-click-walks-before-transition", state.map === "emberHearth" && clickStepDistance === 1 && fieldDestination?.map === "emberHearth");
    mode = clickRouteBackup.mode;
    battle = clickRouteBackup.battle;
    state.map = clickRouteBackup.map;
    state.x = clickRouteBackup.x;
    state.y = clickRouteBackup.y;
    state.renderX = clickRouteBackup.renderX;
    state.renderY = clickRouteBackup.renderY;
    fieldDestination = clickRouteBackup.destination;

    const yardClickBackup = {
      mode,
      battle,
      screenSlide,
      map: state.map,
      x: state.x,
      y: state.y,
      renderX: state.renderX,
      renderY: state.renderY,
      destination: fieldDestination,
      spawnFlag: state.flags["spawn:yard-construct"]
    };
    mode = "walk";
    battle = null;
    screenSlide = null;
    state.map = "emberYard";
    state.x = 4;
    state.y = 9;
    state.renderX = state.x * TILE;
    state.renderY = state.y * TILE;
    state.flags["spawn:yard-construct"] = true;
    fieldDestination = null;
    const yardDoor = maps.emberYard.exits.find(exit => exit.to === "emberHearth");
    handleFieldTap(yardDoor.x * TILE + TILE / 2, yardDoor.y * TILE + fieldRenderOffsetY() + TILE / 2);
    const yardFirstStep = state.map === "emberYard" && Boolean(fieldDestination);
    for (let routeStep = 0; routeStep < 24 && state.map === "emberYard" && fieldDestination; routeStep++) advanceFieldDestination();
    check("map-click-route-completes-at-door", yardFirstStep && state.map === "emberHearth" && state.x === 9 && state.y === 6);
    mode = yardClickBackup.mode;
    battle = yardClickBackup.battle;
    screenSlide = yardClickBackup.screenSlide;
    state.map = yardClickBackup.map;
    state.x = yardClickBackup.x;
    state.y = yardClickBackup.y;
    state.renderX = yardClickBackup.renderX;
    state.renderY = yardClickBackup.renderY;
    fieldDestination = yardClickBackup.destination;
    if (yardClickBackup.spawnFlag === undefined) delete state.flags["spawn:yard-construct"];
    else state.flags["spawn:yard-construct"] = yardClickBackup.spawnFlag;

    const roofMemory = maps.emberRoof.spawns.find(spawnPoint => spawnPoint.id === "roof-rare-memory");
    const roofRouteBackup = {
      mode,
      battle,
      screenSlide,
      map: state.map,
      x: state.x,
      y: state.y,
      renderX: state.renderX,
      renderY: state.renderY,
      destination: fieldDestination,
      sparkyFlag: state.flags.sparky,
      memoryAvailable: roofMemory.available,
      memoryReturnAt: roofMemory.returnAt,
      memoryRetryAt: roofMemory.retryAt
    };
    mode = "walk";
    battle = null;
    screenSlide = null;
    state.map = "emberRoof";
    state.x = 10;
    state.y = 7;
    state.renderX = state.x * TILE;
    state.renderY = state.y * TILE;
    state.flags.sparky = true;
    roofMemory.available = false;
    roofMemory.returnAt = Date.now() + 60000;
    roofMemory.retryAt = 0;
    fieldDestination = null;
    const roofExit = maps.emberRoof.exits.find(exit => exit.to === "dawnCauseway");
    handleFieldTap(roofExit.x * TILE + TILE / 2, roofExit.y * TILE + fieldRenderOffsetY() + TILE / 2);
    const roofFirstStep = state.map === "emberRoof" && Boolean(fieldDestination);
    for (let routeStep = 0; routeStep < 24 && state.map === "emberRoof" && fieldDestination; routeStep++) advanceFieldDestination();
    check("map-roof-post-dragon-route", roofFirstStep && state.map === "dawnCauseway" && state.x === 2 && state.y === 8);
    mode = roofRouteBackup.mode;
    battle = roofRouteBackup.battle;
    screenSlide = roofRouteBackup.screenSlide;
    state.map = roofRouteBackup.map;
    state.x = roofRouteBackup.x;
    state.y = roofRouteBackup.y;
    state.renderX = roofRouteBackup.renderX;
    state.renderY = roofRouteBackup.renderY;
    fieldDestination = roofRouteBackup.destination;
    if (roofRouteBackup.sparkyFlag === undefined) delete state.flags.sparky;
    else state.flags.sparky = roofRouteBackup.sparkyFlag;
    roofMemory.available = roofRouteBackup.memoryAvailable;
    roofMemory.returnAt = roofRouteBackup.memoryReturnAt;
    roofMemory.retryAt = roofRouteBackup.memoryRetryAt;

    const spawnProblems = Object.entries(maps).flatMap(([mapId, map]) => (map.spawns || []).filter(spawnPoint => {
      const reserved = map.points.some(pointData => pointData.x === spawnPoint.x && pointData.y === spawnPoint.y)
        || map.exits.some(exit => exit.x === spawnPoint.x && exit.y === spawnPoint.y);
      return reserved || !terrainPassable(spawnPoint.x, spawnPoint.y, mapId);
    }).map(spawnPoint => `${mapId}:${spawnPoint.id}`));
    check("map-spawn-grounding", spawnProblems.length === 0, spawnProblems.join(","));

    const migrationSpawnEntry = Object.entries(maps).find(([, map]) => map.spawns?.length);
    if (migrationSpawnEntry) {
      const [migrationMapId, migrationMap] = migrationSpawnEntry;
      const migrationSpawn = migrationMap.spawns[0];
      const previousPosition = { x: migrationSpawn.x, y: migrationSpawn.y };
      migrationSpawn.x = 0;
      migrationSpawn.y = 0;
      sanitizeWorldSpawns();
      check("legacy-spawn-recovery", terrainPassable(migrationSpawn.x, migrationSpawn.y, migrationMapId) && migrationSpawn.x >= 1 && migrationSpawn.y >= 1);
      migrationSpawn.x = previousPosition.x;
      migrationSpawn.y = previousPosition.y;
      sanitizeWorldSpawns();
    }

    battle.party.push(battleUnit("Mira"));
    grantImmediateTurn(qaHero, {});
    grantImmediateTurn(qaHero, {});
    const limited = grantImmediateTurn(qaHero, {});
    check("extra-turn-cap", battle.extraTurns === 2 && limited === "Extra-turn limit reached.");

    const previousBattle = battle;
    battle = null;
    mode = "walk";
    const progress = progressFor("Verseborn");
    const oldLevel = progress.level;
    const oldTalents = [...progress.talents];
    progress.level = 40;
    progress.talents = talentTrees.Verseborn.filter(entry => entry.tier < 5).slice(0, 8).map(entry => entry.name);
    toggleTalent("Verseborn:Maestro of Flame");
    const oneChoice = progress.talents.includes("Maestro of Flame");
    toggleTalent("Verseborn:Voice of Ruin");
    check("capstone-choice-replaces", oneChoice && !progress.talents.includes("Maestro of Flame") && progress.talents.includes("Voice of Ruin") && progress.talents.length === 9);
    progress.level = oldLevel;
    progress.talents = oldTalents;
    progress.pendingMilestones = progress.pendingMilestones.filter(level => level <= oldLevel);
    battle = previousBattle;

    const savedBackup = localStorage.getItem(SAVE_KEY);
    const oldGold = state.gold;
    const oldTestAffixes = state.gearAffixes["Ashrunner Knife"];
    const savedEchoState = {
      ownedGear: [...state.ownedGear],
      gearCopies: { ...state.gearCopies },
      gearInstances: structuredClone(state.gearInstances),
      nextGearInstance: state.nextGearInstance
    };
    battle = null;
    mode = "walk";
    state.gold = 4321;
    state.gearAffixes["Ashrunner Knife"] = rollGearAffixes(gearByName("Ashrunner Knife"), "Rare", "mountain");
    const savedEchoName = echoForgeGear.find(gear => gear.slot === "weapon").name;
    const [savedEchoRef] = addOwnedGear(savedEchoName, 1, { rarity: "Legendary", rollAffixes: true });
    const savedEchoAffixes = gearAffixSignature(gearAffixes(savedEchoRef));
    const wroteSave = saveGame();
    state.gold = 1;
    state.gearAffixes["Ashrunner Knife"] = [];
    delete gearInstances[savedEchoRef];
    const loadedSave = loadGame();
    check("save-load-compatible", wroteSave && loadedSave && state.gold === 4321);
    check("affix-save-load", state.gearAffixes["Ashrunner Knife"]?.length === RARITY_AFFIX_COUNTS.Rare);
    check("echo-copy-save-load", gearInstance(savedEchoRef)?.name === savedEchoName && gearAffixSignature(gearAffixes(savedEchoRef)) === savedEchoAffixes);
    state.ownedGear = savedEchoState.ownedGear;
    state.gearCopies = savedEchoState.gearCopies;
    state.gearInstances = savedEchoState.gearInstances;
    state.nextGearInstance = savedEchoState.nextGearInstance;
    gearInstances = state.gearInstances;

    const echoName = echoForgeGear[0].name;
    const legendaryName = postgameGear[0].name;
    const gearMigrationBackup = {
      ownedGear: [...state.ownedGear],
      echoRarity: state.gearRarities[echoName],
      echoAffixes: state.gearAffixes[echoName],
      legendaryRarity: state.gearRarities[legendaryName],
      legendaryAffixes: state.gearAffixes[legendaryName]
    };
    if (!state.ownedGear.includes(echoName)) state.ownedGear.push(echoName);
    if (!state.ownedGear.includes(legendaryName)) state.ownedGear.push(legendaryName);
    state.gearRarities[echoName] = "Epic";
    state.gearAffixes[echoName] = rollGearAffixes(gearByName(echoName), "Uncommon", "dragon");
    const preservedAffix = { ...affixPools.weapon.find(entry => entry.key === "keen"), value: .07 };
    preservedAffix.text = formatAffix(preservedAffix);
    state.gearRarities[legendaryName] = "Legendary";
    state.gearAffixes[legendaryName] = [preservedAffix];
    upgradeOwnedLegendaryGear();
    check("echo-save-upgrades-to-legendary", state.gearRarities[echoName] === "Legendary" && state.gearAffixes[echoName].length === RARITY_AFFIX_COUNTS.Legendary);
    check("legendary-save-top-up", state.gearAffixes[legendaryName].length === 4 && state.gearAffixes[legendaryName].some(entry => entry.key === preservedAffix.key && entry.value === preservedAffix.value));
    state.ownedGear = gearMigrationBackup.ownedGear;
    if (gearMigrationBackup.echoRarity === undefined) delete state.gearRarities[echoName]; else state.gearRarities[echoName] = gearMigrationBackup.echoRarity;
    if (gearMigrationBackup.echoAffixes === undefined) delete state.gearAffixes[echoName]; else state.gearAffixes[echoName] = gearMigrationBackup.echoAffixes;
    if (gearMigrationBackup.legendaryRarity === undefined) delete state.gearRarities[legendaryName]; else state.gearRarities[legendaryName] = gearMigrationBackup.legendaryRarity;
    if (gearMigrationBackup.legendaryAffixes === undefined) delete state.gearAffixes[legendaryName]; else state.gearAffixes[legendaryName] = gearMigrationBackup.legendaryAffixes;
    if (savedBackup === null) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, savedBackup);
    state.gold = oldGold;
    if (oldTestAffixes === undefined) delete state.gearAffixes["Ashrunner Knife"];
    else state.gearAffixes["Ashrunner Knife"] = oldTestAffixes;
    battle = previousBattle;
  } catch (error) {
    results.runtime = { pass: false, detail: error?.stack || String(error) };
  }
  const summary = {
    passed: Object.values(results).filter(result => result.pass).length,
    total: Object.keys(results).length,
    results
  };
  document.body.setAttribute("data-qa-result", JSON.stringify(summary));
  const qaParams = new URLSearchParams(location.search);
  const qaMode = qaParams.get("qa");
  if (qaMode === "battle") {
    mode = "walk";
    addParty("Mira");
    state.activeParty = ["Mira", "Verseborn"];
    const miraProgress = progressFor("Mira");
    miraProgress.level = 25;
    if (!miraProgress.talents.includes("Venomous Edge")) miraProgress.talents.push("Venomous Edge");
    const total = totals("Mira");
    baseJobs.Mira.hp = total.max;
    baseJobs.Mira.mp = total.mp;
    state.resonance = 100;
    const testEnemy = enemy("Tactical Test Sentinel", 180, 7, "Shadow", "#655", 1);
    startBattle("QA Tactical Battle", [testEnemy], null);
  } else if (qaMode === "buffbattle") {
    mode = "walk";
    state.activeParty = ["Verseborn"];
    const verseProgress = progressFor("Verseborn");
    verseProgress.level = 25;
    verseProgress.talents = verseProgress.talents.filter(name => !talentTrees.Verseborn.some(entry => entry.level === 25 && entry.name === name));
    verseProgress.talents.push("Battle Hymn");
    const total = totals("Verseborn");
    baseJobs.Verseborn.hp = total.max;
    baseJobs.Verseborn.mp = total.mp;
    startBattle("QA Buff Battle", [enemy("Slow Test Sentinel", 180, 5, "Shadow", "#655", 1)], null);
  } else if (qaMode === "flamesolo") {
    mode = "walk";
    const requestedHero = qaParams.get("hero");
    const hero = baseJobs[requestedHero] ? requestedHero : "Verseborn";
    addParty(hero);
    progressFor(hero).level = 40;
    const transformTalent = hero === "Glimmer" ? "Mech Form" : hero === "Kael" ? "Shadowpriest" : null;
    if (transformTalent && !progressFor(hero).talents.includes(transformTalent)) progressFor(hero).talents.push(transformTalent);
    const total = totals(hero);
    baseJobs[hero].hp = total.max;
    baseJobs[hero].mp = total.mp;
    state.activeParty = [hero];
    state.resonance = 100;
    startBattle(`${hero} Sprite QA`, [enemy("Training Construct", 9999, 1, "Shadow", "#655", 1)], null);
  } else if (["flame1", "flame2", "flameforms"].includes(qaMode)) {
    mode = "walk";
    const ids = qaMode === "flame1" ? ["Verseborn", "Sparky", "Glimmer"] : qaMode === "flame2" ? ["Kael", "Torren", "Seerin"] : ["Glimmer", "Kael", "Sparky"];
    ids.forEach(id => {
      addParty(id);
      progressFor(id).level = 40;
      const transformTalent = id === "Glimmer" ? "Mech Form" : id === "Kael" ? "Shadowpriest" : null;
      if (transformTalent && !progressFor(id).talents.includes(transformTalent)) progressFor(id).talents.push(transformTalent);
      const total = totals(id);
      baseJobs[id].hp = total.max;
      baseJobs[id].mp = total.mp;
    });
    state.activeParty = ids;
    state.resonance = 100;
    startBattle("Flame Guard Animation QA", [enemy("Training Construct", 9999, 1, "Shadow", "#655", 1)], null);
    if (qaMode === "flameforms") {
      activateTransformation(battle.party.find(unit => unit.id === "Glimmer"), "mech");
      activateTransformation(battle.party.find(unit => unit.id === "Kael"), "shadowpriest");
      renderBattle("Transformation scale and battle-only sprites.");
    }
  } else if (qaMode === "skills") {
    mode = "menu";
    menuTab = "skills";
    selectedSkillHero = "Verseborn";
    progressFor("Verseborn").level = 40;
    el.menu.classList.remove("hidden");
    renderMenu();
  } else if (qaMode === "gear") {
    mode = "menu";
    menuTab = "gear";
    selectedGearHero = "Verseborn";
    selectedGearSlot = "weapon";
    addOwnedGear("Ashrunner Knife", 1, { rarity: "Epic", rollAffixes: true, theme: "mountain" });
    el.menu.classList.remove("hidden");
    renderMenu();
  } else if (qaMode === "result-victory") {
    mode = "walk";
    startBattle("QA Victory Result", [enemy("Training Construct", 1, 1, "Shadow", "#655", 1)], null);
    showBattleResult("victory", [
      { kind: "gold", icon: "G", label: "Gold", value: "+145" },
      { kind: "gear", icon: "E", label: "QA Legendary Cloak", detail: "Armour", value: "x1", rarity: "Legendary" },
      { kind: "item", icon: "*", label: "Ember Dust", detail: "Treasure", value: "x3" },
      { kind: "resonance", icon: "R", label: "Resonance", value: "+15" },
      { kind: "xp", icon: "EXP", label: "EXP", value: "+220" }
    ], returnAfterDefeat);
  } else if (qaMode === "result-defeat") {
    mode = "walk";
    state.gameMode = "hallBattles";
    state.map = "emberHallBattles";
    startBattle("QA Defeat Result", [enemy("Training Construct", 999, 1, "Shadow", "#655", 1)], null);
    battle.party.forEach(unit => { unit.hp = 0; markBattleUnitDown(unit); });
    triggerPartyDefeat("QA final hit.");
  } else if (qaMode === "result-down") {
    mode = "walk";
    addParty("Mira");
    state.activeParty = ["Verseborn", "Mira"];
    startBattle("QA Death State", [enemy("Training Construct", 999, 1, "Shadow", "#655", 1)], null);
    battle.party[0].hp = 0;
    markBattleUnitDown(battle.party[0]);
    renderBattle("Verseborn falls. Mira continues the fight.");
  } else if (qaMode === "hallstage") {
    mode = "walk";
    state.gameMode = "hallBattles";
    const stage = Math.max(1, Math.min(HALL_BATTLE_BLUEPRINTS.length, Number(qaParams.get("stage")) || 41));
    ["Verseborn", "Mira", "Seerin"].forEach(id => {
      addParty(id);
      progressFor(id).level = MAX_LEVEL;
      baseJobs[id].hp = totals(id).max;
      baseJobs[id].mp = totals(id).mp;
    });
    state.activeParty = ["Verseborn", "Mira", "Seerin"];
    state.hallBattles.unlockedStage = HALL_BATTLE_BLUEPRINTS.length;
    state.resonance = 100;
    startHallBattleStage(stage);
  } else if (qaMode === "map") {
    const mapId = qaParams.get("qaMap");
    if (maps[mapId]) {
      mode = "walk";
      battle = null;
      state.map = mapId;
      maps[mapId].exits.forEach(exit => { if (exit.needs) state.flags[exit.needs] = true; });
      maps[mapId].points.forEach(pointData => { if (pointData.needs) state.flags[pointData.needs] = true; });
      maps[mapId].spawns.forEach(spawnPoint => { state.flags[`spawn:${spawnPoint.id}`] = true; });
      const entry = nearestMapEntry(mapId, Number(qaParams.get("x")) || 8, Number(qaParams.get("y")) || 8);
      state.x = entry.x;
      state.y = entry.y;
      state.renderX = entry.x * TILE;
      state.renderY = entry.y * TILE;
      updatePanels();
    }
  }
}


sanitizeWorldSpawns();
syncResponsiveDevice();
syncResponsiveMode();
window.addEventListener("resize", syncResponsiveDevice);
window.addEventListener("orientationchange", syncResponsiveDevice);
refreshHeroVitals();
updateCodex();
updatePanels();
if (new URLSearchParams(location.search).has("qa")) setTimeout(runQaChecks, 0);
draw();
