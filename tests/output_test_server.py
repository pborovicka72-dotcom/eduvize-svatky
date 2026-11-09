"""Loopback-only integration harness. NEVER package or expose this app in deployment."""
from pathlib import Path
from fastapi import Request,FastAPI,HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from test_output_adapter import HolidaysOutputs

case=HolidaysOutputs();case.setUp();app=FastAPI()
from eduvize_admin.output_api import router
def authorize(header):
    actor=case.actors.get(header.removeprefix('Bearer ') if header else '')
    if not actor:raise HTTPException(401)
    return actor
app.include_router(router(case.registry,authorize))
case.colors={"b"*32:"#112233","d"*32:"#556677"}
def browser_theme(profile="b"*32):
    return dict(schemaVersion=1,colors=dict(background='#eaf3f6',text='#18394b',muted='#54717d',surface='#ffffff',primary=case.colors[profile],primaryText='#ffffff',secondary='#dcebf0',secondaryText='#18394b',accent='#138a9a',border='#b0c5cf'),controls={'heightPx':44,'radiusPx':8},cards={'radiusPx':8},icons={'radiusPx':8})
case.theme=browser_theme
case.registry.theme=browser_theme
ROOT=Path(__file__).resolve().parents[1]
@app.middleware('http')
async def loopback_only(request: Request,call_next):
    if request.client.host not in ('127.0.0.1','::1','testclient'):
        return JSONResponse({'error':'Loopback test harness only'},403)
    return await call_next(request)
@app.post('/__test/theme')
async def theme(request: Request):
    data=await request.json();case.colors[data.get('profileId','b'*32)]=data['color'];return {'ok':True}
@app.post('/__test/entitlement')
async def entitlement(request: Request):
    case.allowed=(await request.json())['allowed'];return {'ok':True}
app.mount('/eduvize-svatky',StaticFiles(directory=ROOT),name='holidays-static')
import os
app.mount('/eduvize-styly',StaticFiles(directory=os.environ['HOLIDAYS_TEST_STYLES']),name='shared-static')
