// Approved complete-character idle drawings. Action and alternate-form art stay native.
(() => {
  'use strict';
  const base = 'assets/sprites/flameguard-idle/';
  const sheets = new Map();
  const clocks = new WeakMap();
  let manifest = {};
  function frameAt(config, elapsed) {
    let phase = ((elapsed % config.cycleMs) + config.cycleMs) % config.cycleMs;
    for (let i = 0; i < config.order.length; i++) {
      if (phase < config.durations[i]) return config.order[i];
      phase -= config.durations[i];
    }
    return config.order[0];
  }
  const ready = (async () => {
    const response = await fetch(base + 'manifest.json?v=222');
    if (!response.ok) throw new Error('Flameguard idle manifest unavailable');
    manifest = await response.json();
    await Promise.all(Object.entries(manifest).map(async ([id, config]) => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(id + ' idle artwork unavailable'));
        image.src = base + config.file;
      });
      sheets.set(id, { ...config, image });
    }));
  })();
  ready.catch(error => console.error(error));
  const nativeDraw = drawBattlePartySprite;
  drawBattlePartySprite = function(unit, anchorX, baseline, frame = tick) {
    const visualId = battleVisualId(unit);
    const sheet = sheets.get(visualId);
    if (!sheet || (unit.anim || 'idle') !== 'idle' || unit.hp <= 0) {
      return nativeDraw(unit, anchorX, baseline, frame);
    }
    const now = performance.now();
    const owner = battle || unit;
    if (!clocks.has(owner)) clocks.set(owner, now);
    const col = Number.isFinite(unit.meleeIdleFrame) ? unit.meleeIdleFrame : frameAt(sheet, now - clocks.get(owner));
    const scale = (battleSpriteHeights[visualId] || 54) * BATTLE_COMPOSITION_SCALE / sheet.referenceHeight;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sheet.image, col * sheet.cellWidth, 0, sheet.cellWidth, sheet.cellHeight,
      Math.round(anchorX - sheet.anchorX * scale), Math.round(baseline - sheet.baseline * scale),
      sheet.cellWidth * scale, sheet.cellHeight * scale);
    ctx.restore();
    return true;
  };
  // Diagnostics share the actual playback schedule; no changes to saves or battle rules.
  window.FlameguardIdle = { ready, frameAt, poseAt(unit) {
    const config = sheets.get(battleVisualId(unit));
    const owner = battle || unit;
    return config ? frameAt(config, performance.now() - (clocks.get(owner) ?? performance.now())) : undefined;
  }, get manifest() { return manifest; } };
})();
