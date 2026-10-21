// Keep the native number animation, colours and lane timing above the DOM turn bar.
(()=>{
 const layer=document.createElement('canvas');layer.className='battle-floater-layer';layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{position:'absolute',pointerEvents:'none',zIndex:'30',background:'transparent',border:'0',boxShadow:'none',margin:'0',maxWidth:'none',maxHeight:'none',imageRendering:'auto'});el.battle.appendChild(layer);const context=layer.getContext('2d'),nativeDraw=drawBattleFloaters;
 drawBattleFloaters=function(){
  if(layer.width!==canvas.width||layer.height!==canvas.height){layer.width=canvas.width;layer.height=canvas.height;}
  context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,layer.width,layer.height);
  if(mode!=='battle'||!battle){return;}
  if(battleFloaters.length){const screen=canvas.getBoundingClientRect(),root=el.battle.getBoundingClientRect();Object.assign(layer.style,{left:(screen.left-root.left)+'px',top:(screen.top-root.top)+'px',width:screen.width+'px',height:screen.height+'px'});}
  context.setTransform(renderScale,0,0,renderScale,0,0);nativeDraw(context);
 };
})();
