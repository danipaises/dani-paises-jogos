import {mod,clamp} from './data.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
export class Track {
 constructor(def){this.def=def;this.width=def.width;let raw=[],pts=def.points,n=pts.length;for(let i=0;i<n*80;i++){const t=i/80,j=Math.floor(t),f=t-j;let p=[pts[mod(j-1,n)],pts[j%n],pts[(j+1)%n],pts[(j+2)%n]];raw.push({x:cat(...p.map(v=>v[0]),f),z:cat(...p.map(v=>v[1]),f)});}raw.push(raw[0]);let lengths=[0];for(let i=1;i<raw.length;i++)lengths.push(lengths[i-1]+dist(raw[i],raw[i-1]));this.length=lengths.at(-1);this.count=600;this.step=this.length/this.count;this.samples=[];let j=0;for(let i=0;i<this.count;i++){let s=i*this.step;while(lengths[j+1]<s)j++;let f=(s-lengths[j])/(lengths[j+1]-lengths[j]);this.samples.push({x:raw[j].x+(raw[j+1].x-raw[j].x)*f,z:raw[j].z+(raw[j+1].z-raw[j].z)*f});}
 this.ramps=def.ramps.map(f=>f*this.length);this.boosts=def.boosts.map(f=>f*this.length);
 this.shortcuts=def.shortcuts.map(([a,b])=>({a:this.at(a*this.length),b:this.at(b*this.length),width:5.5}));
 }
 at(s,offset=0){let v=mod(s,this.length)/this.step,i=Math.floor(v),f=v-i,a=this.samples[i],b=this.samples[(i+1)%this.count],dx=b.x-a.x,dz=b.z-a.z,mag=Math.hypot(dx,dz);let tx=dx/mag,tz=dz/mag;return {x:a.x+(b.x-a.x)*f+tz*offset,z:a.z+(b.z-a.z)*f-tx*offset,tx,tz,angle:Math.atan2(tx,tz),s:mod(s,this.length)};}
 nearest(x,z,hint){let best=Infinity,res=null;const scan=(i)=>{i=mod(i,this.count);let a=this.samples[i],b=this.samples[(i+1)%this.count],dx=b.x-a.x,dz=b.z-a.z;let f=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+f*dx,pz=a.z+f*dz,d=(x-px)**2+(z-pz)**2;if(d<best){best=d;let mag=Math.hypot(dx,dz);res={x:px,z:pz,s:(i+f)*this.step,index:i,distance:Math.sqrt(d),lateral:((x-px)*dz-(z-pz)*dx)/mag,tx:dx/mag,tz:dz/mag,angle:Math.atan2(dx,dz)};}};
 if(hint!=null){for(let d=-20;d<=20;d++)scan(hint+d);}if(!res||best>400){for(let i=0;i<this.count;i++)scan(i);}return res;
 }
 shortcutAt(x,z){return this.shortcuts.find(c=>{let dx=c.b.x-c.a.x,dz=c.b.z-c.a.z;let t=clamp(((x-c.a.x)*dx+(z-c.a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-c.a.x-t*dx,z-c.a.z-t*dz)<c.width;});}
}
