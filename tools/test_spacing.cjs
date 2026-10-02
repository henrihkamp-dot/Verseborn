const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false}); sandbox.window = sandbox;');
const {run}=new Function('require','__dirname',`${prefix}\nreturn {run};`)(require,__dirname);
let passed=0;
function check(name,code){assert.ok(run(code),name);console.log('PASS',name);passed++;}
check('Compact formations remain exact', `(()=>{LOGICAL_WIDTH=256;return [1,2,3].every(n=>battlePartyLayouts[n].every(([x,y],i)=>partyBattlePosition(i,n)[0]===x&&partyBattlePosition(i,n)[1]===y));})()`);
check('Wider formations expand all horizontal gaps without changing baselines', `(()=>{for(const n of [1,2,3]){LOGICAL_WIDTH=256;const old=[...Array(n)].map((_,i)=>[partyBattlePosition(i,n),enemyBattlePosition(i,n)]);LOGICAL_WIDTH=320;for(let i=0;i<n;i++){const p=partyBattlePosition(i,n),e=enemyBattlePosition(i,n);if(p[0]!==old[i][0][0]*1.25||e[0]!==old[i][1][0]*1.25||p[1]!==old[i][0][1]||e[1]!==old[i][1][1])return false;}}return true;})()`);
check('Field projection and input inverse agree across every navigable column', `Array.from({length:15},(_,x)=>x*16+8).every(x=>Math.abs(fieldScreenX(x)*FIELD_WORLD_WIDTH/LOGICAL_WIDTH-x)<1e-8)`);
check('World collision grid width stays unchanged', `FIELD_WORLD_WIDTH===256&&TILE===16`);
check('Sprite dimensions and composition scale stay unchanged', `BATTLE_COMPOSITION_SCALE===.92&&LOGICAL_HEIGHT===224`);
check('VFX, floaters and effects use expanded participant anchors', `(()=>{state.activeParty=['Verseborn','Torren','Glimmer'];const party=state.activeParty.map(battleUnit);const enemies=[enemy('A',9999,1,'Sound','#555',1),enemy('B',9999,1,'Sound','#555',1),enemy('C',9999,1,'Sound','#555',1)];battle={party,enemies,round:1,turnQueue:[],usedOnce:{}};LOGICAL_WIDTH=320;return party.every((u,i)=>battleVfxAnchor(u).x===partyBattlePosition(i,3)[0]&&battleFloaterPosition(u)[0]===partyBattlePosition(i,3)[0]+2)&&enemies.every((u,i)=>battleVfxAnchor(u).x===enemyBattlePosition(i,3)[0]&&battleFloaterPosition(u)[0]===enemyBattlePosition(i,3)[0]-2)&&makeBattleEffect(party[0],{name:'Probe',anim:'magic',element:'Sound',power:1},enemies[2]).toX===enemyBattlePosition(2,3)[0];})()`);
console.log(`PASS ${passed}/${passed} focused spacing checks`);
