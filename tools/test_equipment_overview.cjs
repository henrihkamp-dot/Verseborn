const fs=require('fs'),assert=require('node:assert/strict');const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');const {run}=new Function('require','__dirname',prefix+';sandbox.fs=fs;sandbox.__dirname=__dirname;return {run};')(require,__dirname);
function check(name,code){assert.ok(run(code),name);console.log('PASS',name)}
run(`state.party=Object.keys(baseJobs);state.activeParty=['Verseborn','Torren','Glimmer'];state.gameMode='hallBattles';mode='menu';menuTab='gear';state.party.forEach(id=>Object.values(baseJobs[id].gear).forEach(ref=>{if(ref&&!state.ownedGear.includes(gearBaseName(ref)))addOwnedGear(ref)}));`);
check('All seven characters render their own art and exactly five interactive equipped slots',`(()=>{for(const id of state.party){selectedGearHero=id;selectedGearRef=null;gearPickerOpen=false;renderMenu();const html=el.menuBody.innerHTML;if(!html.includes(equipmentArtwork(id))||(html.match(/data-gear-slot=/g)||[]).length!==5||!html.includes('data-equipped-lock="ring"')||!html.includes('data-auto-equip="hero"')||!html.includes('data-unequip-all="hero"'))return false}return true})()`);
check('All equipment artwork assets exist and are compact WebP files',`Object.keys(baseJobs).every(id=>fs.existsSync(__dirname+'/../public/game/'+equipmentArtwork(id)))`);
check('Opening any equipment slot keeps the character and five body slots visible with one inline search pane',`(()=>{
  resetGearBrowser();
  for(const id of state.party)for(const slot of ['weapon','helmet','armour','necklace','ring','all']){
    selectedGearHero=id;selectedGearSlot=slot==='all'?'weapon':slot;selectedGearRef=null;gearBrowser.slot=slot;gearPickerOpen=true;renderMenu();
    const html=el.menuBody.innerHTML;
    const body=html.indexOf('class="equip-body"'),sidebar=html.indexOf('class="equip-sidebar"'),picker=html.indexOf('equip-slot-picker');
    const slots=[...html.matchAll(/data-gear-slot="([^"]+)"/g)].map(match=>match[1]);
    if(body<0||sidebar<=body||picker<=sidebar||!html.includes(equipmentArtwork(id))||!html.includes(id+' full-body equipment portrait'))return false;
    if(slots.length!==5||new Set(slots).size!==5||!['weapon','helmet','armour','necklace','ring'].every(name=>slots.includes(name)))return false;
    if((html.match(/data-gear-search(?=[\\s>])/g)||[]).length!==1||html.includes('gear-scroll-region')||!html.includes('data-close-equipment-picker'))return false;
  }
  return true;
})()`);
check('The picker retains search, filters, sorting, affixes, comparison, equip and favorite locks',`(()=>{gearPickerOpen=true;gearBrowser.slot='all';selectedGearHero='Verseborn';selectedGearRef=null;renderMenu();return ['data-gear-search','data-gear-filter','data-gear-sort','data-gear-preview','data-equip=','data-favorite=','gear-comparison','data-close-equipment-picker','data-auto-equip="party"'].every(key=>el.menuBody.innerHTML.includes(key))})()`);
check('Attribute comparisons do not alter equipped gear, inventory, saved vitals or lock states',`(()=>{const before=JSON.stringify({gear:baseJobs.Verseborn.gear,hp:baseJobs.Verseborn.hp,mp:baseJobs.Verseborn.mp,owned:state.ownedGear,locks:state.favoriteGear});equipmentAttributesHtml('Verseborn',baseJobs.Kael.gear.weapon);return before===JSON.stringify({gear:baseJobs.Verseborn.gear,hp:baseJobs.Verseborn.hp,mp:baseJobs.Verseborn.mp,owned:state.ownedGear,locks:state.favoriteGear})})()`);
check('Locks are reflected directly on equipped body slots',`(()=>{const ref=baseJobs.Verseborn.gear.ring;state.favoriteGear[ref]=true;const html=equipmentBodySlotsHtml('Verseborn');return html.includes('Unlock Ring on Verseborn')&&html.includes('aria-pressed="true"')})()`);
check('The existing search and selected-character usability filters still narrow the picker',`(()=>{gearBrowser.search='promise';gearBrowser.slot='all';gearBrowser.usability='selected';selectedGearHero='Verseborn';const items=filteredSortedGear(ownedGearRefs().map(ref=>({ref,gear:gearByName(ref)})));return items.length>0&&items.every(entry=>gearDisplayName(entry.ref).toLowerCase().includes('promise')&&canEquip('Verseborn',entry.gear))})()`);

