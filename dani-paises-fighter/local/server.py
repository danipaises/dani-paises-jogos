#!/usr/bin/env python3
"""Dani Países LAN: stdlib HTTP/SSE relay; simulation runs on the host screen."""
import argparse, base64, hashlib, io, json, mimetypes, os, secrets, socket, struct, sys, threading, time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
STATIC_ROOT = ROOT / 'www' if (ROOT / 'www').exists() else ROOT.parent
sys.path.insert(0, str(ROOT / 'vendor'))
import qrcode
from qrcode.image.svg import SvgPathImage

ACTION_KEYS = {'left','right','up','down','jump','shortHop','smashAttack','special','grab','block','heavy','uppercut','sweep','ultimate','combo'}
CHARACTERS = {'dani','br','ar','uy','py','cl','bo','pe','ec','co','ve','gy','sr','gf','ca','mx','us','gt','bz','hn','sv','ni','cr','pa'}

class Room:
    def __init__(self):
        self.lock = threading.RLock()
        self.changed = threading.Condition(self.lock)
        self.input_serial = 0
        self.input_events = deque(maxlen=128)
        self.host_key = secrets.token_urlsafe(24)
        self.invite = secrets.token_urlsafe(12)
        self.players = {}
        self.phase = 'lobby'
        self.active = []
        self.revision = 0
        self.config = {}
        self.host_seen = time.monotonic()
        self.organizer = None
        self.commands = []
        self.command_serial = 0
        self.command_status = None
        self.view = {}
    def authenticate(self, key):
        if secrets.compare_digest(key, self.host_key): return 'host'
        for p in self.players.values():
            if secrets.compare_digest(key, p['token']): return p['id']
        return None
    def add(self, name, character, source='phone'):
        if len(self.players) >= 32: raise ValueError('A sala comporta até 32 participantes no torneio.')
        pid = secrets.token_hex(6)
        p = dict(id=pid, token=secrets.token_urlsafe(24), name=str(name or 'Jogador')[:24], character=character if character in CHARACTERS else 'dani', source=source, seen=time.monotonic(), inputAt=0, input={}, seq=-1)
        self.players[pid] = p
        if source=='phone' and self.organizer is None:self.organizer=pid
        return p
    def accept_input(self, role, data):
        if role not in self.players: raise ValueError('Controle inválido.')
        p = self.players[role]
        seq = int(data.get('seq', 0))
        values = data.get('input', {})
        if not isinstance(values, dict): raise ValueError('Comando inválido.')
        if seq <= p['seq']: return
        now = time.monotonic()
        values = {k: bool(v) for k, v in values.items() if k in ACTION_KEYS}
        if values != p['input'] or now - p['inputAt'] > .1:
            self.input_serial += 1
            self.input_events.append({'serial': self.input_serial, 'id': role, 'input': values, 'at': now})
        p.update(seq=seq, input=values, seen=now, inputAt=now)
        self.changed.notify_all()

    def snapshot(self, role):
        now=time.monotonic()
        public=[{k:p[k] for k in ('id','name','character','source')} | {'connected':p['source']!='phone' or now-p['seen']<5} for p in self.players.values()]
        result=dict(players=public, phase=self.phase, active=self.active, config=self.config, revision=self.revision, hostAlive=now-self.host_seen<4, organizerId=self.organizer, view=self.view)
        if role=='host':
            result['inputs']={p['id']:p['input'] if now-p['inputAt']<.4 else {} for p in self.players.values()}
            result['commands']=self.commands
        else:
            result['myId']=role
            result['inputSeq']=self.players.get(role,{}).get('seq',-1)
            result['canOrganize']=role==self.organizer
            if role==self.organizer:
                result['commandStatus']=self.command_status
                result['commandPending']=bool(self.commands)
        return result

ROOM = Room()

class Handler(BaseHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def setup(self):
        super().setup()
        self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    def log_message(self, *args): pass
    def websocket(self, role):
        origin = self.headers.get('Origin')
        if origin and urlparse(origin).netloc != self.headers.get('Host'):
            return self.send(403, {'error': 'Origem inválida.'})
        key = self.headers.get('Sec-WebSocket-Key', '')
        try:
            if len(base64.b64decode(key, validate=True)) != 16: raise ValueError()
        except Exception: return self.send(400, {'error': 'WebSocket inválido.'})
        if self.headers.get('Upgrade', '').lower() != 'websocket' or self.headers.get('Sec-WebSocket-Version') != '13':
            return self.send(400, {'error': 'WebSocket necessário.'})
        room = ROOM
        with room.lock:
            if role in room.players: room.players[role]['socket']=self
        self.send_response(101)
        self.send_header('Upgrade', 'websocket'); self.send_header('Connection', 'Upgrade')
        self.send_header('Sec-WebSocket-Accept', base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode())
        self.end_headers()
        stopped = threading.Event()
        write_lock = threading.Lock()
        def frame(payload, opcode=1):
            if not isinstance(payload, bytes): payload = json.dumps(payload, separators=(',', ':')).encode()
            head = bytes([0x80 | opcode])
            head += bytes([len(payload)]) if len(payload)<126 else b'\x7e'+struct.pack('!H',len(payload))
            with write_lock: self.connection.sendall(head+payload)
        def exact(n):
            data = self.rfile.read(n)
            if len(data)!=n: raise ConnectionError()
            return data
        def receive():
            try:
                while not stopped.is_set():
                    h = exact(2); opcode=h[0]&15; size=h[1]&127
                    if not h[0]&128 or h[0]&112 or not h[1]&128: raise ValueError('Frame inválido')
                    if size==126: size=struct.unpack('!H',exact(2))[0]
                    elif size==127: size=struct.unpack('!Q',exact(8))[0]
                    if size>16384 or (opcode>=8 and size>125): raise ValueError('Frame muito grande')
                    mask=exact(4); raw=exact(size); payload=bytes(v^mask[i%4] for i,v in enumerate(raw))
                    if opcode==8: break
                    if opcode==9: frame(payload,10); continue
                    if opcode==10: continue
                    if opcode!=1: raise ValueError('Frame inválido')
                    d=json.loads(payload)
                    if not isinstance(d,dict): raise ValueError('Pedido inválido')
                    with room.changed:
                        if room is not ROOM: break
                        if role=='host': room.host_seen=time.monotonic()
                        elif role in room.players: room.players[role]['seen']=time.monotonic()
                        else: break
                        if d.get('type')=='input': room.accept_input(role,d)
                    if d.get('type')=='ping': frame({'type':'pong','at':d.get('at')})
            except (OSError, ValueError, TypeError, ConnectionError): pass
            finally:
                stopped.set()
                with room.changed: room.changed.notify_all()
        reader=threading.Thread(target=receive,daemon=True);reader.start()
        serial=0; last_state=0
        try:
            while not stopped.is_set() and room is ROOM:
                now=time.monotonic()
                with room.changed:
                    if role=='host':
                        changes=[{'id':e['id'],'input':e['input']} for e in room.input_events if e['serial']>serial and now-e['at']<.25]
                        serial=room.input_serial
                    else: changes=[]
                    snapshot=room.snapshot(role) if now-last_state>=.2 else None
                    if snapshot is not None: snapshot.pop('inputs',None); last_state=now
                if changes: frame({'type':'inputs','changes':changes})
                if snapshot is not None: frame({'type':'state','state':snapshot})
                with room.changed: room.changed.wait(timeout=.016 if role=='host' else .1)
        except OSError: pass
        finally:
            stopped.set()
            with room.changed:
                if role in room.players and room.players[role].get('socket') is self:
                    p=room.players[role];p['input']={};p['seen']=time.monotonic()-6
                    room.input_serial+=1
                    room.input_events.append({'serial':room.input_serial,'id':role,'input':{},'at':time.monotonic()})
                    room.changed.notify_all()
            try: self.connection.shutdown(socket.SHUT_RDWR)
            except OSError: pass
            self.close_connection=True

    def send(self, code, body, content_type='application/json'):
        if not isinstance(body, bytes): body=json.dumps(body,ensure_ascii=False).encode() if content_type=='application/json' else str(body).encode()
        self.send_response(code); self.send_header('Content-Type',content_type); self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
    def role(self, query):
        key=query.get('key',[''])[0]
        with ROOM.lock: return ROOM.authenticate(key)
    def do_GET(self):
        u=urlparse(self.path); q=parse_qs(u.query); role=self.role(q)
        if u.path=='/api/socket':
            if not role:return self.send(403,{'error':'Sessão inválida.'})
            return self.websocket(role)
        if u.path=='/api/session':
            if role!='host':return self.send(403,{'error':'Abra a tela principal pelo endereço privado mostrado no servidor.'})
            host=q.get('address',[self.server.address])[0]
            if host not in self.server.addresses:host=self.server.address
            return self.send(200,{'joinUrl':f'http://{host}:{self.server.server_port}/join?room={ROOM.invite}','addresses':self.server.addresses,'port':self.server.server_port})
        if u.path=='/api/qr':
            if role!='host':return self.send(403,{'error':'Tela principal necessária.'})
            host=q.get('address',[self.server.address])[0]
            if host not in self.server.addresses:host=self.server.address
            qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=8,border=4)
            qr.add_data(f'http://{host}:{self.server.server_port}/join?room={ROOM.invite}');qr.make(fit=True)
            buffer=io.BytesIO();qr.make_image(image_factory=SvgPathImage).save(buffer)
            return self.send(200,buffer.getvalue(),'image/svg+xml')
        if u.path=='/api/state':
            if not role:return self.send(403,{'error':'Entre pelo QR code.'})
            with ROOM.lock:
                if role=='host':ROOM.host_seen=time.monotonic()
                return self.send(200,ROOM.snapshot(role))
        if u.path=='/api/events':
            if not role:return self.send(403,{'error':'Sessão inválida.'})
            self.send_response(200);self.send_header('Content-Type','text/event-stream');self.send_header('Cache-Control','no-cache');self.send_header('Connection','close');self.end_headers()
            try:
                while True:
                    with ROOM.lock:
                        if role=='host': pass
                        elif role in ROOM.players:ROOM.players[role]['seen']=time.monotonic()
                        else:break
                        data=ROOM.snapshot(role)
                    self.wfile.write(('data: '+json.dumps(data,ensure_ascii=False)+'\n\n').encode());self.wfile.flush();time.sleep(.05 if role=='host' else .4)
            except (BrokenPipeError,ConnectionResetError,TimeoutError):pass
            self.close_connection=True;return
        if u.path=='/':return self.send(200,'<meta charset="utf-8"><h1>Dani Países LAN</h1><p>Abra o endereço da tela principal mostrado no terminal do servidor. Para participar, escaneie o QR code na TV.</p>','text/html; charset=utf-8')
        name='index.html' if u.path=='/host' else ('controller.html' if STATIC_ROOT.name=='www' else 'local/controller.html') if u.path=='/join' else u.path.lstrip('/')
        file=(STATIC_ROOT/name).resolve()
        if not file.is_relative_to(STATIC_ROOT.resolve()) or not file.is_file():return self.send(404,{'error':'Arquivo não encontrado.'})
        return self.send(200,file.read_bytes(),mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
    def do_POST(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):return self.send(403,{'error':'Origem inválida.'})
        try:
            length=int(self.headers.get('Content-Length',0))
            if length>16384:raise ValueError('Pedido muito grande.')
            d=json.loads(self.rfile.read(length));u=urlparse(self.path)
            if not isinstance(d,dict):raise ValueError('Pedido inválido.')
            with ROOM.lock:
                role=ROOM.authenticate(str(d.get('key','')))
                if u.path=='/api/join':
                    if not secrets.compare_digest(str(d.get('room','')),ROOM.invite):return self.send(403,{'error':'Use o QR code atual da TV.'})
                    p=ROOM.add(d.get('name'),d.get('character'));ROOM.revision+=1
                    return self.send(200,{k:p[k] for k in ('id','token','name','character')})
                if u.path=='/api/input':
                    if role not in ROOM.players:return self.send(403,{'error':'Controle inválido.'})
                    ROOM.accept_input(role,d)
                    return self.send(200,{'ok':True})
                if u.path=='/api/heartbeat':
                    if role=='host':ROOM.host_seen=time.monotonic()
                    elif role in ROOM.players:ROOM.players[role]['seen']=time.monotonic()
                    else:return self.send(403,{'error':'Sessão inválida.'})
                    return self.send(200,{'ok':True})
                if u.path=='/api/organize':
                    if role!=ROOM.organizer or role not in ROOM.players:return self.send(403,{'error':'Somente o jogador 1 organiza as partidas.'})
                    action=d.get('action')
                    if action not in {'begin','next','pause','lobby','addLocal','remove'}:raise ValueError('Ação inválida.')
                    if ROOM.commands:raise ValueError('A tela da TV ainda está processando a ação anterior.')
                    payload=d.get('payload',{})
                    if not isinstance(payload,dict):raise ValueError('Configuração inválida.')
                    if action=='begin':
                        ids=payload.get('selected',[]);config=payload.get('config',{})
                        if not isinstance(ids,list) or len(ids)>32 or len(set(ids))!=len(ids) or any(x not in ROOM.players for x in ids):raise ValueError('Participantes inválidos.')
                        if not isinstance(config,dict) or config.get('format') not in {'duel','ffa','teams','campaign'} or config.get('rule') not in {'rounds','stock','time'}:raise ValueError('Formato ou regra inválidos.')
                        if payload.get('tournament','none') not in {'none','league','knockout'}:raise ValueError('Torneio inválido.')
                        if ROOM.phase in ('fight','paused'):raise ValueError('Volte ao lobby antes de iniciar outra partida.')
                    ROOM.command_serial+=1
                    ROOM.commands.append({'id':ROOM.command_serial,'action':action,'payload':payload})
                    ROOM.command_status={'id':ROOM.command_serial,'message':'Aguardando a tela da TV…','ok':None}
                    return self.send(200,{'ok':True,'commandId':ROOM.command_serial})
                if role!='host':return self.send(403,{'error':'Somente a tela principal organiza a sala.'})
                if u.path=='/api/ack':
                    command_id=d.get('id');ROOM.commands=[c for c in ROOM.commands if c['id']!=command_id]
                    ROOM.command_status={'id':command_id,'ok':bool(d.get('ok')),'message':str(d.get('message',''))[:200]}
                    return self.send(200,{'ok':True})
                if u.path=='/api/local':
                    source=d.get('source','keyboard1')
                    if source not in {'keyboard1','keyboard2','touch','pad0','pad1','pad2','pad3'}:raise ValueError('Controle local inválido.')
                    if any(p['source']==source for p in ROOM.players.values()):raise ValueError('Este controle já está cadastrado.')
                    p=ROOM.add(d.get('name'),d.get('character'),source);ROOM.revision+=1
                    return self.send(200,{'id':p['id']})
                if u.path=='/api/remove':
                    pid=d.get('id')
                    if ROOM.phase in ('fight','paused') and pid in ROOM.active:raise ValueError('Encerre a partida antes de remover esse jogador.')
                    if pid==ROOM.organizer:raise ValueError('O jogador 1 organiza a sala e não pode ser removido.')
                    ROOM.players.pop(pid,None);ROOM.revision+=1;return self.send(200,{'ok':True})
                if u.path=='/api/match':
                    active=d.get('active',[]);config=d.get('config',{})
                    if len(active) not in (2,4) or len(set(active))!=len(active) or any(x not in ROOM.players for x in active):raise ValueError('Selecione 2 ou 4 participantes diferentes.')
                    if config.get('format') not in {'duel','ffa','teams','campaign'}:raise ValueError('Formato inválido.')
                    if len(active)!=(4 if config['format'] in ('ffa','teams') else 2):raise ValueError('Quantidade de jogadores incompatível com o formato.')
                    if config.get('rule') not in {'rounds','stock','time'}:raise ValueError('Regra inválida.')
                    if int(config.get('lives',3)) not in (3,5) or int(config.get('seconds',60)) not in (60,120,180):raise ValueError('Vidas ou tempo inválidos.')
                    ROOM.active=active;ROOM.config=config;ROOM.phase='fight';ROOM.view={};ROOM.revision+=1
                elif u.path=='/api/phase':
                    phase=d.get('phase')
                    if phase not in ('lobby','fight','paused','result'):raise ValueError('Estado inválido.')
                    ROOM.phase=phase
                    if isinstance(d.get('view'),dict):ROOM.view=d['view']
                    elif phase!='result':ROOM.view={}
                    ROOM.revision+=1
                else:return self.send(404,{'error':'Ação desconhecida.'})
                return self.send(200,{'ok':True})
        except (ValueError,TypeError,KeyError,json.JSONDecodeError) as e:return self.send(400,{'error':str(e)})

def addresses():
    result=[]
    try:
        with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:
            s.connect(('192.0.2.1',80));result.append(s.getsockname()[0])
    except OSError:pass
    try:result.extend(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:pass
    return list(dict.fromkeys(a for a in result if not a.startswith('127.'))) or ['127.0.0.1']

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);parser.add_argument('--ip',help='IP local para o QR code, caso a detecção automática não funcione.');args=parser.parse_args()
    try:server=ThreadingHTTPServer(('0.0.0.0',args.port),Handler)
    except OSError as e:
        print(f'Não foi possível abrir a porta {args.port}: {e}. Feche a outra instância ou use --port 8766.');return 1
    server.daemon_threads=True;server.addresses=addresses()
    if args.ip:server.addresses.insert(0,args.ip)
    server.address=server.addresses[0]
    print('\nDANI PAÍSES • SERVIDOR LOCAL\n')
    print(f'TELA PRINCIPAL: http://127.0.0.1:{args.port}/host?key={ROOM.host_key}')
    print(f'Outra tela na rede: http://{server.address}:{args.port}/host?key={ROOM.host_key}')
    print('Espelhe esta tela na TV. O QR code aparecerá no lobby. Ctrl+C encerra.\n',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
    return 0
if __name__=='__main__':sys.exit(main())

