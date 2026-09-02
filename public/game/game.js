const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const LOGICAL_WIDTH = 256;
const LOGICAL_HEIGHT = 224;
let renderScale = 3;
ctx.imageSmoothingEnabled = false;

function syncCanvasResolution() {
  const rect = canvas.getBoundingClientRect();
  const measuredScale = rect.width ? Math.round(rect.width / LOGICAL_WIDTH) : 3;
  const nextScale = Math.max(1, Math.min(4, measuredScale));
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
  partyRows: $("partyRows"),
  enemyRows: $("enemyRows"),
  actions: $("actions"),
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
let tick = 0;
let mode = "title";
let menuTab = "status";
let selectedGearHero = "Verseborn";
let selectedGearSlot = "weapon";
let selectedSkillHero = "Verseborn";
let selectedPartySlot = 0;
let activePoint = null;
let talkQueue = [];
let talkPortraits = [];
let talkAfter = null;
let battle = null;
let effect = null;
let battleFloaters = [];
let codexIndex = 0;
let battleActionIndex = 0;
let heldDirection = null;
let nextHeldMove = 0;
let fieldDestination = null;
let nextFieldMove = 0;
let activeVendor = null;
let vendorTab = "buy";
let audioContext = null;
let screenSlide = null;
let titleMenuIndex = 0;
let saveTimer = null;

const titleMenuEntries = ["New Game", "Continue", "Options"];
const SAVE_KEY = "verseborn-jrpg-save-v2";
const titleTwinkles = [
  { x: 135, y: 170, phase: 0, color: "#fff2b8" },
  { x: 1290, y: 118, phase: 110, color: "#d9c7ff" },
  { x: 1115, y: 344, phase: 220, color: "#c7e8ff" }
];

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
  battle: new Audio("assets/audio/battle-jrpg.mp3")
};
Object.values(music).forEach(track => {
  track.loop = true;
  track.preload = "auto";
  track.volume = 0.46;
});
let musicUnlocked = false;
let activeMusic = null;
let musicMuted = false;

function trackForScene() {
  if (mode === "title") return "title";
  if (mode === "battle") return "battle";
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
  Verseborn: 54, Mira: 56, Sparky: 44, Glimmer: 52, GlimmerMech: 62,
  Kael: 58, KaelShadow: 62, Torren: 57, Seerin: 56
};
const BATTLE_IDLE_FRAME_TICKS = 36;
const battleFrameSequences = {
  Verseborn: { idle: [1, 2, 1, 2] },
  Mira: {
    idle: [0, 1, 2, 3],
    melee: [0, 0, 1, 2, 3],
    block: [0, 0, 1, 3, 4],
    magic: [0, 0, 1, 3, 4],
    ultimate1: [0, 0, 1, 2, 3],
    ultimate2: [0, 0, 1, 2, 3]
  },
  Sparky: { idle: [1, 2, 1, 2] },
  Glimmer: { idle: [1, 2, 1, 2], ultimate1: [1, 1, 2, 3, 3], ultimate2: [1, 2, 3, 3, 3] },
  GlimmerMech: { idle: [1, 2, 1, 2] },
  KaelShadow: { idle: [1, 2, 1, 2] },
  Torren: { idle: [1, 2, 1, 2] },
  Seerin: { idle: [1, 2, 1, 2] },
  Kael: { idle: [1, 2, 1, 2], melee: [0, 1, 4, 1, 0], block: [0, 1, 4, 1, 0], ultimate2: [1, 1, 2, 3, 4] }
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
  "Inkbound Auditor": "inkbound-auditor",
  "Dawn Gate Sentinel": "dawn-gate-sentinel",
  "Archive Custodian": "archive-custodian",
  "Dock Foreman": "dock-foreman",
  "Seal Bearer": "clergy-seal-patrol",
  "Cracked Pillar": "cracked-armory-pillar",
  "Ash Wyrm": "ash-wyrm"
};
const enemyAnimationHeights = {
  "Inkbound Auditor": 44,
  "Dawn Gate Sentinel": 51,
  "Archive Custodian": 47,
  "Dock Foreman": 45,
  "Seal Bearer": 45,
  "Cracked Pillar": 55,
  "Ash Wyrm": 60
};
const magicEnemyAnimations = new Set([
  "Inkbound Auditor",
  "Archive Custodian",
  "Seal Bearer",
  "Ash Wyrm"
]);
const magicNpcAnimations = new Set(["Lyrsa", "Nyx", "Jory"]);
const enemyAbilityProfiles = {
  Jory: { row: 0, element: "Sound", magic: "Star Note", ultimate: "Grand Chord" },
  Nyx: { row: 1, element: "Shadow", magic: "Shadow Bolt", ultimate: "Gravebind" },
  Rava: { row: 2, element: "Ancient Fire", magic: "Ember Javelin", ultimate: "Dragon's Breath" },
  Grumm: { row: 3, element: "Earth", magic: "Boulder Toss", ultimate: "Mountain Breaker" },
  Kaeldrin: { row: 4, element: "Holy Fire", magic: "Radiant Lance", heal: "Divine Seal", ultimate: "Blade of Dawn" },
  Lyrsa: { row: 5, element: "Sigil", magic: "Arcane Missile", heal: "Barrier Spell", ultimate: "Astral Convergence" },
  Shade: { row: 6, element: "Shadow", magic: "Throwing Daggers", ultimate: "Shadow Storm" },
  Marla: { row: 7, element: "Heart", magic: "Soup Splash", heal: "Stamina Stew", ultimate: "Feast for All", ultimateHeal: true }
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
const enemyAnimationSheets = {};
const chestOpenTicks = {};
let enemySheet = null;
let enemyAttackSheet = null;
let worldEnemySheet = null;
let npcSheet = null;
let titleImage = null;
let chestSheet = null;
let echoProjectileSheet = null;
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
    const response = await fetch("assets/sprites/battle/manifest.json?v=flame-guard-30a");
    if (!response.ok) return;
    const manifest = await response.json();
    await Promise.all(Object.entries(manifest).map(([id, config]) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        battleAnimationSheets[id] = { ...config, image };
        resolve();
      };
      image.onerror = resolve;
      image.src = `assets/sprites/battle/${config.file}?v=flame-guard-30a`;
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

function loadEnemyAnimationSheet(id, fileName) {
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
      const rows = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => (
        cellBounds(pixels, cleaned.width, cleaned.height, col, row, 5, 5)
      )));
      const idleHeights = rows[0].map(cell => cell.h).sort((a, b) => a - b);
      enemyAnimationSheets[id] = {
        image: cleaned,
        rows,
        referenceHeight: idleHeights[Math.floor(idleHeights.length / 2)] || cleaned.height / 5
      };
      resolve();
    };
    image.onerror = resolve;
    image.src = `assets/sprites/enemies-animation/${fileName}.png`;
  });
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
    image.src = `assets/battles/${id}.png`;
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

Promise.all([
  loadBattleAnimationSheets(),
  ...Object.keys(spriteScale).map(id => loadAnimationSheet(id)),
  ...Object.entries(animatedNpcFiles).map(([id, fileName]) => loadAnimationSheet(id, fileName)),
  ...Object.entries(enemyAnimationFiles).map(([id, fileName]) => loadEnemyAnimationSheet(id, fileName)),
  loadChestSheet(),
  loadEnemySheet(),
  loadEnemyAttackSheet(),
  loadWorldEnemySheet(),
  loadNpcSheet(),
  loadTitleImage(),
  loadMarlaBattleSheet(),
  loadEchoProjectileSheet(),
  ...["ash-quarter", "reverie", "guildspire", "ember-hall", "false-dawn"].map(loadBattleImage),
  ...["lantern", "ash", "reverie", "guildspire", "ember", "alarm", "ash-route", "reverie-route", "guildspire-route", "ember-route", "dawn-route"].map(loadMapImage)
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
  item("Faultline Signet", "ring", { str: 4, stam: 3 }, "The crack points toward the weakest joint.", { type: "stagger", value: 1, label: "+1 stagger on weakness hits" }),
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
    { type: "stagger", value: 2, label: "+2 stagger on weakness hits" },
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

const echoForgeGear = Array.from({ length: 40 }, (_, index) => {
  const rank = Math.floor(index / 2) + 1;
  const variant = index % 2;
  const slot = echoForgeSlots[(rank - 1) % echoForgeSlots.length];
  const tier = Math.floor((rank - 1) / echoForgeSlots.length);
  const blueprint = echoForgeBlueprints[slot][tier * 2 + variant];
  const baseGear = gearByName(blueprint.base);
  const boost = 2 + tier + Math.floor(rank / 10);
  const stats = Object.fromEntries(Object.entries(baseGear.stats).map(([stat, value]) => [stat, value + boost]));
  const coreStat = { weapon: "str", armour: "stam", ring: "agi", necklace: "mag", helmet: "agi" }[slot];
  stats[coreStat] = (stats[coreStat] || 0) + 2 + tier;
  const inheritedEffects = gearEffects(baseGear).map(({ echoUnique, ...effect }) => ({ ...effect, label: `Inherited: ${effect.label}` }));
  const echoEffect = { ...blueprint.effect, echoUnique: true, label: `ECHO: ${blueprint.effect.label}` };
  const echoRarity = "Legendary";
  const name = variant === 0 ? `Echo-Forged ${slot[0].toUpperCase()}${slot.slice(1)} Mk ${rank}` : `Echo-Forged ${blueprint.base}`;
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

function gearIconSheet(gear, heroId) {
  if (gear?.name === "Echo-Thread Lute") return "gear-verseborn";
  if (ngPlusSignatureNames.has(gear?.name)) return `gear-${gearOwners[gear.name][0].toLowerCase()}`;
  if (generalDropGear.has(gear?.name) || echoForgeGearNames.has(gear?.name)) return "gear-drop";
  return `gear-${heroId.toLowerCase()}`;
}

function gearAccessLabel(gear) {
  if (gear?.name === "Echo-Thread Lute") return "ULTIMATE WEAPON / VERSEBORN ONLY";
  if (ngPlusSignatureNames.has(gear?.name)) return `NG+ ULTIMATE WEAPON / ${gearOwners[gear.name][0].toUpperCase()} ONLY`;
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

function gearEffectLabels(gear) {
  return gearEffects(gear).map(effect => effect.echoUnique && effect.label ? `ECHO EFFECT: ${effect.label.replace(/^ECHO(?: EFFECT)?:\s*/i, "")}` : effect.label).filter(Boolean);
}

function gearEffectHtml(gear, className = "rare-effect") {
  const effects = gearEffects(gear).filter(effect => effect.label);
  return effects.length ? `<span class="gear-unique-effects ${className}">${effects.map(effect => {
    const label = effect.echoUnique ? `ECHO EFFECT: ${effect.label.replace(/^ECHO(?: EFFECT)?:\s*/i, "")}` : effect.label;
    return `<small class="${effect.echoUnique ? "is-echo-unique" : ""}">${label}</small>`;
  }).join("")}</span>` : "";
}

const RARITY_AFFIX_COUNTS = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

function affix(key, label, type, min, max, options = {}) {
  return { key, label, type, min, max, ...options };
}

const affixPools = {
  weapon: [
    affix("strong", "Strong", "statPct", .05, .15, { stat: "str", theme: "mountain" }),
    affix("scholars", "Scholar's", "statPct", .05, .15, { stat: "mag", theme: "ruins" }),
    affix("fleet", "Fleet", "statPct", .05, .15, { stat: "agi", theme: "dragon" }),
    affix("keen", "Keen", "critChance", .04, .1),
    affix("venomous", "Venomous", "statusOnHit", .05, .15, { status: "poison", theme: "swamp" }),
    affix("drowsing", "Drowsing", "statusOnHit", .05, .12, { status: "sleep", theme: "ruins" }),
    affix("stormbreaking", "Stormbreaking", "statusOnHit", .05, .12, { status: "stun", theme: "mountain" }),
    affix("executioner", "Executioner", "afflictedDamage", .1, .22),
    affix("physical", "Forceful", "physicalDamage", .06, .14),
    affix("arcane", "Arcane", "magicDamage", .06, .14)
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
    affix("lasting", "Lasting Guard", "buffDuration", 1, 1)
  ],
  accessory: [
    affix("fleet", "Fleet", "statPct", .05, .15, { stat: "agi", theme: "dragon" }),
    affix("alchemist", "Alchemist", "statusChance", .08, .18, { theme: "swamp" }),
    affix("venomSeal", "Venom Seal", "statusOnHit", .05, .1, { status: "poison", theme: "swamp" }),
    affix("dreamSeal", "Dream Seal", "statusOnHit", .05, .1, { status: "sleep", theme: "ruins" }),
    affix("stormSeal", "Storm Seal", "statusOnHit", .05, .1, { status: "stun", theme: "mountain" }),
    affix("resolute", "Resolute", "allStatusResistance", .08, .2),
    affix("echoing", "Echoing", "echoing", .05, .08, { theme: "dragon" }),
    affix("prolonging", "Prolonging", "buffDuration", 1, 1),
    affix("cruel", "Cruel", "statusDuration", 1, 1),
    affix("quickstart", "Quickstart", "openingTurnProgress", .1, .25, { theme: "dragon" }),
    affix("keen", "Keen", "critChance", .04, .09)
  ]
};

function randomAffixValue(entry) {
  if (entry.min === entry.max) return entry.min;
  const step = entry.max <= 1 ? .01 : 1;
  return Math.round((entry.min + Math.random() * (entry.max - entry.min)) / step) * step;
}

function formatAffix(entry) {
  const value = entry.value;
  if (entry.type === "statPct") return `${entry.label}: ${entry.stat.toUpperCase()} +${Math.round(value * 100)}%`;
  if (entry.type === "hpPct") return `${entry.label}: HP +${Math.round(value * 100)}%`;
  if (entry.type === "statusOnHit") return `${entry.label}: ${Math.round(value * 100)}% ${entry.status.toUpperCase()} on hit`;
  if (entry.type === "statusResistance") return `${entry.label}: ${Math.round(value * 100)}% ${entry.status.toUpperCase()} resistance`;
  if (["critChance", "afflictedDamage", "physicalDamage", "magicDamage", "poisonReduction", "statusChance", "allStatusResistance", "echoing", "openingTurnProgress"].includes(entry.type)) {
    return `${entry.label}: +${Math.round(value * 100)}% ${entry.type.replace(/([A-Z])/g, " $1").toLowerCase()}`;
  }
  return `${entry.label}: +${value} ${entry.type.replace(/([A-Z])/g, " $1").toLowerCase()}`;
}

function defaultGearRarity(name) {
  const gear = gearByName(name);
  if (!gear) return "Common";
  if (ngPlusSignatureNames.has(name) || postgameGearNames.has(name)) return "Legendary";
  if (echoForgeGearNames.has(name)) return gear.echoRarity || "Legendary";
  if (ngPlusChestGearNames.has(name)) return "Epic";
  if (ngPlusGearNames.has(name)) return "Epic";
  if (chestGear.includes(gear)) return "Epic";
  if (rareGear.includes(gear) || questGear.includes(gear)) return "Rare";
  if (zoneStarterGear.includes(gear)) return "Uncommon";
  return "Common";
}

function rollGearAffixes(gear, rarity, theme = "") {
  const count = RARITY_AFFIX_COUNTS[rarity] || 0;
  if (!count) return [];
  const base = gear.slot === "weapon" ? affixPools.weapon : gear.slot === "armour" ? affixPools.armour : affixPools.accessory;
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
    const pool = gear.slot === "weapon" ? affixPools.weapon : gear.slot === "armour" ? affixPools.armour : affixPools.accessory;
    pool.filter(entry => !existing.some(current => current.key === entry.key)).slice(0, wanted - existing.length).forEach(entry => {
      const rolled = { ...entry, value: randomAffixValue(entry) };
      rolled.text = formatAffix(rolled);
      existing.push(rolled);
    });
  }
  state.gearAffixes[name] = existing;
  return existing;
}

function upgradeOwnedLegendaryGear() {
  const equipped = Object.values(baseJobs).flatMap(hero => Object.values(hero.gear || {})).filter(Boolean);
  [...new Set([...(state.ownedGear || []), ...equipped])].forEach(name => {
    if (!gearByName(name)) return;
    if (postgameGearNames.has(name)) state.gearRarities[name] = "Legendary";
    if (echoForgeGearNames.has(name)) {
      const current = state.gearRarities[name] || "Common";
      const upgraded = defaultGearRarity(name);
      state.gearRarities[name] = RARITY_ORDER.indexOf(current) > RARITY_ORDER.indexOf(upgraded) ? current : upgraded;
    }
    const rarity = gearRarity(name);
    if (postgameGearNames.has(name) || echoForgeGearNames.has(name) || rarity === "Legendary") topUpGearAffixes(name, rarity, "dragon");
  });
}

function gearRarity(name) {
  return state.gearRarities?.[name] || defaultGearRarity(name);
}

function gearAffixes(name) {
  return Array.isArray(state.gearAffixes?.[name]) ? state.gearAffixes[name] : [];
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
  return `<span class="gear-affixes">${entries.map(entry => `<small>${entry.text || formatAffix(entry)}</small>`).join("")}</span>`;
}

function gearRarityHtml(name) {
  const rarity = gearRarity(name);
  return `<small class="gear-rarity rarity-${rarity.toLowerCase()}">${rarity.toUpperCase()}</small>`;
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
  "Ash Ink": { type: "Quest Material", desc: "Ink recovered from an Ash Scribe." },
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
  Verseborn: character("Verseborn", "Songweaver", "Sound", "#30283f", "#17131f", "#a87b42", { str: 8, agi: 10, mag: 15, stam: 9 }, ["Voice of Verse", "Ashcloak", "Promise Ring", "Cinder Star", "Songweaver Hood"], [
    skill("Attack", "melee", "Neutral", 12, 0, "A clean lute strike."),
    skill("Resonant Verse", "magic", "Sound", 25, 6, "Sound magic; adds Resonance."),
    skill("Shared Warning", "block", "Sound", -28, 8, "Party heal and guard."),
    skill("ULT: The Name I Chose", "ultimate", "Sound", 78, 100, "Full-party songburst.")
  ]),
  Mira: character("Mira", "Whispering Arrow", "Shadow", "#12151d", "#050508", "#7e62a8", { str: 12, agi: 17, mag: 9, stam: 7 }, ["Twin Voidthorns", "Ashcloak", "Quiet Circuit", "Veln Crest Token", "Mira Top Hat"], [
    skill("Attack", "melee", "Neutral", 14, 0, "Twin dagger slash."),
    skill("Voidthorn Mark", "magic", "Shadow", 32, 5, "Marks and exploits weakness."),
    skill("Silent Step", "melee", "Shadow", 20, 4, "Pushes one node back."),
    skill("ULT: Whispering Arrow", "ultimate", "Shadow", 92, 100, "Screen-darkening precision strike.")
  ]),
  Seerin: character("Seerin", "Flame's Shield", "Holy Fire", "#8d382e", "#9e3d20", "#f0d39a", { str: 13, agi: 7, mag: 11, stam: 18 }, ["Earth Shield", "Flameguard Plate", "Red Ember Band", "Cinder Star", "Stone Brow Guard"], [
    skill("Attack", "melee", "Neutral", 13, 0, "Sword and shield hit."),
    skill("Cinder Guard", "block", "Holy Fire", -26, 7, "Blocks and heals weakest ally."),
    skill("Starflame Cut", "magic", "Holy Fire", 34, 7, "Holy fire arc."),
    skill("ULT: The Woman in the Door", "ultimate", "Holy Fire", 70, 100, "Party-wide shield and counterfire.")
  ]),
  Kael: character("Kael", "Silent Oath", "Sigil", "#ece0c6", "#d6c4ab", "#9a7a50", { str: 6, agi: 8, mag: 17, stam: 11 }, ["Staff & Sigil", "Ashcloak", "Promise Ring", "Cinder Star", "Stone Brow Guard"], [
    skill("Attack", "melee", "Neutral", 9, 0, "Staff strike."),
    skill("Quiet Rite", "magic", "Sigil", -36, 8, "Strong heal."),
    skill("Firebreak Sigil", "block", "Sigil", 0, 6, "Halves incoming damage."),
    skill("ULT: Oath Unbound", "ultimate", "Sigil", -90, 100, "Full heal and cleanse.")
  ]),
  Torren: character("Torren", "Stoneheart", "Earth", "#70472c", "#8a4d25", "#d87536", { str: 17, agi: 5, mag: 5, stam: 21 }, ["Earth Shield", "Stonewake Mantle", "Red Ember Band", "Cinder Star", "Stone Brow Guard"], [
    skill("Attack", "melee", "Neutral", 18, 0, "Shield bash."),
    skill("Foundation Break", "melee", "Earth", 40, 6, "Huge stagger damage."),
    skill("Hold the Door", "block", "Earth", -18, 5, "Self heal and guard."),
    skill("ULT: Stone Does Not Stand Alone", "ultimate", "Earth", 85, 100, "Earthquake wall-breaker.")
  ]),
  Glimmer: character("Glimmer", "Gearmind", "Tech", "#e2768c", "#ee7e91", "#b9823e", { str: 7, agi: 14, mag: 18, stam: 6 }, ["Klik-Wrench 7", "Workshop Coat", "Quiet Circuit", "Gearheart Charm", "Glimmer Goggles"], [
    skill("Attack", "melee", "Neutral", 10, 0, "Wrench bonk."),
    skill("Klik-Wrench 7", "magic", "Tech", 44, 8, "Overclocked tech burst."),
    skill("Patch Job", "magic", "Tech", -24, 6, "Heal and stabilize."),
    skill("ULT: The Engineer Who Stayed", "ultimate", "Tech", 96, 100, "Retunes the battlefield itself.")
  ]),
  Sparky: character("Sparky", "Emberborn", "Ancient Fire", "#332846", "#7f4ad1", "#b66cff", { str: 7, agi: 13, mag: 16, stam: 8 }, ["Voice of Verse", "Workshop Coat", "Promise Ring", "Gearheart Charm", "Glimmer Goggles"], [
    skill("Ember Nip", "melee", "Ancient Fire", 14, 0, "Tiny bite. Old flame."),
    skill("Memory Flare", "magic", "Ancient Fire", 36, 7, "Burns false commands."),
    skill("Prrrp", "block", "Heart", -20, 5, "Morale heal."),
    skill("ULT: Eternal Flame", "ultimate", "Ancient Fire", 88, 100, "Dragon memory erupts.")
  ])
};

const MAX_LEVEL = 40;
const MAX_BATTLE_ROUNDS = 20;
const SKILL_MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40];
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
    talent(15, "Granite Memory", "blockTalent", .18, "Defend and block commands reduce another 18% damage."),
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
    talent(30, "Guardian's Answer", "guardCounter", .35, "Blocking a direct hit triggers a 35% counterattack."),
    talent(35, "Earthen Bastion", "newSkill", skill("Earthen Bastion", "block", "Holy Fire", 0, 12, "Party Defense Up and Party Guard.", { targetSide: "party", partyWide: true, buffs: [{ type: "defenseUp", duration: 4 }], grantsWard: true })),
    talent(35, "Dawnbreaker", "newSkill", skill("Dawnbreaker", "magic", "Holy Fire", 50, 12, "Hits all enemies with Stun chance.", { allEnemies: true, status: { type: "stun", chance: .55 } })),
    talent(40, "Aegis of Chosen Kin", "newSkill", skill("ULT: Aegis of Chosen Kin", "ultimate", "Holy Fire", 0, 100, "Party Guard, Defense Up and Damage Up.", { targetSide: "party", partyWide: true, grantsWard: true, buffs: [{ type: "defenseUp" }, { type: "damageUp" }] })),
    talent(40, "Judgment at the Door", "newSkill", skill("ULT: Judgment at the Door", "ultimate", "Holy Fire", 142, 100, "All-enemy judgment with Stun.", { allEnemies: true, status: { type: "stun", chance: .7 } }))
  ],
  Kael: [
    talent(25, "Blessing of Insight", "newSkill", skill("Blessing of Insight", "magic", "Sigil", 0, 8, "Party Magic Up.", { targetSide: "party", partyWide: true, buffs: [{ type: "magicUp" }] })),
    talent(25, "Purify", "newSkill", skill("Purify", "magic", "Sigil", 0, 7, "Removes negative statuses from the party.", { targetSide: "party", partyWide: true, cleanse: true })),
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
    talent(30, "Granite Retort", "guardCounter", .5, "Blocking a direct hit triggers a 50% counterattack."),
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

const STATUS_DEFS = {
  poison: { label: "POISON", short: "PSN", negative: true, duration: 4 },
  sleep: { label: "SLEEP", short: "SLP", negative: true, duration: 5 },
  stun: { label: "STUN", short: "STN", negative: true, duration: 1 },
  strengthUp: { label: "STRENGTH UP", short: "STR", buff: true, duration: 3, value: .25 },
  magicUp: { label: "MAGIC UP", short: "MAG", buff: true, duration: 3, value: .25 },
  defenseUp: { label: "DEFENSE UP", short: "DEF", buff: true, duration: 3, value: .25 },
  defenseDown: { label: "DEFENSE DOWN", short: "DWN", negative: true, duration: 3, value: .2 },
  magicDefenseDown: { label: "MAGIC DEFENSE DOWN", short: "MR-", negative: true, duration: 3, value: .25 },
  mechGuard: { label: "REINFORCED CHASSIS", short: "RIG", buff: true, duration: 2, value: .25 },
  damageUp: { label: "DAMAGE UP", short: "DMG", buff: true, duration: 3, value: .15 },
  agilityUp: { label: "AGILITY UP", short: "AGI", buff: true, duration: 3, value: .25 },
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
    skill("Piston Impact", "melee", "Tech", 0, 0, "1.35x STR Tech strike with heavy stagger.", { coefficient: 1.35, staggerPower: 3, multiHit: 2 }),
    skill("Gearstorm Barrage", "magic", "Tech", 0, 10, "1.9x MAG multi-hit barrage.", { coefficient: 1.9, multiHit: 4 }),
    skill("Arc Reactor Burst", "magic", "Tech", 0, 12, "1.5x MAG to all enemies with Defense Down.", { coefficient: 1.5, allEnemies: true, status: { type: "defenseDown", chance: .6, duration: 3, value: .2 } }),
    skill("Reinforced Chassis", "block", "Tech", 0, 8, "Reduce incoming damage by 25% for two actions.", { targetSide: "self", buffs: [{ type: "mechGuard", duration: 2, value: .25 }] }),
    skill("Maximum Overdrive", "ultimate", "Tech", 0, 100, "2.8x MAG multi-hit blast against all enemies.", { coefficient: 2.8, allEnemies: true, multiHit: 5, ultimateIndex: 1 })
  ],
  shadowpriest: [
    skill("Void Lance", "magic", "Shadow", 0, 0, "1.6x MAG shadow strike.", { coefficient: 1.6 }),
    skill("Umbral Wave", "magic", "Shadow", 0, 10, "1.45x MAG against all enemies.", { coefficient: 1.45, allEnemies: true }),
    skill("Soul Rend", "magic", "Shadow", 0, 12, "2.0x MAG and Magic Defense Down.", { coefficient: 2, status: { type: "magicDefenseDown", chance: 1, duration: 3, value: .25 } }),
    skill("Dark Communion", "magic", "Shadow", 0, 10, "1.5x MAG and heal for 25% of damage dealt.", { coefficient: 1.5, selfHealRatio: .25 }),
    skill("Eclipse", "ultimate", "Shadow", 0, 100, "2.75x MAG against all enemies with Magic Defense Down.", { coefficient: 2.75, allEnemies: true, multiHit: 4, ultimateIndex: 2, status: { type: "magicDefenseDown", chance: 1, duration: 2, value: .2 } })
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
  return { name, anim, element, power, cost, desc, ...options };
}

function talent(level, name, type, value, desc = null, unlockDesc = null) {
  const text = desc || value?.desc || "";
  return { level, name, type, value, desc: text, unlockDesc: unlockDesc || text };
}

const state = {
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
  endgameRank: 0,
  echoForgeRank: 0,
  ngPlus: 0,
  heroProgress: Object.fromEntries(Object.keys(baseJobs).map(id => [id, { level: 1, xp: 0, talents: [], pendingMilestones: [] }])),
  discoveredMaps: ["lantern"],
  escort: null,
  fieldWard: false,
  flags: {}
};

function savedGameExists() {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

function saveGame() {
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, state, heroes, questState, spawnState }));
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

function loadGame() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  } catch {
    return false;
  }
  if (!data?.state) return false;
  Object.assign(state, data.state);
  state.party = Array.isArray(state.party) && state.party.length ? state.party.filter(id => baseJobs[id]) : ["Verseborn"];
  state.activeParty = Array.isArray(state.activeParty) && state.activeParty.length ? state.activeParty.filter(id => state.party.includes(id)).slice(0, 3) : [state.party[0]];
  state.heroProgress ||= {};
  state.gearAffixes ||= {};
  state.gearRarities ||= {};
  state.ownedGear = Array.isArray(state.ownedGear) ? state.ownedGear.filter(name => gearByName(name)) : [];
  state.gearCopies ||= {};
  state.discoveredMaps = Array.isArray(state.discoveredMaps) ? state.discoveredMaps.filter(id => maps[id]) : ["lantern"];
  state.flags ||= {};
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
  "Ledger Cutter": loot([8, 15], [["Ledger Scrap", 1, 1]], [["Echo-Thread Lute", .18]]),
  "Chain Warden": loot([12, 20], [["Iron Chain Link", 1, 2], ["Marla's Soup", .35, 1]], [["Sealbreak Vestment", .12]]),
  "Seal Bearer": loot([14, 22], [["Broken Wax Seal", 1, 2], ["Clockwork Tonic", .3, 1]], [["Sealbreak Vestment", .2]]),
  "Ash Scribe": loot([10, 18], [["Ash Ink", 1, 2], ["Ash Ward", .3, 1]], [["Echo-Thread Lute", .1]]),
  "Buried Construct": loot([18, 28], [["Resonant Stone", 1, 2]], [["Faultline Signet", .22]]),
  "Cracked Pillar": loot([16, 25], [["Resonant Stone", 1, 2], ["Marla's Soup", .3, 1]], [["Faultline Signet", .16]]),
  "Wrong Bell": loot([24, 36], [["False Dawn Cog", 1, 2]], [["Local Truth Lens", .24]]),
  "Gate Lock": loot([22, 34], [["Tempered Lockplate", 1, 2], ["Clockwork Tonic", .35, 1]], [["Local Truth Lens", .16]]),
  "Ash Wyrm": loot([32, 48], [["Ancient Ember Scale", 1, 2], ["Ash Ward", .5, 1]], [["Wyrmheart Ember", .35]])
};

Object.assign(lootTables, {
  "Inkbound Auditor": loot([38, 56], [["Living Ash Ink", 1, 2]], [["Echo-Thread Lute", .45]]),
  "Dock Foreman": loot([70, 95], [["Foreman's Black Ledger", 1, 1]], [["Sealbreak Vestment", .55]]),
  "Orphaned Sigil": loot([42, 64], [["Unclaimed Sigil", 1, 2]], [["Sealbreak Vestment", .45]]),
  "Archive Custodian": loot([82, 110], [["Custodian Seal", 1, 1]], [["Faultline Signet", .6]]),
  "Redacted Witness": loot([48, 72], [["Redacted Testimony", 1, 1]], [["Local Truth Lens", .5]]),
  "First Ember Memory": loot([55, 80], [["Ancient Ember Scale", 1, 2]], [["Wyrmheart Ember", .62]]),
  "Dawn Null": loot([60, 88], [["Null Calibration Shard", 1, 2]], [["Local Truth Lens", .58]]),
  "Dawn Gate Sentinel": loot([110, 145], [["Sentinel Core", 1, 1]], [["Wyrmheart Ember", .7]]),
  "Kaeldrin": loot([180, 240], [["Stonewake Medal", 1, 1]], [["Stonewake Oathblade", 1]]),
  "Lyrsa": loot([170, 230], [["Loopglass Shard", 1, 2]], [["Echo Vow Chain", .7]]),
  "Nyx": loot([150, 210], [["Loopglass Shard", 1, 2]], [["Causality Visor", .65]]),
  "Rava": loot([165, 225], [["Orphan Ember Thread", 1, 2]], [["Orphanheart Coat", .7]]),
  "Jory": loot([190, 250], [["Orphan Ember Thread", 1, 2]], [["Second-Loop Signet", .75]]),
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
  sideQuest("nyxInk", "Ink That Remembers", "Nyx", "kill", { names: ["Ash Scribe"], amount: 3 }, { gold: 110, xp: 120, items: { "Clockwork Tonic": 2 } }, "Defeat three returning Ash Scribes and recover what their ink observed."),
  sideQuest("harlEscort", "A Name Walks Home", "Harl", "escort", { map: "lantern" }, { gold: 125, xp: 140, items: { "Ash Ward": 2 } }, "Escort Harl safely from the ledger house back to the Drunk Lantern."),
  sideQuest("ravaWave", "Nobody Crosses This Yard", "Rava", "wave", { waves: 3 }, { gold: 150, xp: 180, gear: "Rava's Guard Ring" }, "Hold the Reverie dormitory through three escalating clergy waves."),
  sideQuest("rareLore", "Names Outside the Ledger", "Nyx", "rare", { amount: 2 }, { gold: 240, xp: 260, gear: "Nyx's Margin Note" }, "Find and defeat two lore-marked rare spawns across Cindervale."),
  sideQuest("stonewakeTrial", "The Weight of the Old Rank", "Kaeldrin", "boss", { flag: "ngStonewakeWon", amount: 1 }, { gold: 900, xp: 900, gears: ["Stonewake Oathblade", "Second Verse Lute", "Worldroot Shield"] }, "In New Game Plus, defeat Kaeldrin and Lyrsa in Stonewake's full-rank trial.", { requiresNgPlus: true }),
  sideQuest("orphanTrial", "The Children Answer Back", "Jory", "boss", { flag: "ngOrphanTrialWon", amount: 1 }, { gold: 1000, xp: 1050, gears: ["Orphanheart Coat", "Veln Eclipse Blades", "Cinderstar Aegis", "Unbound Oathstaff"] }, "In New Game Plus, survive Nyx, Rava and Jory's Reverie counter-trial.", { requiresNgPlus: true })
];

function sideQuest(id, title, giver, type, target, reward, desc, options = {}) {
  return { id, title, giver, type, target, reward, desc, status: "unseen", progress: 0, ...options };
}

const maps = {
  lantern: map("The Drunk Lantern", "Issue 1", "lantern", [{ x: 14, y: 8, to: "ashLane", tx: 2, ty: 8 }], [
    point(4, 7, "Marla", [["Marla", "Soup first. Heroics after. Harl vanished near the old dock ledger room."], ["Verseborn", "A missing man, a tavern tab, and a song waiting to be wrong. Classic start."], ["Marla", "Find Harl. Start at the Ledger Docks, and bring him home."]], "acceptIssue1", undefined, "marla", "marlaCrate"),
    point(7, 7, "Harl", [["Harl", "I am staying close to the Lantern until my name stops moving without me."], ["Marla", "He carries mugs. I keep an eye on the door."]], undefined, "quest:harlEscort", undefined, "harlEscort"),
    point(8, 5, "Stage", [["Verseborn", "The first song is not a spell. It is a room agreeing to feel the same thing."]])
  ], ["A1 - Opening Tavern", "Home base, vendor, side quests and a safe return point."], { grid: [0, 2], gridSize: [5, 5] }),

  ashLane: map("Ash Quarter - Sootline Alley", "Issue 1", "ash", [{ x: 1, y: 8, to: "lantern", tx: 13, ty: 8 }, { x: 14, y: 8, to: "sootMarket", tx: 2, ty: 8 }, { x: 8, y: 5, to: "ledgerHouse", tx: 7, ty: 6 }], [
    chest(5, 7, "ash-songbound", { gear: "Songbound Rosin", gold: 24 })
  ], ["A2 - Sootline Alley", "A residential route with returning street threats."], { background: "ash-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 6, 14, 10]], grid: [1, 2], gridSize: [5, 5], spawns: [
    spawn("ash-ledger-1", 9, 8, "Soot Ledger Prowlers", [enemy("Ledger Cutter", 52, 8, "Sound", "#71513e", 2)], { respawn: 24 }),
    spawn("ash-rare-auditor", 12, 7, "Rare: Inkbound Auditor", [enemy("Inkbound Auditor", 94, 13, "Holy Fire", "#40304f", 2, "Ash Scribe")], { respawn: 105, rare: true, lore: "A clerk erased from every registry except its own ink." })
  ] }),

  sootMarket: map("Ash Quarter - Soot Market", "Issue 1", "ash", [{ x: 1, y: 8, to: "ashLane", tx: 13, ty: 8 }, { x: 14, y: 8, to: "ashDock", tx: 2, ty: 8 }], [
    chest(5, 7, "ash-cinderbite", { gear: "Cinderbite Edge", items: { "Marla's Soup": 1 } })
  ], ["A3 - Soot Market", "The main route branches into a searchable ledger house."], { background: "ash-route", panorama: true, view: 1, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [2, 2], gridSize: [5, 5], spawns: [
    spawn("market-chain-1", 11, 8, "Chain Runners", [enemy("Chain Warden", 64, 9, "Shadow", "#4a4542", 1)], { respawn: 30 })
  ] }),

  ashDock: map("Ash Quarter - Ledger Docks", "Issue 1", "ash", [{ x: 1, y: 8, to: "sootMarket", tx: 13, ty: 8 }, { x: 14, y: 8, to: "reverieCourt", tx: 3, ty: 10, needs: "issue1" }], [
    recruitPoint(7, 7, "Mira", [["Mira", "You came alone. Good. Quiet footsteps survive longer on these docks."], ["Verseborn", "I can do quiet. Briefly."], ["Mira", "The route is physical. The lie is administrative. Together, that makes a dungeon."], ["Mira", "Draw your lute. I will cover the blind side."]], "harbor"),
    chest(4, 8, "ash-echo", { gear: "Echo Collector", gold: 30 })
  ], ["A4 - Ledger Docks", "The first story battle sits beyond two explorable field units."], { background: "ash-route", panorama: true, view: 2, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [3, 2], gridSize: [5, 5], spawns: [
    spawn("dock-foreman", 11, 8, "Miniboss: Dock Foreman", [enemy("Dock Foreman", 126, 15, "Tech", "#403b39", 2, "Chain Warden")], { boss: true, lore: "The foreman kept moving names after the orders stopped." })
  ] }),

  ledgerHouse: map("Old Ledger House", "Issue 1", "ash", [{ x: 7, y: 5, to: "ashLane", tx: 8, ty: 6 }], [
    point(10, 5, "Harl", [["Harl", "They were not moving people under false names. They moved the names first."], ["Mira", "Reverie Orphanage. Fire Clergy seal."]], "issue1", "harborWon", undefined, "harlEscort"),
    chest(4, 7, "ash-nightneedle", { gear: "Nightneedle Harness", items: { "Clockwork Tonic": 1 } })
  ], ["A3b - Ledger House", "Optional interior, clue room and escort side quest."], { background: "ash", collision: "ash", grid: [2, 1], gridSize: [5, 5] }),

  reverieCourt: map("Reverie - Courtyard", "Issue 2", "reverie", [{ x: 3, y: 11, direction: "down", to: "ashDock", tx: 13, ty: 8 }, { x: 13, y: 5, direction: "up", to: "reverieDorm", tx: 7, ty: 6 }, { x: 10, y: 5, direction: "up", to: "reverieArchive", tx: 8, ty: 11, needs: "clergyWon" }], [
    recruitPoint(6, 7, "Seerin", [["Seerin", "You may inspect the building. You may not take a child."], ["Verseborn", "Then stand with me while we prove who tried."], ["Seerin", "My oath is to life. You are confusing that with authority."], ["Seerin", "I will hold the line. You make them listen."]], "clergy"),
    chest(4, 8, "reverie-hearthwall", { gear: "Hearthwall Crest", gold: 38 })
  ], ["B1 - Shelter Courtyard", "Protection comes before institutional permission."], { background: "reverie-route", panorama: true, view: 0, views: 3, walkable: [[1, 5, 14, 10]], grid: [3, 3], gridSize: [5, 5], spawns: [
    spawn("court-seal-1", 11, 9, "Clergy Seal Patrol", [enemy("Seal Bearer", 70, 10, "Shadow", "#9d5436", 1)], { respawn: 38 })
  ] }),

  reverieDorm: map("Reverie - Dormitory Wing", "Issue 2", "reverie", [{ x: 6, y: 5, direction: "up", to: "reverieCourt", tx: 13, ty: 5 }, { x: 14, y: 7, direction: "right", to: "reverieSeal", tx: 11, ty: 9 }], [
    point(8, 6, "Nyx", [["Nyx", "Adults pretend punctuation cannot hurt people."], ["Nyx", "The supply locker is less interesting than the archive. It is still useful."]], undefined, undefined, "shelter", "nyxInk"),
    point(10, 6, "Rava", [["Rava", "Three waves. No speeches. Keep them away from the little kids."]], "ravaWave"),
    point(13, 6, "Jory", [["Jory", "The first loop taught us where the Flameguard leaves openings."], ["Rava", "You wanted stronger opponents. Try not to complain when you get them."], ["Nyx", "I documented seventeen likely mistakes. We only need one."]], "ngOrphanTrial", "newGamePlus"),
    chest(9, 8, "reverie-silent", { gear: "Silent Reliquary", items: { "Ash Ward": 1 } })
  ], ["B2 - Dormitory Wing", "NPC side quests and a wave-defense encounter live off the main route."], { background: "reverie-route", panorama: true, view: 1, views: 3, walkable: [[1, 5, 14, 10]], grid: [4, 3], gridSize: [5, 5], spawns: [
    spawn("dorm-scribe-1", 12, 7, "Ash Scribe Remnant", [enemy("Ash Scribe", 58, 8, "Sound", "#6d5948", 2)], { respawn: 34 })
  ] }),

  reverieSeal: map("Reverie - Sealed Hall", "Issue 2", "reverie", [{ x: 11, y: 10, direction: "down", to: "reverieDorm", tx: 13, ty: 7 }, { x: 12, y: 4, direction: "up", to: "guildSteps", tx: 2, ty: 8, needs: "issue2" }], [
    chest(13, 8, "reverie-roadwarden", { gear: "Roadwarden Plate", gold: 42 })
  ], ["B3 - Sealed Hall", "A cold threshold and a rare lore encounter."], { background: "reverie-route", panorama: true, view: 2, views: 3, walkable: [[1, 5, 14, 10]], grid: [4, 4], gridSize: [5, 5], spawns: [
    spawn("reverie-rare-sigil", 12, 6, "Rare: Orphaned Sigil", [enemy("Orphaned Sigil", 108, 14, "Tech", "#b9a274", 2, "Seal Bearer")], { respawn: 120, rare: true, lore: "A protection rite that outlived the priest who abandoned it." })
  ] }),

  reverieArchive: map("Reverie - Clergy Archive", "Issue 2", "reverie", [{ x: 8, y: 12, direction: "down", to: "reverieCourt", tx: 10, ty: 5 }], [
    recruitPoint(7, 7, "Kael", [["Kael", "I will keep the seal. Not as obedience. As evidence."], ["Verseborn", "Evidence travels better with witnesses."], ["Kael", "Then I will walk with the Flameguard. Quietly."]], "issue2", "clergyWon"),
    chest(5, 7, "reverie-echo", { gear: "Echo Collector", items: { "Clockwork Tonic": 1 } })
  ], ["B2b - Clergy Archive", "A short moral dungeon interior with a permanent custodian miniboss."], { background: "reverie", collision: "reverie", grid: [3, 4], gridSize: [5, 5], spawns: [
    spawn("archive-custodian", 8, 6, "Miniboss: Archive Custodian", [enemy("Archive Custodian", 142, 16, "Earth", "#6d5948", 2, "Ash Scribe")], { boss: true, lore: "It files people under the rules they broke." })
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
    spawn("guild-rare-witness", 12, 8, "Rare: Redacted Witness", [enemy("Redacted Witness", 118, 15, "Ancient Fire", "#4d4167", 2, "Wrong Bell")], { respawn: 135, rare: true, lore: "A testimony removed from the record but not from the hall." })
  ] }),

  guildCouncil: map("Guildspire - Council Chamber", "Issue 3", "guildspire", [{ x: 8, y: 12, to: "guildRegistry", tx: 8, ty: 10 }], [
    recruitPoint(11, 8, "Torren", [["Torren", "I am not here to earn an old place back. I am here to build a new one."], ["Verseborn", "Ember Hall has an empty chair and several structurally questionable walls."], ["Torren", "Then both can be fixed. I am coming."]], "torren", "registered"),
    point(7, 7, "Kaeldrin", [["Kaeldrin", "A second journey deserves a full-rank test."], ["Lyrsa", "Stonewake will not repeat the restraint of the first evaluation."], ["Verseborn", "Good. We did not bring repeat answers."]], "ngStonewakeTrial", "newGamePlus"),
    chest(5, 8, "guild-emberwell", { gear: "Emberwell Chain", items: { "Marla's Soup": 2 } })
  ], ["C2b - Council Chamber", "A branch room for Torren's return and later contracts."], { background: "guildspire", collision: "guildspire", grid: [1, 2], gridSize: [3, 3] }),

  emberYard: map("Ember Hall - Training Yard", "Issue 3", "ember", [{ x: 4, y: 12, direction: "down", to: "guildHall", tx: 13, ty: 8 }, { x: 8, y: 6, direction: "right", to: "emberHearth", tx: 9, ty: 6 }], [
    chest(2, 9, "ember-lens", { gear: "Impossible Lens", gold: 60 })
  ], ["D1 - Training Yard", "A broad home-base field with repeatable training constructs."], { background: "ember-route", panorama: true, view: 0, views: 5, music: "overworld", walkable: [[1, 3, 14, 11]], grid: [0, 2], gridSize: [5, 5], spawns: [
    spawn("yard-construct", 4, 5, "Training Construct", [enemy("Buried Construct", 78, 11, "Earth", "#6f5540", 1)], { respawn: 22 })
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
    spawn("roof-rare-memory", 11, 7, "Rare: First Ember Memory", [enemy("First Ember Memory", 124, 16, "Sigil", "#5a2f52", 3, "Ash Wyrm")], { respawn: 145, rare: true, lore: "A dragon memory that recognizes Sparky before anyone else does." })
  ] }),

  emberCellar: map("Ember Hall - Resonance Cellar", "Issue 3", "ember", [{ x: 8, y: 12, to: "emberHearth", tx: 11, ty: 10 }], [
    point(6, 7, "Torren", [["Torren", "Tell me what has to stay still."], ["Verseborn", "Us, preferably."]], "ember")
  ], ["D2b - Resonance Cellar", "A permanent story encounter beneath the branching home base."], { background: "ember", collision: "ember", grid: [1, 3], gridSize: [5, 5] }),

  dawnCauseway: map("False Dawn - Storm Causeway", "Issue 4", "alarm", [{ x: 1, y: 8, to: "emberRoof", tx: 13, ty: 6 }, { x: 14, y: 8, to: "dawnStation", tx: 2, ty: 8 }], [
    chest(4, 8, "dawn-songbound", { gear: "Songbound Rosin", gold: 72 })
  ], ["E1 - Storm Causeway", "A consistent high-altitude tech dungeon begins."], { background: "dawn-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [0, 1], gridSize: [3, 3], spawns: [
    spawn("dawn-bell-1", 9, 8, "Wrong Bell Patrol", [enemy("Wrong Bell", 78, 11, "Tech", "#a66a35", 2)], { respawn: 42 })
  ] }),

  dawnStation: map("False Dawn - Calibration Station", "Issue 4", "alarm", [{ x: 1, y: 8, direction: "left", to: "dawnCauseway", tx: 13, ty: 8 }, { x: 9, y: 4, direction: "up", to: "dawnGate", tx: 2, ty: 8 }], [
    point(4, 7, "Harl", [["Harl", "The central system marked these supplies obsolete. Locally, they still work."], ["Verseborn", "That is becoming a theme."]], undefined, undefined, "dawn"),
    chest(5, 7, "dawn-nightneedle", { gear: "Nightneedle Harness", items: { "Clockwork Tonic": 2 } })
  ], ["E2 - Calibration Station", "Side platforms hold regular and rare system remnants."], { background: "dawn-route", panorama: true, view: 1, views: 3, walkable: [[1, 5, 14, 10]], grid: [1, 1], gridSize: [3, 3], spawns: [
    spawn("station-lock-1", 8, 8, "Calibration Husk", [enemy("Gate Lock", 76, 10, "Earth", "#58616b", 1)], { respawn: 45 }),
    spawn("dawn-rare-null", 12, 7, "Rare: Dawn Null", [enemy("Dawn Null", 132, 17, "Sound", "#26353e", 2, "Wrong Bell")], { respawn: 160, rare: true, lore: "A local truth the central alarm failed to overwrite." })
  ] }),

  dawnGate: map("False Dawn - Exterior Gate", "Issue 4", "alarm", [{ x: 1, y: 8, to: "dawnStation", tx: 9, ty: 5 }, { x: 14, y: 8, to: "alarm", tx: 2, ty: 6, needs: "spawn:gate-sentinel" }], [
    chest(5, 8, "dawn-emberwell", { gear: "Emberwell Chain", items: { "Ash Ward": 2 } })
  ], ["E3 - Exterior Gate", "The gate sentinel is a miniboss and never respawns."], { background: "dawn-route", panorama: true, view: 2, views: 3, walkable: [[1, 5, 14, 10]], grid: [2, 1], gridSize: [3, 3], spawns: [
    spawn("gate-sentinel", 10, 8, "Miniboss: Dawn Gate Sentinel", [enemy("Dawn Gate Sentinel", 168, 18, "Ancient Fire", "#58616b", 1, "Gate Lock")], { boss: true, lore: "The last lock between command and observation." })
  ] }),

  alarm: map("False Dawn - Alarm Core", "Issue 4", "alarm", [{ x: 1, y: 6, direction: "left", to: "dawnGate", tx: 13, ty: 8 }], [
    recruitPoint(5, 7, "Glimmer", [["Glimmer", "The alarm is not broken. It is obeying the wrong truth."], ["Verseborn", "Then we give it a better verse."], ["Glimmer", "Everything stays still except me."], ["Glimmer", "That was an invitation. Keep up."]], "dawn"),
    point(11, 5, "Glimmer", [["Kaeldrin", "Your rank still stands."], ["Glimmer", "I know. You came back when you needed the machine. They came when they needed me."], ["Glimmer", "Also, the parts bench is open. Do not lick anything glowing."]], "ending", "dawnWon", "workshop"),
    chest(12, 8, "dawn-fleetglass", { gear: "Fleetglass Circlet", gold: 90 }, "dawnWon")
  ], ["E4 - Alarm Core", "Story boss and ending; its bosses never join the respawn pool."], { background: "alarm", collision: "alarm", grid: [2, 2], gridSize: [3, 3] })
};

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
  return Object.values(gearDb).flat().find(g => g.name === name);
}

function addOwnedGear(name, amount = 1, options = {}) {
  if (!name || amount < 1) return;
  if (!state.ownedGear.includes(name)) state.ownedGear.push(name);
  state.gearCopies[name] = (state.gearCopies[name] || 0) + amount;
  ensureGearMetadata(name, options);
}

function equippedGearUsers(name) {
  if (!name) return [];
  return state.party.filter(id => Object.values(baseJobs[id].gear).includes(name));
}

function gearCopyCount(name) {
  return state.gearCopies[name] || (state.ownedGear.includes(name) ? 1 : 0);
}

function canEquip(id, gear) {
  const owners = gearOwners[gear?.name];
  return !owners || owners.includes(id);
}

function effectValue(id, type, match = null) {
  const fixed = Object.values(baseJobs[id].gear).reduce((total, name) => {
    const effects = gearEffects(gearByName(name));
    return total + effects
      .filter(effect => effect.type === type && (match === null || effect.status === match || effect.stat === match))
      .reduce((sum, effect) => sum + (effect.value || 0), 0);
  }, 0);
  return fixed + affixValue(id, type, match);
}

function progressFor(id) {
  if (!state.heroProgress[id]) state.heroProgress[id] = { level: 1, xp: 0, talents: [], pendingMilestones: [] };
  const progress = state.heroProgress[id];
  if (!Array.isArray(progress.talents)) progress.talents = [];
  if (!Array.isArray(progress.pendingMilestones)) progress.pendingMilestones = [];
  SKILL_MILESTONE_LEVELS.filter(level => level <= progress.level).forEach(level => {
    const choiceMade = (talentTrees[id] || []).some(entry => entry.level === level && progress.talents.includes(entry.name));
    if (!choiceMade && !progress.pendingMilestones.includes(level)) progress.pendingMilestones.push(level);
  });
  progress.pendingMilestones.sort((a, b) => a - b);
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
  const progress = progressFor(id);
  progress.pendingMilestones = progress.pendingMilestones.filter(milestone => milestone !== level);
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
  return status ? (status.value ?? STATUS_DEFS[type]?.value ?? 0) : 0;
}

function hasNegativeStatus(unit) {
  return ensureStatuses(unit).some(status => STATUS_DEFS[status.type]?.negative && status.type !== "overheated");
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
  if (source.form === "mech") return stat === "str" ? 1 + config.attack : 1 + config.tech;
  if (source.form === "shadowpriest" && stat === "mag") return 1 + config.magic;
  return 1;
}

function sourceRelevantStat(source, options = {}) {
  const magicBased = ["magic", "ultimate"].includes(options.damageKind) || ["Tech", "Shadow", "Sigil"].includes(options.element);
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

function statusDurationFor(source, type, requested) {
  const base = requested || STATUS_DEFS[type]?.duration || 1;
  const negative = STATUS_DEFS[type]?.negative;
  const talentBonus = negative && source?.id ? typedTalentValue(source.id, "statusDuration", type) : 0;
  const gearBonus = negative && source?.id ? effectValue(source.id, "statusDuration") : 0;
  if (type === "sleep") return Math.min(5, base);
  if (type === "stun") return 1;
  return Math.max(1, base + talentBonus + gearBonus);
}

function applyStatus(target, type, source, options = {}) {
  const def = STATUS_DEFS[type];
  if (!target || !def || target.hp <= 0) return { applied: false, message: "" };
  if (def.negative && !options.force && Math.random() >= statusApplicationChance(target, type, options.chance ?? 1, source)) {
    return { applied: false, message: `${def.label} RESISTED` };
  }
  let duration = statusDurationFor(source, type, options.duration);
  if (def.negative && target.id) duration = Math.max(1, duration - effectValue(target.id, "statusDurationReduction"));
  const existing = statusOf(target, type);
  const poisonDurations = { weak: 3, normal: 4, strong: 5 };
  if (type === "poison" && !options.duration) duration = statusDurationFor(source, type, poisonDurations[options.potency || "normal"]);
  const value = type === "poison" ? poisonValueFor(target, source, options) : options.value ?? def.value;
  const coefficient = type === "poison" ? options.coefficient ?? ({ weak: .2, normal: .3, strong: .4 }[options.potency || "normal"]) : null;
  const data = {
    type,
    source: { id: source?.id || null, name: source?.name || source?.id || "Unknown" },
    remaining: duration,
    value: existing && type === "poison" ? Math.max(existing.value || 0, value) : value,
    coefficient: existing && type === "poison" ? Math.max(existing.coefficient || 0, coefficient) : coefficient,
    appliedRound: battle?.round || 0,
    appliedTurn: combatantKey(source)
  };
  if (existing) {
    if (type === "poison") data.remaining = Math.max(existing.remaining || 0, duration);
    Object.assign(existing, data);
  }
  else ensureStatuses(target).push(data);
  return { applied: true, message: def.label };
}

function cleanseStatuses(target) {
  const before = ensureStatuses(target).length;
  target.statuses = target.statuses.filter(status => !STATUS_DEFS[status.type]?.negative);
  return before - target.statuses.length;
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
    multiplier *= 1 + effectValue(unit.id, kind === "melee" ? "physicalDamage" : "magicDamage");
    if (target && hasNegativeStatus(target)) multiplier *= 1 + typedTalentValue(unit.id, "afflictedDamage") + effectValue(unit.id, "afflictedDamage");
  }
  return multiplier;
}

function incomingDamageMultiplier(unit) {
  let multiplier = Math.max(.25, 1 - statusValue(unit, "defenseUp"));
  if (unit?.form === "mech") multiplier *= 1 - TRANSFORMATION_CONFIG.mech.defense;
  multiplier *= 1 - statusValue(unit, "mechGuard");
  return Math.max(.15, multiplier);
}

function effectiveAgility(unit, base) {
  const buff = 1 + statusValue(unit, "agilityUp");
  const opening = battle?.round === 1 && unit?.id ? 1 + effectValue(unit.id, "openingTurnProgress") : 1;
  return Math.round(base * buff * opening);
}

function applySkillStatuses(source, target, sk) {
  const applications = [];
  if (sk.status) applications.push(applyStatus(target, sk.status.type, source, { ...sk.status, damageKind: sk.anim, element: sk.element }));
  if (source?.id && (sk.power > 0 || sk.coefficient)) {
    ["poison", "sleep", "stun"].forEach(type => {
      const chance = effectValue(source.id, "statusOnHit", type);
      if (chance > 0) applications.push(applyStatus(target, type, source, { chance, potency: type === "poison" ? "weak" : undefined, duration: type === "poison" ? 3 : undefined, damageKind: sk.anim, element: sk.element }));
    });
  }
  return applications.map(result => result.message).filter(Boolean);
}

function applySkillBuffs(source, targets, sk) {
  const notes = [];
  (sk.buffs || []).forEach(buff => {
    targets.forEach(target => {
      const duration = (buff.duration || STATUS_DEFS[buff.type]?.duration || 3) + (source?.id ? typedTalentValue(source.id, "buffDuration") + effectValue(source.id, "buffDuration") : 0);
      const result = applyStatus(target, buff.type, source, { duration, chance: 1, value: buff.value });
      if (result.message) notes.push(`${target.name}: ${result.message}`);
    });
  });
  return notes;
}

function statusBadgesHtml(unit) {
  const entries = ensureStatuses(unit);
  if (!entries.length) return "";
  return `<div class="status-chips">${entries.slice(0, 6).map(status => {
    const def = STATUS_DEFS[status.type];
    return `<span class="${def?.negative ? "is-negative" : "is-buff"}" title="${def?.label || status.type}: ${status.remaining} turn(s)">${def?.short || status.type.toUpperCase()} ${status.remaining}</span>`;
  }).join("")}</div>`;
}

function processTurnStart(unit) {
  const notes = [];
  const poison = statusOf(unit, "poison");
  if (poison && unit.hp > 0) {
    let amount = poison.value || 1;
    if (unit.id) amount = Math.max(1, Math.round(amount * (1 - affixValue(unit.id, "poisonReduction"))));
    unit.hp = Math.max(0, unit.hp - amount);
    addBattleFloater(unit, amount, { damageType: "Poison" });
    notes.push(`POISON -${amount} HP`);
  }
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
  ensureStatuses(unit).forEach(status => {
    if (status.appliedRound === battle?.round && status.appliedTurn === combatantKey(unit)) return;
    status.remaining--;
  });
  const expired = unit.statuses.filter(status => status.remaining <= 0);
  unit.statuses = unit.statuses.filter(status => status.remaining > 0);
  expired.forEach(status => notes.push(`${STATUS_DEFS[status.type]?.label || status.type} faded.`));
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

function battleSkills(id, unit = null) {
  const combatUnit = unit || battle?.party?.find(member => member.id === id);
  if (combatUnit?.form && TRANSFORMED_SKILLS[combatUnit.form]) return TRANSFORMED_SKILLS[combatUnit.form];
  const extra = activeTalents(id)
    .filter(entry => entry.type === "newSkill")
    .map(entry => ({
      ...entry.value,
      talentSkill: true,
      ultimateIndex: entry.value.ultimateIndex ?? (entry.value.anim === "ultimate" ? 2 : undefined),
      allEnemies: entry.value.allEnemies ?? (entry.level <= 20 && entry.value.anim === "ultimate" && entry.value.power > 0)
    }));
  return [...baseJobs[id].skills.map(entry => entry.anim === "ultimate" ? { ...entry, ultimateIndex: 1 } : entry), ...extra];
}

function battleAnimationName(sk) {
  if (sk.anim !== "ultimate") return sk.anim;
  return sk.ultimateIndex === 2 || sk.transform ? "ultimate2" : "ultimate1";
}

function activateTransformation(unit, form) {
  const config = TRANSFORMATION_CONFIG[form];
  if (!unit || !config) return false;
  unit.form = form;
  unit.formTurns = config.duration;
  unit.anim = "idle";
  unit.formAppliedRound = battle?.round || 0;
  unit.formAppliedTurn = combatantKey(unit);
  return true;
}

function skillHitsAll(id, sk) {
  return Boolean(sk.allEnemies || talentValue(id, "aoeSkill", sk.name));
}

function skillTargetsEnemies(sk) {
  return sk.targetSide !== "party" && sk.targetSide !== "self" && sk.power >= 0 && sk.anim !== "block";
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
  const levelUps = [];
  state.party.forEach(id => {
    const share = state.activeParty.includes(id) ? amount : Math.max(1, Math.round(amount * reserveRate));
    const levels = awardHeroXp(id, share);
    if (levels.length) levelUps.push(`${id} Lv ${levels.at(-1)}`);
  });
  updateSkillPointNotice();
  if (levelUps.length) showHudNotice(`LEVEL UP - ${levelUps.join(" / ")}`);
  return `${amount} XP${reason ? ` (${reason})` : ""}${levelUps.length ? ` / LEVEL UP: ${levelUps.join(", ")}` : ""}`;
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
  ["str", "agi", "mag", "stam"].forEach(stat => {
    out[stat] = Math.round(out[stat] * (1 + affixValue(id, "statPct", stat)));
  });
  const max = 30 + out.stam * 4;
  const mp = 12 + out.mag * 3;
  return { ...out, max: Math.round(max * (1 + affixValue(id, "hpPct"))), mp };
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
    "Ledger Cutter": 0, "Chain Warden": 1, "Seal Bearer": 2,
    "Ash Scribe": 3, "Buried Construct": 4, "Cracked Pillar": 5,
    "Wrong Bell": 6, "Gate Lock": 7, "Ash Wyrm": 8
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
  if (animatedSheet) {
    const row = moving ? 1 : 0;
    const cells = animatedSheet.rows[row];
    const frame = moving ? Math.floor(tick / 6) % cells.length : Math.floor((tick + spawnPoint.phase) / 14) % cells.length;
    const cell = cells[frame];
    const targetHeight = Math.max(25, Math.round((enemyAnimationHeights[key] || 44) * .68));
    const scale = targetHeight / Math.max(1, animatedSheet.referenceHeight);
    const width = Math.max(1, Math.round(cell.w * scale));
    const height = Math.max(1, Math.round(cell.h * scale));
    drawFieldShadow(anchorX, baseline, key === "Ash Wyrm" ? 12 : spawnPoint.boss ? 10 : 8);
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
    const centerX = exit.x * TILE + 8;
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
  const defaultColumn = animation === "idle"
    ? [0, 1, 2, 3, 2, 1][Math.floor((frame + (unit.id?.length || 0) * 3) / BATTLE_IDLE_FRAME_TICKS) % 6]
    : animation === "death"
      ? sheet.columns - 1
      : Math.min(sheet.columns - 1, 1 + Math.floor(progress * (sheet.columns - 1)));
  const sequence = battleFrameSequences[visualId]?.[animation];
  const col = sequence ? sequence[Math.min(sequence.length - 1, defaultColumn)] : defaultColumn;
  const targetHeight = battleSpriteHeights[visualId] || 54;
  const scale = targetHeight / Math.max(1, sheet.referenceHeight || sheet.cellHeight);
  const sourceX = col * sheet.cellWidth;
  const sourceY = row * sheet.cellHeight;
  const width = Math.round(sheet.cellWidth * scale);
  const height = Math.round(sheet.cellHeight * scale);
  const idleAnchorOffset = animation === "idle" ? Number(sheet.idleAnchorOffsets?.[col] || 0) : 0;
  const destX = Math.round(anchorX - width / 2 - idleAnchorOffset * scale);
  const destY = Math.round(baseline - sheet.baseline * scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.image, sourceX, sourceY, sheet.cellWidth, sheet.cellHeight, destX, destY, width, height);
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
    drawRect(px - 2, baseline - 5, 20, 5, "#4b2f26");
    drawRect(px, baseline - 7, 16, 3, "#835739");
    drawRect(px + 2, baseline - 8, 12, 1, "#c28a50");
    drawText("♪", px + 8, baseline - 12 + (Math.floor(frame / 12) % 2), "#ffd27d", 9, "center");
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

function drawTitle() {
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
  ctx.drawImage(titleImage, layout.x, layout.y, layout.width, layout.height);
  drawTitleTwinkles(layout);
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
  const sx = value => Math.round(layout.x + value * layout.scale);
  const sy = value => Math.round(layout.y + value * layout.scale);
  const panelX = sx(570);
  const panelY = sy(438);
  const panelWidth = Math.round(310 * layout.scale);
  const panelHeight = Math.round(151 * layout.scale);
  ctx.fillStyle = "rgba(5, 11, 39, 0.97)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "#9c6fd2";
  ctx.lineWidth = Math.max(1, Math.round(2 * layout.scale));
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  const fontSize = Math.max(14, Math.round(30 * layout.scale));
  ctx.font = `bold ${fontSize}px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  titleMenuEntries.forEach((entry, index) => {
    const top = sy(443 + index * 49);
    const height = Math.round(43 * layout.scale);
    if (index === titleMenuIndex) {
      ctx.fillStyle = "rgba(77, 35, 126, 0.78)";
      ctx.fillRect(sx(576), top, Math.round(296 * layout.scale), height);
    }
    const unavailableContinue = index === 1 && !savedGameExists();
    ctx.fillStyle = unavailableContinue ? "#746d77" : index === titleMenuIndex ? "#fff0bd" : "#f0e4c6";
    ctx.fillText(entry, sx(732), sy(465 + index * 49));
  });

  const arrowBob = Math.round(Math.sin(tick / 18) * 2);
  ctx.fillStyle = "#ffd46f";
  ctx.textAlign = "center";
  ctx.fillText(">", sx(612) + arrowBob, sy(465 + titleMenuIndex * 49));
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function moveTitleSelection(direction) {
  if (!runtimeAssetsReady) return;
  titleMenuIndex = (titleMenuIndex + direction + titleMenuEntries.length) % titleMenuEntries.length;
  playSfx("menu");
}

function startTitleGame(continueGame = false) {
  if (!runtimeAssetsReady) return;
  const loaded = continueGame && loadGame();
  if (!continueGame) {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
  }
  mode = "walk";
  updateMusic();
  updatePanels();
  updateSkillPointNotice();
  if (loaded) showHudNotice("CONTINUE - saved journey restored");
  else showTalk([["Narrator", "Issue 1: The Man With the Enormous Voice"], ["Verseborn", "A warm room, a quiet stage, and Marla looking like she has work for me."]]);
}

function activateTitleSelection() {
  if (!runtimeAssetsReady) return;
  if (titleMenuIndex === 2) {
    toggleMusic();
    playSfx("menu");
    return;
  }
  startTitleGame(titleMenuIndex === 1);
}

function titleMenuPointerIndex(event) {
  if (!titleImage) return null;
  const rect = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * canvas.width / rect.width;
  const canvasY = (event.clientY - rect.top) * canvas.height / rect.height;
  const layout = titleImageLayout();
  const sourceX = (canvasX - layout.x) / layout.scale;
  const sourceY = (canvasY - layout.y) / layout.scale;
  if (sourceX < 570 || sourceX > 880 || sourceY < 438 || sourceY > 589) return null;
  return Math.max(0, Math.min(2, Math.floor((sourceY - 438) / 49)));
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
  const map = currentMap();
  const p = palettes[map.set];
  const offsetY = fieldRenderOffsetY();
  const background = mapImages[map.background || map.set];
  if (background) drawMapBackground(map, background);
  else drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, p[2]);
  drawAmbient(map.set, map.panorama);
  drawQaNavigationOverlay();
  drawExitMarkers();
  updateRenderPosition();
  const spawns = visibleSpawns();
  spawns.forEach(updateWorldEnemyRender);
  const entities = [
    ...spawns.map(spawnPoint => ({ depth: spawnPoint.renderY + 25, draw: () => drawWorldEnemy(spawnPoint) })),
    ...visiblePoints().map(point => ({
      depth: point.y * TILE + (point.chest ? 18 : 25),
      draw: () => {
        if (point.chest) return drawChest(point);
        drawVendorGrounding(point, point.x * TILE + 8, point.y * TILE + 25 + offsetY);
        if (point.id !== "Stage") drawFieldShadow(point.x * TILE + 8, point.y * TILE + 25 + offsetY, point.id === "Kaeldrin" ? 9 : point.id === "Workshop Bench" ? 12 : 7);
        drawSprite(point.id, point.x * TILE, point.y * TILE - 7 + offsetY, 0, "idle");
      }
    })),
    ...(state.escort ? [{
      depth: state.renderY + 24,
      draw: () => {
        drawFieldShadow(state.renderX + 3, state.renderY + 28 + offsetY, 7);
        drawSprite(state.escort, state.renderX - 13, state.renderY - 3 + offsetY, state.facing, tick < state.walkUntil ? "walk" : "idle");
      }
    }] : []),
    {
      depth: state.renderY + 25,
      player: true,
      draw: () => {
        drawFieldShadow(state.renderX + 8, state.renderY + 25 + offsetY, spriteScale[state.activeParty[0]]?.field[0] > 30 ? 10 : 7);
        drawSprite(state.activeParty[0], state.renderX, state.renderY - 7 + offsetY, state.facing, tick < state.walkUntil ? "walk" : "idle");
      }
    }
  ];
  entities.sort((a, b) => a.depth - b.depth || Number(Boolean(a.player)) - Number(Boolean(b.player))).forEach(entity => entity.draw());
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
  const width = Math.min(image.width, Math.round(image.height * LOGICAL_WIDTH / LOGICAL_HEIGHT));
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
    const sx = Math.round(source.x + x / LOGICAL_WIDTH * source.width);
    const sy = Math.round(source.y + y / LOGICAL_HEIGHT * source.height);
    const sw = Math.max(1, Math.round(width / LOGICAL_WIDTH * source.width));
    const sh = Math.max(1, Math.round(height / LOGICAL_HEIGHT * source.height));
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  });
  ctx.restore();
}

function drawQaNavigationOverlay() {
  if (new URLSearchParams(location.search).get("qaGrid") !== "1") return;
  const offsetY = fieldRenderOffsetY();
  ctx.save();
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
  2: [[62, 108], [82, 140]],
  3: [[52, 104], [84, 132], [52, 160]]
};
const BATTLE_ARENA_HEIGHT = 188;

function partyBattlePosition(index, count = battle?.party?.length || 1) {
  return (battlePartyLayouts[Math.min(3, count)] || battlePartyLayouts[3])[index] || [55, 122];
}

function enemyBattlePosition(index, count = battle?.enemies?.length || 1) {
  const positions = count === 1
    ? [[198, 105]]
    : count === 2
      ? [[181, 79], [214, 126]]
      : [[178, 61], [215, 101], [181, 141]];
  return positions[index] || [190, 105];
}

function selectedBattleEnemy() {
  if (!battle?.targetMode) return null;
  return battle.enemies.filter(enemyUnit => enemyUnit.hp > 0)[battleActionIndex] || null;
}

function battleFloaterPosition(target) {
  const partyIndex = battle?.party?.indexOf(target) ?? -1;
  if (partyIndex >= 0) {
    const [x, baseline] = partyBattlePosition(partyIndex, battle.party.length);
    return [x, baseline - 55];
  }
  const enemyIndex = battle?.enemies?.indexOf(target) ?? -1;
  if (enemyIndex >= 0) {
    const [x, baseline] = enemyBattlePosition(enemyIndex, battle.enemies.length);
    const key = enemyAnimationKey(target);
    return [x, baseline - Math.max(38, (enemyAnimationHeights[key] || 44) + 8)];
  }
  return [LOGICAL_WIDTH / 2, 80];
}

function addBattleFloater(target, amount, options = {}) {
  if (!battle || !amount) return;
  const [x, y] = battleFloaterPosition(target);
  battleFloaters.push({
    x,
    y,
    amount: Math.abs(Math.round(amount)),
    kind: options.kind || "damage",
    damageType: options.damageType || (options.kind === "heal" ? "HEAL" : "PHYSICAL"),
    crit: Boolean(options.crit),
    born: tick + (options.delayTicks || 0)
  });
}

function drawBattleFloaters() {
  battleFloaters = battleFloaters.filter(floater => tick - floater.born < 48);
  battleFloaters.forEach(floater => {
    const age = tick - floater.born;
    if (age < 0) return;
    const rise = Math.round(age * .28);
    const alpha = Math.min(1, (48 - age) / 12);
    const healing = floater.kind === "heal";
    const main = `${healing ? "+" : ""}${floater.amount}`;
    const mainSize = floater.crit ? 13 : 10;
    const mainY = floater.y - rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.font = `bold ${mainSize}px "Comic Sans MS", "Comic Sans", cursive`;
    ctx.lineWidth = floater.crit ? 3 : 2;
    ctx.strokeStyle = "#160d13";
    ctx.fillStyle = healing ? "#65e88a" : "#ff5b55";
    ctx.strokeText(main, floater.x, mainY);
    ctx.fillText(main, floater.x, mainY);
    ctx.font = `bold ${floater.crit ? 7 : 6}px "Comic Sans MS", "Comic Sans", cursive`;
    ctx.lineWidth = 2;
    const label = `${floater.crit ? "CRIT! " : ""}${healing ? "HEAL" : floater.damageType.toUpperCase()}`;
    ctx.strokeText(label, floater.x, mainY + 7);
    ctx.fillText(label, floater.x, mainY + 7);
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
  drawBattleVitalBar(anchorX, baseline + 4, unit.hp, unit.max, "HP", enemySide ? "#c85645" : "#e8a64b", enemySide ? 46 : 42);
  if (enemySide) {
    drawBattleVitalBar(anchorX, baseline + 11, unit.resonance || 0, 100, "R", "#8a5ac4", 46);
  } else if (Number.isFinite(unit.maxmp)) {
    drawBattleVitalBar(anchorX, baseline + 11, unit.mp, unit.maxmp, "MP", "#7d62b8", 42);
  }
  drawBattleStatusBadges(unit, anchorX, baseline + 19);
}

function drawBattleStatusBadges(unit, anchorX, y) {
  const statuses = ensureStatuses(unit);
  if (!statuses.length) return;
  const visible = statuses.slice(0, 3);
  const chipWidth = 17;
  const gap = 1;
  const total = visible.length * chipWidth + (visible.length - 1) * gap;
  visible.forEach((status, index) => {
    const def = STATUS_DEFS[status.type];
    const x = Math.round(anchorX - total / 2 + index * (chipWidth + gap));
    drawRect(x, y, chipWidth, 7, def?.negative ? "#7f2f39" : "#345c66");
    drawRect(x + 1, y + 1, chipWidth - 2, 5, def?.negative ? "#30151e" : "#142d34");
    drawText(`${def?.short || "FX"}${status.remaining}`, x + Math.floor(chipWidth / 2), y + 5, def?.negative ? "#ffb1ae" : "#bcecf1", 4, "center");
  });
}

function drawBattleTurnRail() {
  if (!battle?.turnQueue) return;
  const turns = battle.turnQueue.slice(battle.turnIndex).filter(turnIsAlive);
  drawRect(3, 3, LOGICAL_WIDTH - 6, 17, "#090a11dd");
  drawRect(4, 4, LOGICAL_WIDTH - 8, 1, "#8b6a45");
  drawText(`R${battle.round}/${MAX_BATTLE_ROUNDS}`, 8, 15, "#f0c97a", 6);
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

function drawBattleScene() {
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
    const hasTurn = turn?.side === "party" && turn.id === unit.id;
    if (hasTurn) drawBattleGroundMarker(anchorX, baseline, "turn");
    drawFieldShadow(anchorX, baseline + 1, unit.id === "Torren" ? 14 : 10);
    const drawUnit = () => {
      const x = anchorX + battleOffset(unit);
      if (!drawBattlePartySprite(unit, x, baseline, tick)) drawSprite(unit.id, x - 24, baseline - 52, 0, unit.anim || "idle", tick);
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
    if (enemyUnit.hp <= 0 && tick >= enemyUnit.defeatUntil) return;
    const [anchorX, baseline] = enemyBattlePosition(index, battle.enemies.length);
    if (enemyUnit.hp <= 0 && !animatedDeath) ctx.globalAlpha = Math.max(0, (enemyUnit.defeatUntil - tick) / 12);
    const hasTurn = turn?.side === "enemy" && turn.index === index;
    if (hasTurn) drawBattleGroundMarker(anchorX, baseline, "turn");
    if (target === enemyUnit) drawBattleGroundMarker(anchorX, baseline, "target");
    drawFieldShadow(anchorX, baseline + 1, enemySpriteIndex(enemyUnit.sprite || enemyUnit.name) >= 6 ? 15 : 11);
    const drawUnit = () => drawEnemy(enemyUnit, anchorX - 8 + battleOffset(enemyUnit), baseline - 31);
    if (hasTurn) drawWithTurnOutline(drawUnit, "#ffc08a");
    else drawUnit();
    drawBattleVitals(enemyUnit, anchorX, baseline, true);
    ctx.globalAlpha = 1;
  });
  drawEffect();
  drawBattleFloaters();
  drawBattleTurnRail();
}

function battleArenaFor(map) {
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
    "reverie": [[205, 47, "#c382f2"], [51, 63, "#704fc3"]],
    "guildspire": [[33, 45, "#f4cf73"]],
    "ember-hall": [[202, 48, "#ef8b38"], [46, 56, "#f0b34e"]],
    "false-dawn": [[213, 45, "#d9a04d"], [122, 67, "#7cd0d8"]]
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
  const targetHeight = Math.round((animatedNpcHeights[id] || 26) * 1.9);
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
  if (enemyAnimationFiles[e.name]) return e.name;
  if (enemyAnimationFiles[e.sprite]) return e.sprite;
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
  const row = dying ? 4 : attacking ? (e.attackStyle === "magic" || magicEnemyAnimations.has(key) ? 3 : 2) : 0;
  const cells = sheet.rows[row];
  let frame = Math.floor((tick + key.length * 3) / 12) % cells.length;
  if (attacking) frame = Math.min(cells.length - 1, Math.floor(Math.min(24, e.animTick || 0) / 5));
  if (dying) frame = Math.min(cells.length - 1, Math.floor(Math.max(0, tick - (e.deathTick || tick)) / 5));
  const cell = cells[frame];
  const targetHeight = enemyAnimationHeights[key] || 46;
  const scale = targetHeight / Math.max(1, sheet.referenceHeight);
  const width = Math.max(1, Math.round(cell.w * scale));
  const height = Math.max(1, Math.round(cell.h * scale));
  const progress = attacking ? Math.min(1, (e.animTick || 0) / 24) : 0;
  const lunge = attacking ? Math.round(Math.sin(progress * Math.PI) * 7) : 0;
  const bob = !attacking && !dying && Math.floor((tick + key.length) / 18) % 3 === 1 ? -1 : 0;
  const anchorX = px + 8 - lunge;
  const baseline = py + 31 + bob;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.image, cell.x, cell.y, cell.w, cell.h, Math.round(anchorX - width / 2), Math.round(baseline - height), width, height);
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
  const scale = 1;
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
  ctx.drawImage(source.image, cell.x, cell.y, cell.w, cell.h, destX, destY, cell.w, cell.h);
  if (e.anim === "attack") e.animTick = (e.animTick || 0) + 1;
}

function drawEffect() {
  if (!effect) return;
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
  return enemyAbilityProfiles[unit?.sprite] || enemyAbilityProfiles[unit?.name] || null;
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

function draw() {
  tick++;
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
  if (mode === "title") drawTitle();
  else if (mode === "atlas") drawAtlas();
  else if (mode === "battle") drawBattleScene();
  else if (mode === "menu") drawMenuBack();
  else drawTileMap();
  requestAnimationFrame(draw);
}

function updatePanels() {
  refreshHeroVitals();
  const q = currentQuest();
  const objective = objectiveTarget();
  const map = currentMap();
  el.chapter.textContent = map.chapter;
  el.place.textContent = `${map.name} / ${zoneLevelText(state.map)}`;
  el.questTitle.textContent = q ? q[0] : "No active quest";
  el.questText.textContent = q ? `Next: ${objective.label}.` : "Speak with Marla at the counter.";
  el.beatTitle.textContent = map.beat[0];
  el.beatText.textContent = map.beat[1];
  el.resonanceBar.style.width = `${Math.min(100, state.resonance)}%`;
  el.gold.textContent = `${state.gold} G`;
  el.partyPanel.innerHTML = state.activeParty.map(id => {
    const h = baseJobs[id], t = totals(id);
    const progress = progressFor(id);
    return `<div class="hero-row"><span class="dot" style="background:${h.color}"></span><strong>${h.name}<small>LV ${progress.level} / ${h.title} / STR ${t.str} AGI ${t.agi} MAG ${t.mag} STAM ${t.stam}</small></strong><span>${h.hp}/${t.max}</span></div>`;
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
  renderDialoguePortraits();
  nextTalk();
}

function nextTalk() {
  const line = talkQueue.shift();
  if (!line) {
    el.dialogue.classList.add("hidden");
    el.dialogue.classList.remove("has-portraits");
    el.dialoguePortraits.classList.add("hidden");
    mode = "walk";
    const completedPoint = activePoint;
    const after = talkAfter;
    activePoint = null;
    talkAfter = null;
    talkPortraits = [];
    if (completedPoint && completedPoint.event) runEvent(completedPoint.event);
    if (completedPoint && completedPoint.quest) processQuestGiver(completedPoint.quest);
    if (completedPoint?.id === "Marla" && questById("harlEscort")?.status === "ready") completeSideQuest("harlEscort");
    if (completedPoint?.chest) openChest(completedPoint);
    if (completedPoint && completedPoint.vendor && mode === "walk") openVendor(completedPoint.vendor);
    if (after && mode === "walk") after();
    updateSkillPointNotice();
    return;
  }
  el.speaker.textContent = line[0];
  el.line.textContent = line[1];
  syncDialoguePortraitForSpeaker(line[0]);
  updateDialogueSpeaker(line[0]);
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
    const cell = animatedEnemySheet.rows[0][0];
    const scale = Math.min(1, 74 / Math.max(cell.w, cell.h));
    const width = Math.max(1, Math.round(cell.w * scale));
    const height = Math.max(1, Math.round(cell.h * scale));
    paint.drawImage(animatedEnemySheet.image, cell.x, cell.y, cell.w, cell.h, Math.round((96 - width) / 2), 85 - height, width, height);
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
    found.push(`${reward.gold} G`);
  }
  Object.entries(reward.items || {}).forEach(([name, amount]) => {
    addInventoryItem(name, amount);
    found.push(`${name} x${amount}`);
  });
  if (reward.gear) {
    const rarity = reward.rarity || "Epic";
    awardGearDrop(reward.gear, rarity, found, { theme: reward.theme || lootThemeForMap(), label: state.ngPlus > 0 ? `NG+ CHEST ${rarity.toUpperCase()}` : rarity.toUpperCase() });
  }
  playSfx("item");
  updatePanels();
  showTalk([["Treasure", found.join(" / ") || "The chest contains only a faded Flameguard ribbon."]]);
}

function runEvent(event) {
  if (state.flags[event]) return;
  state.flags[event] = true;
  if (event === "acceptIssue1") { state.quest = 0; showTalk([["Quest", "Ash Boy's First Verse accepted."], ["Marla", "Follow the marked route east. Mira is watching the Ledger Docks."]]); }
  if (event === "harbor") {
    addParty("Mira");
    startBattle("Harbor Name-Thieves", [enemy("Ledger Cutter", 58, 9, "Sound", "#71513e", 2), enemy("Chain Warden", 68, 10, "Shadow", "#4a4542", 1)], "harborWon");
  }
  if (event === "issue1") { state.quest = 1; state.resonance += 12; const xp = awardPartyXp(180, "Issue 1"); showTalk([["Mira", "Next stop: Reverie. This is no longer just a dock case."], ["Progress", xp]]); }
  if (event === "clergy") { addParty("Seerin"); startBattle("Fire Clergy Assessors", [enemy("Seal Bearer", 74, 10, "Shadow", "#9d5436", 1), enemy("Ash Scribe", 60, 8, "Sound", "#6d5948", 2)], "clergyWon"); }
  if (event === "issue2") { addParty("Kael"); state.quest = 2; state.resonance += 15; const xp = awardPartyXp(260, "Issue 2"); showTalk([["Kael", "Faith under pressure is still faith. Obedience under pressure is only fear."], ["Progress", xp]]); }
  if (event === "registry") { state.flags.registered = true; state.resonance += 10; showTalk([["Guild Clerk", "Flameguard: provisional rank assigned."], ["Verseborn", "Provisional is official for interesting."]]); }
  if (event === "torren") { addParty("Torren"); showTalk([["Torren", "An empty chair is not a debt."]]); }
  if (event === "ravaWave") {
    activateSideQuest("ravaWave");
    startBattle("Reverie Courtyard - Wave 1", [enemy("Seal Bearer", 68, 10, "Shadow", "#9d5436", 1)], "ravaWaveWon", null, [
      { name: "Reverie Courtyard - Wave 2", enemies: [enemy("Ash Scribe", 62, 9, "Sound", "#6d5948", 1), enemy("Ash Scribe", 62, 9, "Sound", "#6d5948", 2)] },
      { name: "Reverie Courtyard - Wave 3", enemies: [enemy("Seal Bearer", 92, 13, "Tech", "#9d5436", 1), enemy("Ash Scribe", 70, 10, "Sound", "#6d5948", 2)] }
    ]);
  }
  if (event === "ember") startBattle("Ember Hall Resonance", [enemy("Buried Construct", 86, 12, "Earth", "#6f5540", 1), enemy("Cracked Pillar", 76, 7, "Tech", "#55473c", 2)], "emberWon");
  if (event === "sparky") { addParty("Sparky"); state.quest = 3; state.resonance += 18; const xp = awardPartyXp(360, "Issue 3"); showTalk([["Sparky", "Prrrp!"], ["Verseborn", "Tiny dragon. Ancient heart. Family."], ["Progress", xp]]); }
  if (event === "dawn") {
    addParty("Glimmer");
    const enemies = [enemy("Wrong Bell", 82, 11, "Tech", "#a66a35", 2), enemy("Gate Lock", 78, 10, "Earth", "#58616b", 1), enemy("Ash Wyrm", 72, 12, "Ancient Fire", "#5a2f52", 3)];
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
    const lyrsa = enemy("Lyrsa", 160, 25, "Tech", "#8b6ac4", 1, "Lyrsa");
    kaeldrin.levelHint = lyrsa.levelHint = 20;
    kaeldrin.npcBoss = lyrsa.npcBoss = true;
    showTalk([["Kaeldrin", "Stonewake advances at full strength."], ["Lyrsa", "Order begins with precision. Let us measure yours."], ["Verseborn", "Flameguard, second verse."]], {
      portraits: ["Kaeldrin", "Lyrsa"],
      after: () => startBattle("Stonewake Full-Rank Trial", [kaeldrin, lyrsa], "ngStonewakeWon")
    });
  }
  if (event === "ngOrphanTrial") {
    activateSideQuest("orphanTrial");
    const nyx = enemy("Nyx", 145, 22, "Holy Fire", "#473c62", 1, "Nyx");
    const rava = enemy("Rava", 180, 24, "Earth", "#43685a", 2, "Rava");
    const jory = enemy("Jory", 170, 26, "Sound", "#755247", 3, "Jory");
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
  return { name, hp: scaledHp, max: scaledHp, baseMax: scaledHp, baseAtk: atk, baseStats: { ...stats }, atk: scaledAtk, stats, weak, color, node, sprite, level: 1, stagger: 0, resonance: 0, row: 1, anim: "idle", animTick: 0 };
}

function prepareEnemyForBattle(source, mapId = state.map) {
  const [low, high] = zoneBandForMap(mapId);
  const level = Math.max(low, Math.min(MAX_LEVEL, source.levelHint || low + Math.min(high - low, Math.max(0, (source.node || 1) - 1))));
  const ngScale = 1 + state.ngPlus * .32;
  const levelScale = 1 + Math.max(0, level - 1) * .012;
  const baseMax = source.baseMax || source.max;
  const baseAtk = source.baseAtk || source.atk;
  const max = Math.round(baseMax * ngScale * levelScale);
  const atk = Math.round(baseAtk * (1 + state.ngPlus * .22) * (1 + Math.max(0, level - 1) * .01));
  const baseStats = source.baseStats || source.stats;
  return {
    ...source,
    hp: max,
    max,
    atk,
    level,
    xp: 14 + level * 7,
    stats: {
      str: atk,
      agi: Math.round((baseStats.agi || 5) + level * .45 + state.ngPlus * 3),
      mag: Math.round((baseStats.mag || 3) + level * .35 + state.ngPlus * 2),
      stam: Math.round((baseStats.stam || 5) + level * .5 + state.ngPlus * 3)
    },
    stagger: 0,
    resonance: 0,
    statuses: [],
    resistanceTier: source.resistanceTier || (source.npcBoss ? "boss" : source.node >= 3 ? "elite" : "normal"),
    statusChances: { ...(source.statusChances || {}) },
    anim: "idle",
    animTick: 0
  };
}

function battleUnit(id) {
  const h = baseJobs[id], t = totals(id);
  return { id, name: h.name, hp: h.hp, max: t.max, mp: h.mp, maxmp: t.mp, statuses: [], row: id === "Mira" || id === "Glimmer" || id === "Kael" || id === "Sparky" ? 1 : 0, anim: "idle" };
}

function startBattle(name, enemies, winFlag, spawnRef = null, waves = []) {
  mode = "battle";
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
  battle = { name, enemies: preparedEnemies, party: state.activeParty.slice(0, 3).map(battleUnit), winFlag, retryEvent: BATTLE_RETRY_EVENTS[winFlag] || null, spawnRef, waves: preparedWaves, defeated: [], ward: preparedWard, resolving: false, itemMode: false, targetMode: false, pendingSkill: null, turnQueue: [], turnIndex: 0, round: 1, startingResonance, usedOnce: {}, lastSupport: null, extraTurns: 0 };
  const opening = battle.party.reduce((sum, unit) => sum + effectValue(unit.id, "openingResonance"), 0);
  state.resonance = Math.min(100, state.resonance + opening);
  el.dialogue.classList.add("hidden");
  el.battle.classList.remove("hidden");
  el.battleName.textContent = name;
  updateMusic("battle");
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
  return Boolean(currentBattle && currentBattle.round >= MAX_BATTLE_ROUNDS);
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
  battle.turnStartMessage = start.notes.length ? `${unit.name}: ${start.notes.join(" ")}` : "";
  if (start.notes.length) log = `${log} ${unit.name}: ${start.notes.join(" ")}`;
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
  battle.resolving = true;
  battle.party.forEach(unit => {
    const hero = baseJobs[unit.id];
    if (!hero) return;
    hero.hp = Math.max(1, Math.min(totals(unit.id).max, unit.hp));
    hero.mp = Math.max(0, Math.min(totals(unit.id).mp, unit.mp));
  });
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
    ["Draw", `Round ${MAX_BATTLE_ROUNDS} ends with both sides still standing. The battle is a draw.`],
    ["System", `No XP, gold, loot or victory progress was awarded.${log ? " You can prepare and challenge the fight again." : ""}`]
  ]);
  return true;
}

function renderBattle(log) {
  el.battleLog.textContent = log;
  el.battleResonance.style.width = `${Math.max(0, Math.min(100, state.resonance))}%`;
  const turn = currentTurn();
  renderTurnOrder();
  el.partyRows.innerHTML = battle.party.map(unit => unitHtml({ ...unit, name: unit.form ? `${unit.name} - ${unit.form === "mech" ? "MECH" : "SHADOWPRIEST"} ${unit.formTurns}` : unit.name }, turn?.side === "party" && turn.id === unit.id ? "is-active" : "")).join("");
  const revealWeakness = partyCanSeeWeaknesses();
  el.enemyRows.innerHTML = battle.enemies.map(e => unitHtml({ name: `${e.name} Lv ${e.level} - Weak: ${revealWeakness ? e.weak : "???"}`, hp: e.hp, max: e.max, statuses: e.statuses })).join("");
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
    b.disabled = Boolean(onceUsed || noEncore || (sk.anim === "ultimate" ? state.resonance < 100 : sk.cost > u.mp));
    setBattlePreview(b, sk.name, skillPreview(u, sk));
    b.onclick = () => chooseSkillTarget(u, sk);
    el.actions.appendChild(b);
  });
  const defendBtn = document.createElement("button");
  defendBtn.type = "button";
  defendBtn.textContent = "Defend / Skip";
  defendBtn.title = "Use the block animation, gain 6 Resonance and reduce the next hit against this hero.";
  setBattlePreview(defendBtn, "Defend / Skip", `0 damage / 0 MP. ${u.name} blocks ${defendReduction(u)}% of the next direct hit and gains 6 Resonance.`);
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
  const partyHeal = sk.partyWide || talentValue(u.id, "partyHeal", sk.name) > 0;
  const heal = Math.round(Math.abs(sk.power) * (1 + talentValue(u.id, "healBoost")));
  if (sk.power < 0) return `Restores ${heal} HP${partyHeal ? " to every living ally" : " to the weakest ally"} / costs ${sk.anim === "ultimate" ? "100 Resonance" : `${sk.cost} MP`}. ${sk.desc}`;
  if (!skillTargetsEnemies(sk)) return `${sk.transform ? `Transformation for ${TRANSFORMATION_CONFIG[sk.transform]?.duration || 4} actions` : "Support command"} / costs ${sk.anim === "ultimate" ? "100 Resonance" : `${sk.cost} MP`}. ${sk.desc}`;
  const statName = sk.anim === "magic" || sk.anim === "ultimate" ? "MAG" : "STR";
  const statKey = statName === "MAG" ? "mag" : "str";
  const stat = Math.round(t[statKey] * transformedStatMultiplier(u, statKey));
  const low = Math.round(sk.coefficient ? stat * sk.coefficient : sk.power + stat);
  const high = low + 5;
  const weaknessBonus = effectValue(u.id, "weaknessDamage");
  const hitsWeakness = target && target.weak === sk.element;
  const revealWeakness = partyCanSeeWeaknesses();
  const displayWeakness = hitsWeakness && revealWeakness;
  const targetLow = displayWeakness ? Math.floor(Math.floor(low * 1.55) * (1 + weaknessBonus)) : low;
  const targetHigh = displayWeakness ? Math.floor(Math.floor(high * 1.55) * (1 + weaknessBonus)) : high;
  const weakText = weaknessBonus ? ` Weakness hits use x1.55 and another +${Math.round(weaknessBonus * 100)}% from gear.` : " Weakness hits use x1.55 damage.";
  const cost = sk.anim === "ultimate" ? "100 Resonance" : `${sk.cost} MP`;
  const targetText = target ? ` Against ${target.name}: ${targetLow}-${targetHigh} damage${hitsWeakness && revealWeakness ? " including weakness" : ""}.` : "";
  const areaText = skillHitsAll(u.id, sk) ? " Hits every living enemy." : " Hits one selected enemy.";
  const critChance = Math.min(.5, talentValue(u.id, "critChance") + effectValue(u.id, "critChance"));
  const critText = critChance ? ` ${Math.round(critChance * 100)}% critical chance for double damage.` : "";
  return `${sk.element} ${sk.anim} / ${low}-${high} base damage from ${statName} ${stat} / costs ${cost}.${targetText}${areaText}${critText}${revealWeakness ? weakText : " Weaknesses are hidden until a reveal talent is active."} ${sk.desc}`;
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
  return `<div class="unit ${className}"><strong>${u.name}</strong><span>${Math.max(0, u.hp)}/${u.max}</span>${mp}<div class="bar"><span style="width:${pct}%"></span></div>${statusBadgesHtml(u)}</div>`;
}

function chooseSkillTarget(u, sk) {
  const live = battle.enemies.filter(enemyUnit => enemyUnit.hp > 0);
  if (skillTargetsEnemies(sk) && live.length > 1 && !skillHitsAll(u.id, sk)) {
    battle.targetMode = true;
    battle.pendingSkill = sk;
    battleActionIndex = 0;
    return renderBattle(`${u.name}: choose a target for ${sk.name}.`);
  }
  useSkill(u, sk, skillTargetsEnemies(sk) ? live[0] : u);
}

function renderBattleTargets(u) {
  const sk = battle.pendingSkill;
  const revealWeakness = partyCanSeeWeaknesses();
  battle.enemies.filter(enemyUnit => enemyUnit.hp > 0).forEach(enemyUnit => {
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

function makeBattleEffect(caster, skillData, target) {
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

function useSkill(u, selectedSkill, chosenTarget = null) {
  if (battle.resolving) return;
  if (selectedSkill.oncePerBattle && battle.usedOnce[selectedSkill.oncePerBattle]) return renderBattle(`${selectedSkill.name} was already used this battle.`);
  if (selectedSkill.anim !== "ultimate" && selectedSkill.cost > u.mp) return renderBattle(`${u.name} needs more MP.`);
  let sk = selectedSkill;
  if (selectedSkill.encore) {
    if (!battle.lastSupport) return renderBattle("Encore needs an earlier support song.");
    sk = { ...battle.lastSupport, name: `Encore: ${battle.lastSupport.name}`, anim: selectedSkill.anim, cost: selectedSkill.cost, encoreResolved: true };
  }
  const liveAtStart = battle.enemies.filter(e => e.hp > 0);
  const target = skillTargetsEnemies(sk) ? (chosenTarget?.hp > 0 ? chosenTarget : liveAtStart[0]) : u;
  const timing = battleActionTiming(sk.anim);
  battle.targetMode = false;
  battle.pendingSkill = null;
  battle.resolving = true;
  u.anim = battleAnimationName(sk);
  if (selectedSkill.anim !== "ultimate") u.mp -= selectedSkill.cost;
  else state.resonance = 0;
  if (selectedSkill.oncePerBattle) battle.usedOnce[selectedSkill.oncePerBattle] = true;
  playSfx(sk.anim);
  updatePanels();
  const livingAtStart = battle.party.filter(p => p.hp > 0);
  const woundedAtStart = livingAtStart.slice().sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0] || u;
  effect = makeBattleEffect(u, sk, sk.power < 0 ? woundedAtStart : skillTargetsEnemies(sk) ? target || u : u);
  renderBattle(`${u.name} prepares ${sk.name}...`);
  setTimeout(() => { if (u) u.anim = "idle"; }, timing.totalMs - 100);

  setTimeout(() => {
    if (!battle || mode !== "battle") return;
    let log = `${battle.turnStartMessage ? `${battle.turnStartMessage} ` : ""}${u.name} uses ${sk.name}.`;
    const supportTargets = sk.targetSide === "self"
      ? [u]
      : sk.partyWide || sk.targetSide === "party"
        ? battle.party.filter(ally => ally.hp > 0)
        : [u];

    if (sk.revive) {
      battle.party.filter(ally => ally.hp <= 0).forEach(ally => {
        ally.hp = Math.max(1, Math.round(ally.max * sk.revive));
        addBattleFloater(ally, ally.hp, { kind: "heal" });
        log += ` ${ally.name} returns with ${ally.hp} HP.`;
      });
    }

    if (sk.power < 0) {
      const living = battle.party.filter(p => p.hp > 0);
      const wounded = living.slice().sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0] || u;
      const healing = Math.round(Math.abs(sk.power) * (1 + talentValue(u.id, "healBoost")) * (1 + statusValue(u, "magicUp")));
      const healTargets = sk.partyWide || talentValue(u.id, "partyHeal", sk.name) > 0 ? living : sk.targetSide === "self" ? [u] : [wounded];
      let totalRestored = 0;
      healTargets.forEach(ally => {
        const restored = Math.min(healing, ally.max - ally.hp);
        ally.hp += restored;
        totalRestored += restored;
        addBattleFloater(ally, restored, { kind: "heal" });
      });
      if (sk.cleanse || /Oath Unbound/.test(sk.name)) {
        let cleansed = 0;
        healTargets.forEach(ally => cleansed += cleanseStatuses(ally));
        if (cleansed) log += ` PURIFY removed ${cleansed} negative effect${cleansed === 1 ? "" : "s"}.`;
      }
      battle.ward = battle.ward || sk.anim === "block" || sk.grantsWard || /Oath Unbound/.test(sk.name);
      const buffNotes = applySkillBuffs(u, healTargets, sk);
      if (buffNotes.length) log += ` ${buffNotes.join(" ")}.`;
      state.resonance = Math.min(100, state.resonance + 5);
      log += ` ${healTargets.length > 1 ? "The party recovers" : `${wounded.name} recovers`} ${totalRestored} HP.`;
    } else if (!skillTargetsEnemies(sk)) {
      if (sk.transform && activateTransformation(u, sk.transform)) {
        log += ` ${sk.transform === "mech" ? "Mech Form" : "Shadowpriest"} engaged for ${u.formTurns} actions.`;
      }
      if (sk.cleanse) {
        let cleansed = 0;
        supportTargets.forEach(ally => {
          const removed = cleanseStatuses(ally);
          cleansed += removed;
          if (removed && typedTalentValue(u.id, "cleanseHeal")) {
            const restored = Math.min(Math.round(ally.max * typedTalentValue(u.id, "cleanseHeal")), ally.max - ally.hp);
            ally.hp += restored;
            addBattleFloater(ally, restored, { kind: "heal" });
          }
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
    } else if (target) {
      const live = battle.enemies.filter(e => e.hp > 0);
      const t = totals(u.id);
      const hitTargets = skillHitsAll(u.id, sk) ? live : [target];
      let totalDamageDealt = 0;
      hitTargets.forEach(hitTarget => {
        const afflicted = hasNegativeStatus(hitTarget);
        let critChance = talentValue(u.id, "critChance") + effectValue(u.id, "critChance");
        if (afflicted) critChance += typedTalentValue(u.id, "afflictedCrit");
        critChance = Math.min(.65, critChance);
        const statKey = sk.anim === "magic" || sk.anim === "ultimate" ? "mag" : "str";
        const offensiveStat = Math.round(t[statKey] * transformedStatMultiplier(u, statKey));
        let dmg = (sk.coefficient ? offensiveStat * sk.coefficient : sk.power + offensiveStat) + Math.floor(Math.random() * 6);
        if (hitTarget.weak === sk.element) {
          dmg = Math.floor(dmg * 1.55);
          dmg = Math.floor(dmg * (1 + effectValue(u.id, "weaknessDamage")));
          hitTarget.stagger += (sk.staggerPower || 2) + effectValue(u.id, "stagger");
          state.resonance = Math.min(100, state.resonance + 14);
          log += ` ${hitTarget.name}: Weakness!`;
        } else {
          hitTarget.stagger += sk.staggerPower || 1;
          state.resonance = Math.min(100, state.resonance + 5);
        }
        if (hitTarget.stagger >= 3) {
          dmg += 12;
          hitTarget.stagger = 0;
          log += ` ${hitTarget.name}: Stagger break!`;
        }
        if (afflicted && sk.afflictedBonus) dmg *= 1 + sk.afflictedBonus;
        if (sk.buffScaling) dmg *= 1 + ensureStatuses(u).filter(status => STATUS_DEFS[status.type]?.buff).length * sk.buffScaling;
        const critical = Boolean(critChance && Math.random() < critChance);
        if (critical) {
          dmg *= 2;
          log += ` ${hitTarget.name}: CRITICAL!`;
        }
        const defenseDebuff = statusValue(hitTarget, "defenseDown") + (statKey === "mag" ? statusValue(hitTarget, "magicDefenseDown") : 0);
        const defense = Math.max(0, statusValue(hitTarget, "defenseUp") - defenseDebuff) * (1 - (sk.pierce || 0));
        dmg = Math.max(1, Math.round(dmg * outgoingDamageMultiplier(u, sk.anim, hitTarget) * (1 - defense)));
        const sleepBreak = breakSleepFromDamage(hitTarget);
        if (sleepBreak) log += ` ${hitTarget.name}: ${sleepBreak}`;
        if (sk.name.includes("Silent Step")) hitTarget.node = Math.min(3, hitTarget.node + 1);
        hitTarget.hp -= dmg;
        totalDamageDealt += dmg;
        hitTarget.resonance = Math.min(100, (hitTarget.resonance || 0) + (critical ? 14 : 8));
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
        const statusNotes = hitTarget.hp > 0 ? applySkillStatuses(u, hitTarget, sk) : [];
        if (statusNotes.length) log += ` ${hitTarget.name}: ${statusNotes.join(" / ")}.`;
        if (hitTarget.hp <= 0 && !hitTarget.defeatUntil) {
          hitTarget.hp = 0;
          hitTarget.anim = "death";
          hitTarget.deathTick = tick;
          hitTarget.defeatUntil = tick + (enemyAnimationSheetFor(hitTarget) ? 30 : 12);
        }
        log += ` ${hitTarget.name} takes ${dmg}.`;
      });
      if (sk.selfHealRatio && totalDamageDealt > 0) {
        const restored = Math.min(Math.max(1, Math.round(totalDamageDealt * sk.selfHealRatio)), u.max - u.hp);
        u.hp += restored;
        if (restored) {
          addBattleFloater(u, restored, { kind: "heal" });
          log += ` ${u.name} drains ${restored} HP.`;
        }
      }
      playSfx("hit");
      const hpOnHit = effectValue(u.id, "hpOnHit");
      const mpOnHit = effectValue(u.id, "mpOnHit");
      if (hpOnHit) {
        const restored = Math.min(hpOnHit, u.max - u.hp);
        u.hp += restored;
        addBattleFloater(u, restored, { kind: "heal" });
        if (restored) log += ` ${u.name} restores ${restored} HP.`;
      }
      if (mpOnHit) {
        const restored = Math.min(mpOnHit, u.maxmp - u.mp);
        u.mp += restored;
        if (restored) log += ` ${u.name} restores ${restored} MP.`;
      }
    }

    if (!selectedSkill.encore && !skillTargetsEnemies(sk) && sk.anim !== "ultimate") battle.lastSupport = { ...sk };
    const echoChance = effectValue(u.id, "echoing");
    const echoKey = `echoing:${u.id}`;
    if (echoChance && !battle.usedOnce[echoKey] && Math.random() < echoChance) {
      battle.usedOnce[echoKey] = true;
      log += ` ECHOING: ${grantImmediateTurn(u, { appliesOverheated: true })}`;
    }
    updatePanels();
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
    setBattlePreview(button, name, `${info.desc} Exact effect: ${battleItemState(u, info)}. Uses one carried item and ends ${u.name}'s turn.`);
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
  return Boolean(profile?.heal || /clergy|paladin|seal bearer|sentinel|gate lock/i.test(`${unit.name} ${unit.sprite || ""}`));
}

function enemyStatusFor(unit, actionKind) {
  const profile = enemyAbilityProfile(unit);
  const element = profile?.element || enemyMagicElement(unit);
  const type = element === "Shadow" ? (unit.name === "Nyx" ? "sleep" : "poison") : ["Earth", "Tech"].includes(element) ? "stun" : null;
  if (!type) return null;
  return { type, chance: actionKind === "ultimate" ? .8 : .48 };
}

function chooseEnemyAction(unit) {
  const profile = enemyAbilityProfile(unit);
  const wounded = battle.enemies
    .filter(ally => ally.hp > 0 && ally.hp / ally.max < .58)
    .sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
  if ((unit.resonance || 0) >= 100) {
    const action = { kind: "ultimate", name: profile?.ultimate || "Resonant Rupture", element: profile?.element || enemyMagicElement(unit), target: profile?.ultimateHeal ? unit : null, healing: Boolean(profile?.ultimateHeal) };
    action.status = action.healing ? null : enemyStatusFor(unit, "ultimate");
    return action;
  }
  if (wounded && enemyCanHeal(unit) && Math.random() < .68) {
    return { kind: "heal", name: profile?.heal || "Seal Mend", element: profile?.element || "Holy Fire", target: wounded, healing: true };
  }
  if (Math.random() < .44) {
    const element = enemyMagicElement(unit);
    return { kind: "magic", name: profile?.magic || `${element} Pulse`, element, status: enemyStatusFor(unit, "magic") };
  }
  return { kind: "melee", name: "Melee Strike", element: "Physical" };
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
  const timing = battleActionTiming(action.kind === "heal" ? "magic" : action.kind);
  const profile = enemyAbilityProfile(unit);
  return {
    kind: action.kind === "heal" ? "magic" : action.kind,
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

function resolveEnemyTurn(turn, prev) {
  const liveParty = battle.party.filter(p => p.hp > 0);
  if (!liveParty.length) {
    battle.party.forEach(p => p.hp = Math.ceil(p.max / 2));
    battle.resolving = false;
    buildTurnOrder();
    return runCurrentTurn("Marla refuses a game over. Everyone gets back up.");
  }
  const e = battle.enemies[turn.index];
  if (!e || e.hp <= 0) {
    battle.resolving = false;
    return finishTurn(prev);
  }
  const action = chooseEnemyAction(e);
  const target = action.target || liveParty[Math.floor(Math.random() * liveParty.length)];
  const timingKey = action.kind === "heal" ? "magic" : action.kind;
  const timing = battleActionTiming(timingKey);
  e.anim = "attack";
  e.animTick = 0;
  e.attackStyle = action.kind === "melee" ? "melee" : "magic";
  effect = makeEnemyBattleEffect(e, target, action);
  playSfx(action.kind === "melee" ? (e.npcBoss ? "boss" : "melee") : "magic");
  renderBattle(`${e.name} prepares ${action.name}${action.kind === "ultimate" ? " - ULTIMATE" : ""}...`);

  setTimeout(() => {
    if (!battle || mode !== "battle" || e.hp <= 0) return;
    let actionLog = `${battle.turnStartMessage ? `${battle.turnStartMessage} ` : ""}${e.name} uses ${action.name}.`;
    if (action.healing) {
      const healTargets = action.kind === "ultimate" ? battle.enemies.filter(ally => ally.hp > 0) : [target].filter(ally => ally?.hp > 0);
      let total = 0;
      healTargets.forEach(ally => {
        const amount = Math.round(ally.max * (action.kind === "ultimate" ? .24 : .16) + e.stats.mag * (action.kind === "ultimate" ? 1.4 : .9));
        const restored = Math.min(amount, ally.max - ally.hp);
        ally.hp += restored;
        total += restored;
        addBattleFloater(ally, restored, { kind: "heal" });
        if (enemyCanHeal(e)) applyStatus(ally, "defenseUp", e, { duration: 2, chance: 1 });
      });
      e.resonance = action.kind === "ultimate" ? 0 : Math.min(100, (e.resonance || 0) + 32);
      actionLog += ` ${healTargets.length > 1 ? "The enemy formation restores" : `${target.name} restores`} ${total} HP.`;
      if (enemyCanHeal(e)) actionLog += " DEFENSE UP.";
      playSfx("item");
    } else {
      const allTargets = action.kind === "ultimate" && (e.npcBoss || e.node >= 3);
      const hitTargets = allTargets ? battle.party.filter(member => member.hp > 0) : [target].filter(member => member.hp > 0);
      hitTargets.forEach(defender => {
        const random = Math.floor(Math.random() * (action.kind === "ultimate" ? 9 : 6));
        let dmg = action.kind === "melee"
          ? e.atk + random
          : action.kind === "magic"
            ? Math.round(e.atk * .7 + e.stats.mag * .75) + random
            : Math.round((e.atk + e.stats.mag * .5) * (allTargets ? 1.18 : 1.58)) + random;
        dmg = Math.max(1, Math.round(dmg * outgoingDamageMultiplier(e, action.kind, defender) * incomingDamageMultiplier(defender)));
        let defenseText = "";
        if (defender.guarding) {
          const reduction = defendReduction(defender);
          dmg = Math.ceil(dmg * (1 - reduction / 100));
          defender.guarding = false;
          defenseText = ` ${defender.name} blocks ${reduction}%.`;
          playSfx("block");
          const counter = typedTalentValue(defender.id, "guardCounter");
          if (counter && e.hp > 0) {
            const counterDamage = Math.max(1, Math.round((totals(defender.id).str + baseJobs[defender.id].skills[0].power) * counter));
            e.hp = Math.max(0, e.hp - counterDamage);
            addBattleFloater(e, counterDamage, { damageType: "Counter" });
            defenseText += ` Counter -${counterDamage}.`;
          }
        } else if (battle.ward) {
          dmg = Math.ceil(dmg * Math.max(.2, .5 - effectValue(defender.id, "blockPower")));
          defenseText = " Party Guard softens the hit.";
        }
        const sleepBreak = breakSleepFromDamage(defender);
        defender.hp = Math.max(0, defender.hp - dmg);
        defender.flash = 12;
        addBattleFloater(defender, dmg, { damageType: action.kind === "melee" ? "Physical" : action.element, crit: action.kind === "ultimate" });
        const statusResult = defender.hp > 0 && action.status ? applyStatus(defender, action.status.type, e, action.status) : null;
        actionLog += ` ${defender.name} takes ${dmg}.${sleepBreak ? ` ${sleepBreak}` : ""}${defenseText}${statusResult?.message ? ` ${statusResult.message}.` : ""}`;
      });
      battle.ward = false;
      e.resonance = action.kind === "ultimate" ? 0 : Math.min(100, (e.resonance || 0) + (action.kind === "magic" ? 34 : 27));
      playSfx(action.kind === "ultimate" ? "boss" : "hit");
    }
    if (e.hp <= 0) {
      e.anim = "death";
      e.deathTick = tick;
      e.defeatUntil = tick + (enemyAnimationSheetFor(e) ? 30 : 12);
    }
    updatePanels();
    renderBattle(actionLog);
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
  battle.defeated.push(...battle.enemies);
  if (battle.waves.length) {
    if (battleRoundLimitReached()) return endBattleDraw(log);
    const nextWave = battle.waves.shift();
    battle.name = nextWave.name;
    battle.enemies = nextWave.enemies;
    battle.ward = false;
    el.battleName.textContent = nextWave.name;
    state.resonance = Math.min(100, state.resonance + 10);
    battle.round++;
    buildTurnOrder();
    runCurrentTurn(`${log} The next wave enters.`);
    return;
  }
  if (battle.winFlag) state.flags[battle.winFlag] = true;
  state.resonance = Math.min(100, state.resonance + 15);
  battle.party.forEach(u => {
    const h = baseJobs[u.id];
    h.hp = Math.max(1, Math.min(totals(u.id).max, u.hp + 10 + effectValue(u.id, "battleRegen") + talentValue(u.id, "battleRegenTalent")));
    h.mp = u.mp;
  });
  const echoHuntBattle = Boolean(battle.echoHuntRank || battle.winFlag === "endgameHuntWon" || /^Echo Hunt\s+\d+:/i.test(battle.name));
  const rewards = rollBattleLoot(battle.defeated, { forceGearRarity: echoHuntBattle ? "Legendary" : null });
  const bossBattle = Boolean(battle.spawnRef?.boss || ["dawnWon", "endgameHuntWon", "ngStonewakeWon", "ngOrphanTrialWon"].includes(battle.winFlag));
  const battleXp = battle.defeated.reduce((sum, unit) => sum + (unit.xp || 20), 0) + (bossBattle ? 120 + Math.max(...battle.defeated.map(unit => unit.level || 1)) * 12 : 0);
  const xpSummary = awardPartyXp(battleXp, bossBattle ? "boss victory" : "battle");
  if (echoHuntBattle) {
    state.endgameRank++;
    state.echoForgeRank = Math.max(state.echoForgeRank || 0, state.endgameRank);
    const echoGold = 100 + state.endgameRank * 35;
    const cogs = 1 + Math.floor(state.endgameRank / 3);
    state.gold += echoGold;
    rewards.gold += echoGold;
    addInventoryItem("False Dawn Cog", cogs);
    rewards.drops.push(`False Dawn Cog x${cogs}`);
    guaranteeEchoHuntGearReward(rewards, battle.echoHuntRank || state.endgameRank);
  }
  if (battle.spawnRef) {
    battle.spawnRef.available = false;
    if (battle.spawnRef.boss) state.flags[`spawn:${battle.spawnRef.id}`] = true;
    else battle.spawnRef.returnAt = Date.now() + battle.spawnRef.respawn * 1000;
  }
  updateSideQuestKills(battle.defeated, battle.spawnRef);
  if (battle.winFlag === "ravaWaveWon") completeSideQuest("ravaWave");
  if (battle.winFlag === "ngStonewakeWon") completeSideQuest("stonewakeTrial");
  if (battle.winFlag === "ngOrphanTrialWon") completeSideQuest("orphanTrial");
  hideBattlePreview();
  el.turnOrder.innerHTML = "";
  el.battle.classList.add("hidden");
  mode = "walk";
  updateMusic();
  updatePanels();
  playSfx("coin");
  const dropText = rewards.drops.length ? rewards.drops.join(", ") : "no item drops";
  showTalk([["Victory", `${log} ${xpSummary}.`], ["Loot", `${rewards.gold} gold. ${dropText}.`]]);
}

function awardGearDrop(name, requestedRarity, drops, options = {}) {
  addOwnedGear(name, 1, { rarity: requestedRarity, rollAffixes: true, theme: options.theme || lootThemeForMap() });
  const currentRarity = gearRarity(name);
  if (RARITY_ORDER.indexOf(requestedRarity) > RARITY_ORDER.indexOf(currentRarity)) state.gearRarities[name] = requestedRarity;
  const rarity = gearRarity(name);
  topUpGearAffixes(name, rarity, options.theme || "dragon");
  const affixes = gearAffixes(name);
  drops.push(`${options.label || rarity.toUpperCase()}: ${name}${affixes.length ? ` / ${affixes.map(entry => entry.text).join(", ")}` : ""}`);
  return { name, rarity };
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
        drops.push(`${name} x${amount}${stored ? "" : " (Marla stash)"}`);
      });
      table.rare.forEach(([name, chance]) => {
        if (Math.random() > chance || gearCopyCount(name) >= 3) return;
        const rarity = options.forceGearRarity || rollEquipmentRarity(enemyUnit);
        gearDrops.push(awardGearDrop(name, rarity, drops, { theme: options.forceGearRarity ? "dragon" : lootThemeForMap() }));
      });
    });
    if (state.ngPlus > 0 && options.allowNgPlusLoot !== false) gold += rollNgPlusRandomLoot(enemyUnit, drops, gearDrops);
  });
  state.gold += gold;
  return { gold, drops, gearDrops };
}

function rollNgPlusRandomLoot(enemyUnit, drops, gearDrops = []) {
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
    drops.push(`NG+ RANDOM: ${name} x${amount}${stored ? "" : " (Marla stash)"}`);
  }
  const randomGear = [
    ...ngPlusChestGear,
    ...ngPlusGear.filter(gear => !ngPlusSignatureNames.has(gear.name)),
    ...postgameGear
  ];
  const gearChance = Math.min(.68, .18 + loop * .07 + (state.endgameRank || 0) * .012);
  if (randomGear.length && Math.random() < gearChance) {
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
  Torren: ["Front-line tank", "Stagger damage", "Retaliation"],
  Glimmer: ["Tech magic", "Speed manipulation", "Stun support"],
  Sparky: ["Magic burst", "Ancient fire", "Area damage"]
};

const statusStatHelp = [
  ["STR", "Physical and melee damage"],
  ["AGI", "Turn speed and action frequency"],
  ["MAG", "Spell damage and maximum MP"],
  ["STAM", "Maximum HP and durability"],
  ["CRIT", "Chance for double damage"],
  ["DPS / HPS", "AGI-adjusted non-ultimate output"]
];

function estimatedHeroOutput(id) {
  const t = totals(id);
  const skills = battleSkills(id);
  const crit = Math.min(.65, talentValue(id, "critChance") + effectValue(id, "critChance"));
  const afflictedCrit = Math.min(.65, crit + typedTalentValue(id, "afflictedCrit"));
  const actionRate = .75 + t.agi / 40;
  const damageOptions = skills.filter(sk => sk.anim !== "ultimate" && sk.power > 0 && skillTargetsEnemies(sk)).map(sk => {
    const kind = sk.anim === "magic" ? "magic" : "melee";
    const stat = kind === "magic" ? t.mag : t.str;
    const base = sk.power + stat + 2.5;
    const multiplier = 1 + effectValue(id, kind === "magic" ? "magicDamage" : "physicalDamage");
    return { name: sk.name, value: base * multiplier * (1 + crit) * actionRate };
  });
  const healingOptions = skills.filter(sk => sk.anim !== "ultimate" && sk.power < 0).map(sk => {
    const partyWide = sk.partyWide || talentValue(id, "partyHeal", sk.name) > 0;
    const targetFactor = partyWide ? 1 + Math.max(0, state.activeParty.length - 1) * .5 : 1;
    const value = Math.abs(sk.power) * (1 + talentValue(id, "healBoost")) * targetFactor * actionRate;
    return { name: sk.name, value };
  });
  const bestDamage = damageOptions.sort((a, b) => b.value - a.value)[0] || { name: "None", value: 0 };
  const bestHealing = healingOptions.sort((a, b) => b.value - a.value)[0] || { name: "None", value: 0 };
  return {
    crit,
    afflictedCrit,
    dps: Math.round(bestDamage.value),
    dpsSkill: bestDamage.name,
    hps: Math.round(bestHealing.value),
    hpsSkill: bestHealing.name
  };
}

function equippedProcChances(id) {
  const applicationBonus = typedTalentValue(id, "statusChance") + effectValue(id, "statusChance");
  return ["poison", "sleep", "stun"].map(type => {
    const raw = effectValue(id, "statusOnHit", type);
    const normalChance = Math.min(.95, raw * (STATUS_TIER_CHANCES.normal[type] || 1) * (1 + applicationBonus));
    return { type, raw, normalChance };
  }).filter(entry => entry.raw > 0);
}

function statusEquipmentHtml(id) {
  return Object.entries(baseJobs[id].gear).map(([slot, name]) => {
    const gear = gearByName(name);
    if (!gear) return "";
    const fixed = gearEffects(gear).map(effect => {
      const label = effect.echoUnique ? `ECHO EFFECT: ${effect.label.replace(/^ECHO(?: EFFECT)?:\s*/i, "")}` : effect.label;
      return `<small class="${effect.echoUnique ? "is-echo" : "is-fixed"}">${label}</small>`;
    });
    const random = gearAffixes(name).map(entry => `<small class="is-affix">${entry.text || formatAffix(entry)}</small>`);
    const details = [...fixed, ...random];
    return `<div class="status-gear-row"><span><b>${slot.toUpperCase()}</b><strong>${name}</strong>${gearRarityHtml(name)}</span><div>${details.length ? details.join("") : `<small>No fixed effect or random affix.</small>`}</div></div>`;
  }).join("");
}

function statusCardHtml(id) {
  const h = baseJobs[id];
  const t = totals(id);
  const chosen = activeTalents(id);
  const output = estimatedHeroOutput(id);
  const procs = equippedProcChances(id);
  const activeLabel = state.activeParty.includes(id) ? `ACTIVE SLOT ${state.activeParty.indexOf(id) + 1}` : "RESERVE";
  const portrait = portraitSources[id];
  const specialties = characterSpecialties[id] || [h.title];
  const procHtml = procs.length ? procs.map(entry => `<span><b>${entry.type.toUpperCase()}</b><strong>${Math.round(entry.raw * 100)}%</strong><small>${Math.round(entry.normalChance * 100)}% vs normal foes</small></span>`).join("") : `<p class="status-empty">No Poison, Sleep or Stun proc equipped.</p>`;
  return `<article class="menu-card status-card"><header class="status-card-head"><img src="${portrait}" alt="${h.name} portrait"><div><small>${activeLabel}</small><strong>${h.name}</strong><span>${h.title} / ${h.element}</span><p>${specialties.join(" / ")}</p></div></header>${xpProgressHtml(id)}<div class="status-core-stats"><span><small>STR</small><strong>${t.str}</strong></span><span><small>AGI</small><strong>${t.agi}</strong></span><span><small>MAG</small><strong>${t.mag}</strong></span><span><small>STAM</small><strong>${t.stam}</strong></span><span><small>HP</small><strong>${h.hp}/${t.max}</strong></span><span><small>MP</small><strong>${h.mp}/${t.mp}</strong></span></div><div class="status-output"><span><small>CRIT RATE</small><strong>${Math.round(output.crit * 100)}%</strong><em>${output.afflictedCrit > output.crit ? `${Math.round(output.afflictedCrit * 100)}% vs afflicted` : "Double damage"}</em></span><span><small>DPS EST.</small><strong>${output.dps}</strong><em>${output.dpsSkill}</em></span><span><small>HPS EST.</small><strong>${output.hps}</strong><em>${output.hpsSkill}</em></span></div><section class="status-detail-section"><h4>Equipped proc chances</h4><div class="status-procs">${procHtml}</div></section><section class="status-detail-section"><h4>Equipment specialties and affixes</h4><div class="status-gear-list">${statusEquipmentHtml(id)}</div></section><section class="status-detail-section status-talents"><h4>Chosen milestones</h4><p>${chosen.length ? chosen.map(entry => `<b>${entry.name}</b>`).join(" / ") : "No milestone skills chosen yet."}</p></section></article>`;
}

function toggleTalent(value) {
  const separator = value.indexOf(":");
  const id = value.slice(0, separator);
  const name = value.slice(separator + 1);
  const progress = progressFor(id);
  const entry = (talentTrees[id] || []).find(option => option.name === name);
  if (!entry || progress.level < entry.level) return;
  if (progress.talents.includes(name)) progress.talents = progress.talents.filter(chosen => chosen !== name);
  else {
    const sameMilestone = (talentTrees[id] || []).filter(option => option.level === entry.level).map(option => option.name);
    progress.talents = progress.talents.filter(chosen => !sameMilestone.includes(chosen));
    progress.talents.push(name);
    spendPendingSkillPoint(id, entry.level);
  }
  playSfx("menu");
  updatePanels();
  renderMenu();
}

function renderMenu() {
  document.querySelectorAll(".menu-tabs button").forEach(btn => btn.classList.toggle("is-active", btn.dataset.tab === menuTab));
  if (menuTab === "status") {
    const glossary = statusStatHelp.map(([stat, detail]) => `<span><b>${stat}</b><small>${detail}</small></span>`).join("");
    el.menuBody.innerHTML = `<div class="status-glossary">${glossary}</div><p class="status-estimate-note">DPS and HPS compare the strongest non-ultimate command after AGI, before enemy defense or weakness. Proc rates show the combined equipped chance and its expected rate against a normal enemy.</p><div class="status-menu-grid">${state.party.map(statusCardHtml).join("")}</div>`;
  }
  if (menuTab === "party") {
    const activeSlots = Array.from({ length: 3 }, (_, index) => {
      const id = state.activeParty[index];
      if (!id) return `<div class="party-slot ${selectedPartySlot === index ? "is-selected" : ""}"><button type="button" data-party-slot="${index}"><span>Slot ${index + 1}</span><strong>Empty</strong><small>Choose a reserve member below.</small></button></div>`;
      const h = baseJobs[id], t = totals(id);
      return `<div class="party-slot ${selectedPartySlot === index ? "is-selected" : ""}"><button type="button" data-party-slot="${index}"><span>Slot ${index + 1}</span><strong>${h.name}</strong><small>${h.title} / AGI ${t.agi} / HP ${h.hp}/${t.max}</small></button><button type="button" class="party-remove" data-party-remove="${index}" ${state.activeParty.length <= 1 ? "disabled" : ""}>Remove</button></div>`;
    }).join("");
    const roster = state.party.map(id => {
      const h = baseJobs[id], t = totals(id);
      const activeIndex = state.activeParty.indexOf(id);
      return `<button type="button" class="party-member ${activeIndex >= 0 ? "is-active" : ""}" ${activeIndex >= 0 ? `data-party-focus="${activeIndex}"` : `data-party-add="${id}"`}><span class="dot" style="background:${h.color}"></span><strong>${h.name}</strong><small>${h.title}</small><b>${activeIndex >= 0 ? `ACTIVE ${activeIndex + 1}` : "ADD"}</b><span>AGI ${t.agi}</span></button>`;
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
      const ready = current.pendingMilestones.length ? ` / ${current.pendingMilestones.length} POINT${current.pendingMilestones.length === 1 ? "" : "S"} READY` : "";
      return `<button type="button" class="skill-hero ${heroId === id ? "is-selected" : ""}" data-skill-hero="${heroId}"><span class="dot" style="background:${baseJobs[heroId].color}"></span><strong>${heroId}</strong><small>Level ${current.level} / ${current.talents.length} milestones chosen${ready}</small></button>`;
    }).join("");
    const choices = talentTrees[id].map(entry => {
      const selected = chosen.has(entry.name);
      const locked = progress.level < entry.level;
      const competing = talentTrees[id].some(option => option.level === entry.level && chosen.has(option.name));
      const ready = progress.pendingMilestones.includes(entry.level);
      const stateText = locked ? `UNLOCKS AT LV ${entry.level}` : selected ? "CHOSEN" : ready ? "SKILL POINT READY" : competing ? "REPLACE CHOICE" : "AVAILABLE";
      return `<button type="button" class="talent-choice ${selected ? "is-active" : ""} ${locked ? "is-locked" : ""}" data-talent="${id}:${entry.name}" ${locked ? "disabled" : ""}><span class="talent-level">LV ${entry.level}</span><span><strong>${entry.name}</strong><p>${entry.unlockDesc}</p><small>${stateText}</small></span><b>${selected ? "ON" : locked ? "LOCK" : competing ? "SWAP" : "+"}</b></button>`;
    }).join("");
    el.menuBody.innerHTML = `<div class="skill-head"><div><strong>Milestone Skills</strong><p>Choose one path at each milestone. New choices unlock at levels 25, 30, 35 and 40; earlier learned skills remain available.</p></div><span>${hero.name} / ${chosen.size} chosen</span></div><div class="skill-roster">${roster}</div><section class="skill-tree-panel"><header><div><strong>${hero.name}</strong><small>${hero.title} / ${hero.element}</small></div>${xpProgressHtml(id)}</header><div class="talent-grid">${choices}</div></section>`;
    el.menuBody.querySelectorAll("[data-skill-hero]").forEach(button => button.onclick = () => {
      selectedSkillHero = button.dataset.skillHero;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-talent]").forEach(button => button.onclick = () => toggleTalent(button.dataset.talent));
  }
  if (menuTab === "gear") {
    if (!state.party.includes(selectedGearHero)) selectedGearHero = state.party[0];
    const id = selectedGearHero;
    const h = baseJobs[id];
    const totalsNow = totals(id);
    const roster = state.party.map(heroId => {
      const hero = baseJobs[heroId];
      const heroTotals = totals(heroId);
      return `<button type="button" class="gear-hero ${heroId === id ? "is-selected" : ""}" data-gear-hero="${heroId}"><span class="dot" style="background:${hero.color}"></span><strong>${hero.name}</strong><small>${hero.title}</small><span>HP ${hero.hp}/${heroTotals.max}</span></button>`;
    }).join("");
    const slots = Object.entries(h.gear).map(([slot, name]) => {
      const gear = gearByName(name);
      const rare = gear ? `${gearRarityHtml(gear.name)}${gearEffectHtml(gear)}${gearAffixHtml(gear.name)}` : "";
      const choices = gearDb[slot].filter(candidate => state.ownedGear.includes(candidate.name) && canEquip(id, candidate)).length;
      const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[slot];
      const iconSheet = gear ? gearIconSheet(gear, id) : "gear-empty";
      return `<div class="gear-slot ${selectedGearSlot === slot ? "is-selected" : ""}">${pixelIconHtml(iconSheet, iconIndex, "gear-slot-icon")}<span class="gear-slot-name">${slot}</span><div class="gear-detail"><strong>${name || "Empty slot"}</strong><small>${gear ? statLine(gear.stats) : "No stat bonus"}</small><p>${gear?.desc || "Unequipped gear remains in the Items inventory."}</p>${gear ? `<small class="gear-access">${gearAccessLabel(gear)}</small>${rare}` : ""}</div><button type="button" data-gear-slot="${slot}">Manage ${choices}</button></div>`;
    }).join("");
    const slotChoices = gearDb[selectedGearSlot]
      .filter(candidate => state.ownedGear.includes(candidate.name) && canEquip(id, candidate));
    const choiceIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[selectedGearSlot];
    const picker = `<section class="gear-picker"><header><strong>Choose ${selectedGearSlot}</strong><small>${h.name} can equip ${slotChoices.length} owned pieces</small></header><div class="gear-choice-list">${slotChoices.map(gear => {
      const equipped = h.gear[selectedGearSlot] === gear.name;
      const holders = equippedGearUsers(gear.name);
      const occupied = holders.filter(heroId => heroId !== id);
      const copies = gearCopyCount(gear.name);
      const holderText = holders.length ? `Equipped: ${holders.join(", ")} / owned x${copies}` : `In equipment inventory / owned x${copies}`;
      return `<button type="button" class="gear-choice ${equipped ? "is-equipped" : ""}" data-equip="${id}:${selectedGearSlot}:${gear.name}" ${equipped ? "disabled" : ""}>${pixelIconHtml(gearIconSheet(gear, id), choiceIndex, "gear-choice-icon")}<span><strong>${gear.name}</strong>${gearRarityHtml(gear.name)}<small>${statLine(gear.stats)}</small><small>${holderText}</small><small>${gearAccessLabel(gear)}</small>${gearEffectHtml(gear, "gear-choice-effects")}${gearAffixHtml(gear.name)}</span><b>${equipped ? "EQUIPPED" : occupied.length >= copies ? "SWAP" : "EQUIP"}</b></button>`;
    }).join("")}<button type="button" class="gear-choice gear-unequip" data-equip="${id}:${selectedGearSlot}:__EMPTY__" ${h.gear[selectedGearSlot] ? "" : "disabled"}>${pixelIconHtml("gear-empty", choiceIndex, "gear-choice-icon")}<span><strong>Unequip</strong><small>Move this piece back to the Items inventory.</small></span><b>${h.gear[selectedGearSlot] ? "REMOVE" : "EMPTY"}</b></button></div></section>`;
    el.menuBody.innerHTML = `<p class="gear-instruction">Choose a hero, then choose one of their five equipment slots.</p><div class="gear-roster">${roster}</div><div class="gear-layout"><section class="gear-summary"><strong>${h.name}</strong><small>${h.title} / ${h.element}</small><div class="gear-stat-grid"><span>STR <b>${totalsNow.str}</b></span><span>AGI <b>${totalsNow.agi}</b></span><span>MAG <b>${totalsNow.mag}</b></span><span>STAM <b>${totalsNow.stam}</b></span><span>HP <b>${h.hp}/${totalsNow.max}</b></span><span>MP <b>${h.mp}/${totalsNow.mp}</b></span></div></section><section class="menu-card gear-card">${slots}</section></div>${picker}`;
    el.menuBody.querySelectorAll("[data-gear-hero]").forEach(btn => btn.onclick = () => {
      selectedGearHero = btn.dataset.gearHero;
      selectedGearSlot = "weapon";
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-gear-slot]").forEach(btn => btn.onclick = () => {
      selectedGearSlot = btn.dataset.gearSlot;
      renderMenu();
    });
    el.menuBody.querySelectorAll("[data-equip]").forEach(btn => btn.onclick = () => equipGear(btn.dataset.equip));
  }
  if (menuTab === "items") {
    const stash = Object.entries(state.stash).filter(([, amount]) => amount > 0);
    const bag = Object.entries(state.inventory).filter(([, amount]) => amount > 0);
    const itemCard = ([name, amount]) => {
      const info = inventoryInfo(name);
      const battleEffect = info.battle ? `<small class="item-effect">Battle / field: ${info.short}</small>` : "";
      const icon = inventoryIcon(name);
      const targets = info.field ? `<div class="field-targets"><span>Use on</span>${state.party.map(id => {
        const hero = baseJobs[id], total = totals(id);
        const canUse = canUseFieldItem(name, id);
        const value = info.field === "hp" ? `${hero.hp}/${total.max} HP` : info.field === "mp" ? `${hero.mp}/${total.mp} MP` : state.fieldWard ? "Ward ready" : "Prepare ward";
        return `<button type="button" data-field-item="${name}:${id}" ${canUse ? "" : "disabled"}>${hero.name}<small>${value}</small></button>`;
      }).join("")}</div>` : "";
      return `<div class="menu-card item-card">${pixelIconHtml(icon.sheet, icon.index, "inventory-icon")}<div class="item-copy"><strong>${name}<span>x${amount}</span></strong><small>${info.type}</small><p>${info.desc}</p>${battleEffect}${targets}</div></div>`;
    };
    const equipment = state.ownedGear.map(name => gearByName(name)).filter(Boolean);
    const equipmentCard = gear => {
      const holders = equippedGearUsers(gear.name);
      const copies = gearCopyCount(gear.name);
      const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot];
      const iconHero = holders[0] || gearOwners[gear.name]?.[0] || state.activeParty[0];
      const status = holders.length ? `Equipped by ${holders.join(", ")} (${holders.length}/${copies})` : `Unequipped (${copies} owned)`;
      return `<div class="menu-card item-card gear-inventory-card">${pixelIconHtml(gearIconSheet(gear, iconHero), iconIndex, "inventory-icon")}<div class="item-copy"><strong>${gear.name}<span>x${copies}</span></strong>${gearRarityHtml(gear.name)}<small>${gear.slot.toUpperCase()} / ${status}</small><p>${statLine(gear.stats)}. ${gear.desc}</p>${gearEffectHtml(gear, "item-effect")}${gearAffixHtml(gear.name)}</div></div>`;
    };
    const fieldSkills = state.party.flatMap(casterId => baseJobs[casterId].skills
      .filter(sk => sk.anim !== "ultimate" && (sk.power < 0 || sk.anim === "block"))
      .map((sk, skillIndex) => ({ casterId, sk, skillIndex: baseJobs[casterId].skills.indexOf(sk) })));
    const fieldSkillCards = fieldSkills.map(({ casterId, sk, skillIndex }) => {
      const caster = baseJobs[casterId];
      const heal = sk.power < 0 ? Math.round((Math.abs(sk.power) + totals(casterId).mag * .6) * (1 + talentValue(casterId, "healBoost"))) : 0;
      const partyHeal = sk.partyWide || talentValue(casterId, "partyHeal", sk.name) > 0;
      const effectText = [heal ? `Heals about ${heal} HP${partyHeal ? " for all living allies" : ""}` : "", sk.anim === "block" ? "prepares an opening party ward" : ""].filter(Boolean).join(" and ");
      return `<div class="menu-card field-skill-card"><strong>${caster.name}: ${sk.name}</strong><small>${sk.cost} MP / ${effectText}</small><p>${sk.desc}</p><div class="field-targets"><span>Cast on</span>${(partyHeal && heal ? [state.party[0]] : state.party).map(targetId => {
        const target = baseJobs[targetId], targetTotal = totals(targetId);
        const anyoneNeedsHealing = state.party.some(heroId => baseJobs[heroId].hp > 0 && baseJobs[heroId].hp < totals(heroId).max);
        const canUse = caster.mp >= sk.cost && (sk.anim === "block" && !state.fieldWard || heal > 0 && (partyHeal ? anyoneNeedsHealing : target.hp < targetTotal.max));
        return `<button type="button" data-field-skill="${casterId}:${skillIndex}:${targetId}" ${canUse ? "" : "disabled"}>${partyHeal && heal ? "All allies" : target.name}<small>${partyHeal && heal ? "Party heal" : `${target.hp}/${targetTotal.max} HP`}</small></button>`;
      }).join("")}</div></div>`;
    }).join("");
    el.menuBody.innerHTML = `<div class="wallet-line"><span>Wallet</span><strong>${state.gold} G</strong><span>Bag ${inventoryUsed()}/${state.inventorySlots}</span><span>${state.fieldWard ? "Opening ward prepared" : "No field ward"}</span></div><h3>Items</h3><div class="menu-grid">${bag.length ? bag.map(itemCard).join("") : `<div class="menu-card"><strong>Bag empty</strong><p>No consumables or materials are being carried.</p></div>`}</div><h3>Field Skills</h3><div class="menu-grid">${fieldSkillCards || `<div class="menu-card"><strong>No field support skill available</strong><p>Recruit a healer or support hero to cast outside combat.</p></div>`}</div><h3>Equipment Inventory</h3><div class="menu-grid">${equipment.map(equipmentCard).join("")}</div>${stash.length ? `<h3>Marla's Stash</h3><div class="menu-grid">${stash.map(itemCard).join("")}</div>` : ""}`;
    el.menuBody.querySelectorAll("[data-field-item]").forEach(button => button.onclick = () => useFieldItem(button.dataset.fieldItem));
    el.menuBody.querySelectorAll("[data-field-skill]").forEach(button => button.onclick = () => useFieldSkill(button.dataset.fieldSkill));
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
    el.menuBody.innerHTML = `<h3>Issue Chronicle</h3><div class="menu-grid">${knownIssues.length ? knownIssues.map((q, i) => `<div class="menu-card"><strong>Issue ${i + 1}: ${q[0]}</strong><p>${q[2]}</p><p>${q[1]}</p></div>`).join("") : `<div class="menu-card"><strong>No issue recorded</strong><p>Your chronicle begins when someone entrusts you with a quest.</p></div>`}</div><h3>Rare & Miniboss Field Notes</h3><div class="menu-grid">${fieldNotes.map(spawnPoint => `<div class="menu-card"><strong>${spawnPoint.name}</strong><small>${spawnPoint.rare ? "RARE SPAWN" : "ONE-TIME MINIBOSS"} / ${state.flags[`spawn:${spawnPoint.id}`] ? "DEFEATED" : spawnPoint.available ? "ACTIVE" : "DORMANT"}</small><p>${spawnPoint.lore}</p><p>${spawnPoint.boss ? "Does not respawn." : `Rare return window: roughly ${spawnPoint.respawn}-${spawnPoint.respawn + 30}s.`}</p></div>`).join("")}</div>`;
  }
  if (menuTab === "system") {
    const postgame = state.flags.endingComplete ? `<section class="postgame-panel"><header><strong>Postgame Unlocked</strong><span>Echo Hunt Rank ${state.endgameRank} / New Game Plus ${state.ngPlus}</span></header><p>Echo Hunts grow stronger every clear and guarantee at least one Legendary gear drop with four affixes. New Game Plus carries levels, milestone choices, companions, equipment, items and gold into zones that scale toward level 40, expanded legendary loot tables and new Stonewake and Reverie boss quests.</p><div><button type="button" data-endgame-hunt>Start Echo Hunt ${state.endgameRank + 1}</button><button type="button" data-new-game-plus>Begin New Game Plus</button></div></section>` : `<section class="postgame-panel is-locked"><strong>Postgame</strong><p>Complete Issue 4 to unlock repeatable Echo Hunts and New Game Plus.</p></section>`;
    el.menuBody.innerHTML = `<div class="menu-grid"><div class="menu-card"><strong>Combat</strong><p>AGI creates one shared turn order. Poison, Sleep, Stun and timed buffs are processed consistently each turn.</p></div><div class="menu-card"><strong>Levels & Skills</strong><p>The level cap is 40. New two-way skill choices unlock at levels 25, 30, 35 and 40.</p></div><div class="menu-card"><strong>Loot & Gold</strong><p>Dropped equipment can gain readable rarity-based affixes without replacing its fixed stats or unique effect.</p></div><div class="menu-card"><strong>World</strong><p>Regions keep their story level bands; New Game Plus and Echo Hunts grow toward level 40.</p></div></div>${postgame}`;
    el.menuBody.querySelector("[data-endgame-hunt]")?.addEventListener("click", startEndgameHunt);
    el.menuBody.querySelector("[data-new-game-plus]")?.addEventListener("click", beginNewGamePlus);
  }
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
  if (!gear || gear.slot !== slot || !state.ownedGear.includes(name) || !canEquip(id, gear)) return;
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
    { name: "Redacted Witnesses", enemies: [rankedEnemy("Dawn Null", 92, 14, "Sound", "#4f6570", 2, "Wrong Bell"), rankedEnemy("Redacted Witness", 82, 13, "Holy Fire", "#413044", 1, "Ash Scribe")] },
    { name: "First Ember Memory", enemies: [rankedEnemy("First Ember Memory", 116, 16, "Shadow", "#6a3552", 2, "Ash Wyrm"), rankedEnemy("Orphaned Sigil", 96, 15, "Tech", "#8a6640", 1, "Seal Bearer")] },
    { name: "Dawn Gate Recalibration", enemies: [rankedEnemy("Dawn Gate Sentinel", 148, 19, "Ancient Fire", "#58616b", 2, "Gate Lock")] },
    { name: "Stonewake Shadows", enemies: [rankedEnemy("Shade", 104, 18, "Holy Fire", "#4b2633", 2, "Shade", true), rankedEnemy("Grumm", 132, 20, "Sound", "#755034", 1, "Grumm", true)] },
    { name: "Lantern Name-Runners", enemies: [rankedEnemy("Marla", 110, 17, "Shadow", "#8a5b3d", 2, "Marla", true), rankedEnemy("Harl", 118, 19, "Tech", "#5b4a40", 1, "Harl", true)] },
    { name: "Stonewake Command", enemies: [rankedEnemy("Kaeldrin", 138, 22, "Sound", "#62554a", 2, "Kaeldrin", true), rankedEnemy("Lyrsa", 124, 21, "Shadow", "#4c556b", 1, "Lyrsa", true)] },
    { name: "Reverie Counter-Echo", enemies: [rankedEnemy("Nyx", 106, 20, "Holy Fire", "#473c62", 1, "Nyx", true), rankedEnemy("Rava", 126, 21, "Earth", "#43685a", 2, "Rava", true), rankedEnemy("Jory", 116, 23, "Sound", "#755247", 3, "Jory", true)] }
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
  activeVendor = id;
  vendorTab = "buy";
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

function vendorWares(id) {
  const vendor = vendors[id];
  if (!vendor) return [];
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
  const unlockedRank = Math.min(20, Math.max(state.echoForgeRank || 0, state.endgameRank || 0));
  echoForgeGear.filter(gear => gear.echoRank <= unlockedRank).forEach(gear => {
    wares.push({ kind: "gear", name: gear.name, price: gear.price });
  });
  return wares;
}

function renderVendor() {
  const vendor = vendors[activeVendor];
  if (!vendor) return closeVendor();
  const wares = vendorWares(activeVendor);
  const stashEntries = Object.entries(state.stash).filter(([, amount]) => amount > 0);
  const buyList = `<div class="shop-list">${wares.map((ware, index) => {
    const gear = ware.kind === "gear" ? gearByName(ware.name) : null;
    const owned = ware.kind === "gear" && state.ownedGear.includes(ware.name);
    const price = ware.kind === "upgrade" ? bagUpgradePrice(ware.basePrice) : ware.price;
    const full = ware.kind === "item" && inventoryUsed() >= state.inventorySlots;
    const effects = gear ? gearEffectLabels(gear) : [];
    const generatedAffixes = gear ? RARITY_AFFIX_COUNTS[gearRarity(gear.name)] || 0 : 0;
    const rollText = gear && (echoForgeGearNames.has(gear.name) || zoneStarterGear.includes(gear)) ? ` Rolls ${generatedAffixes} random affix${generatedAffixes === 1 ? "" : "es"} when purchased.` : "";
    const details = gear ? `${gearRarity(gear.name)}. ${statLine(gear.stats)}. ${gear.desc}${effects.length ? ` Special: ${effects.join(" / ")}.` : ""}${rollText}` : ware.desc;
    const icon = gear
      ? pixelIconHtml(gearIconSheet(gear, gearOwners[gear.name]?.[0] || state.party[0]), { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot], "shop-icon")
      : (() => { const itemIcon = inventoryIcon(ware.name); return pixelIconHtml(itemIcon.sheet, itemIcon.index, "shop-icon"); })();
    return `<div class="shop-row">${icon}<div><strong>${ware.name}</strong><small>${details}</small></div><span>${price} G</span><button type="button" data-buy="${index}" ${owned || full || state.gold < price ? "disabled" : ""}>${owned ? "Owned" : full ? "Full" : "Buy"}</button></div>`;
  }).join("")}</div>${activeVendor === "marla" && stashEntries.length ? `<h3>Safe Stash</h3><div class="shop-list">${stashEntries.map(([name, amount], index) => {
    const stashIcon = inventoryIcon(name);
    return `<div class="shop-row">${pixelIconHtml(stashIcon.sheet, stashIcon.index, "shop-icon")}<div><strong>${name}</strong><small>Stored after a full inventory.</small></div><span>x${amount}</span><button type="button" data-take-stash="${index}" ${inventoryUsed() >= state.inventorySlots ? "disabled" : ""}>Take</button></div>`;
  }).join("")}</div>` : ""}`;
  const sellItems = Object.entries(state.inventory).filter(([name, amount]) => amount > 0 && inventorySellPrice(name) > 0);
  const sellGear = state.ownedGear.map(name => gearByName(name)).filter(gear => gear && gearSellPrice(gear) > 0 && gearCopyCount(gear.name) > equippedGearUsers(gear.name).length);
  const sellList = `<div class="shop-list">${sellItems.map(([name, amount]) => {
    const info = inventoryInfo(name);
    const icon = inventoryIcon(name);
    return `<div class="shop-row">${pixelIconHtml(icon.sheet, icon.index, "shop-icon")}<div><strong>${name} x${amount}</strong><small>${info.type}. ${info.desc}</small></div><span>${inventorySellPrice(name)} G</span><button type="button" data-sell-kind="item" data-sell-name="${name}">Sell 1</button></div>`;
  }).join("")}${sellGear.map(gear => {
    const iconIndex = { weapon: 0, armour: 1, ring: 2, necklace: 3, helmet: 4 }[gear.slot];
    const available = gearCopyCount(gear.name) - equippedGearUsers(gear.name).length;
    return `<div class="shop-row">${pixelIconHtml(gearIconSheet(gear, state.party[0]), iconIndex, "shop-icon")}<div><strong>${gear.name} x${available} spare</strong><small>${gearRarity(gear.name)}. ${statLine(gear.stats)}. ${gear.desc}</small>${gearAffixHtml(gear.name)}</div><span>${gearSellPrice(gear)} G</span><button type="button" data-sell-kind="gear" data-sell-name="${gear.name}">Sell 1</button></div>`;
  }).join("")}${!sellItems.length && !sellGear.length ? `<div class="shop-empty"><strong>Nothing sellable</strong><p>Key items, quest materials, equipped pieces and character-bound signature gear stay with the Flameguard.</p></div>` : ""}</div>`;
  const forgeRank = Math.min(20, Math.max(state.echoForgeRank || 0, state.endgameRank || 0));
  const shopNote = activeVendor === "workshop"
    ? `Echo Forge rank ${forgeRank}/20. Every cleared Echo Hunt rank unlocks two different Legendary all-hero upgrades here, each with a fixed Echo effect and four random affixes. NG+ also unlocks improved consumables.`
    : "Rare effect gear normally comes from battles and quests. Spare general gear can be sold after it is unequipped.";
  el.menuBody.innerHTML = `<div class="shop-head"><div><strong>${vendor.name}</strong><p>${vendor.blurb}</p></div><div class="shop-wallet">${state.gold} G / BAG ${inventoryUsed()}/${state.inventorySlots}</div><button type="button" data-close-shop aria-label="Close shop">X</button></div><div class="shop-mode-tabs"><button type="button" data-shop-tab="buy" class="${vendorTab === "buy" ? "is-active" : ""}">Buy</button><button type="button" data-shop-tab="sell" class="${vendorTab === "sell" ? "is-active" : ""}">Sell</button></div>${vendorTab === "buy" ? buyList : sellList}<p class="shop-note">${shopNote}</p>`;
  el.menuBody.querySelector("[data-close-shop]").onclick = closeVendor;
  el.menuBody.querySelectorAll("[data-shop-tab]").forEach(button => button.onclick = () => {
    vendorTab = button.dataset.shopTab;
    renderVendor();
  });
  el.menuBody.querySelectorAll("[data-buy]").forEach(button => button.onclick = () => buyWare(Number(button.dataset.buy)));
  el.menuBody.querySelectorAll("[data-sell-kind]").forEach(button => button.onclick = () => sellVendorItem(button.dataset.sellKind, button.dataset.sellName));
  el.menuBody.querySelectorAll("[data-take-stash]").forEach(button => button.onclick = () => takeFromStash(stashEntries[Number(button.dataset.takeStash)]?.[0]));
}

function inventorySellPrice(name) {
  const info = inventoryInfo(name);
  if (["Key Item", "Quest Material", "Miniboss Trophy", "Boss Trophy"].includes(info.type)) return 0;
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
    "Orphan Ember Thread": 34
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
    const gear = gearByName(name);
    const price = gearSellPrice(gear);
    if (!price || gearCopyCount(name) <= equippedGearUsers(name).length) return;
    state.gearCopies[name] = Math.max(0, gearCopyCount(name) - 1);
    if (!state.gearCopies[name]) state.ownedGear = state.ownedGear.filter(ownedName => ownedName !== name);
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
  if (ware.kind === "gear" && state.ownedGear.includes(ware.name)) return;
  if (ware.kind === "item" && inventoryUsed() >= state.inventorySlots) return;
  state.gold -= price;
  if (ware.kind === "gear") {
    const gear = gearByName(ware.name);
    addOwnedGear(ware.name, 1, { rarity: defaultGearRarity(ware.name), rollAffixes: true, theme: activeVendor === "shelter" ? "ruins" : activeVendor === "workshop" ? "dragon" : activeVendor === "guild" ? "mountain" : "swamp" });
    if (gear && (postgameGearNames.has(gear.name) || echoForgeGearNames.has(gear.name))) topUpGearAffixes(gear.name, gearRarity(gear.name), "dragon");
  }
  else if (ware.kind === "upgrade") {
    state.inventorySlots += 10;
    state.bagUpgrades++;
  } else addInventoryItem(ware.name, 1);
  playSfx("coin");
  updatePanels();
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

function handleControl(control) {
  if (control === "music") return toggleMusic();
  unlockMusic();
  if (mode === "title") {
    if (control === "confirm") activateTitleSelection();
    else if (control === "up" || control === "left") moveTitleSelection(-1);
    else if (control === "down" || control === "right") moveTitleSelection(1);
    return;
  }
  fieldDestination = null;
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
    else if (mode === "menu" || mode === "shop") toggleMenu();
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
    const index = titleMenuPointerIndex(event);
    if (index !== null) {
      titleMenuIndex = index;
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
    handleFieldTap(point.x, point.y);
    return;
  }
  if (mode === "battle") {
    const { x, y } = canvasLogicalPoint(event);
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
    applyBuff: (side, index, type, duration = 3) => {
      const target = side === "party" ? battle.party[index] : battle.enemies[index];
      return applyStatus(target, type, target, { duration, force: true });
    },
    rollAffixes: (name, rarity = "Epic", theme = "mountain") => rollGearAffixes(gearByName(name), rarity, theme),
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
    check("milestones", [25, 30, 35, 40].every(level => SKILL_MILESTONE_LEVELS.includes(level)), SKILL_MILESTONE_LEVELS.join(","));
    check("two-way-late-choices", Object.keys(baseJobs).every(id => [25, 30, 35, 40].every(level => talentTrees[id].filter(entry => entry.level === level).length === 2)));

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
    check("rarity-progression", JSON.stringify(RARITY_AFFIX_COUNTS) === JSON.stringify({ Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 }));
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
    check("status-equipment-breakdown", ["WEAPON", "ARMOUR", "RING", "HELMET"].every(slot => statusEquipmentHtml("Verseborn").includes(slot)));
    const oldStatusWeapon = baseJobs.Verseborn.gear.weapon;
    baseJobs.Verseborn.gear.weapon = "Ashrunner Knife";
    const poisonProc = equippedProcChances("Verseborn").find(entry => entry.type === "poison");
    check("status-proc-breakdown", poisonProc?.raw >= .1 && poisonProc.normalChance > 0);
    baseJobs.Verseborn.gear.weapon = oldStatusWeapon;

    const echoIdentity = echoForgeGear.every(gear => {
      const base = gearByName(gear.echoBase);
      const tier = Math.floor((gear.echoRank - 1) / echoForgeSlots.length);
      const blueprint = echoForgeBlueprints[gear.slot][tier * 2 + gear.echoVariant];
      const unique = gearEffects(gear).filter(effect => effect.echoUnique);
      const inherited = gearEffects(gear).filter(effect => effect.label?.startsWith("Inherited:"));
      return base && gear.echoRarity === "Legendary" && blueprint?.base === gear.echoBase && unique.length === 1 && inherited.length === gearEffects(base).length && Object.entries(base.stats).every(([stat, value]) => gear.stats[stat] > value);
    });
    check("echo-upgrade-identity", echoIdentity);
    check("echo-forge-two-per-rank", echoForgeGear.length === 40 && new Set(echoForgeGear.map(gear => gear.name)).size === 40 && Array.from({ length: 20 }, (_, index) => echoForgeGear.filter(gear => gear.echoRank === index + 1).length === 2).every(Boolean));
    check("echo-forge-all-legendary", echoForgeGear.every(gear => defaultGearRarity(gear.name) === "Legendary"));
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
    check("echo-hunt-guarantee-survives-other-loot", mixedEchoRewards.gearDrops.length === 2 && mixedEchoGuarantee?.rarity === "Legendary" && mixedEchoRewards.drops.some(drop => drop.startsWith("GUARANTEED ECHO HUNT LEGENDARY:")));
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
    progress.level = 25;
    progress.talents = progress.talents.filter(name => !talentTrees.Verseborn.some(entry => entry.level === 25 && entry.name === name));
    toggleTalent("Verseborn:Battle Hymn");
    const oneChoice = progress.talents.includes("Battle Hymn");
    toggleTalent("Verseborn:Sheltering Refrain");
    check("milestone-choice-replaces", oneChoice && !progress.talents.includes("Battle Hymn") && progress.talents.includes("Sheltering Refrain"));
    progress.level = oldLevel;
    progress.talents = oldTalents;
    progress.pendingMilestones = progress.pendingMilestones.filter(level => level <= oldLevel);
    battle = previousBattle;

    const savedBackup = localStorage.getItem(SAVE_KEY);
    const oldGold = state.gold;
    const oldTestAffixes = state.gearAffixes["Ashrunner Knife"];
    battle = null;
    mode = "walk";
    state.gold = 4321;
    state.gearAffixes["Ashrunner Knife"] = rollGearAffixes(gearByName("Ashrunner Knife"), "Rare", "mountain");
    const wroteSave = saveGame();
    state.gold = 1;
    state.gearAffixes["Ashrunner Knife"] = [];
    const loadedSave = loadGame();
    check("save-load-compatible", wroteSave && loadedSave && state.gold === 4321);
    check("affix-save-load", state.gearAffixes["Ashrunner Knife"]?.length === RARITY_AFFIX_COUNTS.Rare);

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
refreshHeroVitals();
updateCodex();
updatePanels();
if (new URLSearchParams(location.search).has("qa")) setTimeout(runQaChecks, 0);
draw();
