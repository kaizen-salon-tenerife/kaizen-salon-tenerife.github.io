import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const data=s=>'data:text/javascript;base64,'+Buffer.from(compile(s)).toString('base64');
const projection=data(await readFile(new URL('../lib/google-calendar/projection.ts',import.meta.url),'utf8'));
const calendar=data((await readFile(new URL('../lib/google-calendar/server.ts',import.meta.url),'utf8')).replace('"./projection"',JSON.stringify(projection)));
const src=(await readFile(new URL('../lib/owner-alerts/server.ts',import.meta.url),'utf8')).replace('"../google-calendar/server"',JSON.stringify(calendar)).replace('"@block65/webcrypto-web-push"',JSON.stringify(import.meta.resolve('@block65/webcrypto-web-push')));
const {validSubscription,alertContent,emailRaw,ownerAlertRoute,deliverOwnerAlerts}=await import(data(src));
const {seal}=await import(calendar);
const env={SUPABASE_SECRET_KEY:'test',GOOGLE_CALENDAR_ENCRYPTION_KEY:'ab'.repeat(32),GOOGLE_CLIENT_ID:'test',GOOGLE_CLIENT_SECRET:'test'};
const a={id:'11111111-1111-4111-8111-111111111111',status:'confirmed',starts_at:'2026-11-10T09:15:00',service_name:'Manicura + Pedicura',client:{name:'Ana'}};
test('notification content preserves local appointment time and links to the appointment',()=>{
 const c=alertContent(a);assert.match(c.body,/Ana · Manicura \+ Pedicura · 10\/11\/2026 a las 09:15/);assert.ok(c.url.endsWith(a.id));
 const raw=Buffer.from(emailRaw(c,'test'),'base64url').toString();assert.match(raw,/To: nurmemartinbenitez@gmail.com/);assert.match(raw,/Content-Type: multipart\/alternative/);
 const parts=[...raw.matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/g)].map(m=>Buffer.from(m[1],'base64').toString());
 assert.equal(parts.length,2);for(const part of parts)assert.ok(part.includes(c.url));
 assert.match(parts[0],/Clienta: Ana\nServicios: Manicura \+ Pedicura\nFecha: 10\/11\/2026\nHora \(Canarias\): 09:15 h\nEstado: Confirmada/);
 assert.match(parts[1],/Ver o modificar cita/);
});

test('HTML email escapes client and service data and supports a plain test notice',()=>{
 const c=alertContent({...a,client:{name:'Ana <img src=x>'},service_name:'Uñas & <script>alert(1)</script>'});
 const raw=Buffer.from(emailRaw(c,'safe'),'base64url').toString();
 const html=Buffer.from(raw.match(/Content-Type: text\/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/)[1],'base64').toString();
 assert.ok(html.includes('Ana &lt;img src=x&gt;'));assert.ok(html.includes('Uñas &amp; &lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
 const testRaw=Buffer.from(emailRaw({title:'Prueba',body:'Sin cita creada',url:'https://example.com',tag:'test'},'test'),'base64url').toString();
 assert.ok(testRaw.includes('multipart/alternative'));
});
test('push endpoints cannot target arbitrary servers, credentials, or insecure origins',()=>{
 const sub={endpoint:'https://web.push.apple.com/test',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
 assert.equal(validSubscription(sub),true);
 for(const endpoint of ['http://web.push.apple.com/test','https://localhost/test','https://web.push.apple.com.evil.example/test','https://user:pass@web.push.apple.com/test','https://web.push.apple.com:444/test'])assert.equal(validSubscription({...sub,endpoint}),false);
 assert.equal(validSubscription({...sub,keys:{p256dh:'invalid',auth:'invalid'}}),false);
});
test('notification endpoints require staff authentication and the official origin',async()=>{
 assert.equal((await ownerAlertRoute(new Request('https://mb-beauty.leonforge.workers.dev/api/owner-alerts/status'),env)).status,401);
 assert.equal((await ownerAlertRoute(new Request('https://other.example/api/owner-alerts/setup',{method:'POST'}),env)).status,403);
});
test('email delivery sends once per claimed job and stores acceptance',async()=>{
 const original=globalThis.fetch, writes=[];let sends=0;
 const refresh=await seal('refresh',env);
 globalThis.fetch=async(url,init={})=>{
   const u=new URL(url);
   if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'token'});
   if(u.hostname==='gmail.googleapis.com'){sends++;assert.equal(init.method,'POST');return Response.json({id:'sent'});}
   if(u.pathname.endsWith('/claim_owner_alert_deliveries'))return Response.json([{id:'job',alert_id:'alert',channel:'email',target:'nurme',attempts:1,claim_id:'claim'}]);
   if(u.pathname.endsWith('/owner_alert_settings'))return Response.json([{email_refresh_token:refresh,email_enabled:true}]);
   if(u.pathname.endsWith('/owner_booking_alerts'))return Response.json([{appointment:a}]);
   if(u.pathname.endsWith('/owner_alert_deliveries')){assert.equal(u.searchParams.get('claim_id'),'eq.claim');writes.push(JSON.parse(init.body));return Response.json([]);}
   throw new Error('Unexpected URL');
 };
 try{await deliverOwnerAlerts(env);assert.equal(sends,1);assert.equal(writes.at(-1).status,'sent');}finally{globalThis.fetch=original;}
});
test('email network ambiguity is flagged, and cancelled appointments are never sent',async()=>{
 for(const cancelled of [false,true]){
  const original=globalThis.fetch,writes=[];let sends=0;const refresh=await seal('refresh',env);
  globalThis.fetch=async(url,init={})=>{
   const u=new URL(url);
   if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'token'});
   if(u.hostname==='gmail.googleapis.com'){sends++;throw new Error('timeout');}
   if(u.pathname.endsWith('/claim_owner_alert_deliveries'))return Response.json([{id:'job',alert_id:'alert',channel:'email',target:'nurme',attempts:1,claim_id:'claim'}]);
   if(u.pathname.endsWith('/owner_alert_settings'))return Response.json([{email_refresh_token:refresh,email_enabled:true}]);
   if(u.pathname.endsWith('/owner_booking_alerts'))return Response.json([{appointment:{...a,status:cancelled?'cancelled':'confirmed'}}]);
   writes.push(JSON.parse(init.body));return Response.json([]);
  };
  try{await deliverOwnerAlerts(env);assert.equal(sends,cancelled?0:1);assert.equal(writes.at(-1).status,cancelled?'skipped':'uncertain');}finally{globalThis.fetch=original;}
 }
});

test('push delivery encrypts for the device and retires an expired subscription',async()=>{
 const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const device=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const b64=b=>Buffer.from(b).toString('base64url');
 const sub={endpoint:'https://web.push.apple.com/notification/test',keys:{p256dh:b64(await crypto.subtle.exportKey('raw',device.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};
 const s={vapid_public_key:b64(await crypto.subtle.exportKey('raw',vapid.publicKey)),vapid_private_key:await seal((await crypto.subtle.exportKey('jwk',vapid.privateKey)).d,env)};
 assert.equal(validSubscription(sub),true);
 for(const status of [201,410]){
  const original=globalThis.fetch,writes=[];let sends=0;
  globalThis.fetch=async(url,init={})=>{
   const u=new URL(url);
   if(u.hostname==='web.push.apple.com'){
    sends++;assert.equal(init.redirect,'error');
    const h=new Headers(init.headers);assert.equal(h.get('content-encoding'),'aes128gcm');assert.match(h.get('authorization'),/^vapid /);
    assert.ok(init.body.byteLength>100);return new Response(null,{status});
   }
   if(u.pathname.endsWith('/claim_owner_alert_deliveries'))return Response.json([{id:'job',alert_id:'alert',channel:'push',target:'device',attempts:1,claim_id:'claim'}]);
   if(u.pathname.endsWith('/owner_alert_settings'))return Response.json([s]);
   if(u.pathname.endsWith('/owner_booking_alerts'))return Response.json([{appointment:a}]);
   if(u.pathname.endsWith('/staff_profiles'))return Response.json([{is_active:true,must_change_password:false,professional_key:'nurme',role:'owner'}]);
   if(u.pathname.endsWith('/owner_push_subscriptions')&&init.method!=='PATCH')return Response.json([{id:'device',user_id:'nurme',subscription:sub,active:true}]);
   writes.push({table:u.pathname,body:JSON.parse(init.body)});return Response.json([]);
  };
  try{await deliverOwnerAlerts(env);assert.equal(sends,1);assert.equal(writes.at(-1).body.status,status===201?'sent':'failed');if(status===410)assert.ok(writes.some(w=>w.body.active===false));}finally{globalThis.fetch=original;}
 }
});
