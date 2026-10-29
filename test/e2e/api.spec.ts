import { test, expect } from '@playwright/test';

test('salud responde ok con version y commit', async ({ page }) => {
  const r = await page.request.get('/salud');
  expect(r.status()).toBe(200);
  const cuerpo = await r.json();
  expect(cuerpo.ok).toBe(true);
  expect(typeof cuerpo.version).toBe('string');
  expect(typeof cuerpo.commit).toBe('string');
});

test('version coincide con salud', async ({ page }) => {
  const salud = await (await page.request.get('/salud')).json();
  const version = await (await page.request.get('/version')).json();
  expect(version).toEqual({ version: salud.version, commit: salud.commit });
});

test('las respuestas son JSON', async ({ page }) => {
  const r = await page.request.get('/saldo/ana');
  expect(r.headers()['content-type']).toContain('application/json');
});

test('el navegador muestra el saldo de un usuario semilla', async ({ page }) => {
  await page.goto('/saldo/carla');
  const cuerpo = JSON.parse(await page.locator('body').innerText());
  expect(cuerpo.usuario).toBe('carla');
  expect(typeof cuerpo.saldo).toBe('number');
});

test('una transferencia pasa por la URL publica', async ({ page }) => {
  const r = await page.request.post('/transferir', {
    data: { origen: 'elena', destino: 'ana', monto: 0.01 },
  });
  expect(r.status()).toBe(200);
  const cuerpo = await r.json();
  expect(cuerpo).toMatchObject({ origen: 'elena', destino: 'ana', monto: 0.01 });
  expect(typeof cuerpo.id).toBe('number');
});