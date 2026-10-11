import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL('../lib/google-calendar/projection.ts',import.meta.url),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const projectionUrl = 'data:text/javascript;base64,'+Buffer.from(compiled).toString('base64');
const {projectEvent,eventId,serviceColor,shouldPublish}=await import(projectionUrl);
const serverSource = (await readFile(new URL('../lib/google-calendar/server.ts',import.meta.url),'utf8')).replace('"./projection"',JSON.stringify(projectionUrl));
const serverCompiled = ts.transpileModule(serverSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {seal,unseal,calendarRoute,syncCalendar}=await import('data:text/javascript;base64,'+Buffer.from(serverCompiled).toString('base64'));
const a={id:'b72c89b0-a89e-474b-b5c9-ce5fca525a20',professional_key:'nurme',service_name:'Manicura tradicional',starts_at:'2026-07-10T10:00:00+00:00',ends_at:'2026-07-10T10:30:00+00:00',status:'confirmed',updated_at:'2026-07-09T08:00:00Z'};
const env={GOOGLE_CALENDAR_ENABLED:'true',GOOGLE_CLIENT_ID:'test-id',GOOGLE_CLIENT_SECRET:'test-secret',SUPABASE_SECRET_KEY:'fake-key',GOOGLE_CALENDAR_ENCRYPTION_KEY:'ab'.repeat(32)};
test('projection preserves studio wall time, uses Tenerife DST and exports no client data',()=>{
 const event=projectEvent({...a,notes:'DO NOT EXPORT',phone:'DO NOT EXPORT',client_name:'DO NOT EXPORT'});
 assert.equal(event.start.dateTime,'2026-07-10T10:00:00');assert.equal(event.start.timeZone,'Atlantic/Canary');
 assert.equal(event.visibility,'private');assert.equal(event.colorId,'4');assert.ok(!JSON.stringify(event).includes('DO NOT EXPORT'));
 assert.equal(projectEvent({...a,starts_at:'2026-01-10T10:00:00Z'}).start.dateTime,'2026-01-10T10:00:00');
});
test('stable legal event IDs and classification',()=>{
 assert.match(eventId(a.id),/^[0-9a-v]+$/);assert.equal(eventId(a.id.toUpperCase()),eventId(a.id));assert.throws(()=>eventId('bad'));
 for(const [service,color] of [['Pedicura semipermanente','10'],['Higiene facial','9'],['Lifting de pestañas','3'],['Uñas acrílicas','4'],['Otro','8']]) assert.equal(serviceColor(service),color);
 for(const status of ['pending','cancelled','no_show']) assert.equal(shouldPublish({...a,status}),false);
 assert.equal(shouldPublish({...a,professional_key:'sarai'}),false);assert.equal(shouldPublish({...a,status:'completed'}),true);
});
test('AES-GCM uses unique IVs, detects tampering and wrong keys',async()=>{
 const encrypted=await seal('fake-refresh-token',env);assert.notEqual(encrypted,await seal('fake-refresh-token',env));assert.equal(await unseal(encrypted,env),'fake-refresh-token');
 await assert.rejects(unseal(encrypted,{...env,GOOGLE_CALENDAR_ENCRYPTION_KEY:'cd'.repeat(32)}));
 await assert.rejects(unseal(encrypted.slice(0,-4)+'AAAA',env));
});
test('unconfigured integration and historical hostname fail closed without network access',async()=>{
 assert.equal((await calendarRoute(new Request('https://mb-beauty.leonforge.workers.dev/api/google-calendar/status'),{})).status,503);
 assert.equal((await calendarRoute(new Request('https://old.invalid/api/google-calendar/status'),env)).status,403);
 assert.equal((await calendarRoute(new Request('https://mb-beauty.leonforge.workers.dev/api/google-calendar/status'),env)).status,403);
});
test('failed Google update retains cursor, records safe error and releases lease',async()=>{
 const original=globalThis.fetch;const writes=[];
 const refresh=await seal('fake-refresh',env);
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);const body=options.body ? JSON.parse(options.body instanceof URLSearchParams ? '{}' : options.body) : null;
  if(u.hostname==='oauth2.googleapis.com') return Response.json({access_token:'fake-access'});
  if(u.hostname==='www.googleapis.com') return Response.json({error:'unavailable'},{status:503});
  assert.equal(u.hostname,'gwndpaeebjtoowuzkywz.supabase.co');
  if(u.pathname.endsWith('/appointments')) return Response.json([a]);
  if(body?.lease_until && !body.last_error && body.lease_until!=='1970-01-01T00:00:00Z') return Response.json([{id:'nurme',refresh_token:refresh,calendar_id:'calendar',cursor:'1970-01-01T00:00:00Z',cursor_id:null}]);
  writes.push(body);return Response.json([]);
 };
 try {await assert.rejects(syncCalendar(env));assert.ok(writes.some(w=>w.last_error));assert.ok(!writes.some(w=>w.cursor));assert.ok(writes.some(w=>w.lease_until==='1970-01-01T00:00:00Z'));} finally {globalThis.fetch=original;}
});
test('forged or replayed callbacks cannot exchange a Google authorization code',async()=>{
 const original=globalThis.fetch; let calls=0;
 const cookie=await seal(JSON.stringify({nonce:'state',uid:a.id,verifier:'verifier',expires:Date.now()+60000}),env);
 globalThis.fetch=async(url)=>{ calls++; assert.ok(String(url).includes('/rest/v1/google_calendar_connection')); return Response.json([]); };
 try {
  const request=(state)=>new Request('https://mb-beauty.leonforge.workers.dev/api/google-calendar/callback?state='+state+'&code=fake',{headers:{cookie:'mb_google_connect='+cookie}});
  assert.match((await calendarRoute(request('wrong'),env)).headers.get('location'),/result=invalid$/); assert.equal(calls,0);
  assert.match((await calendarRoute(request('state'),env)).headers.get('location'),/result=invalid$/); assert.equal(calls,1);
 } finally {globalThis.fetch=original;}
});
test('successful writes checkpoint individually and retries recover an insert conflict',async()=>{
 const original=globalThis.fetch;const writes=[];const methods=[];
 const refresh=await seal('fake-refresh',env);
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);
  if(u.hostname==='oauth2.googleapis.com') return Response.json({access_token:'fake-access'});
  if(u.hostname==='www.googleapis.com') {methods.push(options.method); const n=methods.length; return Response.json({}, {status:n===1 ? 404 : n===2 ? 409 : 200});}
  if(u.pathname.endsWith('/appointments')) return Response.json([a]);
  const body=options.body ? JSON.parse(options.body) : null;
  if(body?.lease_until && body.lease_until!=='1970-01-01T00:00:00Z') return Response.json([{id:'nurme',refresh_token:refresh,calendar_id:'calendar',cursor:'1970-01-01T00:00:00Z',cursor_id:null}]);
  writes.push(body);return Response.json([]);
 };
 try {await syncCalendar(env);assert.deepEqual(methods,['PUT','POST','PUT']);assert.ok(writes.some(w=>w?.cursor_id===a.id && w.cursor===a.updated_at));assert.ok(writes.some(w=>w?.last_synced_at));} finally {globalThis.fetch=original;}
});
