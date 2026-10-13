const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// Exercise the published runtime's real asynchronous art loaders. A missing file
// follows the browser's onerror route, which can finish boot while leaving the
// title stuck on LOADING ART. No network or player save is used by this test.
const gameRoot = path.resolve(__dirname, '../dist/client/game');
const gamePath = path.join(gameRoot, 'game.js');
const imageRequests = [];
const manifestRequests = [];
const missing = [];
const callbackErrors = [];
const noop = () => {};
let pendingImages = 0;
const drawing = new Proxy({}, {
  get: (target, key) => target[key] || (
    key === 'measureText' ? text => ({ width: String(text).length * 3 }) :
    key === 'getImageData' ? (_x, _y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) :
    key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop
  )
});
class Element {
  constructor() {
    this.children = []; this.dataset = {}; this.style = {}; this.attrs = {}; this._html = '';
    this.classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
  }
  set innerHTML(value) { this._html = value; this.children = []; }
  get innerHTML() { return this._html; }
  getContext() { return drawing; }
  getBoundingClientRect() { return { width: 768, height: 672, left: 0, top: 0 }; }
  addEventListener() {}
  appendChild(child) { this.children.push(child); }
  querySelector() { return new Element(); }
  querySelectorAll() { return []; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  insertAdjacentHTML(where, value) { this._html = where === 'afterbegin' ? value + this._html : this._html + value; }
  focus() {}
}
function runtimeFile(source) {
  const file = path.resolve(gameRoot, source.split(/[?#]/)[0]);
  assert.ok(file.startsWith(gameRoot + path.sep), 'Art request must stay in the runtime directory: ' + source);
  return file;
}
class DiskImage {
  constructor() { this.complete = false; this.naturalWidth = this.width = 32; this.naturalHeight = this.height = 42; }
  addEventListener() {}
  set src(source) {
    this._src = String(source);
    imageRequests.push(this._src);
    const exists = fs.existsSync(runtimeFile(this._src));
    if (!exists) missing.push(this._src);
    pendingImages++;
    setImmediate(() => {
      this.complete = true;
      try { (exists ? this.onload : this.onerror)?.(); }
      catch (error) { callbackErrors.push(error); }
      finally { pendingImages--; }
    });
  }
  get src() { return this._src; }
}
const elements = new Map();
const body = new Element();
const document = {
  body,
  getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
  querySelector: () => new Element(), querySelectorAll: () => [], createElement: () => new Element(), addEventListener: noop
};
const storage = new Map();
const sandbox = {
  console, document, URLSearchParams, structuredClone, location: { search: '' }, performance: { now: () => 0 },
  Image: DiskImage,
  fetch: async source => {
    manifestRequests.push(source);
    const file = runtimeFile(source);
    if (!fs.existsSync(file)) { missing.push(source); return { ok: false }; }
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
  },
  Audio: class {
    constructor(src) { this.src = src; this.paused = true; }
    addEventListener() {} pause() { this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
  },
  ResizeObserver: class { observe() {} }, requestAnimationFrame: noop, setTimeout: noop, clearTimeout: noop,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  navigator: {}, addEventListener: noop, devicePixelRatio: 1, innerWidth: 1000, innerHeight: 900
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(gamePath, 'utf8'), sandbox, { filename: gamePath });
const run = code => vm.runInContext(code, sandbox);

(async () => {
  // Fetch continuations can schedule more images after the first event-loop turn.
  for (let turn = 0; turn < 32; turn++) {
    await new Promise(setImmediate);
    if (!pendingImages && run('runtimeAssetsReady')) break;
  }
  assert.deepEqual(callbackErrors, [], 'Art decoding callbacks must not leave unresolved boot promises');
  assert.deepEqual([...new Set(missing)], [], 'Every art and manifest request must exist in the published runtime');
  assert.ok(imageRequests.length > 100, 'The test must exercise all boot art loaders, including manifest images');
  assert.equal(manifestRequests.length, 5, 'All five art manifests must be loaded');
  assert.equal(run('runtimeAssetsReady'), true, 'The actual runtime bootstrap must complete');
  assert.equal(run('Boolean(titleImage)'), true, 'Title artwork must be populated; boot-ready alone still permits LOADING ART');
  assert.equal(run('Object.keys(mapImages).length'), 12, 'All twelve world map backgrounds must load');
  const drawnText = [];
  drawing.fillText = text => drawnText.push(text);
  run('drawTitle()');
  assert.ok(!drawnText.includes('LOADING ART'), 'The title render must leave the loading screen');
  console.log(`PASS Published runtime boots with ${imageRequests.length} present images and ${manifestRequests.length} manifests; title leaves LOADING ART.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
