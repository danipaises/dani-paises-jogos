import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {Race} from '../js/core.js';
test('eight human input slots are independent; missing inputs do not become AI',()=>{const r=new Race({humans:[0,1,2,3,4,5,6,7]});r.phase='racing';for(let n=0;n<60;n++)r.update(1/60,{3:{throttle:1}});assert.ok(r.racers[3].speed>5);assert.equal(r.racers[0].speed,0);assert.equal(r.racers[7].speed,0);r.racers[6].item='turbo';r.update(1/60,{6:{item:true}});assert.ok(r.racers[6].boost>2);assert.equal(r.racers[6].item,null);});
test('local human input interface completes all three tracks with eight racers',()=>{for(let track=0;track<3;track++){const r=new Race({track,humans:[0,1,2,3,4,5,6,7]});for(let n=0;n<22000&&r.phase!=='done';n++)r.update(1/30,r.racers.map(p=>r.ai(p,1/30)));assert.equal(r.phase,'done');assert.equal(r.finishOrder.length,8);}});
test('LAN joins, capacity, authorization, input relay and reconnection',async()=>{const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'18087'},stdio:['ignore','pipe','pipe']});const sockets=[];try{const key=await new Promise((res,rej)=>{let out='';const timer=setTimeout(()=>rej(Error('startup timeout')),5000);proc.stdout.on('data',x=>{out+=x;const m=out.match(/host=([a-f0-9]+)/);if(m){clearTimeout(timer);res(m[1]);}});proc.on('error',rej);});
const open=async()=>{const s=new WebSocket('ws://localhost:18087/ws');s.queue=[];s.on('message',b=>s.queue.push(JSON.parse(b)));await new Promise((res,rej)=>{s.on('open',res);s.on('error',rej);});sockets.push(s);return s;};
const take=async(s,type)=>{for(let i=0;i<150;i++){const n=s.queue.findIndex(x=>x.type===type);if(n>=0)return s.queue.splice(n,1)[0];await new Promise(r=>setTimeout(r,10));}throw Error('missing '+type);};
const send=(s,d)=>s.send(JSON.stringify(d));const host=await open();send(host,{type:'host',key});const welcome=await take(host,'welcome');const clients=[];let token;
for(let i=0;i<8;i++){const c=await open();send(c,{type:'join',invite:welcome.invite,name:'P'+i});const j=await take(c,'joined');assert.equal(j.id,i);if(i===0)token=j.token;clients.push(c);}
const ninth=await open();send(ninth,{type:'join',invite:welcome.invite});assert.match((await take(ninth,'error')).message,/cheia/);
send(clients[3],{type:'input',input:{steer:99,throttle:1,item:true}});const inp=await take(host,'input');assert.equal(inp.id,3);assert.equal(inp.input.steer,1);assert.equal(inp.input.item,true);
send(clients[1],{type:'command',command:'start'});await new Promise(r=>setTimeout(r,50));assert.ok(!host.queue.some(x=>x.type==='command'));
send(clients[0],{type:'command',command:'start'});assert.equal((await take(host,'command')).players.length,8);
send(host,{type:'phase',phase:'racing'});clients[0].close();await new Promise(r=>setTimeout(r,50));const reconnect=await open();send(reconnect,{type:'join',invite:welcome.invite,token});assert.equal((await take(reconnect,'joined')).id,0);
}finally{for(const s of sockets)s.terminate();proc.kill();}});
