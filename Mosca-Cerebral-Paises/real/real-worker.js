import{decodeGraph}from'./graph.js';
let graph=null;

function topOutgoing(index,limit=12){
  if(!graph||index<0||index>=graph.N)return[];
  const a=graph.indptr[index],b=graph.indptr[index+1],rows=[];
  for(let k=a;k<b;k++)rows.push({target:graph.indices[k],weight:graph.weights[k]});
  rows.sort((x,y)=>y.weight-x.weight);
  return rows.slice(0,limit);
}

function makeTrace(start,hops=3,branch=4){
  const seen=new Set([start]),nodes=[start],edges=[];
  let frontier=[start];
  for(let h=0;h<hops&&frontier.length;h++){
    const next=[];
    for(const source of frontier){
      for(const e of topOutgoing(source,branch)){
        edges.push({source,target:e.target,weight:e.weight,hop:h+1});
        if(!seen.has(e.target)&&seen.size<70){seen.add(e.target);nodes.push(e.target);next.push(e.target)}
      }
    }
    frontier=next.slice(0,24);
  }
  return{start,nodes,edges};
}

self.onmessage=async({data:m})=>{
  try{
    if(m.type==='load'){
      self.postMessage({type:'status',stage:'download'});
      const r=await fetch(m.url);
      if(!r.ok)throw new Error(`Falha ao baixar o conectoma: HTTP ${r.status}`);
      const reader=r.body?.getReader();let bytes;
      if(reader){
        const chunks=[];let got=0;const total=Number(r.headers.get('content-length'))||m.size||0;
        for(;;){const{done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;self.postMessage({type:'progress',got,total})}
        bytes=new Uint8Array(got);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.length}
      }else bytes=new Uint8Array(await r.arrayBuffer());
      self.postMessage({type:'status',stage:'decode'});
      graph=decodeGraph(bytes);
      let synapses=0,maxOut=0,maxOutIndex=0;
      for(let i=0;i<graph.N;i++){const d=graph.indptr[i+1]-graph.indptr[i];if(d>maxOut){maxOut=d;maxOutIndex=i}}
      for(let i=0;i<graph.weights.length;i++)synapses+=graph.weights[i];
      self.postMessage({type:'ready',stats:{N:graph.N,E:graph.E,minWeight:graph.minWeight,synapses,maxOut,maxOutIndex}});
      return;
    }
    if(!graph)throw new Error('Carregue o conectoma primeiro.');
    if(m.type==='neuron'){
      const index=Number(m.index);
      self.postMessage({type:'neuron',index,outDegree:graph.indptr[index+1]-graph.indptr[index],top:topOutgoing(index,m.limit||12)});
      return;
    }
    if(m.type==='trace'){
      self.postMessage({type:'trace',trace:makeTrace(Number(m.index),m.hops||3,m.branch||4)});
    }
  }catch(err){self.postMessage({type:'error',message:err?.message||String(err)})}
};
