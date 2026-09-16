const REAL_MAX_FILES = 80;
const REAL_MAX_SEGMENTS = 180000;

function makeStyles(){
  const style=document.createElement('style');
  style.textContent=`
  .real-mode{padding-top:96px}.real-grid{display:grid;grid-template-columns:minmax(280px,.7fr) minmax(0,1.5fr);gap:18px}.real-controls{padding:22px}.real-controls h3{margin-top:0}.real-actions{display:grid;gap:10px;margin:18px 0}.real-file{display:block;border:1px dashed var(--line);padding:14px;border-radius:14px;background:#111725}.real-file span{display:block;font-weight:800;margin-bottom:8px}.real-file input{width:100%;color:var(--muted)}.real-status{padding:12px 14px;border-radius:12px;background:#101723;border:1px solid var(--line);color:var(--muted);line-height:1.5}.real-status strong{color:var(--accent)}.real-status.error{border-color:#703743;color:#ffd2d8}.real-status.ok{border-color:#315e52}.real-canvas-wrap{overflow:hidden;min-height:460px;position:relative}.real-canvas-wrap canvas{min-height:460px}.real-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}.real-toolbar select{background:#20263a;color:white;border:1px solid var(--line);padding:9px 11px;border-radius:10px}.real-note{font-size:13px;color:var(--muted);line-height:1.55}.real-badge{display:inline-flex;gap:7px;align-items:center;padding:7px 10px;border-radius:999px;background:rgba(120,245,199,.1);border:1px solid rgba(120,245,199,.25);color:#bffbe7;font-size:12px;font-weight:800}.real-list{margin:12px 0 0;padding-left:18px;color:var(--muted);max-height:150px;overflow:auto;font-size:12px}@media(max-width:900px){.real-grid{grid-template-columns:1fr}.real-canvas-wrap,.real-canvas-wrap canvas{min-height:320px}}`;
  document.head.appendChild(style);
}

function parseSWC(text,name){
  const points=[];
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#')) continue;
    const p=line.split(/\s+/);
    if(p.length<7) continue;
    const id=Number(p[0]), type=Number(p[1]), x=Number(p[2]), y=Number(p[3]), z=Number(p[4]), radius=Number(p[5]), parent=Number(p[6]);
    if([id,x,y,z,parent].some(Number.isNaN)) continue;
    points.push({id,type,x,y,z,radius,parent});
  }
  return {name:name.replace(/\.swc$/i,''),points};
}

function projectionPoint(p,projection){
  if(projection==='xz') return [p.x,p.z];
  if(projection==='yz') return [p.y,p.z];
  return [p.x,p.y];
}

function colorFor(i,total){
  const hue=Math.round((i/Math.max(total,1))*300+130)%360;
  return `hsl(${hue} 78% 68%)`;
}

function drawSkeletons(canvas,neurons,projection){
  const rect=canvas.getBoundingClientRect();
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=Math.max(300,rect.width), h=Math.max(320,Math.min(720,w*.7));
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#0d111a';ctx.fillRect(0,0,w,h);
  if(!neurons.length){ctx.fillStyle='#a6aec4';ctx.font='15px system-ui';ctx.fillText('Selecione arquivos .swc ou um pack JSON real.',24,42);return;}
  let minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity,totalSegments=0;
  for(const n of neurons){
    totalSegments+=Math.max(0,n.points.length-1);
    for(const p of n.points){const [a,b]=projectionPoint(p,projection);minA=Math.min(minA,a);maxA=Math.max(maxA,a);minB=Math.min(minB,b);maxB=Math.max(maxB,b)}
  }
  const pad=28, rangeA=Math.max(1,maxA-minA), rangeB=Math.max(1,maxB-minB), scale=Math.min((w-pad*2)/rangeA,(h-pad*2)/rangeB);
  const ox=(w-rangeA*scale)/2, oy=(h-rangeB*scale)/2;
  const stride=Math.max(1,Math.ceil(totalSegments/REAL_MAX_SEGMENTS));
  neurons.forEach((n,ni)=>{
    const map=new Map(n.points.map(p=>[p.id,p]));
    ctx.strokeStyle=colorFor(ni,neurons.length);ctx.globalAlpha=.72;ctx.lineWidth=1;
    let k=0;
    for(const p of n.points){
      if(p.parent<0||k++%stride!==0) continue;
      const parent=map.get(p.parent);if(!parent) continue;
      const [a,b]=projectionPoint(p,projection),[pa,pb]=projectionPoint(parent,projection);
      const x=ox+(a-minA)*scale,y=h-(oy+(b-minB)*scale),px=ox+(pa-minA)*scale,py=h-(oy+(pb-minB)*scale);
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();
    }
  });
  ctx.globalAlpha=1;
  ctx.fillStyle='#dfe5f5';ctx.font='12px system-ui';ctx.fillText(`${neurons.length} neurônio(s) real(is) • projeção ${projection.toUpperCase()} • ${totalSegments.toLocaleString('pt-BR')} segmentos`,16,h-16);
}

function normalizeGraphPack(pack){
  if(!pack||!Array.isArray(pack.nodes)||!Array.isArray(pack.edges)) throw new Error('Pack JSON inválido: esperado nodes[] e edges[].');
  const nodes=pack.nodes.map((n,i)=>{
    const angle=(i/Math.max(pack.nodes.length,1))*Math.PI*2;
    return {...n,id:String(n.id),label:n.label||String(n.id),x:Number.isFinite(n.x)?n.x:.5+.42*Math.cos(angle),y:Number.isFinite(n.y)?n.y:.5+.42*Math.sin(angle)};
  });
  const edges=pack.edges.map(e=>Array.isArray(e)?[String(e[0]),String(e[1]),Number(e[2]??1)]:[String(e.source),String(e.target),Number(e.weight??1)]);
  return {meta:pack.meta||{},nodes,edges};
}

function drawGraphPack(canvas,pack){
  const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,devicePixelRatio||1)),w=Math.max(300,rect.width),h=Math.max(320,Math.min(720,w*.7));
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0d111a';ctx.fillRect(0,0,w,h);
  const nodes=pack.nodes.map(n=>({...n,px:n.x*w,py:n.y*h})),map=Object.fromEntries(nodes.map(n=>[String(n.id),n]));
  const maxWeight=Math.max(1,...pack.edges.map(e=>e[2]||1));
  const stride=Math.max(1,Math.ceil(pack.edges.length/REAL_MAX_SEGMENTS));
  pack.edges.forEach((e,i)=>{if(i%stride)return;const a=map[e[0]],b=map[e[1]];if(!a||!b)return;ctx.globalAlpha=.12+.5*(e[2]/maxWeight);ctx.strokeStyle='#8da5ff';ctx.lineWidth=.7+1.8*(e[2]/maxWeight);ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(b.px,b.py);ctx.stroke()});
  ctx.globalAlpha=1;nodes.forEach((n,i)=>{ctx.fillStyle=colorFor(i,nodes.length);ctx.beginPath();ctx.arc(n.px,n.py,Math.max(2,Math.min(7,120/Math.sqrt(nodes.length||1))),0,Math.PI*2);ctx.fill()});
  ctx.fillStyle='#dfe5f5';ctx.font='12px system-ui';ctx.fillText(`${nodes.length.toLocaleString('pt-BR')} neurônios • ${pack.edges.length.toLocaleString('pt-BR')} conexões reais`,16,h-16);
}

export function initRealMode(){
  makeStyles();
  const nav=document.querySelector('#nav');
  if(nav&&!nav.querySelector('[href="#real"]')){const a=document.createElement('a');a.href='#real';a.textContent='Dados reais';nav.insertBefore(a,nav.children[1]||null)}
  const hero=document.querySelector('#inicio');if(!hero)return;
  const section=document.createElement('section');section.id='real';section.className='section panel-section real-mode';
  section.innerHTML=`
    <div class="section-heading"><div><div class="eyebrow">MODO REAL LOCAL</div><h2>🔬 Neurônios reais MaleCNS</h2><p>O site público continua leve e simulado. Aqui você pode escolher arquivos que já estão no seu aparelho; eles são lidos localmente pelo navegador.</p></div><span class="real-badge">🔒 arquivos ficam no aparelho</span></div>
    <div class="real-grid">
      <div class="card real-controls">
        <h3>Carregar dados reais</h3>
        <div class="real-actions">
          <label class="real-file"><span>1. Esqueletos oficiais .SWC</span><input id="realSwcFiles" type="file" accept=".swc,text/plain" multiple></label>
          <label class="real-file"><span>2. Pasta com .SWC</span><input id="realSwcFolder" type="file" webkitdirectory directory multiple></label>
          <label class="real-file"><span>3. Pack de conectividade .JSON</span><input id="realGraphFile" type="file" accept=".json,application/json"></label>
        </div>
        <div class="real-toolbar"><label>Projeção <select id="realProjection"><option value="xy">XY</option><option value="xz">XZ</option><option value="yz">YZ</option></select></label><button id="realClear" class="btn">Limpar dados reais</button></div>
        <div id="realStatus" class="real-status"><strong>Modo simulado ativo.</strong><br>Selecione .SWC reais para visualizar a morfologia ou um pack JSON para visualizar conexões reais.</div>
        <ul id="realList" class="real-list"></ul>
        <p class="real-note">Importante: carregar um esqueleto SWC mostra a <strong>morfologia real</strong> daquele neurônio. O comportamento dos modos “Vida” e “Simulador” continua sendo o modelo demonstrativo até que uma rede real compatível seja carregada e usada por um motor próprio.</p>
        <p class="real-note">Para transformar o arquivo Feather oficial de conectividade em um pack pequeno para o navegador, veja <strong>REAL_DATA.md</strong> na pasta deste jogo.</p>
      </div>
      <div class="card real-canvas-wrap"><canvas id="realCanvas"></canvas></div>
    </div>`;
  hero.insertAdjacentElement('afterend',section);
  const canvas=section.querySelector('#realCanvas'),status=section.querySelector('#realStatus'),list=section.querySelector('#realList'),projection=section.querySelector('#realProjection');
  let neurons=[],graph=null;
  const redraw=()=>graph?drawGraphPack(canvas,graph):drawSkeletons(canvas,neurons,projection.value);
  async function loadSwcFiles(fileList){
    const files=[...fileList].filter(f=>f.name.toLowerCase().endsWith('.swc'));
    if(!files.length){status.className='real-status error';status.innerHTML='<strong>Nenhum .SWC encontrado.</strong><br>Escolha arquivos de esqueleto MaleCNS em formato SWC.';return}
    const selected=files.slice(0,REAL_MAX_FILES);neurons=[];graph=null;status.className='real-status';status.textContent=`Lendo ${selected.length} arquivo(s) localmente…`;
    for(const file of selected){try{const n=parseSWC(await file.text(),file.name);if(n.points.length)neurons.push(n)}catch(e){console.warn('SWC inválido',file.name,e)}}
    list.innerHTML=neurons.slice(0,30).map(n=>`<li>${n.name}: ${n.points.length.toLocaleString('pt-BR')} pontos</li>`).join('')+(neurons.length>30?`<li>… e mais ${neurons.length-30}</li>`:'');
    status.className='real-status ok';status.innerHTML=`<strong>Modo real local ativo.</strong><br>${neurons.length} neurônio(s) SWC carregado(s) do aparelho.${files.length>REAL_MAX_FILES?` Para proteger o navegador, esta sessão carregou os primeiros ${REAL_MAX_FILES}.`:''}`;redraw();
  }
  section.querySelector('#realSwcFiles').addEventListener('change',e=>loadSwcFiles(e.target.files));
  section.querySelector('#realSwcFolder').addEventListener('change',e=>loadSwcFiles(e.target.files));
  section.querySelector('#realGraphFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{graph=normalizeGraphPack(JSON.parse(await file.text()));neurons=[];list.innerHTML=`<li>${file.name}</li><li>${graph.nodes.length.toLocaleString('pt-BR')} neurônios</li><li>${graph.edges.length.toLocaleString('pt-BR')} conexões</li>`;status.className='real-status ok';status.innerHTML=`<strong>Pack real carregado localmente.</strong><br>${graph.meta?.source||'Fonte declarada no arquivo'} • nenhum dado foi enviado para servidor.`;redraw()}catch(err){status.className='real-status error';status.innerHTML=`<strong>Não foi possível abrir o JSON.</strong><br>${err.message}`}});
  section.querySelector('#realClear').addEventListener('click',()=>{neurons=[];graph=null;list.innerHTML='';status.className='real-status';status.innerHTML='<strong>Modo simulado ativo.</strong><br>Os dados reais foram removidos da memória desta página.';section.querySelectorAll('input[type=file]').forEach(i=>i.value='');redraw()});
  projection.addEventListener('change',redraw);window.addEventListener('resize',redraw);redraw();
}
