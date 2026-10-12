import base64, importlib.util, json, os, socket, struct, threading, time, unittest, urllib.request, urllib.error
from pathlib import Path
spec=importlib.util.spec_from_file_location('lan_server',Path(__file__).with_name('server.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class Wire:
    def __init__(self, server, key, origin=None):
        self.socket=socket.create_connection(server.server_address, timeout=2)
        self.file=self.socket.makefile('rb')
        host='127.0.0.1:'+str(server.server_port)
        headers=f'GET /api/socket?key={key} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: '+base64.b64encode(os.urandom(16)).decode()+'\r\n'
        if origin: headers+='Origin: '+origin+'\r\n'
        self.socket.sendall((headers+'\r\n').encode())
        self.status=self.file.readline()
        while self.file.readline()!=b'\r\n': pass
    def send(self, data):
        data=json.dumps(data).encode();mask=os.urandom(4)
        h=b'\x81'+(bytes([128|len(data)]) if len(data)<126 else b'\xfe'+struct.pack('!H',len(data)))
        self.socket.sendall(h+mask+bytes(x^mask[i%4] for i,x in enumerate(data)))
    def read(self):
        h=self.file.read(2);size=h[1]&127
        if size==126:size=struct.unpack('!H',self.file.read(2))[0]
        return json.loads(self.file.read(size))
    def close(self):
        try:self.socket.shutdown(socket.SHUT_RDWR)
        except OSError:pass
        self.file.close();self.socket.close()

class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=module.ThreadingHTTPServer(('127.0.0.1',0),module.Handler)
        cls.server.address='127.0.0.1';cls.server.addresses=['127.0.0.1'];cls.server.daemon_threads=True
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.base='http://127.0.0.1:'+str(cls.server.server_port)
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
    def setUp(self):module.ROOM=module.Room()
    def post(self,path,data):
        req=urllib.request.Request(self.base+path,json.dumps(data).encode(),{'Content-Type':'application/json'})
        return json.load(urllib.request.urlopen(req,timeout=3))
    def test_join_and_inputs(self):
        p=self.post('/api/join',{'room':module.ROOM.invite,'name':'Dani','character':'br'})
        self.post('/api/input',{'key':p['token'],'seq':1,'input':{'right':True,'admin':True}})
        state=module.ROOM.snapshot('host');self.assertEqual(state['inputs'][p['id']],{'right':True})
        public=module.ROOM.snapshot(p['id']);self.assertNotIn('inputs',public);self.assertNotIn('token',public['players'][0])
        self.post('/api/input',{'key':p['token'],'seq':0,'input':{'left':True}})
        self.assertEqual(module.ROOM.snapshot('host')['inputs'][p['id']],{'right':True})
        module.ROOM.players[p['id']]['inputAt']=time.monotonic()-1
        module.ROOM.players[p['id']]['seen']=time.monotonic()
        self.assertEqual(module.ROOM.snapshot('host')['inputs'][p['id']],{})
    def test_auth_and_formats(self):
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/join',{'room':'bad','name':'x'})
        p=[self.post('/api/join',{'room':module.ROOM.invite,'name':str(i)}) for i in range(4)]
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/match',{'key':p[0]['token'],'active':[x['id'] for x in p],'config':{'format':'ffa','rule':'stock'}})
        self.post('/api/match',{'key':module.ROOM.host_key,'active':[x['id'] for x in p],'config':{'format':'teams','rule':'time','lives':3,'seconds':60}})
        self.assertEqual(module.ROOM.phase,'fight')
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/match',{'key':module.ROOM.host_key,'active':[x['id'] for x in p],'config':{'format':'campaign','rule':'stock'}})
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/remove',{'key':module.ROOM.host_key,'id':p[0]['id']})
        self.post('/api/phase',{'key':module.ROOM.host_key,'phase':'lobby'})
        self.post('/api/remove',{'key':module.ROOM.host_key,'id':p[1]['id']})
    def test_qr_static_and_stream(self):
        for path in ['/host','/join','/local/host.js','/icon.svg']:
            r=urllib.request.urlopen(self.base+path,timeout=3);self.assertEqual(r.status,200);self.assertTrue(r.read())
        qr=urllib.request.urlopen(self.base+'/api/qr?key='+module.ROOM.host_key,timeout=3).read()
        self.assertIn(b'<svg',qr);self.assertIn(b'<path',qr)
        p=self.post('/api/join',{'room':module.ROOM.invite,'name':'Phone'})
        with urllib.request.urlopen(self.base+'/api/events?key='+p['token'],timeout=3) as stream:
            data=json.loads(stream.readline().decode().removeprefix('data: '));self.assertEqual(data['myId'],p['id']);self.assertNotIn('inputs',data)
        with self.assertRaises(urllib.error.HTTPError):urllib.request.urlopen(self.base+'/../server.py',timeout=3)

    def test_player_one_organizes_without_host_key(self):
        p1=self.post('/api/join',{'room':module.ROOM.invite,'name':'P1'})
        p2=self.post('/api/join',{'room':module.ROOM.invite,'name':'P2'})
        self.assertTrue(module.ROOM.snapshot(p1['id'])['canOrganize'])
        self.assertFalse(module.ROOM.snapshot(p2['id'])['canOrganize'])
        payload={'selected':[p1['id'],p2['id']],'tournament':'none','config':{'format':'duel','rule':'stock','lives':3,'seconds':60,'stage':0}}
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/organize',{'key':p2['token'],'action':'begin','payload':payload})
        command=self.post('/api/organize',{'key':p1['token'],'action':'begin','payload':payload})
        snapshot=module.ROOM.snapshot('host');self.assertEqual(snapshot['commands'][0]['action'],'begin')
        self.assertNotIn('commands',module.ROOM.snapshot(p1['id']))
        self.assertTrue(module.ROOM.snapshot(p1['id'])['commandPending'])
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/organize',{'key':p1['token'],'action':'pause'})
        with self.assertRaises(urllib.error.HTTPError):self.post('/api/ack',{'key':p1['token'],'id':command['commandId'],'ok':True})
        self.post('/api/ack',{'key':module.ROOM.host_key,'id':command['commandId'],'ok':True,'message':'Partida iniciada'})
        self.assertFalse(module.ROOM.snapshot(p1['id'])['commandPending'])
        self.assertEqual(module.ROOM.snapshot(p1['id'])['commandStatus']['message'],'Partida iniciada')
        self.post('/api/phase',{'key':module.ROOM.host_key,'phase':'result','view':{'title':'P1 venceu','nextEnabled':True}})
        self.assertTrue(module.ROOM.snapshot(p1['id'])['view']['nextEnabled'])
        self.post('/api/organize',{'key':p1['token'],'action':'next'})
        self.assertEqual(module.ROOM.snapshot('host')['commands'][0]['action'],'next')

    def test_websocket_four_players_taps_latency_and_reconnect(self):
        players=[self.post('/api/join',{'room':module.ROOM.invite,'name':str(i)}) for i in range(4)]
        host=Wire(self.server,module.ROOM.host_key)
        phones=[Wire(self.server,p['token']) for p in players]
        try:
            self.assertIn(b'101',host.status)
            self.assertEqual(host.read()['type'],'state')
            for phone,p in zip(phones,players):
                initial=phone.read();self.assertEqual(initial['state']['myId'],p['id'])
                self.assertNotIn('inputs',initial['state']);self.assertNotIn('host_key',str(initial))
            timings=[]
            for seq in range(1,11):
                start=time.monotonic()
                for phone in phones:
                    phone.send({'type':'input','seq':seq*2,'input':{'smashAttack':True}})
                    phone.send({'type':'input','seq':seq*2+1,'input':{}})
                got={p['id']:[] for p in players}
                while any(len(values)<2 for values in got.values()):
                    packet=host.read()
                    if packet['type']=='inputs':
                        for change in packet['changes']:got[change['id']].append(change['input'])
                timings.append((time.monotonic()-start)*1000)
                for values in got.values():self.assertEqual(values[:2],[{'smashAttack':True},{}])
            self.assertLess(max(timings),500,'LAN relay must not accumulate seconds of input delay')
            print('WebSocket 4 players, tap down/up: median %.1f ms, max %.1f ms (loopback)'%(sorted(timings)[len(timings)//2],max(timings)))
            phones[0].send({'type':'input','seq':100,'input':{'left':True}})
            phones[0].send({'type':'ping','at':123})
            while phones[0].read()['type']!='pong':pass
            self.assertEqual(module.ROOM.players[players[0]['id']]['seq'],100)
            phones[0].close();phones[0]=Wire(self.server,players[0]['token'])
            state=phones[0].read()['state'];self.assertEqual(state['inputSeq'],100)
            phones[0].send({'type':'input','seq':101,'input':{'right':True}})
            phones[0].send({'type':'ping'})
            while phones[0].read()['type']!='pong':pass
            self.assertEqual(module.ROOM.players[players[0]['id']]['input'],{'right':True})
        finally:
            for phone in phones:phone.close()
            host.close()

    def test_websocket_rejects_invalid_auth_and_origin(self):
        for key,origin in [('bad',None),(module.ROOM.host_key,'https://other.example')]:
            wire=Wire(self.server,key,origin)
            try:self.assertIn(b'403',wire.status)
            finally:wire.close()

if __name__=='__main__':unittest.main()
