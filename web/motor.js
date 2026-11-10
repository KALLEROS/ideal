// El motor de Ideal: las reglas de los círculos, sin pantalla ni almacenamiento.
// Las mismas reglas están escritas en Swift (widget del iPhone) y en Kotlin (widget de Android).
// pruebas/casos.json comprueba que las tres versiones den exactamente el mismo resultado.
(function (raiz) {
  'use strict';

  var MAX_PASOS = 20;    // pasos máximos de un círculo
  var MAX_CUENTA = 99;   // hasta dónde cuenta un límite
  var MAX_TOQUES = 400;  // toques del día que se recuerdan para poder deshacer
  var MAX_HUECO = 400;   // días sin abrir la app que se rellenan en el registro

  // ---------- Fechas ----------
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function claveDe(f) { return f.getFullYear() + '-' + dos(f.getMonth() + 1) + '-' + dos(f.getDate()); }
  function fechaDe(clave) { var p = clave.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // Día al que pertenece un momento. Antes de la hora de reinicio todavía cuenta como el día anterior.
  function claveDia(momento, horaReinicio) {
    var f = new Date(momento.getFullYear(), momento.getMonth(), momento.getDate());
    if (momento.getHours() < horaReinicio) f.setDate(f.getDate() - 1);
    return claveDe(f);
  }
  function sumarDias(clave, n) { var f = fechaDe(clave); f.setDate(f.getDate() + n); return claveDe(f); }
  function siguienteReinicio(momento, horaReinicio) {
    var f = new Date(momento.getFullYear(), momento.getMonth(), momento.getDate(), horaReinicio, 0, 0, 0);
    if (f <= momento) f.setDate(f.getDate() + 1);
    return f;
  }

  // ---------- Cuentas ----------
  function cuentaEn(cuentas, id) {
    var c = cuentas ? cuentas[id] : 0;
    return (typeof c === 'number' && c > 0) ? Math.min(Math.floor(c), MAX_CUENTA) : 0;
  }
  function buscar(estado, id) {
    var hs = estado.config.habitos;
    for (var i = 0; i < hs.length; i++) if (hs[i].id === id) return hs[i];
    return null;
  }
  function poner(estado, id, c) {
    if (c > 0) estado.hoy.cuentas[id] = c; else delete estado.hoy.cuentas[id];
  }

  // Cuánto del círculo se pinta (0 a 1).
  function valor(tipo, pasos, c) {
    if (tipo === 'limite') return pasos <= 0 ? (c > 0 ? 1 : 0) : Math.min(c / pasos, 1);
    return pasos <= 0 ? 0 : Math.min(c, pasos) / pasos;
  }
  // Cuánto cuenta para el día (0 a 1). Una meta vale lo que llevas; un límite vale completo mientras no lo pases.
  function cumplimiento(tipo, pasos, c) {
    if (tipo === 'limite') return c <= pasos ? 1 : pasos / c;
    return pasos <= 0 ? 0 : Math.min(c, pasos) / pasos;
  }
  function excedido(tipo, pasos, c) { return tipo === 'limite' && c > pasos; }

  // Porcentaje del día (entero) a partir de una lista de {t, p, c}. Sin círculos no hay porcentaje.
  function puntaje(items) {
    if (!items || !items.length) return null;
    var s = 0;
    for (var i = 0; i < items.length; i++) s += cumplimiento(items[i].t, items[i].p, items[i].c);
    return Math.floor(s / items.length * 100 + 0.5);
  }
  // Día redondo: todo cumplido.
  function redondo(items) {
    if (!items || !items.length) return false;
    for (var i = 0; i < items.length; i++) if (cumplimiento(items[i].t, items[i].p, items[i].c) < 1) return false;
    return true;
  }

  // ---------- El día ----------
  function hoyNuevo(dia) { return { dia: dia, cuentas: {}, toques: [] }; }

  // Foto de los círculos con sus cuentas: es lo que se guarda en el registro, para que
  // cambiar o borrar un círculo después no altere los días ya pasados.
  function foto(estado, cuentas) {
    return estado.config.habitos.map(function (h) {
      return { id: h.id, e: h.emoji, n: h.nombre, p: h.pasos, c: cuentaEn(cuentas, h.id), t: h.tipo };
    });
  }
  function fotoDeHoy(estado) { return foto(estado, estado.hoy ? estado.hoy.cuentas : null); }

  // Si ya cambió el día: guarda el anterior en el registro y deja el de hoy en ceros.
  // Los días en que no se abrió la app quedan guardados en ceros. Devuelve true si cambió algo.
  function ponerAlDia(estado, diaActual) {
    var hoy = estado.hoy;
    if (!hoy || !hoy.dia) { estado.hoy = hoyNuevo(diaActual); return true; }
    if (diaActual <= hoy.dia) return false;
    if (estado.config.habitos.length) {
      estado.historial[hoy.dia] = { h: foto(estado, hoy.cuentas) };
      var d = sumarDias(hoy.dia, 1), n = 0;
      while (d < diaActual && n < MAX_HUECO) {
        estado.historial[d] = { h: foto(estado, null) };
        d = sumarDias(d, 1); n++;
      }
    }
    estado.hoy = hoyNuevo(diaActual);
    return true;
  }

  // ---------- Toques ----------
  // Un toque avanza un paso. Una meta ya completa no avanza más; un límite sigue contando.
  function tocar(estado, id) {
    var h = buscar(estado, id);
    if (!h) return false;
    var c = cuentaEn(estado.hoy.cuentas, id);
    var tope = h.tipo === 'limite' ? MAX_CUENTA : h.pasos;
    if (c >= tope) return false;
    poner(estado, id, c + 1);
    var t = estado.hoy.toques;
    t.push(id);
    if (t.length > MAX_TOQUES) t.splice(0, t.length - MAX_TOQUES);
    return true;
  }
  // Deshace el último toque del día. Devuelve el id del círculo o null si no había nada que deshacer.
  function deshacer(estado) {
    var t = estado.hoy.toques;
    while (t.length) {
      var id = t.pop();
      var c = cuentaEn(estado.hoy.cuentas, id);
      if (c > 0 && buscar(estado, id)) { poner(estado, id, c - 1); return id; }
    }
    return null;
  }
  function quitarUno(estado, id) {
    var c = cuentaEn(estado.hoy.cuentas, id);
    if (c <= 0) return false;
    poner(estado, id, c - 1);
    var i = estado.hoy.toques.lastIndexOf(id);
    if (i >= 0) estado.hoy.toques.splice(i, 1);
    return true;
  }
  function reiniciarCirculo(estado, id) {
    if (cuentaEn(estado.hoy.cuentas, id) <= 0) return false;
    poner(estado, id, 0);
    estado.hoy.toques = estado.hoy.toques.filter(function (x) { return x !== id; });
    return true;
  }
  // Quita de hoy lo que ya no corresponde a ningún círculo (por ejemplo, al borrar uno).
  function limpiarHoy(estado) {
    var vivos = {};
    estado.config.habitos.forEach(function (h) { vivos[h.id] = true; });
    Object.keys(estado.hoy.cuentas).forEach(function (id) { if (!vivos[id]) delete estado.hoy.cuentas[id]; });
    estado.hoy.toques = estado.hoy.toques.filter(function (id) { return vivos[id]; });
  }

  var Motor = {
    MAX_PASOS: MAX_PASOS, MAX_CUENTA: MAX_CUENTA,
    claveDe: claveDe, fechaDe: fechaDe, claveDia: claveDia, sumarDias: sumarDias, siguienteReinicio: siguienteReinicio,
    cuentaEn: cuentaEn, buscar: buscar, valor: valor, cumplimiento: cumplimiento, excedido: excedido,
    puntaje: puntaje, redondo: redondo, hoyNuevo: hoyNuevo, foto: foto, fotoDeHoy: fotoDeHoy,
    ponerAlDia: ponerAlDia, tocar: tocar, deshacer: deshacer, quitarUno: quitarUno,
    reiniciarCirculo: reiniciarCirculo, limpiarHoy: limpiarHoy
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Motor;
  else raiz.IdealMotor = Motor;
})(typeof self !== 'undefined' ? self : this);
