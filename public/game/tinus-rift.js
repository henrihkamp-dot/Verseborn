// Tinus can study the Rift as soon as both he and the revealed vault are available.
(() => {
  'use strict';
  const entry = skill('Form 17.2-B: Rift Amendment', 'magic', 'Tech', 0, 12,
    'An enhanced golden form woven through the Rift. Deals 2.05× MAG Tech damage to one enemy and applies 22% Magic Vulnerability for 3 actions.', {
      coefficient: 2.05,
      status: { type: 'magicVulnerability', value: .22, duration: 3, chance: 1 },
      riftSecret: true,
      fixedBaseCost: true
    });
  entry.riftVisible = () => state.party.includes('Tinus');
  entry.riftUnlocked = progress => Boolean(progress.unlocked) && state.party.includes('Tinus');
  entry.riftUnlockText = 'Tinus’s lesson unlocks on recruitment once Ember Rift is open; no Rift clear is required.';
  window.EmberRift.secretSkills.Tinus = entry;
})();
