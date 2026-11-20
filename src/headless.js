import fs from 'node:fs';
import {createGame,step,snapshot} from './core.js';
const fail=m=>{throw new Error(m);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const num=x=>typeof x==='number'&&Number.isFinite(x);
const vec=(x,n)=>Array.isArray(x)&&x.length===n&&x.every(num);
const integer=x=>Number.isInteger(x)&&x>=0;
function validate(s,inputs){
 if(!object(s)||!object(inputs)||!Array.isArray(inputs.frames))fail('scenario/inputs must be objects; inputs.frames must be an array');
 for(const k of ['random_motes','random_shades'])if(k in s&&typeof s[k]!=='boolean')fail(k);
 if(s.player!==undefined){if(!object(s.player))fail('player');if('pos'in s.player&&!vec(s.player.pos,3))fail('player.pos');for(const k of ['carried','flames'])if(k in s.player&&!integer(s.player[k]))fail(k);}
 if('time_left_s'in s&&(!num(s.time_left_s)||s.time_left_s<0))fail('time_left_s');
 if('motes'in s&&(!Array.isArray(s.motes)||!s.motes.every(p=>vec(p,3))))fail('motes');
 if('shades'in s){if(!Array.isArray(s.shades)||!s.shades.every(x=>object(x)&&vec(x.pos,3)&&(x.id===undefined||typeof x.id==='string')))fail('shades');const ids=s.shades.map((x,i)=>x.id??`S${i+1}`);if(new Set(ids).size!==ids.length)fail('duplicate shade id');}
 if('lanterns'in s){if(!Array.isArray(s.lanterns))fail('lanterns');const ids=new Set();for(const l of s.lanterns){if(!object(l)||!/^L[1-5]$/.test(l.id)||ids.has(l.id))fail('lantern id');ids.add(l.id);if('pos'in l&&!vec(l.pos,3))fail('lantern.pos');if('deposited'in l&&!integer(l.deposited))fail('deposited');if('lit'in l&&typeof l.lit!=='boolean')fail('lit');}}
 let last=-1;for(const f of inputs.frames){if(!object(f)||!integer(f.tick)||f.tick<=last)fail('frame ticks must strictly increase');last=f.tick;if('move'in f&&(!vec(f.move,2)||f.move.some(x=>Math.abs(x)>1)))fail('move');if('cam_yaw_deg'in f&&!num(f.cam_yaw_deg))fail('cam_yaw_deg');for(const k of ['jump','pulse','interact','dash'])if(k in f&&typeof f[k]!=='boolean')fail(k);}
}
try {
 const args={};const allowed=['seed','night','scenario','inputs','ticks','out','snapshot-every'];for(let i=2;i<process.argv.length;i+=2){const k=process.argv[i].replace(/^--/,'');if(!allowed.includes(k)||process.argv[i+1]===undefined)fail('unknown or missing argument');args[k]=process.argv[i+1];}
 for(const k of ['seed','night','ticks','out'])if(args[k]===undefined)fail(`missing --${k}`);
 const seed=Number(args.seed),ticks=Number(args.ticks),every=Number(args['snapshot-every']??10);if(!Number.isInteger(seed)||args.night!=='1'||!integer(ticks)||!integer(every)||every<1)fail('invalid numeric argument');
 let s={},inputs={frames:[]};try {if(args.scenario)s=JSON.parse(fs.readFileSync(args.scenario,'utf8').replace(/^\uFEFF/,''));if(args.inputs)inputs=JSON.parse(fs.readFileSync(args.inputs,'utf8').replace(/^\uFEFF/,''));validate(s,inputs);}catch(e){process.stderr.write(`Invalid scenario/inputs: ${e.message}\n`);process.exit(2);}
 const g=createGame(seed,s),lines=[snapshot(g)];let i=0;for(let k=0;k<ticks&&g.state==='playing';k++){let f={};if(inputs.frames[i]?.tick===k)f=inputs.frames[i++];lines.push(...step(g,f));if(g.tick%every===0)lines.push(snapshot(g));}lines.push({type:'end',ticks:g.tick,state:g.state,score:g.score});fs.writeFileSync(args.out,lines.map(x=>JSON.stringify(x)).join('\n')+'\n');
}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
