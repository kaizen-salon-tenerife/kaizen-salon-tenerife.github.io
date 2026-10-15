import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(compile(source)).toString('base64');
const identity = dataUrl(await readFile(new URL('../lib/client-identity.ts', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../app/panel/appointment-form.tsx', import.meta.url), 'utf8')).replace('"@/lib/client-identity"', JSON.stringify(identity));
const compiled = compile(source).replaceAll('"react"', JSON.stringify(import.meta.resolve('react'))).replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')));
const { default: AppointmentForm } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const service = { id: 'manicure', name: 'Manicura', category: 'Manicura', priceLabel: '20 €', durationMinutes: 60, professionalKey: 'nurme', isActive: true };
const props = { services: [service], clients: [{ id: 'client', name: 'Ana' }], professionals: [{ id: 'nurme', name: 'Nurme', professionalKey: 'nurme' }], isOwner: true, error: '', onSubmit() {}, onCancel() {} };

test('editing preserves an existing appointment time, nonstandard duration and legacy service name', () => {
  const html = renderToStaticMarkup(createElement(AppointmentForm, { ...props, isEditing: true, submitLabel: 'Guardar cambios', prefill: { clientId: 'client', professionalId: 'nurme', serviceName: 'Servicio antiguo fuera del catálogo', date: '2026-10-15', time: '12:15', duration: 20, notes: 'Conservar nota' } }));
  assert.match(html, /name="serviceName" value="Servicio antiguo fuera del catálogo"/);
  assert.match(html, /name="time"[^>]*value="12:15"/);
  assert.match(html, /value="20" selected=""/);
  assert.match(html, /Conservar nota/);
  assert.match(html, /Guardar cambios/);
  assert.doesNotMatch(html, /Próxima visita recomendada|Datos preparados/);
});

test('combined services including a plus sign survive editing until the selection changes', () => {
  const name = 'Manicura + Limpieza facial + tratamiento';
  const html = renderToStaticMarkup(createElement(AppointmentForm, { ...props, services: [service, { ...service, id: 'facial', name: 'Limpieza facial + tratamiento' }], isEditing: true, prefill: { clientId: 'client', professionalId: 'nurme', serviceName: name, date: '2026-10-15', time: '09:30', duration: 120, notes: '' } }));
  assert.match(html, /2 servicios seleccionados/);
  assert.match(html, /name="serviceName" value="Manicura \+ Limpieza facial \+ tratamiento"/);
  assert.match(html, /value="75"/);
  assert.match(html, /value="105"/);
});
