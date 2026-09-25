const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false}); sandbox.window = sandbox;');
const {run}=new Function('require','__dirname',prefix+'\nreturn {run};')(require,__dirname);
let passed=0;
function test(name,expr){assert.ok(run(expr),name);passed++;console.log('PASS '+name);}
test('All normal statuses have exported glyphs',`Object.keys(STATUS_DEFS).filter(t=>t!=='broken').length===33`);
for(const type of run('Object.keys(STATUS_DEFS)'))assert.ok(fs.existsSync(path.join(__dirname,'../public/game/assets/ui/status',type+'.webp')));
run(`var iconUnit={id:'Mira',name:'Mira',hp:100,statuses:[{type:'evasion',value:.35,remaining:2},{type:'barrier',value:.42,remaining:4},{type:'vampiric',value:.25,remaining:3},{type:'poison',value:19,remaining:5},{type:'silence',remaining:1},{type:'broken',remaining:1}]};`);
test('Actual Evasion, Barrier and Vampiric values',`statusDisplayData(iconUnit,iconUnit.statuses[0]).compact==='35%'&&statusDisplayData(iconUnit,iconUnit.statuses[1]).compact==='42%'&&statusDisplayData(iconUnit,iconUnit.statuses[2]).compact==='25%'`);
test('DOT uses live damage and duration',`statusDisplayData(iconUnit,iconUnit.statuses[3]).compact==='5t'&&statusDisplayData(iconUnit,iconUnit.statuses[3]).description.includes('19 damage')`);
test('Tooltip includes every status, including overflow and Broken',`(statusTooltipHtml(iconUnit).match(/<section>/g)||[]).length===6&&statusTooltipHtml(iconUnit).includes('SILENCE')&&statusTooltipHtml(iconUnit).includes('BROKEN')`);
test('Drawing shows four icons and +1; Broken does not consume a slot',`(()=>{const old=drawText,labels=[];drawText=(t)=>labels.push(t);drawBattleStatusBadges(iconUnit,60,140);drawText=old;return labels.includes('+1')&&labels.filter(x=>x==='5t').length===1&&!labels.includes('1t')})()`);
test('Rendering leaves battle data unchanged',`(()=>{const before=JSON.stringify(iconUnit);drawBattleStatusBadges(iconUnit,60,140);statusTooltipHtml(iconUnit);return before===JSON.stringify(iconUnit)})()`);
test('Values refresh after status changes',`(()=>{iconUnit.statuses[0].value=.18;iconUnit.statuses[0].remaining=1;const d=statusDisplayData(iconUnit,iconUnit.statuses[0]);return d.compact==='18%'&&d.remaining===1})()`);
test('Tooltip escapes unit names',`statusTooltipHtml({...iconUnit,name:'<img>'}).includes('&lt;img&gt;')`);
test('Broken only still has a hover area and full details',`(()=>{statusHoverAreas=[];const unit={...iconUnit,statuses:[{type:'broken',remaining:1}]};drawBattleStatusBadges(unit,60,140);return statusHoverAreas.length===1&&statusTooltipHtml(unit).includes('BROKEN')})()`);
test('Bottom formation icons stay inside the battlefield beside their bars',`(()=>{statusHoverAreas=[];drawBattleStatusBadges(iconUnit,46,180);drawBattleStatusBadges(iconUnit,210,180);return statusHoverAreas.every(a=>a.y+a.h<=BATTLE_ARENA_HEIGHT&&a.x>=0&&a.x+a.w<=LOGICAL_WIDTH)})()`);
console.log(`${passed} focused status UI checks passed; no full regression run.`);
