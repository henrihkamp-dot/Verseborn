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
  const tinusPose=document.createElement('canvas'),tinusHead=document.createElement('canvas');
  tinusPose.width=tinusHead.width=320;tinusPose.height=tinusHead.height=310;
  function headGesture(elapsed){
    const t=((elapsed-8300)%31000+31000)%31000;
    return t<2400?Math.sin(t/2400*Math.PI)*Math.sin(t/2400*Math.PI*2)*.022:0;
  }
  function tinusFrame(sheet,col,elapsed){
    const paint=tinusPose.getContext('2d'),head=tinusHead.getContext('2d');
    paint.clearRect(0,0,320,310);paint.drawImage(sheet.image,col*320,0,320,310,0,0,320,310);
    const angle=headGesture(elapsed);
    if(angle){
      // Move the painted head alone, pivoting at the neck; feet and torso stay fixed.
      head.clearRect(0,0,320,310);head.save();head.beginPath();
      head.moveTo(134,29);head.lineTo(191,29);head.lineTo(195,78);head.lineTo(184,103);head.lineTo(159,100);head.lineTo(137,80);head.closePath();head.clip();head.drawImage(tinusPose,0,0);head.restore();
      paint.globalCompositeOperation='destination-out';paint.drawImage(tinusHead,0,0);paint.globalCompositeOperation='source-over';
      paint.save();paint.translate(166,99);paint.rotate(angle);paint.drawImage(tinusHead,-166,-99);paint.restore();
    }
    if(col>=10&&col<=13){
      // Light is confined to the orb and open hand, rather than outlining his body.
      const pulse=.8+.2*Math.sin(elapsed/240),x=130,y=145;
      paint.save();paint.globalCompositeOperation='screen';
      const glow=paint.createRadialGradient(x,y,1,x,y,31);glow.addColorStop(0,`rgba(212,228,255,${.7*pulse})`);glow.addColorStop(.24,`rgba(137,153,255,${.52*pulse})`);glow.addColorStop(.62,`rgba(116,80,246,${.23*pulse})`);glow.addColorStop(1,'rgba(99,76,236,0)');paint.fillStyle=glow;paint.fillRect(x-31,y-31,62,62);
      paint.strokeStyle=`rgba(193,213,255,${.65*pulse})`;paint.lineWidth=1.15;
      paint.beginPath();paint.ellipse(x,y,14,10,elapsed/460,0,Math.PI*1.3);paint.stroke();paint.restore();
    }
    return tinusPose;
  }
  const ready = (async () => {
    const response = await fetch(base + 'manifest.json?v=261');
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
    const elapsed=now-clocks.get(owner);
    const col = Number.isFinite(unit.meleeIdleFrame) ? unit.meleeIdleFrame : frameAt(sheet, now - clocks.get(owner));
    const scale = (battleSpriteHeights[visualId] || 54) * BATTLE_COMPOSITION_SCALE / sheet.referenceHeight;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const source=visualId==='Tinus'?tinusFrame(sheet,col,elapsed):sheet.image;
    ctx.drawImage(source, visualId==='Tinus'?0:col * sheet.cellWidth, 0, sheet.cellWidth, sheet.cellHeight,
      Math.round(anchorX - sheet.anchorX * scale), Math.round(baseline - sheet.baseline * scale),
      sheet.cellWidth * scale, sheet.cellHeight * scale);
    ctx.restore();
    return true;
  };
  // Diagnostics share the actual playback schedule; no changes to saves or battle rules.
  window.FlameguardIdle = { ready, frameAt, headGesture, poseAt(unit) {
    const config = sheets.get(battleVisualId(unit));
    const owner = battle || unit;
    return config ? frameAt(config, performance.now() - (clocks.get(owner) ?? performance.now())) : undefined;
  }, get manifest() { return manifest; } };
})();
