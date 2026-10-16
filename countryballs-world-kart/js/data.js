export const CHARACTERS = [
 {id:'br',name:'Brasil',flag:'🇧🇷',color:0x15b974,accent:0xffdd36,stats:[3,3,3,3,3],desc:'Equilíbrio para explorar o mundo.'},
 {id:'us',name:'Estados Unidos',flag:'🇺🇸',color:0x3167e8,accent:0xee4358,stats:[5,2,2,4,2],desc:'Velocidade máxima nas grandes retas.'},
 {id:'fr',name:'França',flag:'🇫🇷',color:0x416be0,accent:0xf6f5ef,stats:[2,3,5,2,3],desc:'Precisão em cada curva.'},
 {id:'jp',name:'Japão',flag:'🇯🇵',color:0xf0f2fa,accent:0xec4b5c,stats:[2,5,3,2,3],desc:'Saída rápida. Espírito veloz.'},
 {id:'de',name:'Alemanha',flag:'🇩🇪',color:0x323544,accent:0xffc940,stats:[4,2,3,5,1],desc:'Potência e estabilidade na pista.'},
 {id:'it',name:'Itália',flag:'🇮🇹',color:0x22ba83,accent:0xf34b60,stats:[2,3,3,2,5],desc:'A arte de transformar curvas em turbo.'},
 {id:'pl',name:'Polônia',flag:'🇵🇱',color:0xe94a66,accent:0xffffff,stats:[2,5,2,3,3],desc:'Acelera de novo antes de todo mundo.'},
 {id:'ar',name:'Argentina',flag:'🇦🇷',color:0x67c9ed,accent:0xffffff,stats:[3,3,3,2,4],desc:'Equilíbrio com um turbo especial.'}
];
export const TRACKS=[
 {id:'rio',city:'Rio de Janeiro',country:'BRASIL',name:'Copa Tropical',tag:'SOL, MAR & VELOCIDADE',desc:'Da brisa de Copacabana ao salto na areia. Curvas abertas e um atalho tropical.',level:'Iniciante',icon:'☀',color:'#a7f16a',sky:0x97daf0,ground:0x70b58b,road:0x596b7a,width:15,
 points:[[0,0],[0,90],[40,138],[125,130],[155,72],[123,35],[152,-32],[113,-97],[40,-120],[-40,-80],[-38,-25]],
 ramps:[.19],boosts:[.53],shortcuts:[[.71,.79]],items:[.10,.32,.57,.83]},
 {id:'paris',city:'Paris',country:'FRANÇA',name:'Copa Europeia',tag:'CURVAS COM ELEGÂNCIA',desc:'Pontes sobre o Sena, cafés e curvas técnicas sob o dourado do fim de tarde.',level:'Intermediário',icon:'✦',color:'#ffc393',sky:0xeeb39d,ground:0xa8a686,road:0x69677d,width:12,
 points:[[0,0],[0,72],[46,105],[105,90],[112,37],[63,35],[56,-15],[115,-34],[107,-99],[34,-115],[-36,-68],[-35,-15]],
 ramps:[.41,.78],boosts:[.22],shortcuts:[[.57,.64]],items:[.10,.30,.55,.81]},
 {id:'nyc',city:'Times Square',country:'NOVA YORK • EUA',name:'Copa das Luzes',tag:'A CIDADE É SUA PISTA',desc:'Neon, táxis em movimento e esquinas fechadas no coração de Manhattan.',level:'Avançado',icon:'ϟ',color:'#c7a4ff',sky:0x121c42,ground:0x283249,road:0x35415d,width:11,
 points:[[0,0],[0,75],[26,103],[79,100],[99,76],[98,31],[57,13],[62,-28],[117,-49],[105,-98],[56,-110],[23,-80],[-30,-98],[-53,-55],[-35,-14]],
 ramps:[.24,.69],boosts:[.12,.46,.82],shortcuts:[[.55,.62]],items:[.08,.31,.54,.78]}
];
export const ITEMS=[
 {id:'turbo',icon:'🚀',name:'Turbo Mundial',color:'#a7f16a',hint:'Velocidade extra por 2,3 s.'},
 {id:'peel',icon:'🍌',name:'Casca Escorregadia',color:'#ffd64a',hint:'Armadilha atrás do kart.'},
 {id:'ball',icon:'⚽',name:'Bola de Futebol',color:'#ffffff',hint:'Dispara na sua direção.'},
 {id:'shield',icon:'🛡️',name:'Escudo Nacional',color:'#66d9ff',hint:'Bloqueia um ataque por até 8 s.'},
 {id:'tornado',icon:'🌪️',name:'Tornado',color:'#cdb6ff',hint:'Avança e empurra os rivais.'},
 {id:'lightning',icon:'⚡',name:'Raio Global',color:'#ffe26c',hint:'Rivais desaceleram por 1,7 s.'},
 {id:'magnet',icon:'🧲',name:'Ímã',color:'#ff789b',hint:'Atrai moedas por 7 s.'},
 {id:'rocket',icon:'🚀',name:'Foguete Perseguidor',color:'#ff874f',hint:'Persegue o rival mais próximo à frente.'}
];
export const POINTS=[15,12,10,8,6,4,2,1];
export const DEFAULTS={quality:'medium',music:.28,sfx:.6,difficulty:'normal',opacity:.7,touchSize:1,vibration:true,autoAccelerate:false,steerAssist:false,touch:'auto',layout:{},gamepad:{steer:0,throttle:7,brake:6,drift:0,item:2,pause:9}};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mod=(v,m)=>(v%m+m)%m;
export const angleDiff=(a,b)=>mod(a-b+Math.PI,Math.PI*2)-Math.PI;
export function formatTime(t){if(!Number.isFinite(t))return '—';let ms=Math.floor(t*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
export function random(seed=97531){let v=seed>>>0;return()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296;};}
