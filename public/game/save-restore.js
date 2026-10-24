// Restore user-selected local exports. No save contents are sent to a server.
(()=>{'use strict';
 const prefix='#restore-saves=';if(!location.hash.startsWith(prefix))return;
 const encoded=location.hash.slice(prefix.length);history.replaceState(null,'',location.pathname+location.search);
 const panel=document.createElement('section');panel.style.cssText='position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#080512ed;color:#f4ddb3;font:18px Georgia,serif';
 const card=document.createElement('article');card.style.cssText='max-width:650px;padding:32px;border:2px solid #bc9459;background:#21182b;box-shadow:0 12px 70px #000';panel.append(card);document.body.append(panel);
 const title=document.createElement('h2');title.textContent='Restore recovered Ember Hall saves';card.append(title);
 const info=document.createElement('p');info.style.lineHeight='1.6';card.append(info);
 const button=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:12px 18px;margin:12px 12px 0 0;background:#73542f;color:#fff1cf;border:1px solid #cfad72;font:16px Georgia;cursor:pointer';b.onclick=action;card.append(b);return b;};
 let payload;
 try{if(encoded.length>2000000)throw Error('Recovery file is too large.');payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));if(!payload||typeof payload!=='object')throw Error('Invalid recovery file.');
 const slots=Object.keys(payload);if(!slots.length||slots.some(k=>!['1','2'].includes(k)))throw Error('Invalid save slots.');
 const lines=slots.map(slot=>{if(typeof payload[slot]!=='string')throw Error('Invalid save data.');const d=JSON.parse(payload[slot]);if(!d.state||!d.heroes||d.version!==4||!Array.isArray(d.state.party)||!d.state.hallBattles)throw Error('This is not a supported Ember Hall export.');return 'Slot '+slot+': stage '+(d.state.hallBattles.unlockedStage||1)+' — '+(d.state.hallBattles.clearedStages?.length||0)+' stages cleared.';});
 info.textContent=lines.join(' ');const notice=document.createElement('p');notice.textContent='This replaces these slots in this browser. Existing saves are backed up locally first.';card.append(notice);
 button('Restore both slots',()=>{const before=new Map(),written=[];try{const stamp=Date.now();for(const slot of slots){const key=hallSaveKey(Number(slot)),old=localStorage.getItem(key);before.set(key,old);if(old!==null)localStorage.setItem('verseborn-recovery-backup-'+slot+'-'+stamp,old);}
 for(const slot of slots){const key=hallSaveKey(Number(slot));localStorage.setItem(key,payload[slot]);written.push(key);if(localStorage.getItem(key)!==payload[slot])throw Error('Save verification failed.');}
 clearTimeout(saveTimer);titleMenuIndex=1;titleMenuState='hall';titleSubmenuIndex=0;activeSaveSlot=1;mode='title';card.replaceChildren();const h=document.createElement('h2');h.textContent='Both saves restored';card.append(h);const p=document.createElement('p');p.textContent='Slot 1: stage 48. Slot 2: all 60 stages cleared. Select a slot on the opening screen to continue.';card.append(p);button('Show restored slots',()=>panel.remove());
 }catch(error){for(const key of written){const raw=before.get(key);try{if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw);}catch{}}notice.textContent='Restore failed: '+error.message+'. Original slots were kept.';}});
 button('Cancel',()=>panel.remove());
 }catch(error){title.textContent='Could not read recovery file';info.textContent=error.message;button('Close',()=>panel.remove());}
})();
