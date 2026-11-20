export const T = {player_speed:6,carry_capacity:20,lantern_cost:10,lantern_count_night1:5,pickup_radius:1.4,interact_radius:3,pulse_cost:1,pulse_radius:7,night1_duration_s:300,flames:5,invuln_s:2,hit_drop_ratio:0.25,pulse_stun_s:3,pulse_push_m:4,pulse_cooldown_s:2,safe_radius:5,shade_speed:2,shade_hit_radius:0.8,fall_enabled:false,score:{per_mote:10,per_lantern:100,per_stun:20,per_second_left:1,per_flame_left:50}};
const dt=1/60, distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
export function createGame(seed=1,scenario={}) {
 let rng=seed>>>0; const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const point=()=>{const a=random()*Math.PI*2,r=4+random()*30;return [Math.cos(a)*r,0,Math.sin(a)*r];};
 const g={tick:0,state:'playing',score:0,time_left_s:T.night1_duration_s,player:{pos:[0,0,0],carried:0,flames:T.flames},lanterns:Array.from({length:5},(_,i)=>({id:`L${i+1}`,pos:[Math.sin(i*Math.PI*2/5)*25,0,Math.cos(i*Math.PI*2/5)*25],deposited:0,lit:false})),motes:Array.from({length:90},(_,i)=>({id:`M${i+1}`,pos:point()})),shades:[],input:{move:[0,0],cam_yaw_deg:0,jump:false,interact:false,pulse:false},events:[],vy:0,invuln:0,cooldown:0,nextShade:1,randomMotes:scenario.random_motes!==false,randomShades:scenario.random_shades!==false};
 Object.assign(g.player,scenario.player);g.player.pos=[...g.player.pos];
 if(scenario.motes)g.motes=scenario.motes.map((pos,i)=>({id:`M${i+1}`,pos:[...pos]}));else if(!g.randomMotes)g.motes=[];
 if(scenario.shades)g.shades=scenario.shades.map((s,i)=>({id:s.id??`S${i+1}`,pos:[...s.pos],state:'chase',stun:0}));
 g.nextShade=g.shades.length+1;
 for(const l of scenario.lanterns??[]) {const target=g.lanterns.find(x=>x.id===l.id);Object.assign(target,l);target.lit=target.lit||target.deposited>=T.lantern_cost;}
 if(scenario.time_left_s!==undefined)g.time_left_s=scenario.time_left_s;
 g.initialTime=g.time_left_s;
 g.random=random;g.point=point;return g;
}
export function step(g,frame={}) {
 if(g.state!=='playing')return [];
 const old=g.input,input={...old,...frame};g.input=input;g.tick++;g.events=[];
 const emit=(name,data)=>g.events.push({type:'event',tick:g.tick,name,data});
 const over=(state,reason)=>{g.state=state;if(state==='won')g.score+=Math.floor(Math.max(0,g.time_left_s))*T.score.per_second_left+g.player.flames*T.score.per_flame_left;emit('game_over',{result:state,reason});};
 const p=g.player;g.time_left_s=Math.max(0,g.initialTime-g.tick/60);g.invuln=Math.max(0,g.invuln-dt);g.cooldown=Math.max(0,g.cooldown-dt);
 let [x,z]=input.move;const len=Math.max(1,Math.hypot(x,z));x/=len;z/=len;const a=input.cam_yaw_deg*Math.PI/180;
 p.pos[0]+=(x*Math.cos(a)+z*Math.sin(a))*T.player_speed*dt;p.pos[2]+=(-x*Math.sin(a)+z*Math.cos(a))*T.player_speed*dt;
 const r=Math.hypot(p.pos[0],p.pos[2]);if(r>38){p.pos[0]*=38/r;p.pos[2]*=38/r;}
 if(input.jump&&!old.jump&&p.pos[1]===0)g.vy=7;
 p.pos[1]=Math.max(0,p.pos[1]+g.vy*dt);g.vy-=18*dt;if(p.pos[1]===0)g.vy=0;
 g.motes=g.motes.filter(m=>{if(p.carried<T.carry_capacity&&distance(p.pos,m.pos)<=T.pickup_radius){p.carried++;g.score+=T.score.per_mote;emit('mote_picked',{carried:p.carried});return false;}return true;});
 if(input.interact&&!old.interact){const l=g.lanterns.filter(l=>!l.lit&&distance(l.pos,p.pos)<=T.interact_radius).sort((a,b)=>distance(a.pos,p.pos)-distance(b.pos,p.pos))[0];if(l&&p.carried){const amount=Math.min(p.carried,T.lantern_cost-l.deposited);l.deposited+=amount;p.carried-=amount;emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});if(l.deposited>=T.lantern_cost){l.lit=true;g.score+=T.score.per_lantern;emit('lantern_lit',{lantern_id:l.id});}}}
 if(input.pulse&&!old.pulse&&g.cooldown<=1e-9&&p.flames>=T.pulse_cost){p.flames-=T.pulse_cost;g.cooldown=T.pulse_cooldown_s;const ids=[];for(const s of g.shades){if(distance(s.pos,p.pos)<=T.pulse_radius){ids.push(s.id);s.stun=T.pulse_stun_s;s.state='stunned';let dx=s.pos[0]-p.pos[0],dz=s.pos[2]-p.pos[2],d=Math.hypot(dx,dz);if(!d){dx=1;d=1;}s.pos[0]+=dx/d*T.pulse_push_m;s.pos[2]+=dz/d*T.pulse_push_m;g.score+=T.score.per_stun;}}emit('pulse',{stunned_ids:ids});}
 for(const s of g.shades){if(s.stun>0){s.stun=Math.max(0,s.stun-dt);s.state=s.stun>1e-9?'stunned':'chase';continue;}s.state='chase';const d=distance(s.pos,p.pos);let next=[...s.pos];if(d>0){next[0]+=(p.pos[0]-s.pos[0])/d*Math.min(d,T.shade_speed*dt);next[2]+=(p.pos[2]-s.pos[2])/d*Math.min(d,T.shade_speed*dt);}for(const l of g.lanterns.filter(l=>l.lit)){if(distance(next,l.pos)<T.safe_radius){let dx=next[0]-l.pos[0],dz=next[2]-l.pos[2],r=Math.hypot(dx,dz);if(!r){dx=1;r=1;}next[0]=l.pos[0]+dx/r*T.safe_radius;next[2]=l.pos[2]+dz/r*T.safe_radius;}}s.pos=next;if(distance(s.pos,p.pos)<=T.shade_hit_radius&&g.invuln<=1e-9){p.flames=Math.max(0,p.flames-1);const dropped=Math.floor(p.carried*T.hit_drop_ratio);p.carried-=dropped;g.invuln=T.invuln_s;emit('player_hit',{by:'shade',flames:p.flames,dropped});}}
 if(g.randomShades&&g.tick%300===0){let id;do{id=`S${g.nextShade++}`;}while(g.shades.some(s=>s.id===id));g.shades.push({id,pos:g.point(),state:'chase',stun:0});emit('shade_spawned',{id});}
 if(g.randomMotes&&g.tick%120===0&&g.motes.length<90)g.motes.push({id:`Mspawn${g.tick}`,pos:g.point()});
 if(p.flames<=0)over('lost','no_flames');else if(g.lanterns.every(l=>l.lit))over('won','all_lit');else if(g.time_left_s<=1e-9)over('lost','dawn');return g.events;
}
export function snapshot(g){const pos=p=>p.map(n=>Number(n.toFixed(3)));return {type:'snapshot',tick:g.tick,sim_tick:g.tick,state:g.state,time_left_s:Number(g.time_left_s.toFixed(6)),score:g.score,player:{...g.player,pos:pos(g.player.pos)},lanterns:g.lanterns.map(l=>({...l,pos:pos(l.pos)})),shades:g.shades.map(s=>({id:s.id,pos:pos(s.pos),state:s.state})),motes_active:g.motes.length,motes:g.motes.map(m=>({...m,pos:pos(m.pos)}))};}
