// Las pantallas de Ideal: Hoy, Registro, Círculos y Ajustes.
// Las reglas están en motor.js y el guardado en datos.js; aquí solo se dibuja y se responde a los toques.
(function () {
  'use strict';

  var M = window.IdealMotor, C = window.IdealCatalogo, D = window.IdealDatos;
  var vista = document.getElementById('vista');
  var capas = document.getElementById('capas');
  var pestanas = document.getElementById('pestanas');
  var REPO = 'https://github.com/KALLEROS/ideal';
  var VERSION = '1.0';
  var MAX_CIRCULOS = 20;

  var estado = { config: null, hoy: null, historial: {} };
  var ui = { pestana: 'hoy', mes: null, eleccion: null };

  var I = {
    flecha: '<svg class="flecha" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5l6 6-6 6"/></svg>',
    atras: '<svg viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 1.5l-6 6 6 6"/></svg>',
    adelante: '<svg viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5l6 6-6 6"/></svg>',
    cerrar: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9"/></svg>',
    deshacer: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h8a4.5 4.5 0 0 1 0 9H7"/><path d="M6.5 3.5L3 7l3.5 3.5"/></svg>',
    sube: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 9l4.5-4.5L11.500 9"/></svg>',
    baja: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 5l4.5 4.5L11.5 5"/></svg>'
  };

  // ---------- Utilidades ----------
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function configNueva() { return { v: 1, habitos: [], horaReinicio: 4, tema: 'auto' }; }
  function diaActual() { return M.claveDia(new Date(), estado.config.horaReinicio); }
  function guardarHoy() { D.guardar('hoy', estado.hoy); }
  function guardarConfig() { D.guardar('config', estado.config); }
  function guardarHistorial() { D.guardar('historial', estado.historial); }
  function alDia() {
    if (!M.ponerAlDia(estado, diaActual())) return false;
    guardarHistorial(); guardarHoy();
    return true;
  }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  var fmtLargo = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  var fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
  function horaTexto(h) { return h === 0 ? '12:00 a. m.' : h < 12 ? h + ':00 a. m.' : h === 12 ? '12:00 p. m.' : (h - 12) + ':00 p. m.'; }

  var avisoReloj = null;
  function aviso(texto) {
    var viejo = document.querySelector('.aviso');
    if (viejo) viejo.remove();
    var el = document.createElement('div');
    el.className = 'aviso'; el.setAttribute('role', 'status'); el.textContent = texto;
    document.body.appendChild(el);
    clearTimeout(avisoReloj);
    avisoReloj = setTimeout(function () { el.remove(); }, 2400);
  }
  function efecto(el, clase, ms) {
    if (!el) return;
    el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, ms || 500);
  }

  // ---------- La moneda ----------
  function clasesMoneda(tipo, pasos, c) {
    var v = M.valor(tipo, pasos, c), k = '';
    if (v <= 0) k += ' vacia';
    if (v >= 1) k += ' llena';
    if (M.excedido(tipo, pasos, c)) k += ' pasada';
    return k;
  }
  function textoCuenta(tipo, pasos, c) {
    if (tipo !== 'limite') return c + ' de ' + pasos;
    if (c > pasos) return 'Llevas ' + c + ', límite ' + pasos;
    return pasos === 0 ? 'Hoy, cero' : c + ' de ' + pasos + ' máx.';
  }
  function describir(h) {
    if (h.tipo === 'limite') return h.pasos === 0 ? 'Límite: cero al día' : 'Límite: ' + h.pasos + ' al día';
    return h.pasos === 1 ? 'Una vez al día' : h.pasos + ' veces al día';
  }
  // Moneda de adorno (no se toca): para listas, registro y muestras.
  function monedaFija(emoji, color, tipo, pasos, c, extra) {
    return '<span class="moneda' + clasesMoneda(tipo, pasos, c) + (extra || '') + '" style="--c:' + esc(color) + ';--v:' + M.valor(tipo, pasos, c) +
      '" aria-hidden="true"><span class="liquido"></span><span class="emoji">' + esc(emoji) + '</span></span>';
  }
  function colorDe(id) {
    var h = M.buscar(estado, id);
    return h ? h.color : '#8E8E93';
  }

  // ---------- Hojas ----------
  // Abre un panel desde abajo. "alClic" recibe (accion, elemento, evento) de lo que tenga data-accion.
  function abrirHoja(o) {
    var velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = '<div class="hoja' + (o.alta ? ' alta' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.titulo) + '">' +
      '<div class="hoja-cabeza"><h2>' + esc(o.titulo) + '</h2><button type="button" class="cerrar" data-accion="cerrar" aria-label="Cerrar">' + I.cerrar + '</button></div>' +
      '<div class="hoja-cuerpo"></div></div>';
    var cuerpo = velo.querySelector('.hoja-cuerpo');
    var hoja = {
      el: velo, cuerpo: cuerpo, cerrada: false,
      pintar: function (html) { cuerpo.innerHTML = html; },
      cerrar: function () {
        if (hoja.cerrada) return;
        hoja.cerrada = true; velo.remove();
        if (o.alCerrar) o.alCerrar();
      }
    };
    velo.addEventListener('click', function (e) {
      if (e.target === velo) { hoja.cerrar(); return; }
      var b = e.target.closest('[data-accion]');
      if (!b || b.disabled) return;
      if (b.dataset.accion === 'cerrar') { hoja.cerrar(); return; }
      if (o.alClic) o.alClic(b.dataset.accion, b, e);
    });
    if (o.cuerpo) hoja.pintar(o.cuerpo);
    capas.appendChild(velo);
    return hoja;
  }
  // Pregunta de sí o no. Devuelve una promesa con true o false.
  function confirmar(o) {
    return new Promise(function (resolver) {
      var respuesta = false;
      var hoja = abrirHoja({
        titulo: o.titulo,
        cuerpo: (o.paso ? '<p class="paso">' + esc(o.paso) + '</p>' : '') + '<p>' + esc(o.texto) + '</p>' +
          '<button type="button" class="boton ' + (o.peligro ? 'peligro' : '') + '" data-accion="si">' + esc(o.si) + '</button>' +
          '<button type="button" class="boton suave" data-accion="no">' + esc(o.no || 'Cancelar') + '</button>',
        alClic: function (accion) { respuesta = accion === 'si'; hoja.cerrar(); },
        alCerrar: function () { resolver(respuesta); }
      });
    });
  }

  // ---------- Pestañas ----------
  function pintar() {
    document.documentElement.dataset.tema = estado.config.tema === 'claro' ? 'claro' : estado.config.tema === 'oscuro' ? 'oscuro' : '';
    if (!estado.config.tema || estado.config.tema === 'auto') delete document.documentElement.dataset.tema;
    var sinEmpezar = !estado.config.empezado;
    pestanas.hidden = sinEmpezar;
    if (sinEmpezar) { pintarBienvenida(); return; }
    Array.prototype.forEach.call(pestanas.querySelectorAll('button'), function (b) {
      if (b.dataset.pestana === ui.pestana) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (ui.pestana === 'registro') pintarRegistro();
    else if (ui.pestana === 'circulos') pintarCirculos();
    else if (ui.pestana === 'ajustes') pintarAjustes();
    else pintarHoy();
  }
  pestanas.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pestana]');
    if (!b) return;
    ui.pestana = b.dataset.pestana;
    pintar();
    window.scrollTo(0, 0);
  });

  // ---------- Primera vez ----------
  function gruposHTML(elegidos, ocultos) {
    var html = '';
    C.GRUPOS.forEach(function (g) {
      var lista = g.lista.filter(function (s) { return !ocultos || !ocultos[s.id]; });
      if (!lista.length) return;
      html += '<h2 class="titulo-grupo">' + esc(g.nombre) + '</h2>' + (g.nota ? '<p class="nota" style="margin:-4px 6px 12px">' + esc(g.nota) + '</p>' : '') + '<div class="sugerencias">';
      lista.forEach(function (s) {
        var puesta = elegidos && elegidos[s.id];
        html += '<div class="sugerencia"><button type="button" class="moneda ' + (puesta ? 'elegida llena' : 'vacia') + '" data-accion="sugerencia" data-id="' + s.id +
          '" style="--c:' + s.color + '" aria-pressed="' + (puesta ? 'true' : 'false') + '" aria-label="' + esc(s.nombre) + ', ' + esc(describir(s)) + '">' +
          '<span class="liquido"></span><span class="emoji">' + s.emoji + '</span></button><span class="rotulo">' + esc(s.nombre) + '</span>' +
          '<span class="cuenta">' + (s.tipo === 'limite' ? 'máx. ' + s.pasos : s.pasos === 1 ? '1 vez' : s.pasos + ' veces') + '</span></div>';
      });
      html += '</div>';
    });
    return html;
  }
  function sugerencia(id) {
    for (var i = 0; i < C.GRUPOS.length; i++) for (var j = 0; j < C.GRUPOS[i].lista.length; j++) {
      var s = C.GRUPOS[i].lista[j];
      if (s.id === id) return { id: s.id, emoji: s.emoji, nombre: s.nombre, pasos: s.pasos, tipo: s.tipo, color: s.color };
    }
    return null;
  }
  function pintarBienvenida() {
    if (!ui.eleccion) { ui.eleccion = {}; C.INICIALES.forEach(function (id) { ui.eleccion[id] = true; }); }
    var n = Object.keys(ui.eleccion).length;
    vista.innerHTML = '<div class="bienvenida"><h1>Arma tu día ideal</h1>' +
      '<p>Elige los círculos de tu rutina. Cada uno se llena con tus toques y cada día empieza de nuevo.</p>' +
      '<p class="nota" style="margin:0">Después puedes cambiarlos, crear los tuyos y ponerles cualquier emoji.</p></div>' +
      gruposHTML(ui.eleccion) +
      '<div class="pie-fijo"><button type="button" class="boton" data-accion="empezar"' + (n ? '' : ' disabled') + '>' +
      (n ? 'Empezar con ' + plural(n, 'círculo', 'círculos') : 'Elige al menos un círculo') + '</button></div>';
  }
  function empezar() {
    var hs = [];
    C.GRUPOS.forEach(function (g) { g.lista.forEach(function (s) { if (ui.eleccion[s.id] && hs.length < MAX_CIRCULOS) hs.push(sugerencia(s.id)); }); });
    estado.config.habitos = hs;
    estado.config.empezado = true;
    ui.eleccion = null; ui.pestana = 'hoy';
    guardarConfig(); alDia(); guardarHoy();
    D.pedirPermanencia();
    pintar(); window.scrollTo(0, 0);
  }

  // ---------- Hoy ----------
  function resumenHoy() {
    var items = M.fotoDeHoy(estado), completos = 0, pasados = 0;
    items.forEach(function (it) {
      if (it.t === 'limite') { if (it.c > it.p) pasados++; } else if (it.c >= it.p) completos++;
    });
    var metas = items.filter(function (it) { return it.t !== 'limite'; }).length;
    var texto;
    if (M.redondo(items)) texto = 'Día redondo. Todo cumplido.';
    else {
      texto = metas ? completos + ' de ' + plural(metas, 'círculo completo', 'círculos completos') : 'Vas dentro de tus límites';
      if (pasados) texto += '. ' + (pasados === 1 ? 'Pasaste un límite' : 'Pasaste ' + pasados + ' límites');
    }
    return { pct: M.puntaje(items) || 0, redondo: M.redondo(items), texto: texto };
  }
  function pintarHoy() {
    alDia();
    var hs = estado.config.habitos;
    var cabeza = '<header class="cabeza"><div><p class="fecha">' + esc(fmtLargo.format(M.fechaDe(estado.hoy.dia))) + '</p><h1>Hoy</h1><p class="resumen" id="resumen"></p></div>' +
      (hs.length ? '<div class="moneda moneda-dia" id="moneda-dia" role="img"><span class="liquido"></span><span class="numero"><span id="pct">0</span><small>%</small></span></div>' : '') + '</header>';
    if (!hs.length) {
      vista.innerHTML = cabeza + '<div class="vacio-grande"><p>Todavía no tienes círculos. Elige los de tu rutina para empezar.</p>' +
        '<button type="button" class="boton" data-accion="agregar">Elegir círculos</button></div>';
      return;
    }
    var cols = hs.length <= 4 ? 2 : hs.length <= 9 ? 3 : 4;
    var html = cabeza + '<section class="tablero" style="--cols:' + cols + '" aria-label="Tus círculos de hoy">';
    hs.forEach(function (h) {
      html += '<div class="celda"><button type="button" class="moneda" data-id="' + esc(h.id) + '" style="--c:' + esc(h.color) + '">' +
        '<span class="liquido"></span><span class="emoji">' + esc(h.emoji) + '</span><span class="insignia" hidden></span></button>' +
        '<span class="rotulo">' + esc(h.nombre) + '</span><span class="cuenta"></span></div>';
    });
    html += '</section><div class="bajo-tablero"><button type="button" class="pastilla" id="deshacer" data-accion="deshacer" hidden>' + I.deshacer + 'Deshacer</button></div>' +
      '<p class="pista">Toca un círculo para avanzar. Mantenlo presionado para corregirlo.</p>';
    vista.innerHTML = html;
    refrescarHoy();
  }
  function monedaDe(id) {
    var todas = vista.querySelectorAll('.tablero .moneda');
    for (var i = 0; i < todas.length; i++) if (todas[i].dataset.id === id) return todas[i];
    return null;
  }
  // Actualiza las monedas ya dibujadas sin volver a crearlas, para que el líquido suba con animación.
  function refrescarHoy() {
    estado.config.habitos.forEach(function (h) {
      var el = monedaDe(h.id);
      if (!el) return;
      var c = M.cuentaEn(estado.hoy.cuentas, h.id);
      var pasada = M.excedido(h.tipo, h.pasos, c), v = M.valor(h.tipo, h.pasos, c);
      el.style.setProperty('--v', v);
      el.classList.toggle('vacia', v <= 0); el.classList.toggle('llena', v >= 1); el.classList.toggle('pasada', pasada);
      el.setAttribute('aria-label', h.nombre + ': ' + textoCuenta(h.tipo, h.pasos, c));
      var insignia = el.querySelector('.insignia');
      insignia.hidden = !pasada; insignia.textContent = c;
      var cuenta = el.parentNode.querySelector('.cuenta');
      cuenta.textContent = textoCuenta(h.tipo, h.pasos, c);
      cuenta.classList.toggle('mal', pasada);
    });
    var r = resumenHoy();
    var md = document.getElementById('moneda-dia');
    if (md) {
      md.style.setProperty('--v', r.pct / 100);
      md.classList.toggle('oro', r.redondo); md.classList.toggle('vacia', r.pct <= 0); md.classList.toggle('llena', r.pct >= 100);
      md.setAttribute('aria-label', 'Llevas el ' + r.pct + '% de tu día');
      document.getElementById('pct').textContent = r.pct;
    }
    var res = document.getElementById('resumen');
    if (res) { res.textContent = r.texto; res.classList.toggle('oro', r.redondo); }
    var des = document.getElementById('deshacer');
    if (des) des.hidden = !estado.hoy.toques.length;
  }
  function alTocar(id) {
    if (alDia()) pintarHoy();
    var h = M.buscar(estado, id);
    if (!h) return;
    var eraRedondo = M.redondo(M.fotoDeHoy(estado));
    var el = monedaDe(id);
    if (!M.tocar(estado, id)) { efecto(el, 'tope', 320); D.vibrar('tope'); return; }
    guardarHoy();
    var c = M.cuentaEn(estado.hoy.cuentas, id);
    var completa = h.tipo !== 'limite' && c >= h.pasos;
    var redondo = M.redondo(M.fotoDeHoy(estado));
    refrescarHoy();
    efecto(el, 'pum', 460); efecto(el, 'ondea', 1900);
    if (completa) efecto(el, 'destello', 850);
    D.vibrar(completa || (redondo && !eraRedondo) ? 'exito' : M.excedido(h.tipo, h.pasos, c) ? 'tope' : 'ligero');
    if (redondo && !eraRedondo) { efecto(document.getElementById('moneda-dia'), 'destello', 850); aviso('Día redondo. Todo cumplido.'); }
  }
  function alDeshacer() {
    var id = M.deshacer(estado);
    guardarHoy(); refrescarHoy();
    if (id) { efecto(monedaDe(id), 'ondea', 1900); D.vibrar('ligero'); }
  }
  function abrirAcciones(id) {
    var h = M.buscar(estado, id);
    if (!h) return;
    var c = M.cuentaEn(estado.hoy.cuentas, id);
    var hoja = abrirHoja({
      titulo: h.emoji + ' ' + h.nombre,
      cuerpo: '<p>' + esc(c ? 'Hoy: ' + textoCuenta(h.tipo, h.pasos, c).toLowerCase() + '.' : 'Hoy todavía no lo tocas.') + '</p>' +
        '<button type="button" class="boton suave" data-accion="menos"' + (c ? '' : ' disabled') + '>Quitar un toque</button>' +
        '<button type="button" class="boton suave" data-accion="cero"' + (c ? '' : ' disabled') + '>Dejarlo en ceros</button>' +
        '<button type="button" class="boton suave" data-accion="editar">Editar círculo</button>',
      alClic: function (accion) {
        hoja.cerrar();
        if (accion === 'editar') { abrirEditor(h); return; }
        if (accion === 'menos') M.quitarUno(estado, id); else M.reiniciarCirculo(estado, id);
        guardarHoy(); refrescarHoy(); efecto(monedaDe(id), 'ondea', 1900);
      }
    });
  }

  // Tocar y mantener presionado en el tablero.
  var presion = null, saltarClic = false;
  function soltar() { if (presion) { clearTimeout(presion.reloj); presion = null; } }
  vista.addEventListener('pointerdown', function (e) {
    var m = e.target.closest('.tablero .moneda');
    saltarClic = false; soltar();
    if (!m) return;
    presion = { x: e.clientX, y: e.clientY, reloj: setTimeout(function () {
      presion = null; saltarClic = true; D.vibrar('ligero'); abrirAcciones(m.dataset.id);
    }, 480) };
  });
  vista.addEventListener('pointermove', function (e) {
    if (presion && (Math.abs(e.clientX - presion.x) > 10 || Math.abs(e.clientY - presion.y) > 10)) soltar();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { vista.addEventListener(t, soltar); });
  vista.addEventListener('contextmenu', function (e) {
    var m = e.target.closest('.tablero .moneda');
    if (!m) return;
    e.preventDefault();
    if (!saltarClic) { soltar(); abrirAcciones(m.dataset.id); }
  });

  vista.addEventListener('click', function (e) {
    if (saltarClic) { saltarClic = false; return; }
    var m = e.target.closest('.tablero .moneda');
    if (m) { alTocar(m.dataset.id); return; }
    var b = e.target.closest('[data-accion]');
    if (!b || b.disabled) return;
    var a = b.dataset.accion, id = b.dataset.id;
    if (a === 'deshacer') alDeshacer();
    else if (a === 'sugerencia') { if (ui.eleccion[id]) delete ui.eleccion[id]; else ui.eleccion[id] = true; var y = window.scrollY; pintarBienvenida(); window.scrollTo(0, y); }
    else if (a === 'empezar') empezar();
    else if (a === 'agregar') abrirAgregar();
    else if (a === 'editar') abrirEditor(M.buscar(estado, id));
    else if (a === 'subir' || a === 'bajar') mover(id, a === 'subir' ? -1 : 1);
    else if (a === 'mes-antes' || a === 'mes-despues') { cambiarMes(a === 'mes-antes' ? -1 : 1); }
    else if (a === 'dia') abrirDia(b.dataset.dia);
    else if (a === 'widget') abrirWidget();
    else if (a === 'instalar') abrirInstalar();
    else if (a === 'respaldar') respaldar();
    else if (a === 'restaurar') restaurar();
    else if (a === 'borrar') borrarTodo();
  });
  vista.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'hora') {
      estado.config.horaReinicio = +t.value; guardarConfig(); alDia(); pintar();
      aviso('El día se reinicia a las ' + horaTexto(estado.config.horaReinicio));
    } else if (t.id === 'tema') { estado.config.tema = t.value; guardarConfig(); pintar(); }
  });

  // ---------- Registro ----------
  function itemsDe(dia) {
    if (dia === estado.hoy.dia) return M.fotoDeHoy(estado);
    return estado.historial[dia] ? estado.historial[dia].h : null;
  }
  function cuentasRegistro() {
    var dias = Object.keys(estado.historial).sort();
    var mejor = 0, racha = 0, previo = null, redondos = 0;
    dias.forEach(function (d) {
      var r = M.redondo(estado.historial[d].h);
      if (r) { redondos++; racha = (previo && M.sumarDias(previo, 1) === d) ? racha + 1 : 1; } else racha = 0;
      if (racha > mejor) mejor = racha;
      previo = d;
    });
    var seguida = (previo && M.sumarDias(previo, 1) === estado.hoy.dia) ? racha : 0;
    if (M.redondo(M.fotoDeHoy(estado))) seguida++;
    if (seguida > mejor) mejor = seguida;
    var ultimos = dias.slice(-30), suma = 0, n = 0, redondos30 = 0;
    ultimos.forEach(function (d) {
      var p = M.puntaje(estado.historial[d].h);
      if (p !== null) { suma += p; n++; }
      if (M.redondo(estado.historial[d].h)) redondos30++;
    });
    return { dias: dias, racha: seguida, mejor: mejor, redondos: redondos, promedio: n ? Math.round(suma / n) : null, n: n, redondos30: redondos30 };
  }
  function cambiarMes(delta) {
    var f = new Date(ui.mes.y, ui.mes.m + delta, 1);
    ui.mes = { y: f.getFullYear(), m: f.getMonth() };
    pintarRegistro();
  }
  function pintarRegistro() {
    alDia();
    var r = cuentasRegistro();
    var hoyF = M.fechaDe(estado.hoy.dia);
    if (!ui.mes) ui.mes = { y: hoyF.getFullYear(), m: hoyF.getMonth() };
    var html = '<header class="cabeza"><div><h1>Registro</h1></div></header><section class="frase">';
    if (!r.dias.length) {
      html += '<p class="grande">Tu registro empieza hoy.</p><p class="chica">Mañana vas a ver aquí cómo te fue. Un día en el que cumples todo es un día redondo y se pinta de oro.</p>';
    } else {
      html += '<p class="grande">' + (r.racha > 1 ? 'Llevas <b>' + r.racha + '</b> días redondos seguidos.' :
        r.racha === 1 ? 'Llevas <b>1</b> día redondo. Mañana puede ser el segundo.' : 'Cumple todo hoy y empieza una racha de días redondos.') + '</p>' +
        '<p class="chica">' + (r.mejor ? 'Tu mejor racha: <b>' + plural(r.mejor, 'día', 'días') + '</b>. ' : '') +
        (r.promedio !== null ? 'En ' + (r.n === 1 ? 'el último día' : 'los últimos ' + r.n + ' días') + ' cumpliste en promedio el <b>' + r.promedio + '%</b> y tuviste <b>' +
          plural(r.redondos30, 'día redondo', 'días redondos') + '</b>.' : '') + '</p>';
    }
    html += '</section>';

    // Calendario del mes: cada día es una moneda que muestra cuánto se cumplió.
    var primero = r.dias.length ? M.fechaDe(r.dias[0]) : hoyF;
    var hayAntes = new Date(ui.mes.y, ui.mes.m, 1) > new Date(primero.getFullYear(), primero.getMonth(), 1);
    var hayDespues = new Date(ui.mes.y, ui.mes.m, 1) < new Date(hoyF.getFullYear(), hoyF.getMonth(), 1);
    html += '<section class="tarjeta"><div class="mes"><h2>' + esc(fmtMes.format(new Date(ui.mes.y, ui.mes.m, 1))) + '</h2><div>' +
      '<button type="button" data-accion="mes-antes" aria-label="Mes anterior"' + (hayAntes ? '' : ' disabled') + '>' + I.atras + '</button>' +
      '<button type="button" data-accion="mes-despues" aria-label="Mes siguiente"' + (hayDespues ? '' : ' disabled') + '>' + I.adelante + '</button></div></div>' +
      '<div class="semana" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="dias">';
    var hueco = (new Date(ui.mes.y, ui.mes.m, 1).getDay() + 6) % 7;
    for (var i = 0; i < hueco; i++) html += '<span></span>';
    var total = new Date(ui.mes.y, ui.mes.m + 1, 0).getDate();
    for (var d = 1; d <= total; d++) {
      var clave = M.claveDe(new Date(ui.mes.y, ui.mes.m, d));
      var items = itemsDe(clave), esHoy = clave === estado.hoy.dia;
      if (!items || !items.length) { html += '<span class="moneda dia sin' + (esHoy ? ' hoy' : '') + '">' + d + '</span>'; continue; }
      var pct = M.puntaje(items), red = M.redondo(items);
      html += '<button type="button" class="moneda dia' + (red ? ' redondo llena' : pct <= 0 ? ' vacia' : '') + (esHoy ? ' hoy' : '') + '" style="--v:' + (pct / 100) +
        '" data-accion="dia" data-dia="' + clave + '" aria-label="' + esc(fmtLargo.format(M.fechaDe(clave))) + ': ' + pct + '%"><span class="liquido"></span>' + d + '</button>';
    }
    html += '</div><div class="leyenda"><span><i class="oro"></i>Día redondo</span><span><i></i>Día a medias</span></div></section>';

    // Cómo va cada círculo en los últimos 30 días guardados.
    var ultimos = r.dias.slice(-30), filas = '';
    estado.config.habitos.forEach(function (h) {
      var suma = 0, n = 0;
      ultimos.forEach(function (dia) {
        estado.historial[dia].h.forEach(function (it) { if (it.id === h.id) { suma += M.cumplimiento(it.t, it.p, it.c); n++; } });
      });
      if (!n) return;
      var p = Math.round(suma / n * 100);
      filas += '<div class="fila">' + monedaFija(h.emoji, h.color, 'meta', 100, p) + '<div class="texto"><b>' + esc(h.nombre) + '</b>' +
        '<div class="barra" style="--c:' + esc(h.color) + '"><i style="width:' + p + '%"></i></div></div><span class="valor">' + p + '%</span></div>';
    });
    if (filas) html += '<section class="tarjeta por-circulo"><h2>Por círculo</h2><p class="nota" style="margin:4px 0 6px">Cuánto cumpliste de cada uno en ' +
      (ultimos.length === 1 ? 'el último día' : 'los últimos ' + ultimos.length + ' días') + '.</p>' + filas + '</section>';
    vista.innerHTML = html;
  }
  function abrirDia(dia) {
    var items = itemsDe(dia);
    if (!items) return;
    var pct = M.puntaje(items), red = M.redondo(items);
    var filas = items.map(function (it) {
      var mal = M.excedido(it.t, it.p, it.c);
      return '<div class="fila">' + monedaFija(it.e, colorDe(it.id), it.t, it.p, it.c) + '<div class="texto"><b>' + esc(it.n) + '</b><span' + (mal ? ' style="color:var(--alerta)"' : '') + '>' +
        esc(textoCuenta(it.t, it.p, it.c)) + '</span></div></div>';
    }).join('');
    abrirHoja({
      titulo: fmtLargo.format(M.fechaDe(dia)).replace(/^./, function (c) { return c.toUpperCase(); }),
      cuerpo: '<p>' + (red ? 'Día redondo: cumpliste todo.' : (dia === estado.hoy.dia ? 'Llevas el ' : 'Cumpliste el ') + pct + '% de tu día.') + '</p><div class="lista">' + filas + '</div>'
    });
  }

  // ---------- Círculos ----------
  function pintarCirculos() {
    var hs = estado.config.habitos;
    var html = '<header class="cabeza"><div><h1>Círculos</h1><p class="resumen">' +
      (hs.length ? 'Tienes ' + plural(hs.length, 'círculo', 'círculos') + '. El orden de aquí es el del widget.' : 'Aquí eliges qué quieres cumplir cada día.') + '</p></div></header>';
    if (hs.length) {
      html += '<div class="lista">';
      hs.forEach(function (h, i) {
        html += '<div class="fila"><button type="button" class="fila" style="padding:0;min-height:0;flex:1;min-width:0" data-accion="editar" data-id="' + esc(h.id) + '">' +
          monedaFija(h.emoji, h.color, 'meta', 1, 1) + '<div class="texto"><b>' + esc(h.nombre) + '</b><span>' + esc(describir(h)) + '</span></div></button>' +
          '<div class="mover"><button type="button" data-accion="subir" data-id="' + esc(h.id) + '" aria-label="Subir ' + esc(h.nombre) + '"' + (i === 0 ? ' disabled' : '') + '>' + I.sube + '</button>' +
          '<button type="button" data-accion="bajar" data-id="' + esc(h.id) + '" aria-label="Bajar ' + esc(h.nombre) + '"' + (i === hs.length - 1 ? ' disabled' : '') + '>' + I.baja + '</button></div></div>';
      });
      html += '</div>';
    }
    html += '<div style="margin-top:16px">' + (hs.length >= MAX_CIRCULOS
      ? '<p class="nota">Llegaste a ' + MAX_CIRCULOS + ' círculos, que son los que caben en el widget. Elimina uno para agregar otro.</p>'
      : '<button type="button" class="boton" data-accion="agregar">Agregar círculo</button>') + '</div>';
    vista.innerHTML = html;
  }
  function mover(id, delta) {
    var hs = estado.config.habitos, i = hs.indexOf(M.buscar(estado, id)), j = i + delta;
    if (i < 0 || j < 0 || j >= hs.length) return;
    var t = hs[i]; hs[i] = hs[j]; hs[j] = t;
    guardarConfig(); pintarCirculos();
  }
  function abrirAgregar() {
    function cuerpo() {
      var ya = {};
      estado.config.habitos.forEach(function (h) { ya[h.id] = true; });
      var lleno = estado.config.habitos.length >= MAX_CIRCULOS;
      return '<button type="button" class="boton" data-accion="propio"' + (lleno ? ' disabled' : '') + '>Crear uno propio</button>' +
        (lleno ? '<p class="nota">Ya tienes ' + MAX_CIRCULOS + ' círculos.</p>' : gruposHTML(null, ya));
    }
    var hoja = abrirHoja({
      titulo: 'Agregar círculo', alta: true, cuerpo: cuerpo(),
      alClic: function (accion, b) {
        if (accion === 'propio') { hoja.cerrar(); abrirEditor(null); return; }
        if (accion !== 'sugerencia' || estado.config.habitos.length >= MAX_CIRCULOS) return;
        var s = sugerencia(b.dataset.id);
        estado.config.habitos.push(s);
        guardarConfig(); pintar();
        var y = hoja.cuerpo.scrollTop;
        hoja.pintar(cuerpo()); hoja.cuerpo.scrollTop = y;
        aviso(s.emoji + ' ' + s.nombre + ' agregado');
      }
    });
  }
  function abrirEditor(original) {
    var nuevo = !original;
    var b = original ? JSON.parse(JSON.stringify(original)) : { id: null, emoji: '⭐', nombre: '', pasos: 1, tipo: 'meta', color: C.COLORES[0].hex };
    function cuerpo() {
      var min = b.tipo === 'limite' ? 0 : 1;
      return '<div class="muestra"><button type="button" class="moneda" data-accion="emoji" style="--c:' + esc(b.color) + ';--v:.62" aria-label="Cambiar emoji">' +
        '<span class="liquido"></span><span class="emoji">' + esc(b.emoji) + '</span></button><span>Toca el círculo para cambiar el emoji</span></div>' +
        '<label class="campo"><span>Nombre</span><input type="text" id="nombre" maxlength="24" autocomplete="off" placeholder="Por ejemplo: Agua" value="' + esc(b.nombre) + '"></label>' +
        '<div class="bloque"><span class="etiqueta">Cómo cuenta</span><div class="dos">' +
        '<button type="button" data-accion="tipo" data-tipo="meta" aria-pressed="' + (b.tipo !== 'limite') + '">Meta</button>' +
        '<button type="button" data-accion="tipo" data-tipo="limite" aria-pressed="' + (b.tipo === 'limite') + '">Límite</button></div>' +
        '<p class="nota">' + (b.tipo === 'limite' ? 'Algo que quieres hacer menos. Cada toque suma uno y el día cuenta como cumplido mientras no pases el límite.'
          : 'Algo que quieres cumplir. Cada toque llena una parte del círculo hasta completarlo.') + '</p></div>' +
        '<div class="bloque"><span class="etiqueta">' + (b.tipo === 'limite' ? 'Máximo al día' : 'Veces al día') + '</span><div class="contador">' +
        '<button type="button" data-accion="menos" aria-label="Menos"' + (b.pasos <= min ? ' disabled' : '') + '>−</button><output>' + b.pasos + '</output>' +
        '<button type="button" data-accion="mas" aria-label="Más"' + (b.pasos >= M.MAX_PASOS ? ' disabled' : '') + '>+</button></div></div>' +
        '<div class="bloque"><span class="etiqueta">Color</span><div class="colores">' + C.COLORES.map(function (c) {
          return '<button type="button" data-accion="color" data-hex="' + c.hex + '" style="--c:' + c.hex + '" aria-label="' + c.nombre + '" aria-pressed="' + (c.hex === b.color) + '"></button>';
        }).join('') + '</div></div>' +
        '<button type="button" class="boton" data-accion="guardar">' + (nuevo ? 'Agregar círculo' : 'Guardar cambios') + '</button>' +
        (nuevo ? '' : '<button type="button" class="boton texto-peligro" data-accion="eliminar">Eliminar círculo</button>');
    }
    function repintar() {
      var campo = hoja.cuerpo.querySelector('#nombre');
      if (campo) b.nombre = campo.value;
      var y = hoja.cuerpo.scrollTop;
      hoja.pintar(cuerpo()); hoja.cuerpo.scrollTop = y;
    }
    var hoja = abrirHoja({
      titulo: nuevo ? 'Círculo nuevo' : 'Editar círculo', alta: true, cuerpo: cuerpo(),
      alClic: function (accion, el) {
        if (accion === 'emoji') { abrirGaleria(function (e) { b.emoji = e.emoji; if (!hoja.cuerpo.querySelector('#nombre').value.trim()) hoja.cuerpo.querySelector('#nombre').value = e.nombre; repintar(); }); return; }
        if (accion === 'tipo') { b.tipo = el.dataset.tipo; if (b.tipo !== 'limite' && b.pasos < 1) b.pasos = 1; repintar(); return; }
        if (accion === 'menos') { b.pasos--; repintar(); return; }
        if (accion === 'mas') { b.pasos++; repintar(); return; }
        if (accion === 'color') { b.color = el.dataset.hex; repintar(); return; }
        if (accion === 'guardar') {
          var campo = hoja.cuerpo.querySelector('#nombre');
          b.nombre = campo.value.trim();
          if (!b.nombre) { aviso('Ponle un nombre al círculo'); campo.focus(); return; }
          if (nuevo) { b.id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); estado.config.habitos.push(b); }
          else { var hs = estado.config.habitos; hs[hs.indexOf(M.buscar(estado, b.id))] = b; }
          guardarConfig(); hoja.cerrar(); pintar();
          return;
        }
        if (accion === 'eliminar') {
          confirmar({ titulo: '¿Eliminar ' + b.nombre + '?', texto: 'Se quita de tus círculos y del widget. Lo que ya quedó en tu registro se conserva.', si: 'Eliminar círculo', no: 'Conservarlo', peligro: true })
            .then(function (si) {
              if (!si) return;
              estado.config.habitos = estado.config.habitos.filter(function (h) { return h.id !== b.id; });
              M.limpiarHoy(estado); guardarConfig(); guardarHoy(); hoja.cerrar(); pintar();
            });
        }
      }
    });
  }

  // ---------- Galería de emojis ----------
  var galeria = null;
  function cargarGaleria() {
    if (galeria) return Promise.resolve(galeria);
    return new Promise(function (resolver, rechazar) {
      var s = document.createElement('script');
      s.src = 'emojis.js';
      s.onload = function () {
        var limpio = function (t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
        var nombres = {};
        window.IDEAL_EMOJIS.forEach(function (g) { g.e.forEach(function (e) { e[3] = limpio(e[1] + ' ' + e[2]); nombres[e[0]] = e; }); });
        var rutina = C.RUTINA.map(function (em) { return nombres[em] || [em, '', '', '']; });
        galeria = { grupos: [{ n: 'Rutina', e: rutina }].concat(window.IDEAL_EMOJIS), limpio: limpio };
        resolver(galeria);
      };
      s.onerror = rechazar;
      document.head.appendChild(s);
    });
  }
  function abrirGaleria(alElegir) {
    var grupo = 0;
    var hoja = abrirHoja({
      titulo: 'Elige un emoji', alta: true, cuerpo: '<p>Cargando emojis…</p>',
      alClic: function (accion, el) {
        if (accion === 'grupo') { grupo = +el.dataset.i; hoja.cuerpo.querySelector('#buscar').value = ''; lista(); chips(); return; }
        if (accion === 'elegir') { hoja.cerrar(); alElegir({ emoji: el.dataset.e, nombre: el.title ? el.title.charAt(0).toUpperCase() + el.title.slice(1) : '' }); }
      }
    });
    function botones(es) {
      return es.map(function (e) { return '<button type="button" data-accion="elegir" data-e="' + esc(e[0]) + '" title="' + esc(e[1]) + '" aria-label="' + esc(e[1] || e[0]) + '">' + e[0] + '</button>'; }).join('');
    }
    function chips() {
      Array.prototype.forEach.call(hoja.cuerpo.querySelectorAll('.grupos-emoji button'), function (b, i) { b.setAttribute('aria-pressed', i === grupo && !hoja.cuerpo.querySelector('#buscar').value.trim()); });
    }
    function lista() {
      var q = galeria.limpio(hoja.cuerpo.querySelector('#buscar').value.trim());
      var caja = hoja.cuerpo.querySelector('.emojis'), html;
      if (q) {
        var hallados = [], vistos = {};
        galeria.grupos.forEach(function (g, i) {
          if (i === 0) return;
          g.e.forEach(function (e) { if (hallados.length < 240 && !vistos[e[0]] && e[3].indexOf(q) >= 0) { vistos[e[0]] = 1; hallados.push(e); } });
        });
        html = hallados.length ? botones(hallados) : '';
        hoja.cuerpo.querySelector('#nada').hidden = !!hallados.length;
      } else {
        html = botones(galeria.grupos[grupo].e);
        hoja.cuerpo.querySelector('#nada').hidden = true;
      }
      caja.innerHTML = html;
      chips();
    }
    cargarGaleria().then(function () {
      if (hoja.cerrada) return;
      hoja.pintar('<label class="campo" style="margin-bottom:12px"><span>Buscar</span><input type="search" id="buscar" placeholder="agua, perro, cama, correr…" autocomplete="off" autocapitalize="off"></label>' +
        '<div class="grupos-emoji">' + galeria.grupos.map(function (g, i) { return '<button type="button" data-accion="grupo" data-i="' + i + '">' + esc(g.n) + '</button>'; }).join('') + '</div>' +
        '<div class="emojis"></div><p id="nada" class="nota" hidden>No hay emojis con ese nombre. Prueba con otra palabra.</p>');
      hoja.cuerpo.querySelector('#buscar').addEventListener('input', lista);
      lista();
    }, function () { hoja.pintar('<p>No se pudo cargar la galería. Cierra y vuelve a intentar.</p>'); });
  }

  // ---------- Ajustes ----------
  function enInicio() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function pintarAjustes() {
    var c = estado.config, horas = '';
    for (var h = 0; h <= 12; h++) horas += '<option value="' + h + '"' + (h === c.horaReinicio ? ' selected' : '') + '>' + horaTexto(h) + '</option>';
    var dias = Object.keys(estado.historial).length;
    var html = '<header class="cabeza"><div><h1>Ajustes</h1></div></header>' +
      '<div class="lista"><label class="fila"><div class="texto"><b>El día se reinicia a las</b></div><select id="hora" aria-label="Hora en que se reinicia el día">' + horas + '</select></label>' +
      '<label class="fila"><div class="texto"><b>Apariencia</b></div><select id="tema" aria-label="Apariencia">' +
      [['auto', 'Como el teléfono'], ['claro', 'Clara'], ['oscuro', 'Oscura']].map(function (o) { return '<option value="' + o[0] + '"' + ((c.tema || 'auto') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label></div><p class="nota">Lo que marques antes de la hora de reinicio cuenta para el día anterior. Útil si te duermes después de medianoche.</p>' +
      '<h2 class="titulo-grupo">En tu pantalla de inicio</h2><div class="lista">' +
      '<button type="button" class="fila" data-accion="widget"><div class="texto"><b>Poner el widget</b><span>Marca tus círculos sin abrir la app</span></div>' + I.flecha + '</button>' +
      (D.plataforma === 'web' && !enInicio() ? '<button type="button" class="fila" data-accion="instalar"><div class="texto"><b>Anclar a inicio</b><span>Para abrirla como app y sin internet</span></div>' + I.flecha + '</button>' : '') +
      '</div><h2 class="titulo-grupo">Tus datos</h2><div class="lista">' +
      '<button type="button" class="fila" data-accion="respaldar"><div class="texto"><b>Guardar un respaldo</b><span>Un archivo con tus círculos y tu registro</span></div>' + I.flecha + '</button>' +
      '<button type="button" class="fila" data-accion="restaurar"><div class="texto"><b>Restaurar un respaldo</b><span>Reemplaza lo que hay en este teléfono</span></div>' + I.flecha + '</button>' +
      '</div><p class="nota">Todo vive solo en este teléfono: ' + plural(c.habitos.length, 'círculo', 'círculos') + ' y ' + plural(dias, 'día', 'días') + ' de registro. Nada se manda a internet.</p>' +
      '<div style="margin-top:22px"><button type="button" class="boton texto-peligro" data-accion="borrar">Borrar todo</button></div>' +
      '<p class="nota" style="text-align:center;margin-top:18px">Ideal ' + VERSION + '</p>';
    vista.innerHTML = html;
  }
  function abrirWidget() {
    var cuerpo;
    if (D.plataforma === 'ios') cuerpo = '<ol class="pasos-lista"><li>En tu pantalla de inicio, mantén presionado un espacio vacío hasta que los íconos tiemblen.</li><li>Toca <b>Editar</b> arriba a la izquierda y luego <b>Agregar widget</b> (en iOS 17 es el botón <b>+</b>).</li><li>Busca <b>Ideal</b> y desliza hasta el tamaño grande.</li><li>Toca <b>Agregar widget</b> y acomódalo donde quieras.</li></ol><p class="nota" style="margin:10px 0 0">Cada toque en el widget avanza un círculo sin abrir la app. Los círculos salen en el orden de la pestaña Círculos.</p>';
    else if (D.plataforma === 'android') cuerpo = '<ol class="pasos-lista"><li>En tu pantalla de inicio, mantén presionado un espacio vacío.</li><li>Toca <b>Widgets</b>.</li><li>Busca <b>Ideal</b>, mantén presionado el widget y arrástralo a tu pantalla.</li><li>Estíralo desde las orillas para hacerlo más grande.</li></ol><p class="nota" style="margin:10px 0 0">Cada toque en el widget avanza un círculo sin abrir la app.</p>';
    else cuerpo = '<p>Estás usando la versión web. El iPhone y Android solo dejan poner widgets a las apps instaladas, no a las páginas ancladas a inicio.</p><p>Para tener el widget instala la app de Ideal. Los pasos están en <a href="' + REPO + '#readme" target="_blank" rel="noopener">la página del proyecto</a>.</p><p class="nota" style="margin:0">Tus datos de esta versión web no se pasan solos a la app: guarda un respaldo aquí y restáuralo allá.</p>';
    abrirHoja({ titulo: 'Poner el widget', cuerpo: cuerpo });
  }
  function abrirInstalar() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    abrirHoja({ titulo: 'Anclar a inicio', cuerpo: ios
      ? '<ol class="pasos-lista"><li>Abre esta página en <b>Safari</b>.</li><li>Toca <b>Compartir</b> (el cuadro con una flecha hacia arriba).</li><li>Elige <b>Agregar a inicio</b>.</li></ol><p class="nota" style="margin:10px 0 0">Ya anclada, abre aunque no tengas señal.</p>'
      : '<ol class="pasos-lista"><li>Abre el menú del navegador (los tres puntos).</li><li>Elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li></ol><p class="nota" style="margin:10px 0 0">Ya anclada, abre aunque no tengas señal.</p>' });
  }
  function respaldar() {
    var texto = JSON.stringify({ ideal: 1, fecha: new Date().toISOString(), config: estado.config, hoy: estado.hoy, historial: estado.historial });
    Promise.resolve(D.entregarArchivo('ideal-respaldo-' + estado.hoy.dia + '.json', texto)).catch(function () { aviso('No se pudo guardar el respaldo'); });
  }
  function restaurar() {
    var campo = document.createElement('input');
    campo.type = 'file'; campo.accept = '.json,application/json';
    campo.addEventListener('change', function () {
      var archivo = campo.files && campo.files[0];
      if (!archivo) return;
      var lector = new FileReader();
      lector.onload = function () {
        var r = null;
        try { r = JSON.parse(lector.result); } catch (e) { r = null; }
        if (!r || r.ideal !== 1 || !r.config || !Array.isArray(r.config.habitos) || !r.hoy || typeof r.historial !== 'object') { aviso('Ese archivo no es un respaldo de Ideal'); return; }
        confirmar({ titulo: '¿Restaurar este respaldo?', texto: 'Trae ' + plural(r.config.habitos.length, 'círculo', 'círculos') + ' y ' + plural(Object.keys(r.historial).length, 'día', 'días') + ' de registro. Reemplaza todo lo que hay ahora en este teléfono.', si: 'Restaurar respaldo', peligro: true })
          .then(function (si) {
            if (!si) return;
            estado.config = r.config; estado.config.empezado = true; estado.hoy = r.hoy; estado.historial = r.historial || {};
            guardarConfig(); guardarHoy(); guardarHistorial(); alDia(); ui.mes = null; pintar();
            aviso('Respaldo restaurado');
          });
      };
      lector.readAsText(archivo);
    });
    campo.click();
  }
  // Borrar todo pide tres confirmaciones seguidas; la última hay que escribirla.
  function borrarTodo() {
    var dias = Object.keys(estado.historial).length;
    confirmar({ paso: 'Confirmación 1 de 3', titulo: '¿Borrar todo?', texto: 'Se van a borrar tus ' + plural(estado.config.habitos.length, 'círculo', 'círculos') + ', lo que llevas hoy y ' + plural(dias, 'día', 'días') + ' de registro. No hay copia en ningún otro lado.', si: 'Continuar', no: 'Cancelar', peligro: true })
      .then(function (si) {
        if (!si) return false;
        return confirmar({ paso: 'Confirmación 2 de 3', titulo: 'Esto no se puede deshacer', texto: 'Si borras, tu registro no se puede recuperar. Si solo quieres cambiar tus círculos, hazlo en la pestaña Círculos.', si: 'Sí, quiero borrar todo', no: 'No, conservar todo', peligro: true });
      })
      .then(function (si) {
        if (!si) return;
        var hoja = abrirHoja({
          titulo: 'Última confirmación',
          cuerpo: '<p class="paso">Confirmación 3 de 3</p><p>Para borrar todo, escribe la palabra BORRAR.</p>' +
            '<label class="campo"><span>Escribe BORRAR</span><input type="text" id="palabra" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>' +
            '<button type="button" class="boton peligro" data-accion="si" disabled>Borrar todo para siempre</button><button type="button" class="boton suave" data-accion="cerrar">Cancelar</button>',
          alClic: function (accion) {
            if (accion !== 'si') return;
            hoja.cerrar();
            Promise.resolve(D.borrarTodo()).then(function () {
              estado = { config: configNueva(), hoy: null, historial: {} };
              ui = { pestana: 'hoy', mes: null, eleccion: null };
              alDia(); pintar(); window.scrollTo(0, 0);
              aviso('Todo quedó borrado');
            });
          }
        });
        var campo = hoja.cuerpo.querySelector('#palabra');
        campo.addEventListener('input', function () { hoja.cuerpo.querySelector('[data-accion="si"]').disabled = campo.value.trim().toUpperCase() !== 'BORRAR'; });
      });
  }

  // ---------- Arranque ----------
  function recibir(d) {
    estado.config = d.config && Array.isArray(d.config.habitos) ? d.config : configNueva();
    if (typeof estado.config.horaReinicio !== 'number') estado.config.horaReinicio = 4;
    if (estado.config.habitos.length) estado.config.empezado = true;
    estado.hoy = d.hoy && d.hoy.dia ? d.hoy : null;
    if (estado.hoy) { estado.hoy.cuentas = estado.hoy.cuentas || {}; estado.hoy.toques = estado.hoy.toques || []; }
    estado.historial = d.historial && typeof d.historial === 'object' ? d.historial : {};
    alDia();
  }
  // Vuelve a leer lo guardado: el widget pudo haber cambiado algo mientras la app estaba cerrada.
  function releer() {
    return D.leerTodo().then(function (d) {
      if (!d.config && estado.config && !estado.config.empezado) return;
      recibir(d);
      if (ui.pestana === 'hoy' && estado.config.empezado && vista.querySelector('.tablero') &&
          vista.querySelectorAll('.tablero .moneda').length === estado.config.habitos.length) { refrescarHoy(); return; }
      if (!capas.children.length || ui.pestana === 'hoy') pintar();
    }).catch(function () {});
  }
  window.idealAlVolver = releer;
  document.addEventListener('visibilitychange', function () { if (!document.hidden) releer(); });
  setInterval(function () {
    if (estado.config && estado.hoy && diaActual() !== estado.hoy.dia && alDia()) pintar();
  }, 30000);

  var avisado = false;
  D.alFallar(function () { if (!avisado) { avisado = true; aviso('No se pudo guardar en este teléfono'); } });

  D.leerTodo().then(function (d) { recibir(d); pintar(); }, function () { recibir({}); pintar(); });

  if (D.plataforma === 'web' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
