const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../public/game/hall-world.js','utf8');
const setup=`const W=640,H=356,player={x:315,y:185,facing:0,walking:false,phase:0},resonance={x:315};let target=null,route=[],pendingActor=null,last=0;const keys=new Set();const mode='walk',activeRecruitScene=null,heldDirection=null,state={};const triggered=[];function queueSave(){}function trigger(actor){triggered.push(actor.id);}`;
const geometry=source.slice(source.indexOf('  const floors='),source.indexOf('  const ready='));
const navigation=source.slice(source.indexOf('  function inPolygon'),source.indexOf('  function drawActor'));
const movement=source.slice(source.indexOf('  function update('),source.indexOf('  drawTileMap=function'));
const api=vm.runInNewContext(setup+geometry+navigation+movement+';({player,collision,navigate,update,obstacles,keys,triggered,get target(){return target},get route(){return route}})');
let now=0;
function travel(from,to,label){Object.assign(api.player,{x:from[0],y:from[1]});assert.equal(api.collision(...from),false,label+' start on floor');const began=performance.now();assert.ok(api.navigate(...to),label+' path exists');const planned=[api.target,...api.route].at(-1);assert.ok(Math.hypot(planned.x-to[0],planned.y-to[1])<=18,label+' nearby endpoint');for(let frame=0;api.target&&frame<2400;frame++){now+=1000/60;api.update(now);assert.ok(!api.collision(api.player.x,api.player.y),label+' stays on floor');}assert.equal(api.target,null,label+' arrives without snag');assert.ok(Math.hypot(api.player.x-planned.x,api.player.y-planned.y)<.21,label+' reaches planned destination');console.log('PASS',label,'search',Math.round(performance.now()-began)+'ms');}
travel([315,185],[81,77],'left staircase up');travel([81,77],[315,185],'left staircase down');
travel([315,185],[448,86],'right staircase up');travel([448,86],[315,185],'right staircase down');
travel([81,77],[320,50],'upper landing from kitchen');travel([320,50],[448,86],'upper landing to Glimmer');travel([448,86],[81,77],'upper passage right to left');
travel([315,185],[315,100],'around machine to rear');travel([api.player.x,api.player.y],[315,185],'around machine return');
travel([315,185],[229,279],'click on lower left pot snaps beside it');travel([315,185],[410,279],'click on lower right pot snaps beside it');
for(const o of api.obstacles)assert.equal(api.collision(o.x,o.y),true,'obstacle footprint blocks movement');
assert.equal(api.collision(315,126),true,'machine body blocked');assert.equal(api.collision(500,105),true,'balustrade blocked');assert.equal(api.collision(100,130),true,'weapon rack blocked');
Object.assign(api.player,{x:315,y:185});assert.equal(api.navigate(5,5),false,'distant wall click rejected');assert.equal(api.navigate(NaN,100),false);
Object.assign(api.player,{x:315.7,y:185.3});assert.ok(api.navigate(448,86),'off-grid start routes');
travel([200.09257945774928,85.90742054225072],[224,168],'off-grid left stairs down');
console.log('PASS all obstacle footprints, wall boundaries and off-grid start');

