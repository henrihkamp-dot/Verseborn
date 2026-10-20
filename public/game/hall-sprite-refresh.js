// Complete authored poses; source rectangles only select whole sprite frames.
(() => {
  const base='assets/hall/refresh-309/',fresh='assets/hall/refresh-311/',images={},ids=['Verseborn','Mira','MiraTalk','MiraWalk','SeerinWalk','MiraCute','SeerinCute','MiraDemon','SeerinDemon','TorrenFear','VersebornFear','SparkyFear','Seerin','Nyx','Rava','Jory','Revus'];let frames,loaded=false;
  const ready=Promise.all([fetch(fresh+'frames.json').then(r=>{if(!r.ok)throw Error('Hall pose anchors unavailable');return r.json();}).then(v=>frames=v),...ids.map(id=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[id]=im;resolve();};im.onerror=()=>reject(Error(id+' refreshed sprite unavailable'));const files={Revus:'revus',MiraTalk:'mira-talk',MiraWalk:'mira-walk',SeerinWalk:'seerin-walk',MiraCute:'sparky-cute-reactions',SeerinCute:'sparky-cute-reactions',MiraDemon:'sparky-angry-reactions',SeerinDemon:'sparky-angry-reactions',TorrenFear:'sparky-fear-reactions',VersebornFear:'sparky-fear-reactions',SparkyFear:'sparky-fear-reactions'};im.src=(files[id]?fresh:base)+(files[id]||(id==='Verseborn'?'verseborn-walk':id.toLowerCase()))+'.webp';}))]).then(()=>{loaded=true;});ready.catch(console.error);
  function draw(g,id,x,y,size,index=0,flip=false){
    if(!loaded||!frames[id])return false;const atlas=frames[id],f=atlas.frames[((index%atlas.frames.length)+atlas.frames.length)%atlas.frames.length],scale=size*.82/atlas.unitHeight;
    g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(images[id],f.x,f.y,f.w,f.h,-f.ax*scale,-f.ay*scale,f.w*scale,f.h*scale);g.restore();return true;
  }
  function childFrame(id,now,speaking,practice){const poses=id==='Jory'&&practice?[0,1,2,3,2,1]:speaking?[0,1,2,1,3,0]:[0,0,0,3];return poses[Math.floor(now/(speaking||practice?340:900))%poses.length];}
  window.HallSpriteRefresh={ready,draw,childFrame,get loaded(){return loaded;},get frames(){return frames;}};
})();
