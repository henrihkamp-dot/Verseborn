// Tinus joins through the Hall story gate; this module supplies his native character kit.
(() => {
  'use strict';
  const ID = 'Tinus', BASE = 'assets/tinus/';
  const signatures = [
    ['The Unfinished Ledger', 'weapon', { str: 15, agi: 5, mag: 40, stam: 20, echo: 20 }, 'The Chaos Agent carries a ledger for plans that are still allowed to change.', [{ type: 'magicDamage', value: .12, label: '+12% magic damage' }], 'ledger.webp'],
    ['Chaos Agent’s Black Jacket', 'armour', { str: 20, agi: 8, mag: 35, stam: 65, echo: 15 }, 'A familiar black-and-gold jacket, still carrying the dust of another dimension.', [{ type: 'allStatusResistance', value: .1, label: '10% all-status application resistance' }], 'equipment.webp'],
    ['The Choice Remains', 'ring', { str: 12, agi: 10, mag: 20, stam: 25, echo: 25 }, 'A golden reminder that a system may be rewritten without erasing its people.', [{ type: 'weaknessDamage', value: .12, label: '+12% weakness damage' }], 'form.webp'],
    ['B Coffee Keepsake', 'necklace', { str: 8, agi: 6, mag: 30, stam: 30, echo: 24 }, 'A little warmth for a very long meeting.', [{ type: 'healPower', value: .1, label: '+10% healing potency' }], 'mug.webp'],
    ['Betweenworld Beanie', 'helmet', { str: 12, agi: 8, mag: 25, stam: 50, echo: 16 }, 'His own black beanie. A portal is no reason to lose a good hat.', [{ type: 'allStatusResistance', value: .08, label: '8% all-status application resistance' }], 'portrait.webp']
  ];
  for (const [name, slot, stats, desc, effects, art] of signatures) {
    if (!gearDb[slot].some(entry => entry.name === name)) {
      const gear = item(name, slot, stats, desc, effects);
      Object.assign(gear, { rarity: 'Personal Artifact', tinusSignature: true, tinusArt: BASE + art });
      gearDb[slot].push(gear);
    }
    gearOwners[name] = [ID];
    artifactGearNames.add(name);
  }
  WEAPON_BASIC_ATTACK_EFFECTS[signatures[0][0]] = { type: 'status', status: 'magicVulnerability', value: .12, duration: 2, label: 'BASIC ATTACK: applies 12% Magic Vulnerability for 2 actions' };

  const form = skill('Form 17.2-B', 'magic', 'Tech', 0, 8, '1.45× MAG Tech damage. Applies 18% Magic Vulnerability for 3 actions.', {
    coefficient: 1.45, status: { type: 'magicVulnerability', value: .18, duration: 3, chance: 1 }
  });
  const objection = skill('Objection Sigil', 'magic', 'Sigil', 0, 7, '1.1× MAG Sigil damage; 85% base chance to Silence for 2 actions.', {
    coefficient: 1.1, status: { type: 'silence', chance: .85, duration: 2 }
  });
  const shelter = skill('Structure Serves Life', 'magic', 'Tech', 0, 10, 'Grant the living party a 20% Barrier for 3 actions. Barrier reduces incoming damage.', {
    targetSide: 'party', partyWide: true, buffs: [{ type: 'barrier', value: .2, duration: 3 }]
  });
  const coffee = skill('Coffee Break', 'magic', 'Heart', 0, 5, 'Restore 16 MP to one other living ally. Costs 5 fixed MP and an action.', {
    targetSide: 'ally', otherAllyOnly: true, manaRecovery: 16, fixedBaseCost: true
  });
  const rewrite = skill('ULT: System Rewritten', 'ultimate', 'Tech', 0, 100, '2.3× MAG Tech damage to all enemies. Applies 20% Disrupted for 2 actions, reducing their outgoing damage.', {
    coefficient: 2.3, allEnemies: true, ultimateIndex: 1, status: { type: 'disrupted', value: .2, duration: 2, chance: 1 }
  });
  baseJobs[ID] = character(ID, 'Chaos Agent', 'Tech', '#272523', '#111213', '#d8a44b',
    { str: 14, agi: 8, mag: 18, stam: 18, echo: 15 }, signatures.map(entry => entry[0]), [
      skill('Attack', 'magic', 'Tech', 0, 0, 'A small golden form sent into the blue network. Restores 6% Max MP.', { coefficient: 1, basicAttack: true }),
      form, objection, shelter, coffee, rewrite
    ]);
  STARTING_HERO_GEAR[ID] = { ...baseJobs[ID].gear };
  FLAMEGUARD_COMBAT_ROLES[ID] = 'utility';
  AUTO_EQUIP_PROFILES[ID] = { damage: 1, healing: .7, hp: .18, mp: .25, agi: .1, echo: .3, control: 1, support: 1.2, tank: .15 };
  FLAMEGUARD_BASE_EVASION[ID] = .04;
  spriteScale[ID] = { field: [28, 29], battle: [70, 64] };
  battleSpriteHeights[ID] = 64;
  portraitSources[ID] = BASE + 'portrait.webp';
  menuPortraitSources[ID] = BASE + 'portrait.webp';
  characterSpecialties[ID] = ['Network magic', 'Barriers & cleansing', 'Enemy disruption'];
  characterBios[ID] = 'Tinus, the Chaos Agent, is pulled into the Flameguard’s world through a portal after Seerin’s seven Shadow Duels. With his coffee, golden forms and blue network magic, he questions systems that decide people’s choices for them. He believes structure should serve life.';

  rank0Choices[ID] = [
    skill('Read the Fine Print', 'magic', 'Tech', 0, 7, '1.35× MAG Tech damage to one enemy; 25% extra damage if the target has a negative status.', { coefficient: 1.35, afflictedBonus: .25, rank0: true }),
    skill('A Plan With Room', 'magic', 'Sigil', 0, 7, 'Grant one living ally 20% MAG and 15% Evasion for 2 incoming attacks.', { targetSide: 'ally', rank0: true, buffs: [{ type: 'magicUp', value: .2, duration: 2 }, { type: 'evasion', value: .15, duration: 2 }] })
  ];
  const restore = skill('Amend the Damage', 'magic', 'Heart', -40, 9, 'Heal the most wounded living ally for 40 + 0.8× MAG and cleanse one negative effect.', { healScaling: .8, cleanse: true });
  const circuit = skill('Open Circuit', 'magic', 'Tech', 0, 11, '1.35× MAG Tech damage to all enemies, with a 55% base chance to inflict 15% Magic Defense Down for 2 actions.', { coefficient: 1.35, allEnemies: true, status: { type: 'magicDefenseDown', value: .15, duration: 2, chance: .55 } });
  const freedom = skill('Room to Choose', 'magic', 'Sigil', 0, 9, 'Grant the living party 15% MAG and 15% AGI for 3 actions.', { targetSide: 'party', partyWide: true, buffs: [{ type: 'magicUp', value: .15, duration: 3 }, { type: 'agilityUp', value: .15, duration: 3 }] });
  const annul = skill('Void the Clause', 'magic', 'Sigil', 0, 8, 'Dispel one positive enemy buff. Deals no direct damage.', { targetSide: 'enemy', dispel: true });
  const rebalance = skill('Restore the Balance', 'magic', 'Heart', -35, 13, 'Heal every living ally for 35 + 0.65× MAG, cleanse one negative effect each and grant a 12% Barrier for 2 actions.', { healScaling: .65, targetSide: 'party', partyWide: true, cleanse: true, buffs: [{ type: 'barrier', value: .12, duration: 2 }] });
  const sanctuary = skill('ULT II: A World With Choices', 'ultimate', 'Sigil', -75, 100, 'Heal the living party for 75 + 0.9× MAG before Ultimate and ECHO bonuses. Cleanse one negative effect each, grant Party Guard and 20% MAG for 3 actions.', { healScaling: .9, ultimateIndex: 2, targetSide: 'party', partyWide: true, cleanse: true, grantsWard: true, buffs: [{ type: 'magicUp', value: .2, duration: 3 }] });
  const bill = skill('ULT II: B.I.L.L. — Open the Network', 'ultimate', 'Tech', 0, 100, '2.8× MAG Tech damage to all enemies. Applies 20% Magic Vulnerability for 3 actions.', { coefficient: 2.8, ultimateIndex: 2, allEnemies: true, status: { type: 'magicVulnerability', value: .2, duration: 3, chance: 1 } });
  talentTrees[ID] = [
    talentNode(1, 'Practical Magic', 'magicDamage', .15, 'MAG attacks deal 15% more damage.'),
    talentNode(1, 'Human Revision', 'newSkill', restore),
    talentNode(1, 'Reinforced Margins', 'barrierBoost', .2, 'Barriers cast by Tinus are 20% stronger.'),
    talentNode(2, 'Many Open Threads', 'newSkill', circuit),
    talentNode(2, 'Room to Choose', 'newSkill', freedom),
    talentNode(2, 'No Wasted Forms', 'techCostReduction', .15, 'Tech skills cost 15% less MP.'),
    talentNode(3, 'Void the Clause', 'newSkill', annul),
    talentNode(3, 'Hold the Structure', 'buffDuration', 1, 'Timed buffs cast by Tinus last 1 additional action.'),
    talentNode(3, 'Unwritten Advantage', 'afflictedDamage', .2, 'Direct damage to enemies with a negative status increases by 20%.'),
    talentNode(4, 'Restore the Balance', 'newSkill', rebalance),
    talentNode(4, 'People Before Procedure', 'healBoost', .25, 'Healing cast by Tinus restores 25% more HP.'),
    talentNode(4, 'Not Your Decision', 'statusResistance', .2, 'Tinus gains 20% resistance to negative-status application.'),
    talentNode(5, 'A World With Choices', 'newSkill', sanctuary),
    talentNode(5, 'B.I.L.L. — Open the Network', 'newSkill', bill),
    talentNode(5, 'The System Can Change', 'ultimateBoost', .35, 'All Tinus Ultimates gain 35% damage, healing and support potency.')
  ];

  const oldEquipmentArtwork = equipmentArtwork;
  equipmentArtwork = id => id === ID ? BASE + 'equipment.webp' : oldEquipmentArtwork(id);
  const oldGearIcon = gearIconHtml;
  gearIconHtml = (gear, heroId, index, className = '', ref = null) => {
    const signature = signatures.find(entry => entry[0] === gear?.name);
    if (!signature) return oldGearIcon(gear, heroId, index, className, ref);
    return `<span class="pixel-icon ${className} gear-art-icon gear-art-${gear.slot} tinus-gear-icon" aria-hidden="true" style="background-image:url('${BASE + signature[5]}');background-size:contain;background-position:center;background-repeat:no-repeat"></span>`;
  };

  const images = {}, frameCache = new Map();
  let manifest;
  const ready = (async () => {
    const response = await fetch(BASE + 'manifest.json?v=tinus-anchored-210');
    if (!response.ok) throw new Error('Tinus frame manifest could not load.');
    manifest = await response.json();
    await Promise.all(['hall', 'battle', 'effects'].map(key => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images[key] = image; resolve(); };
      image.onerror = () => reject(new Error('Tinus ' + key + ' artwork could not load.'));
      image.src = BASE + manifest[key].file;
    })));
    battleAnimationSheets[ID] = { ...manifest.battle, image: images.battle };
    characterVfxSheets[ID] = { ...manifest.effects, image: images.effects };
    return true;
  })();
  // Report asset failure without replacing Tinus by a generic placeholder.
  ready.catch(error => console.error(error));

  function hallFrame(row, col) {
    const key = row * 8 + col;
    if (frameCache.has(key)) return frameCache.get(key);
    const config = manifest.hall, canvas = document.createElement('canvas');
    canvas.width = config.cellWidth; canvas.height = config.cellHeight;
    canvas.getContext('2d').drawImage(images.hall, col * config.cellWidth, row * config.cellHeight, config.cellWidth, config.cellHeight, 0, 0, config.cellWidth, config.cellHeight);
    frameCache.set(key, canvas);
    return canvas;
  }
  const blended = document.createElement('canvas');
  function drawField(actor, camera = { x: 0, y: 0 }, now = performance.now()) {
    if (!manifest || !images.hall) return false;
    const pose = actor.pose || 'idle', moving = pose === 'walk' || pose === 'backWalk';
    const row = pose === 'seated' ? 3 : pose === 'backWalk' ? 2 : pose === 'walk' ? 1 : 0;
    const phase = Number.isFinite(actor.phase) ? actor.phase : now / (moving ? 120 : 220);
    const col = ((Math.floor(phase) % 8) + 8) % 8;
    const config = manifest.hall, targetHeight = actor.size || 40;
    const scale = targetHeight / config.referenceHeight;
    const anchorX = actor.x - (camera.x || 0), baseline = actor.y - (camera.y || 0);
    let source = hallFrame(row, col);
    // Interpolate whole anchored poses for the quiet standing / seated coffee loops.
    // Walking uses the supplied eight complete drawings in their original order.
    if (!moving) {
      blended.width = config.cellWidth; blended.height = config.cellHeight;
      const paint = blended.getContext('2d'), mix = phase - Math.floor(phase);
      paint.globalAlpha = 1 - mix; paint.drawImage(source, 0, 0);
      paint.globalCompositeOperation = 'lighter';
      paint.globalAlpha = mix; paint.drawImage(hallFrame(row, (col + 1) % 8), 0, 0);
      paint.globalAlpha = 1; paint.globalCompositeOperation = 'source-over';
      source = blended;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (actor.flip) { ctx.translate(anchorX * 2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, anchorX - config.cellWidth * scale / 2, baseline - config.baseline * scale, config.cellWidth * scale, config.cellHeight * scale);
    ctx.restore();
    return true;
  }
  const battleIdleFrames = [];
  function stableBattleIdleFrame(col) {
    if (battleIdleFrames[col]) return battleIdleFrames[col];
    const config = manifest.battle, canvas = document.createElement('canvas');
    canvas.width = config.cellWidth; canvas.height = config.cellHeight;
    // Align complete coffee poses by the torso, rather than the shifting shoe centroid.
    canvas.getContext('2d').drawImage(images.battle, col * config.cellWidth, 0,
      config.cellWidth, config.cellHeight, -(config.idleAnchorOffsets[col] || 0),
      -(config.idleBaselineOffsets[col] || 0), config.cellWidth, config.cellHeight);
    return battleIdleFrames[col] = canvas;
  }
  const oldDrawBattlePartySprite = drawBattlePartySprite;
  drawBattlePartySprite = function(unit, anchorX, baseline, frame = tick) {
    if (unit.id !== ID || unit.anim && unit.anim !== 'idle' || !manifest || !images.battle) {
      return oldDrawBattlePartySprite(unit, anchorX, baseline, frame);
    }
    const config = manifest.battle, sequence = [0, 1, 2, 3, 2, 1];
    const phase = battleIdlePhase(ID, frame);
    const index = Math.floor(phase) % sequence.length;
    const source = stableBattleIdleFrame(sequence[index]);
    const next = stableBattleIdleFrame(sequence[(index + 1) % sequence.length]);
    const mix = battlePoseTransition(phase % 1);
    const scale = battleSpriteHeights[ID] * BATTLE_COMPOSITION_SCALE / config.referenceHeight;
    const x = anchorX - config.cellWidth * scale / 2, y = baseline - config.baseline * scale;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    if (mix > 0 && sequence[index] !== sequence[(index + 1) % sequence.length]) {
      const blended = blendBattlePoses(ID, {image: source, w: config.cellWidth, h: config.cellHeight}, {image: next, w: config.cellWidth, h: config.cellHeight}, mix);
      ctx.drawImage(blended.image, x - blended.pad * scale, y - blended.pad * scale, blended.image.width / blended.ratio * scale, blended.image.height / blended.ratio * scale);
    } else ctx.drawImage(source, x, y, config.cellWidth * scale, config.cellHeight * scale);
    ctx.restore(); return true;
  };
  const oldDrawSprite = drawSprite;
  drawSprite = function(id, px, py, dir = 0, anim = 'idle', frame = tick) {
    if (id !== ID) return oldDrawSprite(id, px, py, dir, anim, frame);
    if (mode === 'battle' || ['melee', 'magic', 'block', 'ultimate', 'death'].includes(anim)) {
      return drawBattlePartySprite({ id, anim }, px + 24, py + 52, frame);
    }
    return drawField({ x: px + 8, y: py + 32, size: spriteScale[ID].field[1], pose: anim === 'walk' ? dir === 2 ? 'backWalk' : 'walk' : 'idle', phase: frame / (anim === 'walk' ? 7.2 : 13.2), flip: dir === 1 }, { x: 0, y: 0 }, frame * 1000 / 60);
  };

  function recruit() {
    if (state.party.includes(ID)) return false;
    const level = Math.min(MAX_LEVEL, Math.max(1, ...state.party.map(id => Number(progressFor(id).level) || 1)));
    state.party.push(ID);
    state.heroProgress[ID] = { level, xp: 0, talents: [], pendingMilestones: [] };
    const hero = baseJobs[ID];
    for (const [name, slot] of signatures) {
      if (!state.ownedGear.includes(name)) addOwnedGear(name, 1, { rarity: 'Personal Artifact', rollAffixes: false });
      hero.gear[slot] = echoGearInstanceRefs(name)[0] || name;
    }
    progressFor(ID);
    const stats = totals(ID); hero.hp = stats.max; hero.mp = stats.mp;
    queueSave();
    updatePanels();
    return true;
  }
  window.TinusCharacter = { ready, recruit, drawField, signatureNames: signatures.map(entry => entry[0]) };
})();
