// Guarda todo en el teléfono y en ningún otro lado. Hay tres lugares según cómo se abrió la app:
//   - App de iPhone: en la carpeta que comparten la app y el widget (se habla con Swift por "webkit").
//   - App de Android: en los archivos de la app, que también lee el widget (se habla con Kotlin por "IdealAndroid").
//   - Web anclada a inicio: en el navegador (localStorage).
// Son tres documentos: "config" (círculos y ajustes), "hoy" (lo que llevas) e "historial" (los días pasados).
(function (raiz) {
  'use strict';

  var puenteIOS = raiz.webkit && raiz.webkit.messageHandlers && raiz.webkit.messageHandlers.ideal;
  var puenteAndroid = raiz.IdealAndroid;
  var plataforma = puenteIOS ? 'ios' : puenteAndroid ? 'android' : 'web';
  var CLAVES = ['config', 'hoy', 'historial'];
  var PREFIJO = 'ideal.';
  var alFallar = null;

  function interpretar(texto) {
    if (!texto) return null;
    try { return JSON.parse(texto); } catch (e) { return null; }
  }
  function fallo(e) { if (alFallar) alFallar(e); }

  function leerTodo() {
    if (plataforma === 'ios') {
      return puenteIOS.postMessage({ tipo: 'leer' }).then(function (r) {
        var salida = {};
        CLAVES.forEach(function (k) { salida[k] = interpretar(r && r[k]); });
        return salida;
      });
    }
    var salida = {};
    CLAVES.forEach(function (k) {
      var texto = null;
      try { texto = plataforma === 'android' ? puenteAndroid.leer(k) : localStorage.getItem(PREFIJO + k); } catch (e) { fallo(e); }
      salida[k] = interpretar(texto);
    });
    return Promise.resolve(salida);
  }

  function guardar(clave, valor) {
    var texto = JSON.stringify(valor);
    try {
      if (plataforma === 'ios') puenteIOS.postMessage({ tipo: 'guardar', clave: clave, valor: texto }).catch(fallo);
      else if (plataforma === 'android') puenteAndroid.guardar(clave, texto);
      else localStorage.setItem(PREFIJO + clave, texto);
    } catch (e) { fallo(e); }
  }

  function borrarTodo() {
    try {
      if (plataforma === 'ios') return puenteIOS.postMessage({ tipo: 'borrar' }).catch(fallo);
      if (plataforma === 'android') puenteAndroid.borrar();
      else CLAVES.forEach(function (k) { localStorage.removeItem(PREFIJO + k); });
    } catch (e) { fallo(e); }
    return Promise.resolve();
  }

  // Vibración corta al tocar un círculo (en la web del iPhone no existe; ahí no hace nada).
  function vibrar(tipo) {
    try {
      if (plataforma === 'ios') puenteIOS.postMessage({ tipo: 'vibrar', estilo: tipo }).catch(function () {});
      else if (plataforma === 'android') puenteAndroid.vibrar(tipo);
      else if (navigator.vibrate) navigator.vibrate(tipo === 'exito' ? [12, 60, 18] : 10);
    } catch (e) { /* sin vibración no pasa nada */ }
  }

  // Entrega un archivo de texto al usuario (respaldo): hoja de compartir en las apps, descarga en la web.
  function entregarArchivo(nombre, texto) {
    if (plataforma === 'ios') return puenteIOS.postMessage({ tipo: 'compartir', nombre: nombre, texto: texto });
    if (plataforma === 'android') { puenteAndroid.compartir(nombre, texto); return Promise.resolve(); }
    var archivo = null;
    try { archivo = new File([texto], nombre, { type: 'application/json' }); } catch (e) { archivo = null; }
    if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      return navigator.share({ files: [archivo] }).catch(function () {});
    }
    var url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve();
  }

  // Pide al navegador que no borre los datos por falta de espacio (solo aplica a la web).
  function pedirPermanencia() {
    if (plataforma === 'web' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(function () {});
    }
  }

  raiz.IdealDatos = {
    plataforma: plataforma,
    leerTodo: leerTodo, guardar: guardar, borrarTodo: borrarTodo,
    vibrar: vibrar, entregarArchivo: entregarArchivo, pedirPermanencia: pedirPermanencia,
    alFallar: function (f) { alFallar = f; }
  };
})(window);
