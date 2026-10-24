const fs=require('fs');const f='public/game/asset-loading.js';let s=fs.readFileSync(f,'utf8');s=s.replace('window.ArtworkLoading=',`// Images produced by innerHTML bypass the src property setter. Recover those too.
 document.addEventListener('error',event=>{const image=event.target;if(!(image instanceof HTMLImageElement)||entries.has(image))return;const url=image.getAttribute('src');if(!url||!/assets\\//.test(url)||/^(data|blob):/.test(url))return;event.stopImmediatePropagation();image.src=url;},true);
 window.ArtworkLoading=`);fs.writeFileSync(f,s);
