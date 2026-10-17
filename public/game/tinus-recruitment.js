// Persistent, conversation-gated arrival after the seven original Shadow Duels.
(() => {
  'use strict';
  const arrival = { x: 320, y: 334 }, seat = { x: 467, y: 187 };
  const approach = { x: 434, y: 190 };
  let artReady = false, saved = null, actor = null, path = [], last = 0, portalStarted = 0, replay = null;
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
    if (replay) return replay.actor;
    if (!artReady || state.gameMode !== 'hallBattles') return null;
    const data = progress();
    if (data.phase === 'locked') return null;
    if (!actor) actor = data.recruited ? makeActor(seat.x, seat.y, 'seated') : makeActor(arrival.x, arrival.y);
    return actor;
  }
  function smoothPath(points, origin = actor) {
    if (!points?.length) return [];
    const result = []; let from = { ...origin };
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
  const arrivalLines = [
    ['Verseborn', 'That portal just pulled someone into the Hall. Are you all right?'],
    ['Tinus', 'I was finishing a structural-change request. This is not the address I put on it.'],
    ['Verseborn', 'We finished Seerin’s last Shadow Duel. Then that seam opened.'],
    ['Tinus', 'Tinus. Chaos Agent. Apparently also an unsolicited interdimensional delivery.'],
    ['Tinus', 'Where I come from, we learned that structure should serve life. Systems must leave people room to choose.'],
    ['Verseborn', 'We could use someone who knows how to untangle a broken system. Join the Flameguard?'],
    ['Tinus', 'Golden forms, blue networks, a few practical amendments… yes. I can help.'],
    ['Marla', 'Then take the seat by the bar. I will put the coffee on.'],
    ['Tinus', 'Finally. A sensible operating procedure.']
  ];
  const barLines = [
    [['Tinus', 'Structure should serve life. If the plan forgets the people, change the plan.'], ['Marla', 'And if the plan forgets lunch?'], ['Tinus', 'Then it was never a serious plan.']],
    [['Tinus', 'People are nodes. Every choice is a thread. A network works better when nobody is forced to pull in the same direction.'], ['Verseborn', 'And the coffee?'], ['Tinus', 'Critical infrastructure.']],
    [['Tinus', 'Form 17.2-B: application for structural change. I did not see an interdimensional travel clause.'], ['Marla', 'Another mug?'], ['Tinus', 'Approved without amendments.']]
  ];
  function interact() {
    if (replay) return true;
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
    showTalk(arrivalLines, { portraits: ['Verseborn', 'Tinus'], skippable: true, after: join });
    return true;
  }
  function tick(now) {
    if (replay) { tickReplay(now); return; }
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
    if (advanceWalk(actor, path, dt)) settle();
  }
  function advanceWalk(npc, waypoints, dt) {
    let remaining = 36 * dt;
    while (remaining > 0 && waypoints.length) {
      const point = waypoints[0], dx = point.x - npc.x, dy = point.y - npc.y, distance = Math.hypot(dx, dy);
      if (distance < .001) { waypoints.shift(); continue; }
      const step = Math.min(distance, remaining);
      npc.pose = dy < -Math.abs(dx) * .5 ? 'backWalk' : 'walk'; npc.flip = dx < -.01;
      npc.x += dx / distance * step; npc.y += dy / distance * step; npc.phase += step / 4;
      remaining -= step;
      if (step === distance) waypoints.shift();
    }
    return !waypoints.length;
  }
  function drawPortal(npc, camera, now) {
    const started = replay?.started || portalStarted;
    if (!started || npc.pose === 'seated') return;
    const elapsed = now - started, fade = Math.min(1, elapsed / 350, (3100 - elapsed) / 600);
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
  function startReplay() {
    if (replay || !artReady || state.gameMode !== 'hallBattles' || !state.party.includes('Tinus') || !emberHallWorld.ready) return false;
    const now = performance.now();
    replay = { phase: 'arriving', started: now, last: now, actor: makeActor(arrival.x, arrival.y), path: [],
      original: { map: state.map, hallPosition: structuredClone(state.hallPosition), player: { ...emberHallWorld.player },
        mode, menuTab, activePoint, tabsHidden: document.querySelector('.menu-tabs').classList.contains('hidden') } };
    replay.actor.alpha = 0;
    emberHallWorld.clearNavigation(); heldDirection = null; activePoint = null;
    state.map = 'emberHallBattles'; Object.assign(emberHallWorld.player, { x: 296, y: 328, facing: 2, walking: false });
    el.menu.classList.add('hidden'); mode = 'walk'; updateSkillPointNotice(); updateMusic();
    return true;
  }
  function finishReplay() {
    if (!replay) return;
    const original = replay.original;
    talkAfter = null; activePoint = null;
    if (mode === 'talk') finishTalk();
    emberHallWorld.clearNavigation(); Object.assign(emberHallWorld.player, original.player);
    state.map = original.map; state.hallPosition = original.hallPosition; activePoint = original.activePoint;
    replay = null; last = performance.now(); heldDirection = null;
    mode = original.mode; menuTab = original.menuTab;
    el.menu.classList.remove('hidden'); document.querySelector('.menu-tabs').classList.toggle('hidden', original.tabsHidden);
    renderMenu(); updateSkillPointNotice(); updateMusic(); queueSave();
  }
  function tickReplay(now) {
    const scene = replay, dt = Math.max(0, Math.min(.05, (now - scene.last) / 1000)); scene.last = now;
    if (scene.phase === 'arriving') {
      scene.actor.alpha = Math.min(1, Math.max(0, (now - scene.started - 650) / 1000));
      if (now - scene.started > 2800) {
        scene.phase = 'dialogue'; scene.actor.alpha = 1;
        showTalk(arrivalLines, { portraits: ['Verseborn', 'Tinus'], skippable: true, after: () => {
          if (!replay) return;
          scene.phase = 'walking'; scene.actor.pose = 'walk'; scene.actor.phase = 0;
          scene.path = smoothPath(emberHallWorld.findPath(scene.actor, approach.x, approach.y), scene.actor);
          scene.path.push({ ...seat }); scene.last = performance.now();
        } });
      }
    } else if (scene.phase === 'walking' && advanceWalk(scene.actor, scene.path, dt)) {
      scene.phase = 'seated'; scene.actor = makeActor(seat.x, seat.y, 'seated'); scene.seatedAt = now;
    } else if (scene.phase === 'seated' && now - scene.seatedAt > 1800) finishReplay();
  }
  const memoryId = 'tinus-betweenworld-arrival', oldMemories = sceneMemoriesHtml, oldReplay = replayRecruitScene;
  sceneMemoriesHtml = function() {
    const html = oldMemories();
    if (state.gameMode !== 'hallBattles' || !state.party.includes('Tinus')) return html;
    const card = `<article class="memory-card"><img src="${menuPortraitSource('Tinus')}" alt=""><div><strong>Tinus</strong><div class="memory-actions"><button type="button" data-replay-scene="${memoryId}">An Unscheduled Arrival<span aria-hidden="true">▶</span></button></div></div></article>`;
    return html.replace('<!--memory-character-end-->',card+'<!--memory-character-end-->');
  };
  replayRecruitScene = id => id === memoryId ? startReplay() : oldReplay(id);
  const oldControl = handleControl, oldSave = saveGame;
  handleControl = function(control) {
    if (replay) {
      if (control === 'cancel' || control === 'menu') return finishReplay();
      if (replay.phase !== 'dialogue' && !['music', 'fullscreen'].includes(control)) return;
    }
    return oldControl(control);
  };
  // Transient camera/map staging must never be written into a player's save.
  saveGame = function(...args) { if (!replay) return oldSave(...args); };
  document.addEventListener('keydown', event => {
    if (replay && ['Escape', 'x'].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); finishReplay(); }
  }, true);
  window.TinusRecruitment = { ready, eligible, progress, resident, tick, interact, drawPortal, replay: startReplay,
    get replaying() { return Boolean(replay); }, get replayPhase() { return replay?.phase; },
    focus: () => replay ? replay.actor : null };
})();
