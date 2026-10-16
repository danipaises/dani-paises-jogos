import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {CHARACTERS,DEFAULTS} from '../js/data.js';
function setup(){const html=readFileSync(new URL('../local.html',import.meta.url),'utf8'),els=new Map(),commands=[];const el=()=>({hidden:false,value:'',disabled:false,dataset:{},style:{},children:[],options:[],classList:{add(){},toggle(){}},append(o){this.options.push(o);},replaceChildren(...children){this.children=children;}});for(const [,id] of html.matchAll(/id="([^"]+)"/g))els.set(id,el());els.get('touch').hidden=true;for(const [,command] of html.matchAll(/data-command="([^"]+)"/g)){const b=el();b.dataset.command=command;commands.push(b);}class Input{constructor(){this.active=false;this.clears=0;}clear(){this.clears++;}poll(){return{throttle:1,item:true};}}
class Socket{static instance;constructor(){this.readyState=1;Socket.instance=this;}send(){} }
const doc={getElementById:id=>{assert.ok(els.has(id),id);return els.get(id);},querySelectorAll:s=>s==='[data-command]'?commands:[],createElement:el,body:{classList:{add(){},toggle(){}}},addEventListener(){}};
const context=vm.createContext({CHARACTERS,DEFAULTS,ITEMS:[],formatTime:()=>'',Input,GameAudio:class{},URL,URLSearchParams,location:{search:'?room=test',protocol:'http:',host:'localhost:8080'},sessionStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>0},document:doc,window:{addEventListener(){}},navigator:{},WebSocket:Socket,requestAnimationFrame(){},setTimeout(){}});
vm.runInContext(readFileSync(new URL('../js/local.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);
vm.runInContext('connect()',context);const socket=Socket.instance;const message=d=>socket.onmessage({data:JSON.stringify(d)});const room=phase=>message({type:'room',players:[{id:0,name:'Piloto',char:0,connected:true}],phase,config:{mode:'gp',track:0,laps:3,speed:1,difficulty:'normal'}});return{els,commands,context,message,room};}
test('name and master settings never overlap driving controls; pause and results release inputs',async()=>{const s=setup();assert.equal(s.els.get('touch').hidden,true);await s.message({type:'joined',id:0,token:'test'});await s.room('lobby');assert.equal(s.els.get('touch').hidden,true);assert.equal(s.els.get('organizer').hidden,false);assert.equal(vm.runInContext('input.active',s.context),false);
await s.room('racing');assert.equal(s.els.get('touch').hidden,false);assert.equal(s.els.get('organizer').hidden,true);assert.equal(vm.runInContext('input.active',s.context),true);
await s.message({type:'state',paused:true,racers:[]});assert.equal(s.els.get('touch').hidden,true);assert.equal(vm.runInContext('input.active',s.context),false);
await s.message({type:'state',paused:false,racers:[]});assert.equal(s.els.get('touch').hidden,false);
await s.room('results');assert.equal(s.els.get('touch').hidden,true);assert.equal(s.els.get('organizer').hidden,false);assert.ok(s.commands.find(b=>b.dataset.command==='start').hidden);assert.equal(s.commands.find(b=>b.dataset.command==='next').hidden,false);
vm.runInContext("setDevice('gamepad');setDevice('touch')",s.context);assert.equal(s.els.get('touch').hidden,true);await s.room('lobby');assert.equal(s.els.get('touch').hidden,true);assert.equal(s.commands.find(b=>b.dataset.command==='start').hidden,false);});
