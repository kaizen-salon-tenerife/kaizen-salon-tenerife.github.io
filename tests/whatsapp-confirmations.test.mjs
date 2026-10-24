import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../lib/whatsapp-confirmations.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { appointmentsForConfirmation } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('both panel and web appointments are available for WhatsApp confirmation', () => {
  const panel = { id: 'panel', status: 'confirmed', startsAt: '2026-10-26T09:00:00', bookingRequestId: null, client: 'Ana', service: 'Manicura' };
  const web = { ...panel, id: 'web', bookingRequestId: 'request', client: 'Bea' };
  assert.deepEqual(appointmentsForConfirmation([panel, web], '2026-10-24'), [panel, web]);
});

test('today is included, while past and inactive appointments are excluded', () => {
  const today = { id: 'today', status: 'confirmed', startsAt: '2026-10-24T09:00:00' };
  const excluded = ['pending', 'cancelled', 'completed', 'no_show'].map(status => ({ ...today, status }));
  excluded.push({ ...today, startsAt: '2026-10-23T19:00:00' });
  assert.deepEqual(appointmentsForConfirmation([...excluded, today], '2026-10-24'), [today]);
});
