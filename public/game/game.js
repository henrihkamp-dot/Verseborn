const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

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
  hint: $("hint")
};

const TILE = 16;
const PLAYER_STEP_TICKS = 17;
const WALK_FRAME_TICKS = 3;
let tick = 0;
let mode = "title";
let menuTab = "status";
let selectedGearHero = "Verseborn";
let selectedGearSlot = "weapon";
let selectedPartySlot = 0;
let activePoint = null;
let talkQueue = [];
let battle = null;
let effect = null;
let codexIndex = 0;
let battleActionIndex = 0;
let heldDirection = null;
let nextHeldMove = 0;
let activeVendor = null;
let vendorTab = "buy";
let audioContext = null;
let screenSlide = null;

const music = {
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
  if (mode === "battle") return "battle";
  return currentMap()?.music === "overworld" ? "overworld" : "inhouse";
}

function updateMusic(force) {
  if (!musicUnlocked || mode === "title" || musicMuted || document.hidden) return;
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
const mapImages = {};
const battleImages = {};
let enemySheet = null;
let enemyAttackSheet = null;
let worldEnemySheet = null;
let npcSheet = null;
let titleImage = null;
let spriteLoadProgress = 0;

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

Promise.all([
  ...Object.keys(spriteScale).map(loadSpriteSheet),
  ...Object.keys(spriteScale).map(loadWalkSpriteSheet),
  loadEnemySheet(),
  loadEnemyAttackSheet(),
  loadWorldEnemySheet(),
  loadNpcSheet(),
  loadTitleImage(),
  ...["ash-quarter", "reverie", "guildspire", "ember-hall", "false-dawn"].map(loadBattleImage),
  ...["lantern", "ash", "reverie", "guildspire", "ember", "alarm", "ash-route", "reverie-route", "guildspire-route", "ember-route", "dawn-route"].map(loadMapImage)
]).then(() => {
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
  ["Lysra", "19_Lysra_Clean_Quest_Manga_Sheet.png"],
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
  item("Ashrunner Knife", "weapon", { str: 2, agi: 2 }, "Affordable Ash Quarter steel for a first route."),
  item("Sootweave Coat", "armour", { agi: 1, stam: 3 }, "Warm, patched and built for narrow streets."),
  item("Shelter Staff", "weapon", { mag: 3, stam: 2 }, "A simple focus used by Reverie wardens."),
  item("Reverie Mantle", "armour", { mag: 2, stam: 3 }, "Protective cloth made to outlast a bad night."),
  item("Guildsteel Saber", "weapon", { str: 4, agi: 1 }, "Standard Guildspire field issue without ceremonial weight."),
  item("Registry Coat", "armour", { agi: 2, stam: 3 }, "Officially practical and practically official."),
  item("Ember Pike", "weapon", { str: 4, mag: 2 }, "Training-yard steel with a restrained ember channel."),
  item("Flameguard Leathers", "armour", { str: 2, stam: 4 }, "Flexible field armour from Ember Hall stores."),
  item("Calibration Rod", "weapon", { mag: 4, agi: 2 }, "A recovered False Dawn tool repurposed as a focus."),
  item("Stormglass Vestment", "armour", { agi: 3, stam: 3 }, "Insulated cloth for the causeway's static winds.")
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
  item("Crownless Edge", "weapon", { str: 8, mag: 8, agi: 4 }, "A general weapon forged from a completed False Dawn loop.", { type: "openingResonance", value: 20, label: "+20 Resonance at battle start" }),
  item("Dawnforged Aegis", "armour", { stam: 10, str: 4 }, "Armour tempered by battles that already happened once.", { type: "blockPower", value: .25, label: "25% stronger personal guard" }),
  item("Loopbreaker Ring", "ring", { str: 6, agi: 6, stam: 3 }, "Its broken circle refuses to repeat a losing turn.", { type: "stagger", value: 2, label: "+2 stagger on weakness hits" }),
  item("Memory Chain", "necklace", { mag: 8, stam: 6 }, "Carries a victory forward without erasing the road behind it.", { type: "battleRegen", value: 18, label: "Restore 18 HP after victory" }),
  item("Starless Visor", "helmet", { mag: 7, agi: 7 }, "Sees the flaw inside a perfected system.", { type: "weaknessDamage", value: .28, label: "+28% weakness damage" })
];
postgameGear.forEach(gear => gearDb[gear.slot].push(gear));

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
  "Echo-Thread Lute": ["Verseborn"],
  "Songbound Rosin": ["Verseborn"],
  "Nightneedle Harness": ["Mira"],
  "Hearthwall Crest": ["Seerin"],
  "Silent Reliquary": ["Kael"],
  "Stonefather Gauntlet": ["Torren"],
  "Impossible Lens": ["Glimmer"],
  "Elder Ember Bell": ["Sparky"]
};

const generalDropGear = new Set([
  ...rareGear.filter(gear => gear.name !== "Echo-Thread Lute"),
  ...questGear,
  ...chestGear,
  ...postgameGear
].map(gear => gear.name));
const postgameGearNames = new Set(postgameGear.map(gear => gear.name));

function gearIconSheet(gear, heroId) {
  if (gear?.name === "Echo-Thread Lute") return "gear-verseborn";
  if (generalDropGear.has(gear?.name)) return "gear-drop";
  return `gear-${heroId.toLowerCase()}`;
}

function gearAccessLabel(gear) {
  if (gear?.name === "Echo-Thread Lute") return "ULTIMATE WEAPON / VERSEBORN ONLY";
  if (chestGear.includes(gear)) return gearOwners[gear.name] ? `EPIC CHEST / ${gearOwners[gear.name][0].toUpperCase()} ONLY` : "EPIC CHEST / ALL HEROES";
  if (postgameGearNames.has(gear?.name)) return "ENDGAME DROP / ALL HEROES";
  if (generalDropGear.has(gear?.name)) return "FOUND GEAR / ALL HEROES";
  const owners = gearOwners[gear?.name];
  return owners ? `SIGNATURE / ${owners.join(" + ")}` : "GENERAL GEAR / ALL HEROES";
}

function item(name, slot, stats, desc, effect = null) {
  return { name, slot, stats, desc, effect };
}

const inventoryDb = {
  "Marla's Soup": { type: "Food / HP", desc: "Restores 24 HP to a chosen hero, in or outside battle.", battle: "hp", field: "hp", value: 24, short: "HP +24" },
  "Clockwork Tonic": { type: "Tonic / MP", desc: "Restores 18 MP to a chosen hero, in or outside battle.", battle: "mp", field: "mp", value: 18, short: "MP +18" },
  "Ash Ward": { type: "Ward / Guard", desc: "Halves incoming party damage for one enemy turn. Outside battle it prepares an opening ward.", battle: "guard", field: "guard", value: 1, short: "Party Guard" },
  "Old Registry Key": { type: "Key Item", desc: "Opens an old registry lock in the Ash Quarter." },
  "Ledger Scrap": { type: "Battle Loot", desc: "Discarded ledger paper. Useful to collectors and clerks." },
  "Iron Chain Link": { type: "Quest Material", desc: "A sturdy repair part requested by Marla." },
  "Broken Wax Seal": { type: "Battle Loot", desc: "A clergy seal with its command broken." },
  "Ash Ink": { type: "Quest Material", desc: "Ink recovered from an Ash Scribe." },
  "Resonant Stone": { type: "Crafting Material", desc: "Stone that still hums after battle." },
  "False Dawn Cog": { type: "Rare Material", desc: "A calibrated cog from the False Dawn system." },
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
  const itemIcons = { "Marla's Soup": 0, "Clockwork Tonic": 1, "Ash Ward": 2, "Old Registry Key": 3 };
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

function character(name, title, element, color, hair, trim, stats, gear, skills) {
  return { name, title, element, color, hair, trim, stats, gear: slotsFrom(gear), skills, hp: 1, mp: 1 };
}

function slotsFrom(names) {
  return { weapon: names[0], armour: names[1], ring: names[2], necklace: names[3], helmet: names[4] };
}

function skill(name, anim, element, power, cost, desc) {
  return { name, anim, element, power, cost, desc };
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
  party: ["Verseborn", "Mira"],
  activeParty: ["Verseborn", "Mira"],
  gold: 180,
  inventory: { "Marla's Soup": 4, "Clockwork Tonic": 2, "Ash Ward": 1, "Old Registry Key": 1 },
  inventorySlots: 30,
  bagUpgrades: 0,
  stash: {},
  ownedGear: [...new Set(["Verseborn", "Mira"].flatMap(id => Object.values(baseJobs[id].gear)))],
  gearCopies: ["Verseborn", "Mira"].flatMap(id => Object.values(baseJobs[id].gear)).reduce((copies, name) => {
    copies[name] = (copies[name] || 0) + 1;
    return copies;
  }, {}),
  endgameRank: 0,
  ngPlus: 0,
  escort: null,
  fieldWard: false,
  flags: {}
};

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
  "Dawn Gate Sentinel": loot([110, 145], [["Sentinel Core", 1, 1]], [["Wyrmheart Ember", .7]])
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
  sideQuest("marlaCrate", "A Crate Owed Twice", "Marla", "fetch", { item: "Iron Chain Link", amount: 3 }, { gold: 75, items: { "Marla's Soup": 2 } }, "Bring Marla three chain links for repairs under the Lantern."),
  sideQuest("nyxInk", "Ink That Remembers", "Nyx", "kill", { names: ["Ash Scribe"], amount: 3 }, { gold: 110, items: { "Clockwork Tonic": 2 } }, "Defeat three returning Ash Scribes and recover what their ink observed."),
  sideQuest("harlEscort", "A Name Walks Home", "Harl", "escort", { map: "lantern" }, { gold: 125, items: { "Ash Ward": 2 } }, "Escort Harl safely from the ledger house back to the Drunk Lantern."),
  sideQuest("ravaWave", "Nobody Crosses This Yard", "Rava", "wave", { waves: 3 }, { gold: 150, gear: "Rava's Guard Ring" }, "Hold the Reverie dormitory through three escalating clergy waves."),
  sideQuest("rareLore", "Names Outside the Ledger", "Nyx", "rare", { amount: 2 }, { gold: 240, gear: "Nyx's Margin Note" }, "Find and defeat two lore-marked rare spawns across Cindervale.")
];

function sideQuest(id, title, giver, type, target, reward, desc, status = "unseen") {
  return { id, title, giver, type, target, reward, desc, status, progress: 0 };
}

const maps = {
  lantern: map("The Drunk Lantern", "Issue 1", "lantern", [{ x: 14, y: 8, to: "ashLane", tx: 2, ty: 8 }], [
    point(4, 7, "Marla", [["Marla", "Soup first. Heroics after. Harl vanished near the old dock ledger room."], ["Verseborn", "A missing man, a tavern tab, and a song waiting to be wrong. Classic start."], ["Marla", "Find Harl. Start at the Ledger Docks, and bring him home."]], "acceptIssue1", undefined, "marla", "marlaCrate"),
    point(7, 7, "Harl", [["Harl", "I am staying close to the Lantern until my name stops moving without me."], ["Marla", "He carries mugs. I keep an eye on the door."]], undefined, "quest:harlEscort", undefined, "harlEscort"),
    point(8, 5, "Stage", [["Verseborn", "The first song is not a spell. It is a room agreeing to feel the same thing."]])
  ], ["A1 - Opening Tavern", "Home base, vendor, side quests and a safe return point."], { grid: [0, 2], gridSize: [5, 5] }),

  ashLane: map("Ash Quarter - Sootline Alley", "Issue 1", "ash", [{ x: 1, y: 8, to: "lantern", tx: 13, ty: 8 }, { x: 14, y: 8, to: "sootMarket", tx: 2, ty: 8 }, { x: 8, y: 5, to: "ledgerHouse", tx: 2, ty: 8 }], [
    chest(5, 7, "ash-songbound", { gear: "Songbound Rosin", gold: 24 })
  ], ["A2 - Sootline Alley", "A residential route with returning street threats."], { background: "ash-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 6, 14, 10]], grid: [1, 2], gridSize: [5, 5], spawns: [
    spawn("ash-ledger-1", 9, 8, "Soot Ledger Prowlers", [enemy("Ledger Cutter", 52, 8, "Sound", "#71513e", 2)], { respawn: 24 }),
    spawn("ash-rare-auditor", 12, 7, "Rare: Inkbound Auditor", [enemy("Inkbound Auditor", 94, 13, "Holy Fire", "#40304f", 2, "Ash Scribe")], { respawn: 105, rare: true, lore: "A clerk erased from every registry except its own ink." })
  ] }),

  sootMarket: map("Ash Quarter - Soot Market", "Issue 1", "ash", [{ x: 1, y: 8, to: "ashLane", tx: 13, ty: 8 }, { x: 14, y: 8, to: "ashDock", tx: 2, ty: 8 }, { x: 8, y: 11, to: "ledgerHouse", tx: 8, ty: 11 }], [
    chest(5, 7, "ash-cinderbite", { gear: "Cinderbite Edge", items: { "Marla's Soup": 1 } })
  ], ["A3 - Soot Market", "The main route branches into a searchable ledger house."], { background: "ash-route", panorama: true, view: 1, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [2, 2], gridSize: [5, 5], spawns: [
    spawn("market-chain-1", 11, 8, "Chain Runners", [enemy("Chain Warden", 64, 9, "Shadow", "#4a4542", 1)], { respawn: 30 })
  ] }),

  ashDock: map("Ash Quarter - Ledger Docks", "Issue 1", "ash", [{ x: 1, y: 8, to: "sootMarket", tx: 13, ty: 8 }, { x: 14, y: 8, to: "reverieCourt", tx: 2, ty: 8, needs: "issue1" }], [
    point(7, 7, "Mira", [["Mira", "The route is physical. The lie is administrative. Together, that makes a dungeon."], ["Mira", "Draw your lute."]], "harbor"),
    chest(4, 8, "ash-echo", { gear: "Echo Collector", gold: 30 })
  ], ["A4 - Ledger Docks", "The first story battle sits beyond two explorable field units."], { background: "ash-route", panorama: true, view: 2, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [3, 2], gridSize: [5, 5], spawns: [
    spawn("dock-foreman", 11, 8, "Miniboss: Dock Foreman", [enemy("Dock Foreman", 126, 15, "Tech", "#403b39", 2, "Chain Warden")], { boss: true, lore: "The foreman kept moving names after the orders stopped." })
  ] }),

  ledgerHouse: map("Old Ledger House", "Issue 1", "ash", [{ x: 8, y: 12, to: "sootMarket", tx: 8, ty: 10 }, { x: 1, y: 8, to: "ashLane", tx: 8, ty: 6 }], [
    point(10, 5, "Harl", [["Harl", "They were not moving people under false names. They moved the names first."], ["Mira", "Reverie Orphanage. Fire Clergy seal."]], "issue1", "harborWon", undefined, "harlEscort"),
    chest(4, 7, "ash-nightneedle", { gear: "Nightneedle Harness", items: { "Clockwork Tonic": 1 } })
  ], ["A3b - Ledger House", "Optional interior, clue room and escort side quest."], { background: "ash", collision: "ash", grid: [2, 1], gridSize: [5, 5] }),

  reverieCourt: map("Reverie - Courtyard", "Issue 2", "reverie", [{ x: 1, y: 8, to: "ashDock", tx: 13, ty: 8 }, { x: 14, y: 8, to: "reverieDorm", tx: 2, ty: 8 }, { x: 8, y: 4, to: "reverieArchive", tx: 2, ty: 8, needs: "clergyWon" }], [
    point(6, 7, "Seerin", [["Seerin", "You may inspect the building. You may not take a child."], ["Seerin", "My oath is to life. You are confusing that with authority."]], "clergy"),
    chest(4, 8, "reverie-hearthwall", { gear: "Hearthwall Crest", gold: 38 })
  ], ["B1 - Shelter Courtyard", "Protection comes before institutional permission."], { background: "reverie-route", panorama: true, view: 0, views: 3, walkable: [[1, 5, 14, 10]], grid: [3, 3], gridSize: [5, 5], spawns: [
    spawn("court-seal-1", 11, 8, "Clergy Seal Patrol", [enemy("Seal Bearer", 70, 10, "Shadow", "#9d5436", 1)], { respawn: 38 })
  ] }),

  reverieDorm: map("Reverie - Dormitory Wing", "Issue 2", "reverie", [{ x: 1, y: 8, to: "reverieCourt", tx: 13, ty: 8 }, { x: 14, y: 8, to: "reverieSeal", tx: 2, ty: 8 }, { x: 8, y: 11, to: "reverieArchive", tx: 8, ty: 11 }], [
    point(6, 7, "Nyx", [["Nyx", "Adults pretend punctuation cannot hurt people."], ["Nyx", "The supply locker is less interesting than the archive. It is still useful."]], undefined, undefined, "shelter", "nyxInk"),
    point(10, 7, "Rava", [["Rava", "Three waves. No speeches. Keep them away from the little kids."]], "ravaWave"),
    chest(4, 8, "reverie-silent", { gear: "Silent Reliquary", items: { "Ash Ward": 1 } })
  ], ["B2 - Dormitory Wing", "NPC side quests and a wave-defense encounter live off the main route."], { background: "reverie-route", panorama: true, view: 1, views: 3, walkable: [[1, 5, 14, 10]], grid: [4, 3], gridSize: [5, 5], spawns: [
    spawn("dorm-scribe-1", 12, 8, "Ash Scribe Remnant", [enemy("Ash Scribe", 58, 8, "Sound", "#6d5948", 2)], { respawn: 34 })
  ] }),

  reverieSeal: map("Reverie - Sealed Hall", "Issue 2", "reverie", [{ x: 1, y: 8, to: "reverieDorm", tx: 13, ty: 8 }, { x: 14, y: 8, to: "guildSteps", tx: 2, ty: 8, needs: "issue2" }], [
    chest(6, 8, "reverie-roadwarden", { gear: "Roadwarden Plate", gold: 42 })
  ], ["B3 - Sealed Hall", "A cold threshold and a rare lore encounter."], { background: "reverie-route", panorama: true, view: 2, views: 3, walkable: [[1, 5, 14, 10]], grid: [4, 4], gridSize: [5, 5], spawns: [
    spawn("reverie-rare-sigil", 9, 7, "Rare: Orphaned Sigil", [enemy("Orphaned Sigil", 108, 14, "Tech", "#b9a274", 2, "Seal Bearer")], { respawn: 120, rare: true, lore: "A protection rite that outlived the priest who abandoned it." })
  ] }),

  reverieArchive: map("Reverie - Clergy Archive", "Issue 2", "reverie", [{ x: 8, y: 12, to: "reverieDorm", tx: 8, ty: 10 }, { x: 1, y: 8, to: "reverieCourt", tx: 8, ty: 5 }], [
    point(7, 7, "Kael", [["Kael", "I will keep the seal. Not as obedience. As evidence."]], "issue2", "clergyWon"),
    chest(5, 7, "reverie-echo", { gear: "Echo Collector", items: { "Clockwork Tonic": 1 } })
  ], ["B2b - Clergy Archive", "A short moral dungeon interior with a permanent custodian miniboss."], { background: "reverie", collision: "reverie", grid: [3, 4], gridSize: [5, 5], spawns: [
    spawn("archive-custodian", 11, 7, "Miniboss: Archive Custodian", [enemy("Archive Custodian", 142, 16, "Earth", "#6d5948", 2, "Ash Scribe")], { boss: true, lore: "It files people under the rules they broke." })
  ] }),

  guildSteps: map("Guildspire - Crown Steps", "Issue 3", "guildspire", [{ x: 1, y: 8, to: "reverieSeal", tx: 13, ty: 8 }, { x: 14, y: 8, to: "guildRegistry", tx: 2, ty: 8 }, { x: 6, y: 3, to: "guildCouncil", tx: 2, ty: 8, needs: "registered" }], [
    chest(4, 8, "guild-stonefather", { gear: "Stonefather Gauntlet", gold: 50 })
  ], ["C1 - Crown Steps", "The route opens into a formal three-unit civic hub."], { background: "guildspire-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 4, 14, 10]], grid: [1, 1], gridSize: [3, 3] }),

  guildRegistry: map("Guildspire - Registry", "Issue 3", "guildspire", [{ x: 1, y: 8, to: "guildSteps", tx: 13, ty: 8 }, { x: 14, y: 8, to: "guildHall", tx: 2, ty: 8 }, { x: 8, y: 11, to: "guildCouncil", tx: 8, ty: 2 }], [
    point(8, 6, "Kaeldrin", [["Kaeldrin", "Stonewake is already assigned. Efficiency matters."], ["Glimmer", "I fixed the test machine."], ["Kaeldrin", "Good. Maintain it."], ["Kaeldrin", "The requisitions desk has approved field equipment."]], "registry", undefined, "guild"),
    chest(4, 8, "guild-fleetglass", { gear: "Fleetglass Circlet", items: { "Ash Ward": 1 } })
  ], ["C2 - Registry", "Main registration, equipment vendor and a branch to the council chamber."], { background: "guildspire-route", panorama: true, view: 1, views: 3, walkable: [[1, 4, 14, 10]], grid: [2, 1], gridSize: [3, 3] }),

  guildHall: map("Guildspire - Audience Hall", "Issue 3", "guildspire", [{ x: 1, y: 8, to: "guildRegistry", tx: 13, ty: 8 }, { x: 14, y: 8, to: "emberYard", tx: 2, ty: 8, needs: "registered" }], [
    point(8, 6, "Lysra", [["Lysra", "Mira Veln refusing privilege is still a privilege. Fascinating posture."]]),
    chest(5, 8, "guild-cinderbite", { gear: "Cinderbite Edge", gold: 55 })
  ], ["C3 - Audience Hall", "Political dialogue and a rare archive apparition."], { background: "guildspire-route", panorama: true, view: 2, views: 3, walkable: [[1, 4, 14, 10]], grid: [2, 2], gridSize: [3, 3], spawns: [
    spawn("guild-rare-witness", 12, 8, "Rare: Redacted Witness", [enemy("Redacted Witness", 118, 15, "Ancient Fire", "#4d4167", 2, "Wrong Bell")], { respawn: 135, rare: true, lore: "A testimony removed from the record but not from the hall." })
  ] }),

  guildCouncil: map("Guildspire - Council Chamber", "Issue 3", "guildspire", [{ x: 8, y: 1, to: "guildRegistry", tx: 8, ty: 10 }, { x: 1, y: 8, to: "guildSteps", tx: 6, ty: 4 }], [
    point(11, 8, "Torren", [["Torren", "I am not here to earn an old place back. I am here to build a new one."]], "torren", "registered"),
    chest(5, 8, "guild-emberwell", { gear: "Emberwell Chain", items: { "Marla's Soup": 2 } })
  ], ["C2b - Council Chamber", "A branch room for Torren's return and later contracts."], { background: "guildspire", collision: "guildspire", grid: [1, 2], gridSize: [3, 3] }),

  emberYard: map("Ember Hall - Training Yard", "Issue 3", "ember", [{ x: 1, y: 8, to: "guildHall", tx: 13, ty: 8 }, { x: 14, y: 8, to: "emberHearth", tx: 2, ty: 8 }, { x: 8, y: 2, to: "emberCellar", tx: 2, ty: 8, needs: "torren" }], [
    chest(4, 8, "ember-lens", { gear: "Impossible Lens", gold: 60 })
  ], ["D1 - Training Yard", "A broad home-base field with repeatable training constructs."], { background: "ember-route", panorama: true, view: 0, views: 5, music: "overworld", walkable: [[1, 3, 14, 11]], grid: [0, 2], gridSize: [5, 5], spawns: [
    spawn("yard-construct", 9, 8, "Training Construct", [enemy("Buried Construct", 78, 11, "Earth", "#6f5540", 1)], { respawn: 22 })
  ] }),

  emberHearth: map("Ember Hall - Hearth Room", "Issue 3", "ember", [{ x: 1, y: 8, to: "emberYard", tx: 13, ty: 8 }, { x: 14, y: 8, to: "emberWorkshop", tx: 2, ty: 8 }, { x: 8, y: 11, to: "emberCellar", tx: 8, ty: 2 }], [
    chest(4, 8, "ember-bell", { gear: "Elder Ember Bell", items: { "Marla's Soup": 1 } })
  ], ["D2 - Hearth Room", "The route branches down into the resonance cellar."], { background: "ember-route", panorama: true, view: 1, views: 5, walkable: [[1, 4, 14, 10]], grid: [1, 2], gridSize: [5, 5] }),

  emberWorkshop: map("Ember Hall - Workshop", "Issue 3", "ember", [{ x: 1, y: 8, to: "emberHearth", tx: 13, ty: 8 }, { x: 14, y: 8, to: "emberArmory", tx: 2, ty: 8 }], [
    point(9, 7, "Sparky", [["Sparky", "Prrrp."], ["Verseborn", "Tiny dragon. Ancient heart. Absolutely coming with us."]], "sparky", "emberWon", "workshop")
  ], ["D3 - Workshop", "Recruit Sparky, buy crafted gear and inspect Glimmer's machines."], { background: "ember-route", panorama: true, view: 2, views: 5, walkable: [[1, 4, 14, 10]], grid: [2, 2], gridSize: [5, 5] }),

  emberArmory: map("Ember Hall - Armory Passage", "Issue 3", "ember", [{ x: 1, y: 8, to: "emberWorkshop", tx: 13, ty: 8 }, { x: 14, y: 8, to: "emberRoof", tx: 2, ty: 8 }], [
    chest(5, 8, "ember-roadwarden", { gear: "Roadwarden Plate", items: { "Ash Ward": 1 } })
  ], ["D4 - Armory Passage", "A combat-ready branch with respawning equipment husks."], { background: "ember-route", panorama: true, view: 3, views: 5, walkable: [[1, 4, 14, 10]], grid: [3, 2], gridSize: [5, 5], spawns: [
    spawn("armory-pillar", 10, 8, "Cracked Armory Pillar", [enemy("Cracked Pillar", 74, 9, "Tech", "#55473c", 2)], { respawn: 31 })
  ] }),

  emberRoof: map("Ember Hall - Roof Watch", "Issue 3", "ember", [{ x: 1, y: 8, to: "emberArmory", tx: 13, ty: 8 }, { x: 14, y: 8, to: "dawnCauseway", tx: 2, ty: 8, needs: "sparky" }], [
    chest(5, 8, "ember-echo", { gear: "Echo Collector", gold: 68 })
  ], ["D5 - Roof Watch", "The home-base grid ends at the road to False Dawn."], { background: "ember-route", panorama: true, view: 4, views: 5, walkable: [[1, 4, 14, 10]], grid: [4, 2], gridSize: [5, 5], spawns: [
    spawn("roof-rare-memory", 10, 7, "Rare: First Ember Memory", [enemy("First Ember Memory", 124, 16, "Sigil", "#5a2f52", 3, "Ash Wyrm")], { respawn: 145, rare: true, lore: "A dragon memory that recognizes Sparky before anyone else does." })
  ] }),

  emberCellar: map("Ember Hall - Resonance Cellar", "Issue 3", "ember", [{ x: 8, y: 1, to: "emberHearth", tx: 8, ty: 10 }, { x: 1, y: 8, to: "emberYard", tx: 8, ty: 3 }], [
    point(6, 7, "Torren", [["Torren", "Tell me what has to stay still."], ["Verseborn", "Us, preferably."]], "ember")
  ], ["D2b - Resonance Cellar", "A permanent story encounter beneath the branching home base."], { background: "ember", collision: "ember", grid: [1, 3], gridSize: [5, 5] }),

  dawnCauseway: map("False Dawn - Storm Causeway", "Issue 4", "alarm", [{ x: 1, y: 8, to: "emberRoof", tx: 13, ty: 8 }, { x: 14, y: 8, to: "dawnStation", tx: 2, ty: 8 }], [
    chest(4, 8, "dawn-songbound", { gear: "Songbound Rosin", gold: 72 })
  ], ["E1 - Storm Causeway", "A consistent high-altitude tech dungeon begins."], { background: "dawn-route", panorama: true, view: 0, views: 3, music: "overworld", walkable: [[1, 5, 14, 10]], grid: [0, 1], gridSize: [3, 3], spawns: [
    spawn("dawn-bell-1", 9, 8, "Wrong Bell Patrol", [enemy("Wrong Bell", 78, 11, "Tech", "#a66a35", 2)], { respawn: 42 })
  ] }),

  dawnStation: map("False Dawn - Calibration Station", "Issue 4", "alarm", [{ x: 1, y: 8, to: "dawnCauseway", tx: 13, ty: 8 }, { x: 14, y: 8, to: "dawnGate", tx: 2, ty: 8 }], [
    point(4, 7, "Field Clerk", [["Field Clerk", "The central system marked these supplies obsolete. Locally, they still work."], ["Verseborn", "That is becoming a theme."]], undefined, undefined, "dawn"),
    chest(6, 8, "dawn-nightneedle", { gear: "Nightneedle Harness", items: { "Clockwork Tonic": 2 } })
  ], ["E2 - Calibration Station", "Side platforms hold regular and rare system remnants."], { background: "dawn-route", panorama: true, view: 1, views: 3, walkable: [[1, 5, 14, 10]], grid: [1, 1], gridSize: [3, 3], spawns: [
    spawn("station-lock-1", 8, 8, "Calibration Husk", [enemy("Gate Lock", 76, 10, "Earth", "#58616b", 1)], { respawn: 45 }),
    spawn("dawn-rare-null", 12, 7, "Rare: Dawn Null", [enemy("Dawn Null", 132, 17, "Sound", "#26353e", 2, "Wrong Bell")], { respawn: 160, rare: true, lore: "A local truth the central alarm failed to overwrite." })
  ] }),

  dawnGate: map("False Dawn - Exterior Gate", "Issue 4", "alarm", [{ x: 1, y: 8, to: "dawnStation", tx: 13, ty: 8 }, { x: 14, y: 8, to: "alarm", tx: 2, ty: 8, needs: "spawn:gate-sentinel" }], [
    chest(5, 8, "dawn-emberwell", { gear: "Emberwell Chain", items: { "Ash Ward": 2 } })
  ], ["E3 - Exterior Gate", "The gate sentinel is a miniboss and never respawns."], { background: "dawn-route", panorama: true, view: 2, views: 3, walkable: [[1, 5, 14, 10]], grid: [2, 1], gridSize: [3, 3], spawns: [
    spawn("gate-sentinel", 10, 8, "Miniboss: Dawn Gate Sentinel", [enemy("Dawn Gate Sentinel", 168, 18, "Ancient Fire", "#58616b", 1, "Gate Lock")], { boss: true, lore: "The last lock between command and observation." })
  ] }),

  alarm: map("False Dawn - Alarm Core", "Issue 4", "alarm", [{ x: 1, y: 8, to: "dawnGate", tx: 13, ty: 8 }], [
    point(5, 7, "Glimmer", [["Glimmer", "The alarm is not broken. It is obeying the wrong truth."], ["Glimmer", "Everything stays still except me."]], "dawn"),
    point(10, 5, "Glimmer", [["Kaeldrin", "Your rank still stands."], ["Glimmer", "I know. You came back when you needed the machine. They came when they needed me."], ["Glimmer", "Also, the parts bench is open. Do not lick anything glowing."]], "ending", "dawnWon", "workshop"),
    chest(8, 8, "dawn-fleetglass", { gear: "Fleetglass Circlet", gold: 90 }, "dawnWon")
  ], ["E4 - Alarm Core", "Story boss and ending; its bosses never join the respawn pool."], { background: "alarm", collision: "alarm", grid: [2, 2], gridSize: [3, 3] })
};

function map(name, chapter, set, exits, points, beat, options = {}) {
  return { name, chapter, set, exits, points, beat, spawns: [], ...options };
}

function point(x, y, id, text, event, needs, vendor, quest) {
  return { x, y, id, text, event, needs, vendor, quest };
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
    [1, 1, 5, 4], [10, 1, 14, 4], [7, 1, 8, 2],
    [1, 5, 3, 7], [12, 5, 14, 7], [1, 9, 5, 12], [10, 9, 14, 12]
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
    [1, 1, 6, 3], [8, 1, 14, 4], [7, 1, 7, 5],
    [7, 8, 7, 12], [1, 9, 5, 12], [8, 8, 10, 9], [12, 7, 14, 12]
  ]
};

const fieldPathMasks = {
  ashLane: [[1, 5, 14, 8], [7, 5, 9, 7]],
  sootMarket: [[1, 5, 14, 8], [7, 7, 9, 11]],
  ashDock: [[1, 5, 10, 8], [9, 7, 14, 8]],
  reverieCourt: [[1, 6, 14, 9], [3, 4, 5, 9], [7, 4, 9, 8]],
  reverieDorm: [[1, 6, 14, 9], [7, 7, 9, 11]],
  reverieSeal: [[1, 6, 14, 9], [12, 4, 14, 9]],
  guildSteps: [[1, 5, 14, 9], [5, 2, 7, 9]],
  guildRegistry: [[1, 5, 14, 9], [7, 5, 9, 11]],
  guildHall: [[1, 5, 14, 9]],
  emberYard: [[1, 2, 11, 10], [10, 5, 14, 9]],
  emberHearth: [[1, 3, 14, 10], [7, 8, 9, 11]],
  emberWorkshop: [[1, 4, 14, 10]],
  emberArmory: [[1, 4, 14, 10]],
  emberRoof: [[1, 3, 14, 10]],
  dawnCauseway: [[1, 7, 9, 8], [8, 5, 14, 9]],
  dawnStation: [[1, 7, 6, 8], [5, 5, 9, 8], [6, 4, 13, 6], [12, 5, 14, 8]],
  dawnGate: [[1, 7, 8, 8], [7, 4, 10, 8], [9, 3, 14, 8]]
};

const npc = {
  Marla: ["#6b4a38", "#2c1d18", "#d9c0a0"],
  Stage: ["#6f5238", "#1c1820", "#ffd27d"],
  Harl: ["#80624e", "#2c241e", "#bfa06a"],
  Nyx: ["#1e2a46", "#0b0b13", "#b58a3e"],
  Rava: ["#26342f", "#427065", "#d8b08b"],
  Kaeldrin: ["#10233f", "#111018", "#d9c07b"],
  Lysra: ["#f2eee6", "#f2f2ec", "#6b4bb0"],
  "Field Clerk": ["#26353e", "#b08a55", "#7bd4c6"]
};

function gearByName(name) {
  return Object.values(gearDb).flat().find(g => g.name === name);
}

function addOwnedGear(name, amount = 1) {
  if (!name || amount < 1) return;
  if (!state.ownedGear.includes(name)) state.ownedGear.push(name);
  state.gearCopies[name] = (state.gearCopies[name] || 0) + amount;
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

function effectValue(id, type) {
  return Object.values(baseJobs[id].gear).reduce((total, name) => {
    const effect = gearByName(name)?.effect;
    return total + (effect?.type === type ? effect.value : 0);
  }, 0);
}

function totals(id) {
  const h = baseJobs[id];
  const out = { ...h.stats };
  Object.values(h.gear).forEach(name => {
    const g = gearByName(name);
    if (!g) return;
    Object.entries(g.stats).forEach(([k, v]) => out[k] = (out[k] || 0) + v);
  });
  const max = 30 + out.stam * 4;
  const mp = 12 + out.mag * 3;
  return { ...out, max, mp };
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
  if (!worldEnemySheet) return;
  const enemyUnit = spawnPoint.enemies[0];
  const index = enemySpriteIndex(enemyUnit.sprite || enemyUnit.name);
  const cell = worldEnemySheet.cells[index];
  const width = cell.w;
  const height = cell.h;
  if (!Number.isFinite(spawnPoint.renderX)) spawnPoint.renderX = spawnPoint.x * TILE;
  if (!Number.isFinite(spawnPoint.renderY)) spawnPoint.renderY = spawnPoint.y * TILE;
  const targetX = spawnPoint.x * TILE;
  const targetY = spawnPoint.y * TILE;
  const moving = spawnPoint.renderX !== targetX || spawnPoint.renderY !== targetY;
  spawnPoint.renderX = approach(spawnPoint.renderX, targetX, 2);
  spawnPoint.renderY = approach(spawnPoint.renderY, targetY, 2);
  const stride = moving ? [0, -1, 0, 1][Math.floor(tick / 5) % 4] : (Math.floor((tick + spawnPoint.phase) / 28) % 4 === 1 ? -1 : 0);
  const sway = moving ? [0, 1, 0, -1][Math.floor(tick / 5) % 4] : 0;
  const offsetY = fieldRenderOffsetY();
  const x = Math.round(spawnPoint.renderX + 8 - width / 2 + sway);
  const y = Math.round(spawnPoint.renderY + 17 + offsetY - height + stride);
  drawFieldShadow(spawnPoint.renderX + 8, spawnPoint.renderY + 17 + offsetY, spawnPoint.boss ? 10 : 7);
  ctx.drawImage(worldEnemySheet.image, cell.x, cell.y, cell.w, cell.h, x, y, width, height);
  if (spawnPoint.rare) drawSubtlePulse(spawnPoint.renderX + 8, spawnPoint.renderY + 8 + offsetY, 0, "#bca2ff", 156);
  if (spawnPoint.boss) drawText("!", spawnPoint.renderX + 8, spawnPoint.renderY - 12 + offsetY, "#ffcf73", 8, "center");
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
    let symbol = "^^", x = centerX, y = centerY + phase;
    if (exit.x <= 1) { symbol = "<<"; x = centerX + phase; y = centerY; }
    else if (exit.x >= 14) { symbol = ">>"; x = centerX - phase; y = centerY; }
    else if (exit.y >= 10) { symbol = "vv"; y = centerY - phase; }
    drawRect(centerX - 8, centerY - 7, 16, 12, objective ? "#392619dd" : "#100d15aa");
    drawRect(centerX - 6, centerY + 5, 12, 1, objective ? "#ffd66d" : unlocked ? "#d59b4266" : "#4f424866");
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

function drawSprite(id, px, py, dir = 0, anim = "idle", frame = tick) {
  const h = baseJobs[id];
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
  const actionT = effect ? Math.min(24, effect.t) : 0;
  let motionX = 0;
  let motionY = 0;
  if (battlePose && anim === "idle") {
    const idle = battleIdleMotion(id, frame);
    motionX = idle[0];
    motionY = idle[1];
  }
  if (battlePose && anim === "melee") motionX = Math.round(Math.sin((actionT / 24) * Math.PI) * 8);
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
    drawText("♪", px + 8, py + 18 + (Math.floor(frame / 12) % 2), "#ffd27d", 9, "center");
    return;
  }
  const rows = { Marla: 0, Harl: 1, Nyx: 2, Rava: 3, Kaeldrin: 4, Lysra: 5 };
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
  if (titleImage) ctx.drawImage(titleImage, 0, 0, canvas.width, canvas.height);
  else drawRect(0, 0, canvas.width, canvas.height, "#121015");
  drawRect(34, 43, 188, 87, "#090b19c7");
  ctx.strokeStyle = "#9f7045";
  ctx.strokeRect(37, 46, 182, 81);
  drawText("VERSEBORN", 128, 73, "#ffd27d", 20, "center");
  drawText("GETTING STARTED", 128, 94, "#f0d8aa", 9, "center");
  drawText("THE FALSE DAWN", 128, 111, "#c89561", 7, "center");
  drawText(spriteLoadProgress < 7 ? `SPRITES ${spriteLoadProgress}/7` : "Z / ENTER", 128, 145, "#fff1c6", 8, "center");
  const starPhase = tick % 180;
  if (starPhase < 24) drawSubtlePulse(104, 24, 0, "#c4a9ff", 180);
}

function drawTileMap() {
  if (screenSlide) {
    drawScreenSlide();
    return;
  }
  const map = currentMap();
  const p = palettes[map.set];
  const offsetY = fieldRenderOffsetY();
  const background = mapImages[map.background || map.set];
  if (background) drawMapBackground(map, background);
  else drawRect(0, 0, canvas.width, canvas.height, p[2]);
  drawAmbient(map.set, map.panorama);
  drawExitMarkers();
  visibleSpawns().forEach(spawnPoint => drawWorldEnemy(spawnPoint));
  visiblePoints().forEach(point => {
    if (point.chest) {
      drawChest(point);
      return;
    }
    drawFieldShadow(point.x * TILE + 8, point.y * TILE + 17 + offsetY, point.id === "Kaeldrin" ? 9 : 7);
    drawSprite(point.id, point.x * TILE, point.y * TILE - 7 + offsetY, 0, "idle");
  });
  drawObjectiveMarker();
  if (state.escort) {
    drawFieldShadow(state.renderX + 3, state.renderY + 28 + offsetY, 7);
    drawSprite(state.escort, state.renderX - 13, state.renderY - 3 + offsetY, state.facing, tick < state.walkUntil ? "walk" : "idle");
  }
  updateRenderPosition();
  drawFieldShadow(state.renderX + 8, state.renderY + 25 + offsetY, spriteScale[state.activeParty[0]]?.field[0] > 30 ? 10 : 7);
  drawSprite(state.activeParty[0], state.renderX, state.renderY - 7 + offsetY, state.facing, tick < state.walkUntil ? "walk" : "idle");
  const labelSize = map.name.length > 29 ? 7 : map.name.length > 23 ? 8 : 9;
  drawText(map.name, 9, 13, "#0b090d", labelSize);
  drawText(map.name, 8, 12, "#ffe0a1", labelSize);
}

function drawChest(pointData) {
  const x = pointData.x * TILE + 2;
  const y = pointData.y * TILE + 4 + fieldRenderOffsetY();
  const opened = state.flags[`chest:${pointData.chest.id}`];
  drawFieldShadow(x + 6, y + 12, 7);
  drawRect(x, y + (opened ? 4 : 2), 12, 8, "#3a2117");
  drawRect(x + 1, y + (opened ? 3 : 1), 10, 3, opened ? "#6f4827" : "#b17436");
  drawRect(x + 5, y + 5, 2, 4, "#f1c663");
  drawRect(x + 1, y + 10, 10, 2, "#171018");
  if (!opened && tick % 150 < 12) drawSubtlePulse(x + 6, y - 2, 0, "#ffe29a", 150);
}

function drawMapBackground(map, image, offsetX = 0, offsetY = 0) {
  if (!Number.isFinite(map.view)) {
    ctx.drawImage(image, offsetX, offsetY, canvas.width, canvas.height);
    return;
  }
  const views = Math.max(2, map.views || 2);
  const cropWidth = Math.min(image.width, Math.round(image.height * canvas.width / canvas.height));
  const maxX = Math.max(0, image.width - cropWidth);
  const sourceX = Math.round(maxX * map.view / (views - 1));
  ctx.drawImage(image, sourceX, 0, cropWidth, image.height, offsetX, offsetY, canvas.width, canvas.height);
}

function drawScreenSlide() {
  screenSlide.t++;
  const progress = Math.min(1, screenSlide.t / 14);
  const ease = progress * progress * (3 - 2 * progress);
  const dx = screenSlide.dx * canvas.width;
  const dy = screenSlide.dy * canvas.height;
  const fromImage = mapImages[screenSlide.from.background || screenSlide.from.set];
  const toImage = mapImages[screenSlide.to.background || screenSlide.to.set];
  drawRect(0, 0, canvas.width, canvas.height, "#0b0910");
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

function drawBattleScene() {
  const map = currentMap();
  const arenaId = battleArenaFor(map);
  const background = battleImages[arenaId];
  if (background) drawBattleBackground(background, arenaId);
  else drawRect(0, 0, canvas.width, canvas.height, "#17212a");
  drawRect(0, 0, canvas.width, 154, "#07101a24");

  const partyLayouts = {
    1: [[55, 122]],
    2: [[43, 105], [76, 134]],
    3: [[42, 96], [76, 121], [42, 147]]
  };
  const partyPositions = partyLayouts[Math.min(3, battle.party.length)] || partyLayouts[3];
  battle.party.forEach((unit, index) => {
    const [anchorX, baseline] = partyPositions[index];
    drawFieldShadow(anchorX, baseline + 1, unit.id === "Torren" ? 14 : 10);
    drawSprite(unit.id, anchorX - 24 + battleOffset(unit), baseline - 52, 0, unit.anim || "idle", tick);
  });

  const enemyPositions = battle.enemies.length === 1
    ? [[198, 105]]
    : battle.enemies.length === 2
      ? [[181, 79], [214, 126]]
      : [[178, 61], [215, 101], [181, 141]];
  battle.enemies.forEach((enemyUnit, index) => {
    if (enemyUnit.hp <= 0 && !enemyUnit.defeatUntil) enemyUnit.defeatUntil = tick + 12;
    if (enemyUnit.hp <= 0 && tick >= enemyUnit.defeatUntil) return;
    const [anchorX, baseline] = enemyPositions[index] || [190, 105];
    if (enemyUnit.hp <= 0) ctx.globalAlpha = Math.max(0, (enemyUnit.defeatUntil - tick) / 12);
    drawFieldShadow(anchorX, baseline + 1, enemySpriteIndex(enemyUnit.sprite || enemyUnit.name) >= 6 ? 15 : 11);
    drawEnemy(enemyUnit, anchorX - 8 + battleOffset(enemyUnit), baseline - 31);
    ctx.globalAlpha = 1;
  });
  drawEffect();
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
  const targetHeight = 154;
  const sourceHeight = Math.min(image.height, Math.round(image.width * targetHeight / canvas.width));
  const sourceY = Math.max(0, Math.floor((image.height - sourceHeight) / 2));
  ctx.drawImage(image, 0, sourceY, image.width, sourceHeight, 0, 0, canvas.width, targetHeight);
  drawBattleAmbient(arenaId);
  drawRect(0, targetHeight, canvas.width, canvas.height - targetHeight, "#11101a");
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

function drawEnemy(e, px, py) {
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
  const x = effect.x, y = effect.y;
  if (effect.kind === "melee") {
    drawRect(x - effect.t * 2, y - 8, 24, 3, "#fff0bc");
    drawRect(x - effect.t, y - 2, 18, 2, "#e07136");
  }
  if (effect.kind === "block") {
    ctx.strokeStyle = "#f5d68b";
    for (let i = 0; i < 3; i++) ctx.strokeRect(x - 12 - i * 3, y - 20 - i * 3, 24 + i * 6, 28 + i * 6);
  }
  if (effect.kind === "magic") {
    for (let i = 0; i < 8; i++) drawSpark(x + Math.cos((tick + i * 9) / 8) * (8 + effect.t), y + Math.sin((tick + i * 7) / 8) * (8 + effect.t), effect.color, tick + i);
  }
  if (effect.kind === "ultimate") {
    drawRect(0, 0, canvas.width, canvas.height, effect.t % 8 < 4 ? "#fff3" : "#0004");
    for (let i = 0; i < 18; i++) drawSpark((i * 31 + tick * 3) % canvas.width, 30 + ((i * 17 + tick) % 150), effect.color, tick + i);
  }
  if (effect.t > 24) effect = null;
}

function drawAtlas() {
  drawRect(0, 0, canvas.width, canvas.height, "#9eb3b3");
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
  drawRect(0, 0, canvas.width, canvas.height, "#111016");
  drawText("MENU", 12, 18, "#ffd27d", 12);
  state.activeParty.forEach((id, i) => {
    drawSprite(id, 8 + i * 34, 56, 0, "idle", tick + i * 3);
  });
}

function draw() {
  tick++;
  if (mode === "walk" && heldDirection && tick >= nextHeldMove) {
    handleControl(heldDirection);
    nextHeldMove = tick + PLAYER_STEP_TICKS;
  }
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
  el.place.textContent = map.name;
  el.questTitle.textContent = q ? q[0] : "No active quest";
  el.questText.textContent = q ? `Next: ${objective.label}.` : "Speak with Marla at the counter.";
  el.beatTitle.textContent = map.beat[0];
  el.beatText.textContent = map.beat[1];
  el.resonanceBar.style.width = `${Math.min(100, state.resonance)}%`;
  el.gold.textContent = `${state.gold} G`;
  el.partyPanel.innerHTML = state.activeParty.map(id => {
    const h = baseJobs[id], t = totals(id);
    return `<div class="hero-row"><span class="dot" style="background:${h.color}"></span><strong>${h.name}<small>${h.title} / STR ${t.str} AGI ${t.agi} MAG ${t.mag} STAM ${t.stam}</small></strong><span>${h.hp}/${t.max}</span></div>`;
  }).join("");
}

function updateCodex() {
  const [name, file] = codex[codexIndex];
  el.codexImage.src = `assets/${file}`;
  el.codexName.textContent = name;
}

function terrainPassable(x, y, mapId = state.map) {
  if (x < 1 || x > 14 || y < 1 || y > 12) return false;
  const map = maps[mapId];
  const paths = fieldPathMasks[mapId] || map.walkable;
  if (paths && !paths.some(([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2)) return false;
  if ((collisionMasks[map.collision || mapId] || []).some(([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2)) return false;
  return true;
}

function passable(x, y) {
  if (!terrainPassable(x, y)) return false;
  if (visiblePoints().some(p => p.x === x && p.y === y)) return false;
  return !visibleSpawns().some(spawnPoint => Math.abs(spawnPoint.x - x) <= (spawnPoint.boss ? 1 : 0) && Math.abs(spawnPoint.y - y) <= (spawnPoint.boss ? 1 : 0));
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
  const enemies = encounter.enemies.map(unit => ({ ...unit, hp: unit.max, stagger: 0, anim: "idle", animTick: 0 }));
  startBattle(encounter.name, enemies, undefined, encounter);
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
  if (mode !== "walk") return;
  state.facing = facing;
  const nx = state.x + dx, ny = state.y + dy;
  const exit = currentMap().exits.find(e => e.x === nx && e.y === ny && (!e.needs || state.flags[e.needs]));
  if (exit) {
    const from = currentMap();
    state.map = exit.to;
    state.x = exit.tx;
    state.y = exit.ty;
    state.renderX = state.x * TILE;
    state.renderY = state.y * TILE;
    screenSlide = { from, to: currentMap(), dx: Math.sign(dx), dy: Math.sign(dy), t: 0 };
    mode = "transition";
    checkSideQuestMap(state.map);
    updatePanels();
    updateMusic();
    return;
  }
  const encounter = visibleSpawns().find(spawnPoint => spawnPoint.boss
    ? Math.abs(spawnPoint.x - nx) <= 1 && Math.abs(spawnPoint.y - ny) <= 1
    : spawnPoint.x === nx && spawnPoint.y === ny);
  if (encounter) {
    beginFieldEncounter(encounter);
    return;
  }
  if (passable(nx, ny)) {
    state.x = nx;
    state.y = ny;
    state.walkUntil = tick + PLAYER_STEP_TICKS;
  }
}

function interact() {
  unlockMusic();
  if (mode === "title") {
    mode = "walk";
    updateMusic();
    showTalk([["Narrator", "Issue 1: The Man With the Enormous Voice"], ["Verseborn", "A warm room, a quiet stage, and Marla looking like she has work for me."]]);
    return;
  }
  if (mode === "talk") return nextTalk();
  if (mode !== "walk") return;
  const encounter = visibleSpawns().find(spawnPoint => Math.abs(spawnPoint.x - state.x) + Math.abs(spawnPoint.y - state.y) <= 1 + (spawnPoint.boss ? 1 : 0));
  if (encounter) return beginFieldEncounter(encounter);
  const p = visiblePoints().find(pt => Math.abs(pt.x - state.x) + Math.abs(pt.y - state.y) <= 1);
  if (p) {
    activePoint = p;
    showTalk([...pointDialogue(p), ...questPreview(p.quest)]);
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

function showTalk(lines) {
  mode = "talk";
  talkQueue = lines.slice();
  nextTalk();
}

function nextTalk() {
  const line = talkQueue.shift();
  if (!line) {
    el.dialogue.classList.add("hidden");
    mode = "walk";
    const completedPoint = activePoint;
    activePoint = null;
    if (completedPoint && completedPoint.event) runEvent(completedPoint.event);
    if (completedPoint && completedPoint.quest) processQuestGiver(completedPoint.quest);
    if (completedPoint?.id === "Marla" && questById("harlEscort")?.status === "ready") completeSideQuest("harlEscort");
    if (completedPoint?.chest) openChest(completedPoint);
    if (completedPoint && completedPoint.vendor && mode === "walk") openVendor(completedPoint.vendor);
    return;
  }
  el.speaker.textContent = line[0];
  el.line.textContent = line[1];
  el.dialogue.classList.remove("hidden");
}

function openChest(pointData) {
  const chestData = pointData?.chest;
  if (!chestData || state.flags[`chest:${chestData.id}`]) return;
  state.flags[`chest:${chestData.id}`] = true;
  const reward = chestData.reward || {};
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
    addOwnedGear(reward.gear);
    found.push(`EPIC: ${reward.gear}`);
  }
  playSfx("item");
  updatePanels();
  showTalk([["Treasure", found.join(" / ") || "The chest contains only a faded Flameguard ribbon."]]);
}

function runEvent(event) {
  if (state.flags[event]) return;
  state.flags[event] = true;
  if (event === "acceptIssue1") { state.quest = 0; showTalk([["Quest", "Ash Boy's First Verse accepted."], ["Marla", "Follow the marked route east. Mira is watching the Ledger Docks."]]); }
  if (event === "harbor") startBattle("Harbor Name-Thieves", [enemy("Ledger Cutter", 58, 9, "Sound", "#71513e", 2), enemy("Chain Warden", 68, 10, "Shadow", "#4a4542", 1)], "harborWon");
  if (event === "issue1") { state.quest = 1; state.resonance += 12; showTalk([["Mira", "Next stop: Reverie. This is no longer just a dock case."]]); }
  if (event === "clergy") { addParty("Seerin"); startBattle("Fire Clergy Assessors", [enemy("Seal Bearer", 74, 10, "Shadow", "#9d5436", 1), enemy("Ash Scribe", 60, 8, "Sound", "#6d5948", 2)], "clergyWon"); }
  if (event === "issue2") { addParty("Kael"); state.quest = 2; state.resonance += 15; showTalk([["Kael", "Faith under pressure is still faith. Obedience under pressure is only fear."]]); }
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
  if (event === "sparky") { addParty("Sparky"); state.quest = 3; state.resonance += 18; showTalk([["Sparky", "Prrrp!"], ["Verseborn", "Tiny dragon. Ancient heart. Family."]]); }
  if (event === "dawn") { addParty("Glimmer"); startBattle("False Dawn System", [enemy("Wrong Bell", 82, 11, "Tech", "#a66a35", 2), enemy("Gate Lock", 78, 10, "Earth", "#58616b", 1), enemy("Ash Wyrm", 72, 12, "Ancient Fire", "#5a2f52", 3)], "dawnWon"); }
  if (event === "ending") {
    state.resonance = 100;
    state.flags.endingComplete = true;
    showTalk([["Narrator", "The Flameguard is complete."], ["Glimmer", "I can improve unstable."], ["System", "Postgame Echo Hunts and New Game Plus are now available from the System menu."]]);
  }
  updatePanels();
}

function addParty(id) {
  if (!state.party.includes(id)) state.party.push(id);
  if (!state.activeParty.includes(id) && state.activeParty.length < 3) state.activeParty.push(id);
  Object.values(baseJobs[id].gear).forEach(name => {
    addOwnedGear(name);
  });
}

function enemy(name, hp, atk, weak, color, node, sprite = null) {
  const ngScale = 1 + state.ngPlus * .28;
  const scaledHp = Math.round(hp * 3.15 * ngScale);
  const scaledAtk = Math.round(atk * (1 + state.ngPlus * .18));
  const stats = {
    str: scaledAtk,
    agi: Math.max(4, Math.round(5 + node * 3 + atk * .55 + state.ngPlus * 2)),
    mag: Math.max(3, Math.round(atk * .72 + (weak === "Tech" || weak === "Sound" ? 3 : 0))),
    stam: Math.max(5, Math.round(hp / 10 + node * 2))
  };
  return { name, hp: scaledHp, max: scaledHp, atk: scaledAtk, stats, weak, color, node, sprite, stagger: 0, row: 1, anim: "idle", animTick: 0 };
}

function battleUnit(id) {
  const h = baseJobs[id], t = totals(id);
  return { id, name: h.name, hp: h.hp, max: t.max, mp: h.mp, maxmp: t.mp, row: id === "Mira" || id === "Glimmer" || id === "Kael" || id === "Sparky" ? 1 : 0, anim: "idle" };
}

function startBattle(name, enemies, winFlag, spawnRef = null, waves = []) {
  mode = "battle";
  const preparedWard = Boolean(state.fieldWard);
  state.fieldWard = false;
  battle = { name, enemies, party: state.activeParty.slice(0, 3).map(battleUnit), winFlag, spawnRef, waves: waves.slice(), defeated: [], ward: preparedWard, resolving: false, itemMode: false, targetMode: false, pendingSkill: null, turnQueue: [], turnIndex: 0, round: 1 };
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
    ...battle.party.filter(unit => unit.hp > 0).map(unit => ({ side: "party", id: unit.id, name: unit.name, agi: totals(unit.id).agi })),
    ...battle.enemies.map((unit, index) => ({ side: "enemy", index, name: unit.name, agi: unit.stats.agi })).filter(turn => battle.enemies[turn.index].hp > 0)
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

function runCurrentTurn(log) {
  while (currentTurn() && !turnIsAlive(currentTurn())) battle.turnIndex++;
  if (!currentTurn()) {
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
  if (turn.side === "enemy") {
    battle.resolving = true;
    renderBattle(`${log} ${turn.name} moves next.`);
    setTimeout(() => resolveEnemyTurn(turn, log), 430);
    return;
  }
  battle.resolving = false;
  const unit = battle.party.find(member => member.id === turn.id);
  if (unit) unit.guarding = false;
  renderBattle(`${log} ${turn.name}: choose a command.`);
}

function finishTurn(log) {
  battle.itemMode = false;
  battle.targetMode = false;
  battle.pendingSkill = null;
  hideBattlePreview();
  battle.turnIndex++;
  runCurrentTurn(log);
}

function renderBattle(log) {
  el.battleLog.textContent = log;
  el.battleResonance.style.width = `${Math.max(0, Math.min(100, state.resonance))}%`;
  const turn = currentTurn();
  renderTurnOrder();
  el.partyRows.innerHTML = battle.party.map(unit => unitHtml(unit, turn?.side === "party" && turn.id === unit.id ? "is-active" : "")).join("");
  el.enemyRows.innerHTML = battle.enemies.map(e => unitHtml({ name: `${e.name} - Weak: ${e.weak}`, hp: e.hp, max: e.max })).join("");
  el.actions.innerHTML = "";
  el.actions.classList.toggle("is-items", battle.itemMode);
  if (battle.resolving) return;
  if (!turn || turn.side !== "party") return;
  const u = battle.party.find(unit => unit.id === turn.id);
  if (!u || u.hp <= 0) return finishTurn("A fallen ally loses their turn.");
  if (battle.itemMode) return renderBattleItems(u);
  if (battle.targetMode) return renderBattleTargets(u);
  baseJobs[u.id].skills.forEach(sk => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = sk.name;
    b.disabled = sk.anim === "ultimate" ? state.resonance < 100 : sk.cost > u.mp;
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
  if (sk.power < 0) return `Restores ${Math.abs(sk.power)} HP / costs ${sk.cost} MP. ${sk.desc}`;
  if (sk.anim === "block") return `0 damage / costs ${sk.cost} MP. Grants party guard. ${sk.desc}`;
  const statName = sk.anim === "magic" || sk.anim === "ultimate" ? "MAG" : "STR";
  const stat = statName === "MAG" ? t.mag : t.str;
  const low = sk.power + stat;
  const high = low + 5;
  const weaknessBonus = effectValue(u.id, "weaknessDamage");
  const hitsWeakness = target && target.weak === sk.element;
  const targetLow = hitsWeakness ? Math.floor(Math.floor(low * 1.55) * (1 + weaknessBonus)) : low;
  const targetHigh = hitsWeakness ? Math.floor(Math.floor(high * 1.55) * (1 + weaknessBonus)) : high;
  const weakText = weaknessBonus ? ` Weakness hits use x1.55 and another +${Math.round(weaknessBonus * 100)}% from gear.` : " Weakness hits use x1.55 damage.";
  const cost = sk.anim === "ultimate" ? "100 Resonance" : `${sk.cost} MP`;
  const targetText = target ? ` Against ${target.name}: ${targetLow}-${targetHigh} damage${hitsWeakness ? " including weakness" : ""}.` : "";
  return `${sk.element} ${sk.anim} / ${low}-${high} base damage from ${statName} ${stat} / costs ${cost}.${targetText}${weakText} ${sk.desc}`;
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
  return `<div class="unit ${className}"><strong>${u.name}</strong><span>${Math.max(0, u.hp)}/${u.max}</span>${mp}<div class="bar"><span style="width:${pct}%"></span></div></div>`;
}

function chooseSkillTarget(u, sk) {
  const live = battle.enemies.filter(enemyUnit => enemyUnit.hp > 0);
  if (sk.power > 0 && live.length > 1) {
    battle.targetMode = true;
    battle.pendingSkill = sk;
    battleActionIndex = 0;
    return renderBattle(`${u.name}: choose a target for ${sk.name}.`);
  }
  useSkill(u, sk, live[0]);
}

function renderBattleTargets(u) {
  const sk = battle.pendingSkill;
  battle.enemies.filter(enemyUnit => enemyUnit.hp > 0).forEach(enemyUnit => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${enemyUnit.name} | HP ${enemyUnit.hp}/${enemyUnit.max} | Weak: ${enemyUnit.weak}`;
    setBattlePreview(button, `${sk.name} -> ${enemyUnit.name}`, `${skillPreview(u, sk, enemyUnit)} Target weakness: ${enemyUnit.weak}.`);
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
  return Math.round((1 - Math.max(.15, .45 - effectValue(u.id, "blockPower"))) * 100);
}

function useDefend(u) {
  if (battle.resolving) return;
  u.anim = "block";
  u.guarding = true;
  state.resonance = Math.min(100, state.resonance + 6);
  effect = { kind: "block", t: 0, x: 62, y: 105, color: elementColor(baseJobs[u.id].element) };
  playSfx("block");
  setTimeout(() => u.anim = "idle", 650);
  updatePanels();
  finishTurn(`${u.name} defends, reducing the next direct hit by ${defendReduction(u)}% and gaining 6 Resonance.`);
}

function useSkill(u, sk, chosenTarget = null) {
  if (battle.resolving) return;
  if (sk.anim !== "ultimate" && sk.cost > u.mp) return renderBattle(`${u.name} needs more MP.`);
  const live = battle.enemies.filter(e => e.hp > 0);
  const target = chosenTarget?.hp > 0 ? chosenTarget : live[0];
  battle.targetMode = false;
  battle.pendingSkill = null;
  u.anim = sk.anim;
  if (sk.anim !== "ultimate") u.mp -= sk.cost;
  playSfx(sk.anim);
  effect = { kind: sk.anim, t: 0, x: sk.power < 0 ? 62 : 198, y: 100, color: elementColor(sk.element) };
  setTimeout(() => u.anim = "idle", 650);
  let log = `${u.name} uses ${sk.name}.`;
  if (sk.anim === "ultimate") state.resonance = 0;
  if (sk.power < 0) {
    const wounded = battle.party.filter(p => p.hp > 0).sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0] || u;
    wounded.hp = Math.min(wounded.max, wounded.hp + Math.abs(sk.power));
    battle.ward = sk.anim === "block" || sk.anim === "ultimate";
    state.resonance = Math.min(100, state.resonance + 5);
    log += ` ${wounded.name} recovers ${Math.abs(sk.power)}.`;
  } else if (sk.anim === "block") {
    battle.ward = true;
    state.resonance = Math.min(100, state.resonance + 12);
    log += " The party blocks.";
  } else if (target) {
    const t = totals(u.id);
    let dmg = sk.power + (sk.anim === "magic" || sk.anim === "ultimate" ? t.mag : t.str) + Math.floor(Math.random() * 6);
    if (target.weak === sk.element) {
      dmg = Math.floor(dmg * 1.55);
      dmg = Math.floor(dmg * (1 + effectValue(u.id, "weaknessDamage")));
      target.stagger += 2 + effectValue(u.id, "stagger");
      state.resonance = Math.min(100, state.resonance + 14);
      log += " Weakness!";
    } else {
      target.stagger++;
      state.resonance = Math.min(100, state.resonance + 5);
    }
    if (target.stagger >= 3) {
      dmg += 12;
      target.stagger = 0;
      log += " Stagger break!";
    }
    if (sk.name.includes("Silent Step")) target.node = Math.min(3, target.node + 1);
    target.hp -= dmg;
    target.flash = 10;
    setTimeout(() => playSfx("hit"), 90);
    log += ` ${target.name} takes ${dmg}.`;
    const hpOnHit = effectValue(u.id, "hpOnHit");
    const mpOnHit = effectValue(u.id, "mpOnHit");
    if (hpOnHit) {
      const restored = Math.min(hpOnHit, u.max - u.hp);
      u.hp += restored;
      if (restored) log += ` ${u.name} restores ${restored} HP.`;
    }
    if (mpOnHit) {
      const restored = Math.min(mpOnHit, u.maxmp - u.mp);
      u.mp += restored;
      if (restored) log += ` ${u.name} restores ${restored} MP.`;
    }
  }
  updatePanels();
  if (battle.enemies.every(e => e.hp <= 0)) return winBattle(log);
  finishTurn(log);
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
    log += ` HP +${u.hp - before}.`;
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
  e.anim = "attack";
  e.animTick = 0;
  setTimeout(() => { e.anim = "idle"; e.animTick = 0; }, 520);
  const target = liveParty[Math.floor(Math.random() * liveParty.length)];
  let dmg = e.atk + Math.floor(Math.random() * 6);
  let defenseText = "";
  if (target.guarding) {
    const reduction = defendReduction(target);
    dmg = Math.ceil(dmg * (1 - reduction / 100));
    target.guarding = false;
    defenseText = ` ${target.name}'s defense blocks ${reduction}%.`;
  } else if (battle.ward) {
    dmg = Math.ceil(dmg * Math.max(.2, .5 - effectValue(target.id, "blockPower")));
    defenseText = " Party Guard softens the hit.";
  }
  target.hp -= dmg;
  target.flash = 12;
  playSfx(["Wrong Bell", "Gate Lock", "Ash Wyrm"].includes(e.name) ? "boss" : "hit");
  battle.ward = false;
  battle.resolving = false;
  finishTurn(`${e.name} hits ${target.name} for ${dmg}.${defenseText}`);
}

function winBattle(log) {
  battle.defeated.push(...battle.enemies);
  if (battle.waves.length) {
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
    h.hp = Math.max(1, Math.min(totals(u.id).max, u.hp + 10 + effectValue(u.id, "battleRegen")));
    h.mp = u.mp;
  });
  const rewards = rollBattleLoot(battle.defeated);
  if (battle.winFlag === "endgameHuntWon") {
    state.endgameRank++;
    const echoGold = 100 + state.endgameRank * 35;
    const cogs = 1 + Math.floor(state.endgameRank / 3);
    state.gold += echoGold;
    rewards.gold += echoGold;
    addInventoryItem("False Dawn Cog", cogs);
    rewards.drops.push(`False Dawn Cog x${cogs}`);
    const unclaimed = postgameGear.filter(gear => !state.ownedGear.includes(gear.name));
    if (unclaimed.length && (state.endgameRank === 1 || state.endgameRank % 2 === 0)) {
      addOwnedGear(unclaimed[0].name);
      rewards.drops.push(`ENDGAME: ${unclaimed[0].name}`);
    }
  }
  if (battle.spawnRef) {
    battle.spawnRef.available = false;
    if (battle.spawnRef.boss) state.flags[`spawn:${battle.spawnRef.id}`] = true;
    else battle.spawnRef.returnAt = Date.now() + battle.spawnRef.respawn * 1000;
  }
  updateSideQuestKills(battle.defeated, battle.spawnRef);
  if (battle.winFlag === "ravaWaveWon") completeSideQuest("ravaWave");
  hideBattlePreview();
  el.turnOrder.innerHTML = "";
  el.battle.classList.add("hidden");
  mode = "walk";
  updateMusic();
  updatePanels();
  playSfx("coin");
  const dropText = rewards.drops.length ? rewards.drops.join(", ") : "no item drops";
  showTalk([["Victory", `${log} Trust and one more clue gained.`], ["Loot", `${rewards.gold} gold. ${dropText}.`]]);
}

function rollBattleLoot(enemies) {
  let gold = 0;
  const drops = [];
  enemies.forEach(enemyUnit => {
    const table = lootTables[enemyUnit.name];
    if (!table) return;
    gold += table.gold[0] + Math.floor(Math.random() * (table.gold[1] - table.gold[0] + 1));
    table.common.forEach(([name, chance, amount]) => {
      if (Math.random() > chance) return;
      const stored = addInventoryItem(name, amount);
      drops.push(`${name} x${amount}${stored ? "" : " (Marla stash)"}`);
    });
    table.rare.forEach(([name, chance]) => {
      if (state.ownedGear.includes(name) || Math.random() > chance) return;
      addOwnedGear(name);
      drops.push(`RARE: ${name}`);
    });
  });
  state.gold += gold;
  return { gold, drops };
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
  if (!quest || !["unseen", "available"].includes(quest.status)) return;
  quest.status = "active";
  if (quest.type === "escort") state.escort = quest.giver;
}

function questPreview(id) {
  if (!id) return [];
  const quest = questById(id);
  if (!quest) return [];
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
  if (!quest) return;
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
  Object.entries(quest.reward.items || {}).forEach(([name, amount]) => addInventoryItem(name, amount));
  if (quest.reward.gear && !state.ownedGear.includes(quest.reward.gear)) addOwnedGear(quest.reward.gear);
  if (state.escort === quest.giver) state.escort = null;
  state.flags[`quest:${id}`] = true;
  playSfx("coin");
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
  return `${Math.min(quest.progress, quest.target.amount)}/${quest.target.amount}`;
}

function toggleMenu() {
  if (mode === "shop") return closeVendor();
  if (mode === "menu") {
    mode = "walk";
    el.menu.classList.add("hidden");
    return;
  }
  if (mode !== "walk" && mode !== "atlas") return;
  mode = "menu";
  el.menu.classList.remove("is-shop");
  document.querySelector(".menu-tabs").classList.remove("hidden");
  el.menu.classList.remove("hidden");
  renderMenu();
}

function renderMenu() {
  document.querySelectorAll(".menu-tabs button").forEach(btn => btn.classList.toggle("is-active", btn.dataset.tab === menuTab));
  if (menuTab === "status") {
    el.menuBody.innerHTML = `<div class="menu-grid">${state.party.map(id => {
      const h = baseJobs[id], t = totals(id);
      return `<div class="menu-card"><strong>${h.name} - ${h.title}</strong><small>${state.activeParty.includes(id) ? `ACTIVE SLOT ${state.activeParty.indexOf(id) + 1}` : "RESERVE"}</small><p>STR ${t.str} / AGI ${t.agi} / MAG ${t.mag} / STAM ${t.stam}</p><p>HP ${h.hp}/${t.max} MP ${h.mp}/${t.mp}. ${h.element} class.</p></div>`;
    }).join("")}</div>`;
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
      const rare = gear?.effect ? `<small class="rare-effect">Special: ${gear.effect.label}</small>` : "";
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
      return `<button type="button" class="gear-choice ${equipped ? "is-equipped" : ""}" data-equip="${id}:${selectedGearSlot}:${gear.name}" ${equipped ? "disabled" : ""}>${pixelIconHtml(gearIconSheet(gear, id), choiceIndex, "gear-choice-icon")}<span><strong>${gear.name}</strong><small>${statLine(gear.stats)}</small><small>${holderText}</small><small>${gearAccessLabel(gear)}</small>${gear.effect ? `<em>${gear.effect.label}</em>` : ""}</span><b>${equipped ? "EQUIPPED" : occupied.length >= copies ? "SWAP" : "EQUIP"}</b></button>`;
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
      return `<div class="menu-card item-card gear-inventory-card">${pixelIconHtml(gearIconSheet(gear, iconHero), iconIndex, "inventory-icon")}<div class="item-copy"><strong>${gear.name}<span>x${copies}</span></strong><small>${gear.slot.toUpperCase()} / ${status}</small><p>${statLine(gear.stats)}. ${gear.desc}</p>${gear.effect ? `<small class="item-effect">Special: ${gear.effect.label}</small>` : ""}</div></div>`;
    };
    const fieldSkills = state.party.flatMap(casterId => baseJobs[casterId].skills
      .filter(sk => sk.anim !== "ultimate" && (sk.power < 0 || sk.anim === "block"))
      .map((sk, skillIndex) => ({ casterId, sk, skillIndex: baseJobs[casterId].skills.indexOf(sk) })));
    const fieldSkillCards = fieldSkills.map(({ casterId, sk, skillIndex }) => {
      const caster = baseJobs[casterId];
      const heal = sk.power < 0 ? Math.abs(sk.power) + Math.round(totals(casterId).mag * .6) : 0;
      const effectText = [heal ? `Heals about ${heal} HP` : "", sk.anim === "block" ? "prepares an opening party ward" : ""].filter(Boolean).join(" and ");
      return `<div class="menu-card field-skill-card"><strong>${caster.name}: ${sk.name}</strong><small>${sk.cost} MP / ${effectText}</small><p>${sk.desc}</p><div class="field-targets"><span>Cast on</span>${state.party.map(targetId => {
        const target = baseJobs[targetId], targetTotal = totals(targetId);
        const canUse = caster.mp >= sk.cost && (sk.anim === "block" && !state.fieldWard || heal > 0 && target.hp < targetTotal.max);
        return `<button type="button" data-field-skill="${casterId}:${skillIndex}:${targetId}" ${canUse ? "" : "disabled"}>${target.name}<small>${target.hp}/${targetTotal.max} HP</small></button>`;
      }).join("")}</div></div>`;
    }).join("");
    el.menuBody.innerHTML = `<div class="wallet-line"><span>Wallet</span><strong>${state.gold} G</strong><span>Bag ${inventoryUsed()}/${state.inventorySlots}</span><span>${state.fieldWard ? "Opening ward prepared" : "No field ward"}</span></div><h3>Items</h3><div class="menu-grid">${bag.length ? bag.map(itemCard).join("") : `<div class="menu-card"><strong>Bag empty</strong><p>No consumables or materials are being carried.</p></div>`}</div><h3>Field Skills</h3><div class="menu-grid">${fieldSkillCards || `<div class="menu-card"><strong>No field support skill available</strong><p>Recruit a healer or support hero to cast outside combat.</p></div>`}</div><h3>Equipment Inventory</h3><div class="menu-grid">${equipment.map(equipmentCard).join("")}</div>${stash.length ? `<h3>Marla's Stash</h3><div class="menu-grid">${stash.map(itemCard).join("")}</div>` : ""}`;
    el.menuBody.querySelectorAll("[data-field-item]").forEach(button => button.onclick = () => useFieldItem(button.dataset.fieldItem));
    el.menuBody.querySelectorAll("[data-field-skill]").forEach(button => button.onclick = () => useFieldSkill(button.dataset.fieldSkill));
  }
  if (menuTab === "quests") {
    const main = currentQuest();
    const tracked = sideQuests.filter(quest => ["active", "ready", "completed"].includes(quest.status));
    el.menuBody.innerHTML = `<div class="menu-card main-quest"><strong>${main ? `Main: ${main[0]}` : "No active main quest"}</strong><p>${main ? main[1] : "Speak with people marked by a gold exclamation point."}</p></div><div class="menu-grid">${tracked.length ? tracked.map(quest => `<div class="menu-card quest-${quest.status}"><strong>${quest.title}</strong><small>${quest.status.toUpperCase()} / ${quest.giver}</small><p>${quest.desc}</p><p>${sideQuestProgress(quest)}</p><p>Reward: ${quest.reward.gold || 0} G${quest.reward.gear ? ` / ${quest.reward.gear}` : ""}</p></div>`).join("") : `<div class="menu-card"><strong>No side quests yet</strong><p>They appear here after an NPC gives them to you.</p></div>`}</div>`;
  }
  if (menuTab === "world") {
    const region = mapRegion(state.map);
    const entries = Object.entries(maps).filter(([id]) => mapRegion(id) === region);
    const size = currentMap().gridSize || [5, 5];
    el.menuBody.innerHTML = `<div class="wallet-line"><span>${region}</span><strong>${size[0]} x ${size[1]} field grid</strong></div><div class="world-grid" style="--world-cols:${size[0]}">${Array.from({ length: size[0] * size[1] }, (_, index) => {
      const x = index % size[0], y = Math.floor(index / size[0]);
      const match = entries.find(([, field]) => field.grid?.[0] === x && field.grid?.[1] === y);
      if (!match) return `<div class="world-cell is-empty"></div>`;
      const [id, field] = match;
      return `<div class="world-cell ${id === state.map ? "is-current" : ""}"><span>${x + 1}.${y + 1}</span><strong>${field.name}</strong></div>`;
    }).join("")}</div>`;
  }
  if (menuTab === "lore") {
    const fieldNotes = Object.values(maps).flatMap(field => field.spawns || []).filter(spawnPoint => spawnPoint.rare || spawnPoint.boss);
    const knownIssues = quests.slice(0, Math.max(0, state.quest + 1));
    el.menuBody.innerHTML = `<h3>Issue Chronicle</h3><div class="menu-grid">${knownIssues.length ? knownIssues.map((q, i) => `<div class="menu-card"><strong>Issue ${i + 1}: ${q[0]}</strong><p>${q[2]}</p><p>${q[1]}</p></div>`).join("") : `<div class="menu-card"><strong>No issue recorded</strong><p>Your chronicle begins when someone entrusts you with a quest.</p></div>`}</div><h3>Rare & Miniboss Field Notes</h3><div class="menu-grid">${fieldNotes.map(spawnPoint => `<div class="menu-card"><strong>${spawnPoint.name}</strong><small>${spawnPoint.rare ? "RARE SPAWN" : "ONE-TIME MINIBOSS"} / ${state.flags[`spawn:${spawnPoint.id}`] ? "DEFEATED" : spawnPoint.available ? "ACTIVE" : "DORMANT"}</small><p>${spawnPoint.lore}</p><p>${spawnPoint.boss ? "Does not respawn." : `Rare return window: roughly ${spawnPoint.respawn}-${spawnPoint.respawn + 30}s.`}</p></div>`).join("")}</div>`;
  }
  if (menuTab === "system") {
    const postgame = state.flags.endingComplete ? `<section class="postgame-panel"><header><strong>Postgame Unlocked</strong><span>Echo Hunt Rank ${state.endgameRank} / New Game Plus ${state.ngPlus}</span></header><p>Echo Hunts grow stronger every clear and award gold, materials and five pieces of Dawnforged endgame gear. New Game Plus keeps companions, equipment, items and gold while resetting story quests and bosses with stronger enemy stats.</p><div><button type="button" data-endgame-hunt>Start Echo Hunt ${state.endgameRank + 1}</button><button type="button" data-new-game-plus>Begin New Game Plus</button></div></section>` : `<section class="postgame-panel is-locked"><strong>Postgame</strong><p>Complete Issue 4 to unlock repeatable Echo Hunts and New Game Plus.</p></section>`;
    el.menuBody.innerHTML = `<div class="menu-grid"><div class="menu-card"><strong>Combat</strong><p>AGI creates one shared turn order for heroes and enemies. Every hero can Defend, select targets and inspect exact command values.</p></div><div class="menu-card"><strong>Stats</strong><p>STR controls melee, AGI controls turn order, MAG controls spells, STAM controls HP and durability.</p></div><div class="menu-card"><strong>Loot & Gold</strong><p>Every enemy has its own gold and loot table. Rare effect gear comes from battles and side quests, never shops.</p></div><div class="menu-card"><strong>World</strong><p>Field units form branching 3x3 and 5x5 regional grids with interiors, vendors, rare spawns and one-time bosses.</p></div></div>${postgame}`;
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
  const heal = sk.power < 0 ? Math.abs(sk.power) + Math.round(totals(casterId).mag * .6) : 0;
  const needsHeal = heal > 0 && target.hp < targetTotal.max;
  const needsWard = sk.anim === "block" && !state.fieldWard;
  if (!needsHeal && !needsWard) return;
  caster.mp -= sk.cost;
  if (needsHeal) target.hp = Math.min(targetTotal.max, target.hp + heal);
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
  const rankedEnemy = (name, hp, atk, weak, color, node, sprite) => {
    const unit = enemy(name, hp, atk, weak, color, node, sprite);
    unit.hp = unit.max = Math.round(unit.max * boost);
    unit.atk = Math.round(unit.atk * (1 + rank * .08));
    unit.stats.agi += Math.ceil(rank * 1.5);
    unit.stats.stam += rank * 2;
    return unit;
  };
  const formations = [
    [rankedEnemy("Dawn Null", 92, 14, "Sound", "#4f6570", 2, "Wrong Bell"), rankedEnemy("Redacted Witness", 82, 13, "Holy Fire", "#413044", 1, "Ash Scribe")],
    [rankedEnemy("First Ember Memory", 116, 16, "Shadow", "#6a3552", 2, "Ash Wyrm"), rankedEnemy("Orphaned Sigil", 96, 15, "Tech", "#8a6640", 1, "Seal Bearer")],
    [rankedEnemy("Dawn Gate Sentinel", 148, 19, "Ancient Fire", "#58616b", 2, "Gate Lock")]
  ];
  el.menu.classList.add("hidden");
  startBattle(`Postgame Echo Hunt - Rank ${rank}`, formations[(rank - 1) % formations.length], "endgameHuntWon");
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

function renderVendor() {
  const vendor = vendors[activeVendor];
  if (!vendor) return closeVendor();
  const stashEntries = Object.entries(state.stash).filter(([, amount]) => amount > 0);
  const buyList = `<div class="shop-list">${vendor.wares.map((ware, index) => {
    const gear = ware.kind === "gear" ? gearByName(ware.name) : null;
    const owned = ware.kind === "gear" && state.ownedGear.includes(ware.name);
    const price = ware.kind === "upgrade" ? bagUpgradePrice(ware.basePrice) : ware.price;
    const full = ware.kind === "item" && inventoryUsed() >= state.inventorySlots;
    const details = gear ? `${statLine(gear.stats)}. ${gear.desc}${gear.effect ? ` Special: ${gear.effect.label}.` : ""}` : ware.desc;
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
    return `<div class="shop-row">${pixelIconHtml(gearIconSheet(gear, state.party[0]), iconIndex, "shop-icon")}<div><strong>${gear.name} x${available} spare</strong><small>${statLine(gear.stats)}. ${gear.desc}</small></div><span>${gearSellPrice(gear)} G</span><button type="button" data-sell-kind="gear" data-sell-name="${gear.name}">Sell 1</button></div>`;
  }).join("")}${!sellItems.length && !sellGear.length ? `<div class="shop-empty"><strong>Nothing sellable</strong><p>Key items, quest materials, equipped pieces and character-bound signature gear stay with the Flameguard.</p></div>` : ""}</div>`;
  el.menuBody.innerHTML = `<div class="shop-head"><div><strong>${vendor.name}</strong><p>${vendor.blurb}</p></div><div class="shop-wallet">${state.gold} G / BAG ${inventoryUsed()}/${state.inventorySlots}</div><button type="button" data-close-shop aria-label="Close shop">X</button></div><div class="shop-mode-tabs"><button type="button" data-shop-tab="buy" class="${vendorTab === "buy" ? "is-active" : ""}">Buy</button><button type="button" data-shop-tab="sell" class="${vendorTab === "sell" ? "is-active" : ""}">Sell</button></div>${vendorTab === "buy" ? buyList : sellList}<p class="shop-note">Rare effect gear comes from battles and quests, never shops. Spare general gear can be sold after it is unequipped.</p>`;
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
    "Null Calibration Shard": 38
  };
  return values[name] || 0;
}

function gearSellPrice(gear) {
  if (!gear || gearOwners[gear.name] || gear.name === "Echo-Thread Lute") return 0;
  const shopWare = Object.values(vendors).flatMap(vendor => vendor.wares).find(ware => ware.kind === "gear" && ware.name === gear.name);
  const value = shopWare?.price || Object.values(gear.stats).reduce((sum, stat) => sum + stat, 0) * 14 + (gear.effect ? 45 : 0);
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
  const ware = vendors[activeVendor]?.wares[index];
  const price = ware?.kind === "upgrade" ? bagUpgradePrice(ware.basePrice) : ware?.price;
  if (!ware || state.gold < price) return;
  if (ware.kind === "gear" && state.ownedGear.includes(ware.name)) return;
  if (ware.kind === "item" && inventoryUsed() >= state.inventorySlots) return;
  state.gold -= price;
  if (ware.kind === "gear") addOwnedGear(ware.name);
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
  heldDirection = control;
  handleControl(control);
  nextHeldMove = tick + PLAYER_STEP_TICKS;
}

function stopHeldDirection(control) {
  if (heldDirection === control) heldDirection = null;
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
  if (mode === "title") interact();
});

canvas.addEventListener("click", event => {
  if (mode === "battle") {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
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

el.codexPrev.onclick = () => { codexIndex = (codexIndex + codex.length - 1) % codex.length; updateCodex(); };
el.codexNext.onclick = () => { codexIndex = (codexIndex + 1) % codex.length; updateCodex(); };

refreshHeroVitals();
updateCodex();
updatePanels();
draw();
