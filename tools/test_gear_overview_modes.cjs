const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.ok(run(`(()=>{
  const entries=[{type:'siphoning',label:'Siphoning',value:.1},{type:'buffDuration',label:'Lasting',value:2},{type:'statPct',stat:'mag',label:'Scholar',value:.12},{type:'statusOnHit',status:'sleep',label:'Drowsing',value:.1}];
  const html=combinedAffixesHtml(entries);
  return entries.every(entry=>html.split('<b>'+entry.label+'</b>').length===2)&&html.includes('Turn Management')&&html.includes('HP & MP Recovery')&&html.includes('Stat Increases')&&html.includes('Status Chances');
})()`));
assert.ok(run(`(()=>{
  const id='Torren';const effects=effectValue,sustain=combatSustainRate;
  try {
    effectValue=(hero,type,status)=>type==='buffDuration'||type==='statusDuration'?2:effects(hero,type,status);
    combatSustainRate=(hero,type)=>type==='siphoning'?.1:sustain(hero,type);
    autoEquipStrategy='dps';const old=autoEquipLoadoutScore(id);
    autoEquipStrategy='utility';const enhanced=autoEquipLoadoutScore(id);
    return enhanced>old&&autoEquipToolbarHtml(id).includes('data-auto-equip-strategy="dps"');
  } finally {effectValue=effects;combatSustainRate=sustain;autoEquipStrategy='utility';}
})()`));
console.log('PASS grouped affixes appear once; DPS/Utility priorities and controls');
