import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../lib/staff-fetch.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { staffFetch } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('eight client registrations survive an expired session without losing form data', async () => {
  const original = globalThis.fetch, writes = [];
  let expired = false, refreshes = 0;
  globalThis.fetch = async (path, init) => {
    if (path === '/api/auth/refresh') { refreshes++; expired = false; return Response.json({ ok: true }); }
    if (expired) return Response.json({ error: 'Sesión no válida.' }, { status: 401 });
    writes.push(JSON.parse(init.body)); return Response.json({}, { status: 201 });
  };
  try {
    for (let i = 0; i < 8; i++) {
      if (i === 5) expired = true;
      assert.equal((await staffFetch('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'Clienta ' + i }) })).status, 201);
    }
    assert.equal(refreshes, 1);
    assert.deepEqual(writes.map(x => x.name), Array.from({ length: 8 }, (_, i) => 'Clienta ' + i));
  } finally { globalThis.fetch = original; }
});

test('parallel unauthorized requests share a single session refresh', async () => {
  const original = globalThis.fetch;
  let valid = false, refreshes = 0;
  globalThis.fetch = async (path) => {
    if (path === '/api/auth/refresh') { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); valid = true; return Response.json({}); }
    return Response.json({}, { status: valid ? 200 : 401 });
  };
  try { assert.deepEqual((await Promise.all([staffFetch('/api/clients'), staffFetch('/api/services')])).map(x => x.status), [200, 200]); assert.equal(refreshes, 1); }
  finally { globalThis.fetch = original; }
});

test('failed refresh returns the original unauthorized response without an infinite retry', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async path => { calls.push(path); return Response.json({}, { status: 401 }); };
  try { assert.equal((await staffFetch('/api/clients')).status, 401); assert.deepEqual(calls, ['/api/clients', '/api/auth/refresh']); }
  finally { globalThis.fetch = original; }
});

test('validation and server errors are never replayed', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async path => { calls.push(path); return Response.json({}, { status: 500 }); };
  try { assert.equal((await staffFetch('/api/clients')).status, 500); assert.deepEqual(calls, ['/api/clients']); }
  finally { globalThis.fetch = original; }
});

const identity = await readFile(new URL('../lib/client-identity.ts', import.meta.url), 'utf8');
const identityCompiled = ts.transpileModule(identity, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { clientChoiceLabel } = await import('data:text/javascript;base64,' + Buffer.from(identityCompiled).toString('base64'));
test('same-name client choices remain distinguishable without merging their records', () => {
  const clients = [{ id: 'client-000001', name: 'Ana', phone: '600001111' }, { id: 'client-000002', name: 'ANA', phone: '600001111' }];
  assert.notEqual(clientChoiceLabel(clients[0], clients), clientChoiceLabel(clients[1], clients));
  assert.equal(clientChoiceLabel(clients[0], [clients[0]]), 'Ana');
});
