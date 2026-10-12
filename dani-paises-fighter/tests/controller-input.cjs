const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{};const nodes={};
const node=()=>({hidden:false,value:'',style:{},dataset:{},classList:{add:noop,remove:noop},append:noop,setAttribute:noop,setPointerCapture:noop,addEventListener:noop,getBoundingClientRect:()=>({left:0,top:0,width:150,height:150})});
const actions=['jump','smashAttack','special','block','grab','ultimate','heavy','uppercut'].map(action=>Object.assign(node(),{dataset:{action}}));let clock=0,portrait=false;const sockets=[];
class WS{static OPEN=1;constructor(){this.readyState=1;this.bufferedAmount=0;this.sent=[];sockets.push(this)}send(data){this.sent.push(JSON.parse(data))}close(){this.readyState=3}}
const sandbox={console,URLSearchParams,WebSocket:WS,performance:{now:()=>clock},matchMedia:()=>({matches:portrait}),location:{search:'?room=test',protocol:'http:',host:'localhost:8765'},setInterval:noop,setTimeout:noop,clearTimeout:noop,sessionStorage:{getItem:()=>null,setItem:noop},window:{addEventListener:noop},document:{hidden:false,body:{classList:{add:noop,remove:noop,toggle:noop}},documentElement:{},getElementById:id=>nodes[id]??=node(),createElement:node,querySelectorAll:selector=>selector==='[data-action]'?actions:[],addEventListener:noop}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../local/controller.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
vm.runInContext("session={id:'p1',name:'Dani',token:'private'};connect();ws.onopen();enabled=true;",sandbox);
const ws=sockets[0],attack=actions[1],special=actions[2];
const event={pointerId:1,preventDefault:noop};
attack.onpointerdown(event);special.onpointerdown({...event,pointerId:2});attack.onpointerup();special.onpointerup();
assert(ws.sent.some(p=>p.input?.smashAttack&&p.input?.special),'two simultaneous buttons');assert.deepEqual(ws.sent.at(-1).input,{},'release delivered immediately');
vm.runInContext("stickKeys={right:true};send();",sandbox);assert(ws.sent.at(-1).input.right);
portrait=true;vm.runInContext('send()',sandbox);assert.deepEqual(ws.sent.at(-1).input,{},'portrait stops movement');portrait=false;
vm.runInContext("ws.onmessage({data:JSON.stringify({type:'state',state:{inputSeq:800,phase:'fight',active:['p1'],hostAlive:true,players:[],canOrganize:false}})});",sandbox);assert(ws.sent.at(-1).seq>800,'reload resumes server sequence');
ws.bufferedAmount=4096;vm.runInContext("buttons={jump:true};send()",sandbox);assert.equal(ws.readyState,3,'congested socket closes instead of queuing old commands');
console.log('PASS: controller multitouch, immediate release, horizontal gate, restored sequence and bounded outgoing buffer');
