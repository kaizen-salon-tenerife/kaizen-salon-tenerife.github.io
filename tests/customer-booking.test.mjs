import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const data=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const projection=data(await readFile(new URL('../lib/google-calendar/projection.ts',import.meta.url),'utf8'));
const calendar=data((await readFile(new URL('../lib/google-calendar/server.ts',import.meta.url),'utf8')).replace('"./projection"',JSON.stringify(projection)));
const source=data((await readFile(new URL('../lib/customer-booking.ts',import.meta.url),'utf8')).replace('"./google-calendar/server"',JSON.stringify(calendar)));
const {customerBookingRoute}=await import(source);
const {unseal}=await import(calendar);
const env={SUPABASE_SECRET_KEY:'test',GOOGLE_CALENDAR_ENCRYPTION_KEY:'ab'.repeat(32)};
const request=body=>new Request('https://mb-beauty.leonforge.workers.dev/api/manage-booking',{method:'POST',headers:{origin:'https://mb-beauty.leonforge.workers.dev','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});

test('lookup requires the official origin, rate limit, full phone and reference',async()=>{
 assert.equal((await customerBookingRoute(new Request('https://mb-beauty.leonforge.workers.dev/api/manage-booking',{method:'POST'}),env)).status,403);
 const original=globalThis.fetch;const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return Response.json(false);};
 try{assert.equal((await customerBookingRoute(request({reference:'KZ-ABC123',phone:'000000615'}),env)).status,429);assert.equal(calls.length,1);assert.match(calls[0].body.p_key,/^[a-f0-9]{64}$/);assert.ok(!calls[0].url.includes('000000615'));}finally{globalThis.fetch=original;}
});
test('lookup issues a time-limited encrypted ticket; mutations require it and a revision',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url,init)=>{const payload=JSON.parse(init.body);calls.push(payload);return Response.json(url.endsWith('consume_booking_management_attempt')?true:{reference:'KZ-ABC123',name:'Test',version:'a'.repeat(32),appointments:[]});};
 try{
  const response=await customerBookingRoute(request({reference:' kz-abc123 ',phone:'000 000 615'}),env);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-MB-Booking-Changed'),null);
  const result=await response.json();assert.ok(result.token);assert.ok(!JSON.stringify(result).includes('000000615'));
  const ticket=JSON.parse(await unseal(result.token,env));assert.equal(ticket.purpose,'customer-booking');assert.ok(ticket.expires>Date.now());
  assert.equal((await customerBookingRoute(request({action:'cancel',reference:'KZ-ABC123',phone:'000000615',version:'a'.repeat(32)}),env)).status,401);
  assert.equal((await customerBookingRoute(request({action:'cancel',token:result.token}),env)).status,409);
  const cancelled=await customerBookingRoute(request({action:'cancel',token:result.token,version:'a'.repeat(32)}),env);assert.equal(cancelled.status,200);assert.equal(cancelled.headers.get('X-MB-Booking-Changed'),'1');assert.equal(calls.at(-1).p_phone,'000000615');
  assert.equal((await customerBookingRoute(request({action:'slots',token:result.token,date:'2027-02-30'}),env)).status,400);
 }finally{globalThis.fetch=original;}
});
