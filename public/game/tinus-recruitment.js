// Persistent, conversation-gated arrival after the seven original Shadow Duels.
(() => {
  'use strict';
  const arrival = { x: 320, y: 334 }, seat = { x: 467, y: 187 };
  const approach = { x: 434, y: 190 };
  let artReady = false, saved = null, actor = null, path = [], last = 0, portalStarted = 0;
  const ready = TinusCharacter.ready.then(() => { artReady = true; });
  function progress() {
    const hall = hallBattleProgress();
    if (!hall.tinus || typeof hall.tinus !== 'object') hall.tinus = { phase: 'locked', recruited: false };
    const data = hall.tinus;
    if (saved !== data) {
      saved = data; actor = null; path = []; portalStarted = 0; last = 0;
      // An interrupted journey resumes at his permanent seat, never grants a second kit.
      if (state.party.includes('Tinus')) { data.recruited = true; data.phase = 'resident'; }
      else if (['arriving', 'travelling', 'resident'].includes(data.phase)) data.phase = 'waiting';
    }
    return data;
  }
  function eligible() {
    const wins = window.HallHub?.progress().shadowDefeated || [];
    const trials = Object.keys(window.HallHub?.shadowTrials || {});
    return trials.length === 7 && trials.every(id => wins.includes(id));
  }
  function makeActor(x, y, pose = 'idle') {
    return { id: 'Tinus', x, y, size: 36, pose, alpha: 1,
      approach: pose === 'seated' ? { ...approach } : { x: arrival.x, y: arrival.y - 20 } };
  }
  function resident() {
    if (!artReady || state.gameMode !== 'hallBattles') return null;
    const data = progress();
    if (data.phase === 'locked') return null;
    if (!actor) actor = data.recruited ? makeActor(seat.x, seat.y, 'seated') : makeActor(arrival.x, arrival.y);
    return actor;
  }
  function smoothPath(points) {
    if (!points?.length) return [];
    const result = []; let from = { ...actor };
    for (let i = 0; i < points.length;) {
      let best = i;
      for (let j = i; j < points.length; j++) {
        const to = points[j], count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * 2));
        let clear = true;
        for (let k = 1; k <= count; k++) {
          if (emberHallWorld.collision(from.x + (to.x - from.x) * k / count, from.y + (to.y - from.y) * k / count)) { clear = false; break; }
        }
        if (clear) best = j;
      }
      from = points[best]; result.push(from); i = best + 1;
    }
    return result;
  }
  function settle() {
    const data = progress(); data.phase = 'resident';
    actor = makeActor(seat.x, seat.y, 'seated'); path = [];
    queueSave();
  }
  function join() {
    const data = progress();
    TinusCharacter.recruit();
    data.recruited = true; data.phase = 'travelling';
    actor = makeActor(arrival.x, arrival.y, 'walk'); actor.phase = 0;
    path = smoothPath(emberHallWorld.findPath(actor, approach.x, approach.y));
    // The final step is onto his bar stool, beyond the player floor footprint.
    path.push({ x: seat.x, y: seat.y }); last = performance.now();
    showHudNotice('Tinus joined the Flameguard. His skills and talents are now available.');
    queueSave(); updatePanels();
  }
  const barLines = [
    [['Tinus', 'Structure should serve life. If the plan forgets the people, change the plan.'], ['Marla', 'And if the plan forgets lunch?'], ['Tinus', 'Then it was never a serious plan.']],
    [['Tinus', 'People are nodes. Every choice is a thread. A network works better when nobody is forced to pull in the same direction.'], ['Verseborn', 'And the coffee?'], ['Tinus', 'Critical infrastructure.']],
    [['Tinus', 'Form 17.2-B: application for structural change. I did not see an interdimensional travel clause.'], ['Marla', 'Another mug?'], ['Tinus', 'Approved without amendments.']]
  ];
  function interact() {
    const data = progress(); if (data.phase === 'locked') return false;
    if (data.phase === 'arriving' || data.phase === 'travelling') {
      showHudNotice(data.phase === 'arriving' ? 'Someone is stepping through the portal…' : 'Tinus is finding his seat at the bar.');
      return true;
    }
    activePoint = null; emberHallWorld.clearNavigation();
    if (data.recruited) {
      const index = Math.max(0, Number(data.conversations) || 0) % barLines.length;
      data.conversations = index + 1;
      showTalk(barLines[index], { portraits: ['Verseborn', 'Tinus'], after: queueSave });
      return true;
    }
    showTalk([
      ['Verseborn', 'That portal just pulled someone into the Hall. Are you all right?'],
      ['Tinus', 'I was finishing a structural-change request. This is not the address I put on it.'],
      ['Verseborn', 'We finished Seerin’s last Shadow Duel. Then that seam opened.'],
      ['Tinus', 'Tinus. Chaos Agent. Apparently also an unsolicited interdimensional delivery.'],
      ['Tinus', 'Where I come from, we learned that structure should serve life. Systems must leave people room to choose.'],
      ['Verseborn', 'We could use someone who knows how to untangle a broken system. Join the Flameguard?'],
      ['Tinus', 'Golden forms, blue networks, a few practical amendments… yes. I can help.'],
      ['Marla', 'Then take the seat by the bar. I will put the coffee on.'],
      ['Tinus', 'Finally. A sensible operating procedure.']
    ], { portraits: ['Verseborn', 'Tinus'], skippable: true, after: join });
    return true;
  }
  function tick(now) {
    const data = progress(), dt = last ? Math.max(0, Math.min(.05, (now - last) / 1000)) : 0; last = now;
    if (!artReady || mode !== 'walk') return;
    if (data.phase === 'locked' && eligible()) {
      data.phase = 'arriving'; actor = makeActor(arrival.x, arrival.y); actor.alpha = 0;
      portalStarted = now; queueSave();
      showHudNotice('A golden-blue seam opens at the entrance to Ember Hall…');
    }
    if (data.phase === 'arriving') {
      actor.alpha = Math.min(1, Math.max(0, (now - portalStarted - 650) / 1000));
      if (now - portalStarted > 2800) { data.phase = 'waiting'; actor.alpha = 1; queueSave(); }
    }
    if (data.phase !== 'travelling') return;
    if (!actor || !path.length) return settle();
    let remaining = 36 * dt;
    while (remaining > 0 && path.length) {
      const point = path[0], dx = point.x - actor.x, dy = point.y - actor.y, distance = Math.hypot(dx, dy);
      if (distance < .001) { path.shift(); continue; }
      const step = Math.min(distance, remaining);
      actor.pose = dy < -Math.abs(dx) * .5 ? 'backWalk' : 'walk'; actor.flip = dx < -.01;
      actor.x += dx / distance * step; actor.y += dy / distance * step; actor.phase += step / 4;
      remaining -= step;
      if (step === distance) path.shift();
    }
    if (!path.length) settle();
  }
  function drawPortal(npc, camera, now) {
    if (!portalStarted || npc.pose === 'seated') return;
    const elapsed = now - portalStarted, fade = Math.min(1, elapsed / 350, (3100 - elapsed) / 600);
    if (fade <= 0) return;
    const x = arrival.x - camera.x, y = arrival.y - camera.y - 19;
    ctx.save(); ctx.globalAlpha = Math.max(0, fade); ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    glow.addColorStop(0, '#122239dd'); glow.addColorStop(.6, '#319ddc88'); glow.addColorStop(1, '#318dde00');
    ctx.fillStyle = glow; ctx.fillRect(-27, -29, 54, 58);
    ctx.strokeStyle = '#80ceff'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(0, 0, 14, 25, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f2c568'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + elapsed / 1200;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 26); ctx.lineTo(Math.cos(a + .13) * 16, Math.sin(a + .13) * 27); ctx.stroke();
    }
    ctx.restore();
  }
  window.TinusRecruitment = { ready, eligible, progress, resident, tick, interact, drawPortal };
})();
