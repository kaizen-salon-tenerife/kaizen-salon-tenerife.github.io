import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const { default: worker } = await import('../dist/server/index.js');
const env = { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const request = (path, options = {}) => worker.fetch(new Request(`http://localhost${path}`, options), env, ctx);

test('renders MB Beauty metadata, accessible content and no former public identity', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>MB Beauty \| Estética y cuidado personalizado<\/title>/i);
  assert.match(html, /apple-mobile-web-app-title[^>]+MB Beauty/);
  assert.match(html, /manifest.webmanifest/);
  assert.match(html, /og:image" content="https:\/\/mb-beauty.leonforge.workers.dev\/brand\/social\/mb-beauty-share.jpg/);
  assert.match(html, /mbstetic17/);
  assert.match(html, /Nurme Martín/);
  assert.doesNotMatch(html, /Kaizen|Sarai|Yeroha|codex-preview/);
});

for (const path of ['/reservar', '/privacidad', '/panel/acceso', '/panel/cambiar-clave', '/panel/recuperar-clave']) {
  test(`direct navigation and reload: ${path}`, async () => {
    for (let i = 0; i < 2; i++) {
      const response = await request(path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /MB Beauty/);
      assert.doesNotMatch(html, /logo-kaizen|Kaizen/);
      if (path === '/reservar') assert.doesNotMatch(html, /Micropigmentación de cejas|Tatuaje fine line|Sarai|Yeroha/);
    }
  });
}

test('private panel requires session', async () => {
  const response = await request('/panel');
  assert.equal(response.status, 307);
  assert.match(response.headers.get('location'), /\/panel\/acceso$/);
});

test('unknown pages have branded 404', async () => {
  const response = await request('/pagina-inexistente');
  assert.equal(response.status, 404);
  assert.match(await response.text(), /MB Beauty/);
});

for (const path of ['/api/appointments', '/api/clients', '/api/payments', '/api/schedule-blocks', '/api/whatsapp-notifications']) {
  test(`private endpoint rejects unauthenticated mutations: ${path}`, async () => {
    assert.equal((await request(path, { method: "POST", headers: { origin: "http://localhost", "Content-Type": "application/json" }, body: "{}" })).status, 401);
  });
}

test('refresh requires session and logout clears existing session cookies', async () => {
  assert.equal((await request('/api/auth/refresh', { method: 'POST', headers: { origin: 'http://localhost' } })).status, 401);
  const response = await request('/api/auth/logout', { method: 'POST', headers: { origin: 'http://localhost' } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /mb_beauty_access_token=;.*Max-Age=0/);
  assert.match(response.headers.get('set-cookie'), /mb_beauty_refresh_token=;.*Max-Age=0/);
});

for (const path of ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/auth/change-password', '/api/booking-requests']) {
  test(`cross-origin mutation rejected: ${path}`, async () => {
    assert.equal((await request(path, { method: 'POST', headers: { origin: 'https://example.invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  });
}

test('invalid availability input does not contact Supabase', async () => {
  assert.equal((await request('/api/availability?date=invalid')).status, 400);
});

test('manifest and all installed-app icons are valid', async () => {
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.name, 'MB Beauty');
  assert.equal(manifest.start_url, '/');
  for (const icon of manifest.icons) assert.ok((await readFile(`public${icon.src}`)).length > 0);
  assert.ok((await readFile('public/brand/logo/apple-touch-icon.png')).length > 0);
});
