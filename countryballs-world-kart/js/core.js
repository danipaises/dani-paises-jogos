import {CHARACTERS,TRACKS,POINTS,clamp,mod,angleDiff,random} from './data.js';
import {Track} from './track.js';
export class Race {
 constructor({track=0,character=0,difficulty='normal',mode='quick',seed=12345,humans=null,laps=3,speed=1}={}){
 this.totalLaps=Number.isInteger(laps)&&laps>=1&&laps<=10?laps:3;this.speedFactor=[.8,1,1.25].includes(speed)?speed:1;this.humans=humans;this.track=new Track(TRACKS[track]);this.trackIndex=track;this.mode=mode;this.difficulty=difficulty;this.rng=random(seed);this.time=0;this.countdown=3.5;this.phase='countdown';this.events=[];this.effects=[];this.traps=[];this.projectiles=[];this.finishOrder=[];this.racers=[];this.allDone=false;
 const ids=humans?[...humans,...CHARACTERS.map((_,i)=>i).filter(i=>!humans.includes(i))]:mode==='time'?[character]:[character,...CHARACTERS.map((_,i)=>i).filter(i=>i!==character)];
 ids.forEach((c,i)=>{let s=-10-Math.floor(i/2)*5,p=this.track.at(s,(i%2?1:-1)*2.5);this.racers.push({id:i,char:c,x:p.x,z:p.z,angle:p.angle,speed:0,y:0,vy:0,progress:s,s:p.s,index:Math.floor(p.s/this.track.step),nextGate:1,laps:0,lapStart:0,lapTimes:[],coins:0,item:null,boost:0,slow:0,stun:0,shield:0,magnet:0,invincible:0,drift:0,drifting:false,driftHeld:false,steer:0,rank:i+1,finished:false,finishTime:null,stuck:0,rampCooldown:0,aiTimer:1+this.rng()*3,lane:(i%3-1)*2,baseLane:(i%3-1)*2,trick:0,trickReady:false,respawns:0,collisionCooldown:0,safeS:s});});
 this.boxes=[];for(const f of this.track.def.items)for(const lane of [-3,0,3])this.boxes.push({...this.track.at(f*this.track.length,lane),cooldown:0});
 this.coins=[];for(let i=1;i<42;i++){let s=i/42*this.track.length;this.coins.push({...this.track.at(s,Math.sin(i*.8)*3),cooldown:0});}
 this.obstacles=track===2?[.36,.64].map((s,i)=>({...this.track.at(s*this.track.length),baseS:s*this.track.length,phase:i*2,radius:1.8})):[];
 }
 emit(type,r,data={}){this.events.push({type,racer:r?.id,x:r?.x,z:r?.z,...data});}
 ai(r,dt){let nearest=this.track.nearest(r.x,r.z,r.index);let wanted=r.baseLane;
 const ahead=(o)=>{const dx=o.x-r.x,dz=o.z-r.z;return dx*nearest.tx+dz*nearest.tz;};
 const blocker=this.racers.find(o=>o!==r&&!o.finished&&ahead(o)>1&&ahead(o)<15&&Math.hypot(o.x-r.x,o.z-r.z)<17&&Math.abs((o.x-r.x)*nearest.tz-(o.z-r.z)*nearest.tx)<2.7);
 if(blocker)wanted=nearest.lateral>0?-3.1:3.1;
 else if(!r.item){let box=this.boxes.filter(b=>b.cooldown<=0&&ahead(b)>3&&ahead(b)<24&&Math.hypot(b.x-r.x,b.z-r.z)<25).sort((a,b)=>Math.hypot(a.x-r.x,a.z-r.z)-Math.hypot(b.x-r.x,b.z-r.z))[0];if(box)wanted=this.track.nearest(box.x,box.z).lateral;}
 const trap=this.traps.find(o=>ahead(o)>0&&ahead(o)<13&&Math.hypot(o.x-r.x,o.z-r.z)<14);if(trap)wanted=((trap.x-r.x)*nearest.tz-(trap.z-r.z)*nearest.tx)>0?-3.3:3.3;
 r.lane+=(wanted-r.lane)*Math.min(1,dt*2);let look=7+Math.abs(r.speed)*.46;let target=this.track.at(nearest.s+look,r.lane);let desired=Math.atan2(target.x-r.x,target.z-r.z),error=angleDiff(desired,r.angle);let curve=Math.abs(angleDiff(this.track.at(nearest.s+23).angle,nearest.angle));let steering=clamp(error*2.3,-1,1);for(const o of this.obstacles){let d=Math.hypot(o.x-r.x,o.z-r.z);if(d<13){let side=(o.x-r.x)*nearest.tz-(o.z-r.z)*nearest.tx;steering+=side>0?-.55:.55;}}
 const ability={easy:.77,normal:.9,hard:1.0}[this.difficulty]||.9;let limit=(25.4+CHARACTERS[r.char].stats[0]*1.05)*this.speedFactor*ability/(1+curve*.50);r.aiTimer-=dt;
 if(r.item&&r.aiTimer<=0){const offensive=['rocket','ball','tornado'].includes(r.item);if(!offensive||this.targetAhead(r)){this.useItem(r);r.aiTimer=2+this.rng()*3;}}
 return {throttle:r.speed<limit?1:.22,brake:r.speed>limit+3?.35:0,steer:clamp(steering,-1,1),drift:curve>.32&&curve<1.2&&Math.abs(error)<.85&&r.speed>13};
 }
 update(dt,input={}){dt=clamp(dt,0,.05);this.events=[];if(this.phase==='done')return;
 if(this.phase==='countdown'){this.countdown-=dt;if(this.countdown<=0){this.phase='racing';this.emit('go',this.racers[0]);}return;}
 this.time+=dt;for(let o of this.obstacles){Object.assign(o,this.track.at(o.baseS,Math.sin(this.time*.65+o.phase)*3.2));}
 for(const c of [...this.boxes,...this.coins])c.cooldown=Math.max(0,c.cooldown-dt);
 if(!this.humans&&input.item)this.useItem(this.racers[0]);
 for(const r of this.racers){if(r.finished){r.speed*=Math.exp(-3*dt);continue;}const control=this.humans?(r.id<this.humans.length?(input[r.id]||{}):this.ai(r,dt)):(r.id===0?input:this.ai(r,dt));if(this.humans&&control.item)this.useItem(r);this.stepRacer(r,control,dt);}
 this.collisions();this.updateItems(dt);this.rank();
 if(this.finishOrder.length===this.racers.length){this.phase='done';this.allDone=true;this.emit('complete',this.racers[0]);}
 }
 stepRacer(r,c,dt){const stats=CHARACTERS[r.char].stats;for(const key of ['boost','slow','stun','shield','magnet','invincible','rampCooldown','collisionCooldown'])r[key]=Math.max(0,r[key]-dt);
 let throttle=clamp(c.throttle||0,0,1),brake=clamp(c.brake||0,0,1),steer=clamp(c.steer||0,-1,1);r.steer+=(steer-r.steer)*Math.min(1,dt*10);
 if(r.stun>0){throttle=0;brake=.2;}
 let nearest=this.track.nearest(r.x,r.z,r.index),shortcut=this.track.shortcutAt(r.x,r.z),off=nearest.distance>this.track.width*.5;
 let max=(25.4+stats[0]*1.05)*this.speedFactor*(1+r.coins*.006)*(r.slow>0?.56:1)*(off?(shortcut?.82:.55):1);
 if(r.boost>0)max*=1.38;
 const acceleration=this.speedFactor*(8.8+stats[1]*1.3+(CHARACTERS[r.char].id==='pl'&&r.speed<10?1:0));
 if(brake>.05)r.speed-=brake*(r.speed>0?25:acceleration*.45)*dt;else if(throttle>.01)r.speed+=acceleration*throttle*dt;else r.speed*=Math.exp(-.65*dt);
 if(r.speed>max)r.speed+=(max-r.speed)*Math.min(1,dt*4);r.speed=clamp(r.speed,-8,max+3);
 let was=r.driftHeld;r.driftHeld=!!c.drift;
 if(c.drift&&!was){if(r.y<=0){r.vy=4.2;this.emit('jump',r);}else if(r.y>1&&!r.trickReady){r.trickReady=true;r.trick=.001;this.emit('trick',r);}}
 if(r.trick>0)r.trick=Math.min(1,r.trick+dt*2.6);
 r.drifting=!!c.drift&&Math.abs(r.steer)>.12&&r.speed>9&&r.stun<=0;
 if(r.drifting)r.drift+=dt*(.8+stats[4]*.15);else if(!c.drift&&was){if(r.drift>.6){r.boost=Math.max(r.boost,Math.min(2.5,.7+r.drift*.5)+(r.char===7?.25:0));this.emit('driftboost',r);}r.drift=0;}
 if(!c.drift&&!was)r.drift=0;
 let turn=(1.3+stats[2]*.085)*Math.min(1,Math.abs(r.speed)/9)*(r.speed<0?-1:1)*(r.drifting?1.33:1);
 r.angle+=r.steer*turn*Math.sqrt(this.speedFactor)*dt;
 let slip=r.drifting?-r.steer*.16:0;
 r.x+=Math.sin(r.angle+slip)*r.speed*dt;r.z+=Math.cos(r.angle+slip)*r.speed*dt;
 if(r.y>0||r.vy>0){r.vy-=15*dt;r.y+=r.vy*dt;if(r.y<0){r.y=0;r.vy=0;if(r.trickReady){r.boost=Math.max(r.boost,.8);r.trickReady=false;r.trick=0;this.emit('driftboost',r);}this.emit('land',r);}}
 nearest=this.track.nearest(r.x,r.z,r.index);shortcut=this.track.shortcutAt(r.x,r.z);
 const boundary=this.track.width*.5+5.5;
 if(nearest.distance>boundary&&!shortcut){const excess=nearest.distance-boundary;r.x-=nearest.tz*Math.sign(nearest.lateral)*excess;r.z+=nearest.tx*Math.sign(nearest.lateral)*excess;r.speed*=.86;if(r.collisionCooldown<=0){this.emit('collision',r);if(Math.abs(r.speed)>18)r.coins=Math.max(0,r.coins-1);r.collisionCooldown=.5;}}
 let ds=nearest.s-r.s;if(ds>this.track.length/2)ds-=this.track.length;if(ds<-this.track.length/2)ds+=this.track.length;
 if(Math.abs(ds)<Math.max(7,Math.abs(r.speed)*dt*5)&&nearest.distance<this.track.width+15){r.progress+=ds;}
 r.s=nearest.s;r.index=nearest.index;
 const gateStep=this.track.length/16;
 if(r.progress>=r.nextGate*gateStep){let gate=this.track.at(r.nextGate*gateStep);if(Math.hypot(gate.x-r.x,gate.z-r.z)<this.track.width+15){r.nextGate++;if((r.nextGate-1)%16===0){r.laps++;r.lapTimes.push(this.time-r.lapStart);r.lapStart=this.time;this.emit('lap',r);if(r.laps===this.totalLaps){r.finished=true;r.finishTime=this.time;this.finishOrder.push(r.id);this.emit('finish',r);}}}}
 if(nearest.distance<this.track.width*.5&&ds>0)r.safeS=r.progress;
 if(r.speed<2&&throttle>.5)r.stuck+=dt;else r.stuck=0;
 if(nearest.distance>42||r.stuck>4){this.respawn(r);}
 if(r.rampCooldown<=0&&r.y===0&&r.speed>10&&this.track.ramps.some(s=>Math.abs(s-r.s)<2.8)&&Math.abs(nearest.lateral)<5){r.vy=7.5;r.rampCooldown=2;this.emit('ramp',r);}
 if(this.track.boosts.some(s=>Math.abs(s-r.s)<3)&&Math.abs(nearest.lateral)<4){if(r.boost<.2)this.emit('boostpad',r);r.boost=Math.max(r.boost,.7);}
 for(const box of this.boxes)if(box.cooldown<=0&&!r.item&&Math.hypot(box.x-r.x,box.z-r.z)<2.3&&r.y<3){r.item=this.rollItem(r.rank);box.cooldown=4;this.emit('item',r);break;}
 for(const coin of this.coins)if(coin.cooldown<=0&&Math.hypot(coin.x-r.x,coin.z-r.z)<(r.magnet>0?13:2)&&r.y<4&&r.coins<10){r.coins++;coin.cooldown=6;this.emit('coin',r);}
 }
 respawn(r){let s=Math.min(r.safeS,(r.nextGate-.15)*this.track.length/16),p=this.track.at(s);Object.assign(r,{x:p.x,z:p.z,angle:p.angle,s:p.s,progress:s,index:Math.floor(p.s/this.track.step),speed:5,y:3,vy:0,stuck:0,invincible:2});r.respawns++;this.emit('respawn',r);}
 rank(){const list=[...this.racers].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.progress-a.progress);list.forEach((r,i)=>r.rank=i+1);return list;}
 collisions(){for(let i=0;i<this.racers.length;i++){const a=this.racers[i];if(a.finished)continue;for(let j=i+1;j<this.racers.length;j++){const b=this.racers[j];if(b.finished||Math.abs(a.y-b.y)>1.8)continue;let dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);if(d<2.2&&d>.01){let push=(2.2-d)*.55,wa=CHARACTERS[a.char].stats[3],wb=CHARACTERS[b.char].stats[3];a.x+=dx/d*push*wb/3;a.z+=dz/d*push*wb/3;b.x-=dx/d*push*wa/3;b.z-=dz/d*push*wa/3;if(Math.abs(a.speed-b.speed)>10&&a.collisionCooldown<=0){a.coins=Math.max(0,a.coins-1);a.collisionCooldown=.6;this.emit('collision',a);}a.speed*=.99;b.speed*=.99;}}
 for(const o of this.obstacles)if(Math.hypot(a.x-o.x,a.z-o.z)<o.radius+1&&a.y<2&&a.invincible<=0){this.hit(a,'obstacle',o);}}
 }
 rollItem(rank){let pool=rank<=2?['peel','peel','shield','ball','magnet','turbo','tornado']:rank<=5?['turbo','shield','ball','tornado','rocket','magnet','peel']:['turbo','turbo','lightning','rocket','rocket','magnet','tornado'];return pool[Math.floor(this.rng()*pool.length)];}
 targetAhead(r){return this.racers.filter(o=>o!==r&&!o.finished&&o.progress>r.progress).sort((a,b)=>a.progress-b.progress)[0];}
 useItem(r){if(!r.item||r.finished||this.phase!=='racing')return false;let id=r.item;r.item=null;this.emit('use',r,{item:id});if(id==='turbo')r.boost=2.3+(r.char===7?.35:0);else if(id==='shield')r.shield=8;else if(id==='magnet')r.magnet=7;else if(id==='lightning'){for(const o of this.racers)if(o!==r&&!o.finished)this.hit(o,'lightning',r);}else if(id==='peel'){this.traps.push({x:r.x-Math.sin(r.angle)*3,z:r.z-Math.cos(r.angle)*3,owner:r.id,life:18,age:0});}else{let target=this.targetAhead(r);this.projectiles.push({x:r.x+Math.sin(r.angle)*2.5,z:r.z+Math.cos(r.angle)*2.5,angle:r.angle,owner:r.id,kind:id,target:target?.id,life:8,speed:id==='rocket'?45:id==='tornado'?32:40});}return true;}
 hit(r,kind,source){if(r.invincible>0)return false;if(r.shield>0){r.shield=0;r.invincible=.45;this.emit('blocked',r);return false;}r.invincible=1.25;r.coins=Math.max(0,r.coins-2);if(kind==='lightning')r.slow=1.7;else{r.stun=kind==='peel'?.75:.55;r.speed*=.48;if(kind==='tornado'){let dx=r.x-source.x,dz=r.z-source.z,m=Math.hypot(dx,dz)||1;r.x+=dx/m*3;r.z+=dz/m*3;}}this.emit('hit',r,{kind});return true;}
 updateItems(dt){for(const t of this.traps){t.life-=dt;t.age+=dt;for(const r of this.racers)if(!r.finished&&(r.id!==t.owner||t.age>2)&&r.y<1.6&&Math.hypot(t.x-r.x,t.z-r.z)<1.8){this.hit(r,'peel',t);t.life=0;}}
 for(const p of this.projectiles){p.life-=dt;if(p.kind==='rocket'&&p.target!==undefined){let target=this.racers[p.target];if(target&&!target.finished)p.angle+=clamp(angleDiff(Math.atan2(target.x-p.x,target.z-p.z),p.angle),-dt*6,dt*6);}p.x+=Math.sin(p.angle)*p.speed*dt;p.z+=Math.cos(p.angle)*p.speed*dt;for(const r of this.racers)if(r.id!==p.owner&&!r.finished&&Math.hypot(p.x-r.x,p.z-r.z)<(p.kind==='tornado'?3.1:2)){this.hit(r,p.kind,p);p.life=0;break;}}
 this.traps=this.traps.filter(t=>t.life>0);this.projectiles=this.projectiles.filter(p=>p.life>0);
 }
 results(){return this.rank().map(r=>({char:r.char,rank:r.rank,time:r.finishTime,points:POINTS[r.rank-1],laps:r.lapTimes}));}
}
export function cupStandings(rounds){let table=CHARACTERS.map((c,i)=>({char:i,points:0,wins:0,totalTime:0,finishes:[]}));for(const round of rounds)for(const r of round){let t=table[r.char];t.points+=r.points;t.wins+=r.rank===1?1:0;t.totalTime+=r.time??1e9;t.finishes.push(r.rank);}return table.sort((a,b)=>b.points-a.points||b.wins-a.wins||a.totalTime-b.totalTime||a.char-b.char);}
