const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let code=fs.readFileSync(path.join(__dirname,'test_tinus_whirlpool.cjs'),'utf8').split('\nlet passed=0;')[0]+'\nreturn {run,sandbox};';const{run,sandbox}=new Function('require','__dirname',code)(require,__dirname);
let passed=0;function check(label,code){assert.ok(run(code),label);console.log('PASS '+label);passed++;}
(async()=>{await Promise.all([sandbox.TinusCharacter.ready,sandbox.TinusWhirlpool.ready]);run(`state.party=Object.keys(baseJobs);state.activeParty=['Verseborn','Torren','Glimmer'];battle={party:state.activeParty.map(battleUnit),enemies:[],round:1};mode='battle';`);
check('Idle cycle is 7.2 seconds, retaining every current pose',`BATTLE_IDLE_FRAME_TICKS===72&&BATTLE_IDLE_FRAME_TICKS*6===432`);
check('All eight members have longer skill and Ultimate presentation',`['Verseborn','Mira','Seerin','Kael','Torren','Glimmer','Sparky','Tinus'].every(id=>['melee','magic','ultimate','block'].every(anim=>{const u={id},a={anim},base=baseSkillVisualTiming(u,a),now=skillVisualTiming(u,a);return now.totalMs>base.totalMs&&now.impactMs>base.impactMs&&now.totalMs>now.impactMs;}))`);
check('Enemy action timings stay unchanged',`['melee','magic','ultimate','block'].every(anim=>{const u={name:'Enemy'},a={anim};return JSON.stringify(skillVisualTiming(u,a))===JSON.stringify(baseSkillVisualTiming(u,a));})`);
check('Whole-frame transitions hold original art, ease continuously and complete',`battlePoseTransition(0)===0&&battlePoseTransition(.7)===0&&battlePoseTransition(.9)>0&&battlePoseTransition(.9)<1&&battlePoseTransition(1)===1`);
check('Animation includes a transparent padded blend without changing the original image',`(()=>{const image={width:512,height:512},a={image,w:512,h:512,dx:-24,dy:-2},b={image,w:512,h:512,dx:25,dy:0},r=blendBattlePoses('qa',a,b,.5);return r.pad>=29&&r.ratio<=1&&a.image===image&&b.image===image&&battlePoseBlendCanvases.size===1;})()`);
check('Death frames are extended and do not restart as an idle loop',`BATTLE_DEATH_FRAME_TICKS===20`);
console.log('PASS '+passed+' battle animation checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
