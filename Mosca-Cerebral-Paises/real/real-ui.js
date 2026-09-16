const $=s=>document.querySelector(s);
const nf=new Intl.NumberFormat('pt-BR');
const BASE='https://raw.githubusercontent.com/Lulzx/fly-brain/main/public/data/';
const GRAPH_URL=BASE+'graph.flyg';
const META_URL=BASE+'meta.json';
const GRAPH_SIZE=14623114;
let worker=null,meta=null,stats=null,selected=null,graphReady=false,metaReady=false;

const statusEl=$('#realStatus'),progressEl=$('#realProgress'),loadBtn=$('#loadRealBrain'),workspace=$('#realWorkspace');
const searchBtn=$('#realSearchBtn'),queryEl=$('#realQuery'),matchesEl=$('#realMatches'),infoEl=$('#realNeuronInfo'),traceBtn=$('#realTrace');

function status(text,kind=''){if(statusEl){statusEl.textContent=text;statusEl.dataset.kind=kind}}
function progress(got,total){if(!progressEl)return;const pct=total?Math.min(100,got/total*100):0;progressEl.style.setProperty('--p',pct+'%');progressEl.textContent=total?`${(got/1e6).toFixed(1)} / ${(total/1e6).toFixed(1)} MB`:`${(got/1e6).toFixed(1)} MB`}
function label(i){const t=meta?.types?.[i];return t&&String(t).trim()?String(t):`Neurônio #${i}`}
function maybeReady(){if(graphReady&&metaReady){workspace.hidden=false;searchBtn.disabled=false;queryEl.disabled=false;loadBtn.textContent='✓ Conectoma real carregado';status(`MaleCNS real carregado: ${nf.format(stats.N)} neurônios.`, 'ok')}}

function setupWorker(){
  worker=new Worker(new URL('./real-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data:m})=>{
    if(m.type==='status'){
      if(m.stage==='download')status('Baixando o grafo real (~14,6 MB)…');
      if(m.stage==='decode')status('Download concluído. Decodificando milhões de conexões no aparelho…');
    }else if(m.type==='progress')progress(m.got,m.total||GRAPH_SIZE);
    else if(m.type==='ready'){
      stats=m.stats;graphReady=true;
      $('#realNeurons').textContent=nf.format(stats.N);
      $('#realEdges').textContent=nf.format(stats.E);
      $('#realSynapses').textContent=nf.format(stats.synapses);
      $('#realMinWeight').textContent=nf.format(stats.minWeight);
      maybeReady();
    }else if(m.type==='neuron')renderNeuron(m);
    else if(m.type==='trace')drawTrace(m.trace);
    else if(m.type==='error'){status(m.message,'error');loadBtn.disabled=false;loadBtn.textContent='Tentar novamente'}
  };
  worker.onerror=e=>{status(`Erro no processamento: ${e.message||'falha no worker'}`,'error');loadBtn.disabled=false};
}

async function loadReal(){
  if(worker||graphReady)return;
  loadBtn.disabled=true;loadBtn.textContent='Carregando…';progress(0,GRAPH_SIZE);
  setupWorker();
  const metaPromise=fetch(META_URL).then(r=>{if(!r.ok)throw new Error(`Metadados: HTTP ${r.status}`);return r.json()});
  worker.postMessage({type:'load',url:GRAPH_URL,size:GRAPH_SIZE});
  try{meta=await metaPromise;metaReady=Array.isArray(meta.types);if(!metaReady)throw new Error('Metadados do MaleCNS sem a tabela de tipos esperada.');maybeReady()}catch(e){status(`Falha nos metadados: ${e.message}`,'error');loadBtn.disabled=false;loadBtn.textContent='Tentar novamente'}
}

function searchReal(){
  if(!graphReady||!metaReady)return;
  const q=queryEl.value.trim();matchesEl.innerHTML='';
  if(!q){matchesEl.innerHTML='<span class="real-muted">Digite um tipo, por exemplo DNp01, ou um índice numérico.</span>';return}
  if(/^\d+$/.test(q)){
    const i=Number(q);if(i>=0&&i<stats.N){selectNeuron(i);return}
    matchesEl.innerHTML='<span class="real-error">Índice fora do intervalo do conectoma.</span>';return;
  }
  const needle=q.toLowerCase(),exact=[],partial=[];
  for(let i=0;i<meta.types.length;i++){
    const t=meta.types[i];if(!t)continue;const s=String(t),low=s.toLowerCase();
    if(low===needle){exact.push(i);if(exact.length>=20)break}
    else if(partial.length<20&&low.includes(needle))partial.push(i);
  }
  const found=exact.length?exact:partial;
  if(!found.length){matchesEl.innerHTML='<span class="real-error">Nenhum tipo encontrado. Tente parte do nome.</span>';return}
  for(const i of found){const b=document.createElement('button');b.className='real-match';b.innerHTML=`<strong>${escapeHtml(label(i))}</strong><span>#${i}</span>`;b.onclick=()=>selectNeuron(i);matchesEl.appendChild(b)}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function selectNeuron(i){selected=i;traceBtn.disabled=false;infoEl.innerHTML=`<h3>${escapeHtml(label(i))}</h3><p>Carregando conexões reais…</p>`;worker.postMessage({type:'neuron',index:i,limit:14})}

function renderNeuron(m){
  const rows=m.top||[];
  infoEl.innerHTML=`<div class="real-info-head"><div><span class="real-kicker">NEURÔNIO REAL</span><h3>${escapeHtml(label(m.index))}</h3><p>Índice interno #${m.index} • ${nf.format(m.outDegree)} parceiros de saída neste grafo.</p></div><button id="traceNow" class="btn primary">Propagar 3 saltos</button></div><div class="real-connections"></div>`;
  const list=infoEl.querySelector('.real-connections');
  if(!rows.length)list.innerHTML='<p class="real-muted">Nenhuma conexão de saída acima do limiar do grafo empacotado.</p>';
  for(const e of rows){const b=document.createElement('button');b.className='real-connection';b.innerHTML=`<span><strong>${escapeHtml(label(e.target))}</strong><small>#${e.target}</small></span><b>${nf.format(e.weight)} sinapses</b>`;b.onclick=()=>selectNeuron(e.target);list.appendChild(b)}
  infoEl.querySelector('#traceNow')?.addEventListener('click',()=>worker.postMessage({type:'trace',index:m.index,hops:3,branch:4}));
  drawStar(m.index,rows);
}

function canvasCtx(){const c=$('#realCanvas');if(!c)return null;const rect=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),h=Math.max(360,Math.min(620,rect.width*.58));c.width=Math.floor(rect.width*dpr);c.height=Math.floor(h*dpr);c.style.height=h+'px';const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{c,ctx,w:rect.width,h}}
function drawStar(center,rows){const C=canvasCtx();if(!C)return;const{ctx,w,h}=C;ctx.fillStyle='#080c13';ctx.fillRect(0,0,w,h);const cx=w*.5,cy=h*.5,R=Math.min(w,h)*.34,max=Math.max(1,...rows.map(x=>x.weight));rows.forEach((e,j)=>{const a=Math.PI*2*j/Math.max(1,rows.length)-Math.PI/2,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;ctx.strokeStyle=`rgba(120,245,199,${.18+.72*e.weight/max})`;ctx.lineWidth=1+5*e.weight/max;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();node(ctx,x,y,label(e.target),false);});node(ctx,cx,cy,label(center),true)}
function node(ctx,x,y,text,main){ctx.beginPath();ctx.arc(x,y,main?16:9,0,Math.PI*2);ctx.fillStyle=main?'#78f5c7':'#8da5ff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=main?24:12;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#e9eefc';ctx.font=`${main?'bold 12px':'11px'} system-ui`;const t=text.length>18?text.slice(0,17)+'…':text;ctx.fillText(t,x+(main?22:13),y+4)}

function drawTrace(trace){
  const C=canvasCtx();if(!C)return;const{ctx,w,h}=C;ctx.fillStyle='#080c13';ctx.fillRect(0,0,w,h);
  const hop=new Map([[trace.start,0]]);for(const e of trace.edges)if(!hop.has(e.target))hop.set(e.target,e.hop);
  const groups=[0,1,2,3].map(k=>trace.nodes.filter(n=>(hop.get(n)||0)===k));const pos=new Map();
  groups.forEach((g,k)=>g.forEach((n,j)=>{const x=50+k*(w-100)/3,y=(j+1)*h/(g.length+1);pos.set(n,{x,y})}));
  const max=Math.max(1,...trace.edges.map(e=>e.weight));
  for(const e of trace.edges){const A=pos.get(e.source),B=pos.get(e.target);if(!A||!B)continue;ctx.strokeStyle=`rgba(120,245,199,${.12+.65*e.weight/max})`;ctx.lineWidth=1+3*e.weight/max;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()}
  for(const n of trace.nodes){const p=pos.get(n);if(p)node(ctx,p.x,p.y,label(n),n===trace.start)}
  status('Propagação estrutural exibida. Ela segue as conexões mais fortes; não é uma simulação fisiológica.','ok');
}

loadBtn?.addEventListener('click',loadReal);
searchBtn?.addEventListener('click',searchReal);
queryEl?.addEventListener('keydown',e=>{if(e.key==='Enter')searchReal()});
traceBtn?.addEventListener('click',()=>{if(selected!=null)worker.postMessage({type:'trace',index:selected,hops:3,branch:4})});
window.addEventListener('resize',()=>{if(selected!=null&&graphReady)worker.postMessage({type:'neuron',index:selected,limit:14})});
