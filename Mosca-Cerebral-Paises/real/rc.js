// Decoder used for the packed FLYG connectome format.
// Adapted from Lulzx/fly-brain (MIT, Copyright (c) 2026 lulzx).
// See ../THIRD_PARTY_NOTICES.md
const TOP=2**24,PBITS=12,PONE=1<<PBITS,MOVE=5,MIN=0x80000000|0;

export class Decoder{
  constructor(bytes,pos=0){this.b=bytes;this.s=new Int32Array(3);this.s[0]=-1;this.s[2]=pos;let code=0;for(let i=0;i<5;i++)code=(code<<8)|this.next();this.s[1]=code}
  next(){const p=this.s[2];this.s[2]=p+1;return p<this.b.length?this.b[p]:0}
  bit(p,i){const s=this.s;let range=s[0],code=s[1],b;const pr=p[i],bound=Math.imul(range>>>PBITS,pr);if((code^MIN)<(bound^MIN)){range=bound;p[i]=pr+((PONE-pr)>>MOVE);b=0}else{code=(code-bound)|0;range=(range-bound)|0;p[i]=pr-(pr>>MOVE);b=1}if((range>>>24)===0){const buf=this.b;let pos=s[2];do{range<<=8;code=(code<<8)|(pos<buf.length?buf[pos++]:0)}while((range>>>24)===0);s[2]=pos}s[0]=range;s[1]=code;return b}
  direct(_,nbits){const s=this.s,buf=this.b;let range=s[0],code=s[1],pos=s[2],v=0;while(nbits>0){const n=nbits<16?nbits:16;nbits-=n;range=range>>>n;const x=((code>>>0)/range)|0;code=(code-Math.imul(x,range))|0;v=v*(1<<n)+x;while((range>>>24)===0){range<<=8;code=(code<<8)|(pos<buf.length?buf[pos++]:0)}}s[0]=range;s[1]=code;s[2]=pos;return v}
}

export const probs=n=>new Uint16Array(n).fill(PONE>>1);

export class UInt{
  constructor(nctx){this.k=probs(nctx*32);this.m=probs(nctx*32*4)}
  dec(d,ctx){const st=d.s,buf=d.b,len=buf.length,kp=this.k,base=ctx*32;let range=st[0],code=st[1],pos=st[2],t=1;for(let i=0;i<5;i++){const j=base+t,pr=kp[j],bound=Math.imul(range>>>PBITS,pr);if((code^MIN)<(bound^MIN)){range=bound;kp[j]=pr+((PONE-pr)>>MOVE);t<<=1}else{code=(code-bound)|0;range=(range-bound)|0;kp[j]=pr-(pr>>MOVE);t=(t<<1)|1}while((range>>>24)===0){range<<=8;code=(code<<8)|(pos<len?buf[pos++]:0)}}const k=t-32;let r=1;if(k>0){const mp=this.m,mb=(base+k)*4;for(let s=0;s<2&&s<k;s++){const j=mb+(s===0?1:2+(r&1)),pr=mp[j],bound=Math.imul(range>>>PBITS,pr);if((code^MIN)<(bound^MIN)){range=bound;mp[j]=pr+((PONE-pr)>>MOVE);r<<=1}else{code=(code-bound)|0;range=(range-bound)|0;mp[j]=pr-(pr>>MOVE);r=(r<<1)|1}while((range>>>24)===0){range<<=8;code=(code<<8)|(pos<len?buf[pos++]:0)}}if(k>=3){let nbits=k-2;while(nbits>0){const n=nbits<16?nbits:16;nbits-=n;range=range>>>n;const x=((code>>>0)/range)|0;code=(code-Math.imul(x,range))|0;r=r*(1<<n)+x;while((range>>>24)===0){range<<=8;code=(code<<8)|(pos<len?buf[pos++]:0)}}}}st[0]=range;st[1]=code;st[2]=pos;return r-1}
}

export class SInt extends UInt{dec(d,ctx){const z=super.dec(d,ctx);return z&1?-(z+1)/2:z/2}}
export const lg=x=>31-Math.clz32(x+1);
