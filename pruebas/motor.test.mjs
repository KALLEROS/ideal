// Prueba el motor de la app (web/motor.js) con los casos compartidos y con algunos propios.
// Uso: node --test pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const Motor = createRequire(import.meta.url)(join(aqui, '..', 'web', 'motor.js'));
const datos = JSON.parse(readFileSync(join(aqui, 'casos.json'), 'utf8'));
const copia = (x) => JSON.parse(JSON.stringify(x));

test('claveDia: antes de la hora de reinicio cuenta como el día anterior', () => {
  for (const c of datos.claves) {
    const momento = new Date(c.y, c.m - 1, c.d, c.h, 30);
    assert.equal(Motor.claveDia(momento, c.reinicio), c.espera, JSON.stringify(c));
  }
});

for (const caso of datos.casos) {
  test(caso.nombre, () => {
    const estado = { config: copia(datos.configs[caso.config]), hoy: copia(caso.hoy), historial: copia(caso.historial) };
    for (const p of caso.pasos) {
      if (p.op === 'dia') assert.equal(Motor.ponerAlDia(estado, p.dia), p.cambia, 'dia ' + p.dia);
      else if (p.op === 'tocar') assert.equal(Motor.tocar(estado, p.id), p.cambia, 'tocar ' + p.id);
      else if (p.op === 'deshacer') assert.equal(Motor.deshacer(estado), p.da, 'deshacer');
      else assert.fail('Paso desconocido: ' + p.op);
    }
    assert.deepEqual(estado.hoy, caso.espera.hoy);
    assert.deepEqual(estado.historial, caso.espera.historial);
    const hoy = Motor.fotoDeHoy(estado);
    assert.equal(Motor.puntaje(hoy), caso.espera.puntaje);
    assert.equal(Motor.redondo(hoy), caso.espera.redondo);
  });
}

// ---------- Solo de la app (el widget no las usa) ----------
const base = () => ({
  config: copia(datos.configs.base),
  hoy: { dia: '2026-11-10', cuentas: { agua: 3, perro: 1 }, toques: ['agua', 'perro', 'agua', 'agua'] },
  historial: {}
});

test('quitarUno baja la cuenta y olvida el último toque de ese círculo', () => {
  const e = base();
  assert.equal(Motor.quitarUno(e, 'agua'), true);
  assert.deepEqual(e.hoy, { dia: '2026-11-10', cuentas: { agua: 2, perro: 1 }, toques: ['agua', 'perro', 'agua'] });
  assert.equal(Motor.quitarUno(e, 'cigarro'), false);
});

test('reiniciarCirculo deja el círculo en ceros sin tocar los demás', () => {
  const e = base();
  assert.equal(Motor.reiniciarCirculo(e, 'agua'), true);
  assert.deepEqual(e.hoy, { dia: '2026-11-10', cuentas: { perro: 1 }, toques: ['perro'] });
  assert.equal(Motor.reiniciarCirculo(e, 'agua'), false);
});

test('limpiarHoy quita lo de círculos borrados', () => {
  const e = base();
  e.config.habitos = e.config.habitos.filter((h) => h.id !== 'perro');
  Motor.limpiarHoy(e);
  assert.deepEqual(e.hoy, { dia: '2026-11-10', cuentas: { agua: 3 }, toques: ['agua', 'agua', 'agua'] });
});

test('valor: cuánto se pinta el círculo', () => {
  assert.equal(Motor.valor('meta', 8, 2), 0.25);
  assert.equal(Motor.valor('meta', 8, 12), 1);
  assert.equal(Motor.valor('limite', 4, 1), 0.25);
  assert.equal(Motor.valor('limite', 4, 9), 1);
  assert.equal(Motor.valor('limite', 0, 0), 0);
  assert.equal(Motor.valor('limite', 0, 1), 1);
});

test('siguienteReinicio: la próxima vez que da la hora de reinicio', () => {
  const antes = Motor.siguienteReinicio(new Date(2026, 10, 10, 2, 15), 4);
  assert.deepEqual([antes.getDate(), antes.getHours(), antes.getMinutes()], [10, 4, 0]);
  const despues = Motor.siguienteReinicio(new Date(2026, 10, 10, 4, 0), 4);
  assert.deepEqual([despues.getDate(), despues.getHours()], [11, 4]);
  const finDeMes = Motor.siguienteReinicio(new Date(2026, 10, 30, 22, 0), 0);
  assert.deepEqual([finDeMes.getMonth(), finDeMes.getDate(), finDeMes.getHours()], [11, 1, 0]);
});
