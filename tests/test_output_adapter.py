import copy
import json
import sqlite3
import tempfile
import unittest
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from eduvize_admin.output_registry import OutputRegistry, Actor, OutputError
from eduvize_admin.output_api import router
from eduvize_holidays.output_adapter import validate, get_output_adapters

PAYLOAD=dict(country='cz',monthFormat='text',days=3,tomorrow=True,holidays=True,significant=True,nameDetails=True)
class Connection:
    def __init__(self,path):
        self.conn=sqlite3.connect(path,timeout=15);self.conn.execute('BEGIN IMMEDIATE')
    def execute(self,sql,args=()):
        if 'pg_advisory_xact_lock' in sql:return self.conn.execute('SELECT 1')
        return self.conn.execute(sql.replace('%s','?'),args)
    def __enter__(self):return self
    def __exit__(self,typ,value,tb):
        self.conn.rollback() if typ else self.conn.commit();self.conn.close()

class HolidaysOutputs(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=str(Path(self.tmp.name)/'test.db')
        self.connect=lambda:Connection(self.path)
        self.profiles={'b'*32:'a'*32,'d'*32:'c'*32};self.color='#112233';self.allowed=True
        self.actors={k:Actor(s,k,frozenset(['read','create','save','publish','revoke'])) for k,s in [('a','a'*32),('c','c'*32)]}
        def entitlement(school,app):
            if not self.allowed:raise OutputError(403,'FORBIDDEN','Test entitlement removed')
        self.entitlement=entitlement
        self.registry=self.new_registry()
        def auth(header):
            actor=self.actors.get(header.removeprefix('Bearer ') if header else '')
            if not actor:raise HTTPException(401)
            return actor
        app=FastAPI();app.include_router(router(self.registry,auth));self.client=TestClient(app)
        self.draft={'schemaVersion':1,'payloadVersion':1,'payload':PAYLOAD.copy(),'presentation':{'mode':'web','geometry':None,'interaction':'display'}}
        a=self.call('POST','/api/v1/output-assemblies',{'schemaVersion':1,'appId':'holidays','profileId':'b'*32}).json()
        self.body={'schemaVersion':1,'appId':'holidays','profileId':'b'*32,'assemblyId':a['id'],'draft':self.draft}
    def new_registry(self):
        return OutputRegistry(self.connect,get_output_adapters(),self.profiles.get,'https://test.skola.eduvize.cz',lambda p:self.theme(),self.entitlement)
    def theme(self):
        return dict(schemaVersion=1,colors={k:self.color for k in ['background','text','muted','surface','primary','primaryText','secondary','secondaryText','accent','border']},controls={'heightPx':44,'radiusPx':8},cards={'radiusPx':8},icons={'radiusPx':8})
    def call(self,method,path,body=None,key=None,actor='a'):
        return self.client.request(method,path,json=body,headers={'Authorization':'Bearer '+actor,'Idempotency-Key':key or str(uuid.uuid4())})
    def create(self):
        r=self.call('POST','/api/v1/outputs',self.body);self.assertEqual(r.status_code,201,r.text);return r.json()
    def publish(self,o):
        r=self.call('POST','/api/v1/outputs/'+o['id']+'/publish',{'expectedRevision':o['revision']});self.assertEqual(r.status_code,200,r.text);return r.json()
    def tearDown(self):self.tmp.cleanup()
    def test_strict_settings_reject_private_fields_invalid_values_and_boolean_days(self):
        self.assertEqual(validate(PAYLOAD,{}),PAYLOAD)
        for delta in [{'country':'xx'},{'days':True},{'days':7},{'previewDate':'2026-12-24'},{'profileId':'d'*32},{'token':'secret'},{'nameDetails':'1'}]:
            with self.assertRaises(ValidationError):validate({**PAYLOAD,**delta},{})
    def test_publication_copy_draft_retry_and_bound_profile(self):
        key=str(uuid.uuid4());one=self.call('POST','/api/v1/outputs',self.body,key).json()
        self.assertEqual(self.call('POST','/api/v1/outputs',self.body,key).json(),one)
        self.assertEqual(self.call('GET','/api/v1/outputs/'+one['id']+'/link').status_code,409)
        o=self.publish(one);url=o['url'];path='/api/public/v1/outputs/'+o['id']
        d=copy.deepcopy(self.draft);d['payload']['country']='sk'
        saved=self.call('PUT','/api/v1/outputs/'+o['id']+'/draft',{'expectedRevision':o['revision'],'draft':d}).json()
        self.assertEqual(self.client.get(path).json()['payload']['country'],'cz')
        for _ in range(3):self.assertEqual(self.call('GET','/api/v1/outputs/'+o['id']+'/link').json()['url'],url)
        self.assertEqual(self.call('GET','/api/v1/outputs/'+o['id']).json()['revision'],saved['revision'])
        self.assertEqual(self.publish(saved)['url'],url)
        self.assertEqual(self.client.get(path).json()['payload']['country'],'sk')
        self.assertEqual(self.call('GET','/api/v1/outputs/'+o['id'],actor='c').status_code,404)
        public=self.client.get(path).text
        for private in ['profileId','schoolId','assemblyId','token']:self.assertNotIn(private,public)
    def test_modes_geometry_and_fixed_renderer(self):
        fixtures=json.loads((Path(__file__).parent/'fixtures/presentation.json').read_text())
        for presentation in fixtures.values():
            self.body['draft']['presentation']=presentation;o=self.publish(self.create())
            self.assertEqual(self.client.get('/o/'+o['id'],follow_redirects=False).headers['location'],'/eduvize-svatky/published.html?edu-output='+o['id'])
            self.assertEqual(self.client.get('/api/public/v1/outputs/'+o['id']).json()['presentation']['mode'],presentation['mode'])
    def test_restart_theme_revocation_and_entitlement(self):
        o=self.publish(self.create());id=o['id'];self.color='#abcdef'
        self.assertEqual(self.new_registry().public(id)['payload'],PAYLOAD)
        self.assertEqual(self.client.get('/api/public/v1/outputs/'+id+'/theme').json()['colors']['primary'],'#abcdef')
        self.allowed=False
        self.assertEqual(self.client.get('/api/public/v1/outputs/'+id).status_code,403)
        self.assertEqual(self.call('POST','/api/v1/outputs/'+id+'/revoke',{'expectedRevision':o['revision']}).status_code,200)
        self.allowed=True
        self.assertEqual(self.client.get('/api/public/v1/outputs/'+id).status_code,410)

if __name__=='__main__':unittest.main()
