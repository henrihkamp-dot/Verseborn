const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../public/game/game.js','utf8').split('function syncResponsiveDevice() {')[1].split('function syncResponsiveMode()')[0];
for(const test of [
 {name:'11-inch iPad landscape',w:1194,h:834,touch:5,platform:'MacIntel',coarse:true,tablet:true},
 {name:'12.9-inch iPad portrait',w:1024,h:1366,touch:5,platform:'MacIntel',coarse:true,tablet:true},
 {name:'iPad with trackpad',w:1366,h:1024,touch:5,platform:'MacIntel',coarse:false,tablet:true},
 {name:'iPad Split View',w:600,h:834,touch:5,platform:'MacIntel',coarse:true,tablet:true},
 {name:'desktop Mac',w:1440,h:900,touch:0,platform:'MacIntel',coarse:false,tablet:false},
 {name:'touchscreen laptop with mouse',w:1440,h:900,touch:1,platform:'Win32',coarse:false,tablet:false},
 {name:'phone retains phone layout',w:390,h:844,touch:5,platform:'iPhone',coarse:true,tablet:false,phone:true}
]){
 const classes=new Set(),styles={},meta={};
 const root={classList:{toggle:(name,value)=>value?classes.add(name):classes.delete(name),remove:name=>classes.delete(name)},style:{setProperty:(k,v)=>styles[k]=v,removeProperty:k=>delete styles[k]}};
 const context={document:{documentElement:root,querySelector:()=>meta},navigator:{platform:test.platform,userAgent:test.platform,maxTouchPoints:test.touch},requestAnimationFrame:()=>{},syncCanvasResolution:()=>{},defaultViewportContent:'width=device-width, initial-scale=1'};
 context.window={innerWidth:test.w,innerHeight:test.h,matchMedia:()=>({matches:test.coarse}),visualViewport:{height:test.h-40,scale:1}};
 vm.runInNewContext('function syncResponsiveDevice() {'+source+';syncResponsiveDevice();',context);
 assert.equal(classes.has('touch-tablet'),test.tablet,test.name);assert.equal(classes.has('touch-phone'),!!test.phone,test.name);
 if(test.tablet){assert.equal(classes.has('desktop-scaled'),false);assert.equal(styles['--tablet-viewport-height'],(test.h-40)+'px');assert.ok(meta.content.includes('viewport-fit=cover'));}
 console.log('PASS '+test.name);
}
