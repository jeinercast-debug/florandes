/* FLORANDES — almacenamiento local.
   localStorage: preferencias, observaciones, correcciones al dataset, cola de IA.
   IndexedDB:    fotos de campo y fotos de referencia cacheadas (binarios).
   Nada de esto sale del dispositivo salvo que el investigador exporte a propósito. */
(function (global) {
  'use strict';

  var LLAVES = {
    ajustes: 'florandes.ajustes',
    observaciones: 'florandes.observaciones',
    correcciones: 'florandes.correcciones',
    especiesPropias: 'florandes.especies_propias',
    cola: 'florandes.cola',
    visto: 'florandes.onboarding_visto'
  };

  function leer(llave, porDefecto) {
    try {
      var crudo = localStorage.getItem(llave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch (e) {
      console.warn('[florandes] no se pudo leer', llave, e);
      return porDefecto;
    }
  }

  function escribir(llave, valor) {
    try {
      localStorage.setItem(llave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.error('[florandes] no se pudo guardar', llave, e);
      return false;
    }
  }

  /* ── Ajustes ───────────────────────────────────────────────────────── */
  var AJUSTES_BASE = {
    nombre: '',
    claveAnthropic: '',
    clavePlantNet: '',
    modelo: 'claude-sonnet-5',
    fotosReferencia: true,
    gpsAutomatico: true,
    resolverSolo: true
  };

  function ajustes() {
    return Object.assign({}, AJUSTES_BASE, leer(LLAVES.ajustes, {}));
  }

  function guardarAjustes(parcial) {
    var nuevos = Object.assign(ajustes(), parcial);
    escribir(LLAVES.ajustes, nuevos);
    return nuevos;
  }

  /* ── IndexedDB: fotos ──────────────────────────────────────────────── */
  var BD = 'florandes', VERSION = 1, TIENDA_FOTOS = 'fotos', TIENDA_REF = 'referencia';
  var _bd = null;

  function bd() {
    if (_bd) return _bd;
    _bd = new Promise(function (ok, mal) {
      var req = indexedDB.open(BD, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(TIENDA_FOTOS)) {
          var t = db.createObjectStore(TIENDA_FOTOS, { keyPath: 'id' });
          t.createIndex('obs', 'obs', { unique: false });
        }
        if (!db.objectStoreNames.contains(TIENDA_REF)) {
          db.createObjectStore(TIENDA_REF, { keyPath: 'nc' });
        }
      };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { mal(req.error); };
    });
    return _bd;
  }

  function tx(tienda, modo) {
    return bd().then(function (db) {
      return db.transaction(tienda, modo).objectStore(tienda);
    });
  }

  function pedir(req) {
    return new Promise(function (ok, mal) {
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { mal(req.error); };
    });
  }

  function guardarFoto(registro) {
    return tx(TIENDA_FOTOS, 'readwrite').then(function (t) {
      return pedir(t.put(registro));
    }).then(function () { return registro.id; });
  }

  function leerFoto(idFoto) {
    return tx(TIENDA_FOTOS, 'readonly').then(function (t) { return pedir(t.get(idFoto)); });
  }

  function fotosDe(obsId) {
    return tx(TIENDA_FOTOS, 'readonly').then(function (t) {
      return pedir(t.index('obs').getAll(obsId));
    });
  }

  function borrarFoto(idFoto) {
    return tx(TIENDA_FOTOS, 'readwrite').then(function (t) { return pedir(t.delete(idFoto)); });
  }

  function borrarFotosDe(obsId) {
    return fotosDe(obsId).then(function (fotos) {
      return Promise.all(fotos.map(function (f) { return borrarFoto(f.id); }));
    });
  }

  function todasLasFotos() {
    return tx(TIENDA_FOTOS, 'readonly').then(function (t) { return pedir(t.getAll()); });
  }

  /* Fotos de referencia (iNaturalist/GBIF) cacheadas para verlas sin señal. */
  function guardarReferencia(nc, blob, atribucion) {
    return tx(TIENDA_REF, 'readwrite').then(function (t) {
      return pedir(t.put({ nc: nc, blob: blob, atribucion: atribucion || '', ts: Date.now() }));
    });
  }

  function leerReferencia(nc) {
    return tx(TIENDA_REF, 'readonly').then(function (t) { return pedir(t.get(nc)); });
  }

  function referenciasGuardadas() {
    return tx(TIENDA_REF, 'readonly').then(function (t) { return pedir(t.getAllKeys()); });
  }

  function limpiarReferencias() {
    return tx(TIENDA_REF, 'readwrite').then(function (t) { return pedir(t.clear()); });
  }

  /* ── Espacio en disco ──────────────────────────────────────────────── */
  function espacio() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return Promise.resolve(null);
    }
    return navigator.storage.estimate().then(function (e) {
      var usado = e.usage || 0, cuota = e.quota || 0;
      return {
        usado: usado,
        cuota: cuota,
        proporcion: cuota ? usado / cuota : 0,
        apretado: cuota ? (usado / cuota) > 0.8 : false
      };
    }).catch(function () { return null; });
  }

  /* ── Conversión de imágenes ────────────────────────────────────────── */
  /* Comprime a JPEG con lado mayor `max` para que quepan muchas fotos de salida. */
  function comprimir(archivo, max) {
    max = max || 1280;
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo);
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, max / Math.max(img.width, img.height));
        var lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        URL.revokeObjectURL(url);
        lienzo.toBlob(function (blob) {
          blob ? ok(blob) : mal(new Error('No se pudo procesar la imagen'));
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        mal(new Error('El archivo no es una imagen legible'));
      };
      img.src = url;
    });
  }

  function blobABase64(blob) {
    return new Promise(function (ok, mal) {
      var lector = new FileReader();
      lector.onload = function () {
        var s = String(lector.result);
        ok(s.slice(s.indexOf(',') + 1));
      };
      lector.onerror = function () { mal(lector.error); };
      lector.readAsDataURL(blob);
    });
  }

  global.Almacen = {
    LLAVES: LLAVES,
    leer: leer, escribir: escribir,
    ajustes: ajustes, guardarAjustes: guardarAjustes,
    guardarFoto: guardarFoto, leerFoto: leerFoto, fotosDe: fotosDe,
    borrarFoto: borrarFoto, borrarFotosDe: borrarFotosDe, todasLasFotos: todasLasFotos,
    guardarReferencia: guardarReferencia, leerReferencia: leerReferencia,
    referenciasGuardadas: referenciasGuardadas, limpiarReferencias: limpiarReferencias,
    espacio: espacio, comprimir: comprimir, blobABase64: blobABase64
  };
})(window);
