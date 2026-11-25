import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/whatsapp-link.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {whatsappLink}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('WhatsApp links use readable labels without emoji while preserving accents and line breaks',()=>{
 const message='Hola Nurme 😊 Soy María.\n🔖 Referencia: KZ-ABC123\n📅 jueves, 26 de noviembre\n🕘 09:00 h (Canarias)\n💅 Uñas & cuidado + facial\n¡Gracias por tu comprensión! 💛';
 const url=new URL(whatsappLink('34652430072',message));
 assert.equal(url.origin,'https://api.whatsapp.com');assert.equal(url.pathname,'/send/');
 assert.equal(url.searchParams.get('phone'),'34652430072');
 assert.equal(url.searchParams.get('text'),'Hola Nurme Soy María.\nReferencia: KZ-ABC123\njueves, 26 de noviembre\n09:00 h (Canarias)\nUñas & cuidado + facial\n¡Gracias por tu comprensión!');
 assert.ok(!url.href.includes('%EF%BF%BD'));assert.ok(!url.href.includes('%F0%9F'));
 assert.ok(message.includes('😊')); // The original clipboard text is not changed.
 assert.equal(url.searchParams.get('type'),'phone_number');assert.equal(url.searchParams.get('app_absent'),'0');
});
test('link text has no leftover variation selectors, joiners or flags',()=>{
 const text=new URL(whatsappLink('34652430072','☺️ Hola 👩🏽‍💻\n🇮🇨 Canarias ❤️\n1️⃣ Servicio 1 + 2')).searchParams.get('text');
 assert.equal(text,'Hola\nCanarias\n1 Servicio 1 + 2');
});
