/* FLORANDES — observaciones de campo.
   Regla dura de la Fase 1: la captura se guarda ANTES que cualquier otra cosa.
   Sin señal, sin GPS y sin clave de API, la observación igual queda registrada. */
(function (global) {
  'use strict';

  var U = global.U, Almacen = global.Almacen, Datos = global.Datos, Clave = global.Clave;

  var lista = [];
  var oyentes = [];

  function cargar() {
    lista = Almacen.leer(Almacen.LLAVES.observaciones, []);
    return lista;
  }

  function guardar() {
    var ok = Almacen.escribir(Almacen.LLAVES.observaciones, lista);
    oyentes.forEach(function (fn) { fn(lista); });
    return ok;
  }

  function alCambiar(fn) { oyentes.push(fn); }

  function todas() {
    return lista.slice().sort(function (a, b) { return b.ts - a.ts; });
  }

  function obtener(idObs) {
    return lista.filter(function (o) { return o.id === idObs; })[0] || null;
  }

  function crear(datos) {
    var obs = Object.assign({
      id: U.id(),
      ts: Date.now(),
      nota: '',
      chars: {},
      lat: null, lon: null, alt: null, precision: null,
      lugar: '',
      fotos: [],
      candidatos: [],
      identificacion: { estado: 'pendiente', intentos: 0, error: null, candidatos: [], resumen: '', ts: null },
      vista: true,
      especieConfirmada: null
    }, datos);
    lista.push(obs);
    guardar();
    return obs;
  }

  function actualizar(idObs, parcial) {
    var obs = obtener(idObs);
    if (!obs) return null;
    Object.assign(obs, parcial);
    guardar();
    return obs;
  }

  function eliminar(idObs) {
    lista = lista.filter(function (o) { return o.id !== idObs; });
    guardar();
    return Almacen.borrarFotosDe(idObs);
  }

  /* Recalcula los candidatos regionales offline y los guarda en la observación. */
  function recalcularCandidatos(idObs) {
    var obs = obtener(idObs);
    if (!obs) return [];
    var ranking = Clave.candidatos(obs.chars, {
      altitud: obs.alt,
      familia: obs.familia || null
    }).slice(0, 12);
    obs.candidatos = ranking.map(function (c) {
      return {
        id: c.especie.id,
        nc: c.especie.nc,
        confianza: c.confianza,
        fuera: c.fuera,
        avisos: c.avisos
      };
    });
    guardar();
    return ranking;
  }

  /* ── Estado de la cola ─────────────────────────────────────────────── */
  function pendientes() {
    return lista.filter(function (o) {
      return o.identificacion.estado === 'pendiente' || o.identificacion.estado === 'procesando';
    });
  }

  function conError() {
    return lista.filter(function (o) { return o.identificacion.estado === 'error'; });
  }

  function listasSinVer() {
    return lista.filter(function (o) {
      return o.identificacion.estado === 'listo' && !o.vista;
    });
  }

  function marcarVista(idObs) {
    var obs = obtener(idObs);
    if (obs && !obs.vista) { obs.vista = true; guardar(); }
    return obs;
  }

  function marcarTodasVistas() {
    var cambio = false;
    lista.forEach(function (o) { if (!o.vista) { o.vista = true; cambio = true; } });
    if (cambio) guardar();
  }

  function reintentar(idObs) {
    var obs = obtener(idObs);
    if (!obs) return null;
    obs.identificacion.estado = 'pendiente';
    obs.identificacion.error = null;
    guardar();
    return obs;
  }

  /* ── Ubicación ─────────────────────────────────────────────────────── */
  /* Nunca bloquea la captura: si el GPS falla, se resuelve sin él. */
  function ubicacion(tiempo) {
    return new Promise(function (ok) {
      if (!navigator.geolocation) return ok({ error: 'Este dispositivo no reporta ubicación' });
      var listo = false;
      var reloj = setTimeout(function () {
        if (!listo) { listo = true; ok({ error: 'El GPS no respondió a tiempo' }); }
      }, tiempo || 12000);
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (listo) return;
        listo = true; clearTimeout(reloj);
        ok({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : null,
          precision: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null
        });
      }, function (err) {
        if (listo) return;
        listo = true; clearTimeout(reloj);
        var mensajes = {
          1: 'Permiso de ubicación denegado',
          2: 'El GPS no está disponible aquí',
          3: 'El GPS no respondió a tiempo'
        };
        ok({ error: mensajes[err.code] || 'No se pudo obtener la ubicación' });
      }, { enableHighAccuracy: true, timeout: tiempo || 12000, maximumAge: 60000 });
    });
  }

  function enlaceMapa(obs) {
    if (obs.lat === null || obs.lon === null) return null;
    return 'https://www.google.com/maps?q=' + obs.lat + ',' + obs.lon;
  }

  /* ── Exportación ───────────────────────────────────────────────────── */
  var COLUMNAS = [
    'fecha', 'especie_confirmada', 'candidato_1', 'confianza_1', 'candidato_2', 'confianza_2',
    'estado_identificacion', 'latitud', 'longitud', 'altitud_msnm', 'precision_m',
    'caracteres', 'nota', 'fotos'
  ];

  function filas() {
    return todas().map(function (o) {
      var cands = (o.identificacion.candidatos && o.identificacion.candidatos.length)
        ? o.identificacion.candidatos : o.candidatos;
      var sp = o.especieConfirmada ? Datos.obtener(o.especieConfirmada) : null;
      var caracteres = Object.keys(o.chars).map(function (k) {
        return (Clave.definicion(k) ? Clave.definicion(k).titulo : k) + ': ' + Clave.etiqueta(k, o.chars[k]);
      }).join('; ');
      return {
        fecha: new Date(o.ts).toISOString(),
        especie_confirmada: sp ? sp.nc : '',
        candidato_1: cands[0] ? (cands[0].nc || cands[0].nombre || '') : '',
        confianza_1: cands[0] ? cands[0].confianza + '%' : '',
        candidato_2: cands[1] ? (cands[1].nc || cands[1].nombre || '') : '',
        confianza_2: cands[1] ? cands[1].confianza + '%' : '',
        estado_identificacion: o.identificacion.estado,
        latitud: o.lat === null ? '' : o.lat,
        longitud: o.lon === null ? '' : o.lon,
        altitud_msnm: o.alt === null ? '' : o.alt,
        precision_m: o.precision === null ? '' : o.precision,
        caracteres: caracteres,
        nota: o.nota || '',
        fotos: o.fotos.length
      };
    });
  }

  function aCSV() {
    var datos = filas();
    var escapar = function (v) {
      var s = String(v === null || v === undefined ? '' : v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lineas = [COLUMNAS.join(',')];
    datos.forEach(function (f) {
      lineas.push(COLUMNAS.map(function (c) { return escapar(f[c]); }).join(','));
    });
    return '﻿' + lineas.join('\r\n');
  }

  function aTXT() {
    return todas().map(function (o) {
      var cands = (o.identificacion.candidatos && o.identificacion.candidatos.length)
        ? o.identificacion.candidatos : o.candidatos;
      var partes = [
        'Observación ' + o.id,
        'Fecha: ' + U.fechaLarga(o.ts),
        'Ubicación: ' + (o.lat !== null ? o.lat.toFixed(5) + ', ' + o.lon.toFixed(5) : 'sin GPS') +
          (o.alt !== null ? ' · ' + o.alt + ' msnm' : ''),
        'Caracteres: ' + (Object.keys(o.chars).map(function (k) {
          return (Clave.definicion(k) ? Clave.definicion(k).titulo : k) + ' = ' + Clave.etiqueta(k, o.chars[k]);
        }).join(', ') || 'ninguno'),
        'Identificación: ' + o.identificacion.estado,
        'Candidatos: ' + (cands.length
          ? cands.slice(0, 3).map(function (c) { return (c.nc || c.nombre) + ' (' + c.confianza + '%)'; }).join(', ')
          : 'sin candidatos'),
        'Nota: ' + (o.nota || '—')
      ];
      return partes.join('\n');
    }).join('\n\n' + new Array(50).join('─') + '\n\n');
  }

  function descargar(nombre, contenido, tipo) {
    var blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  var _xlsx = null;
  function cargarXLSX() {
    if (_xlsx) return _xlsx;
    _xlsx = new Promise(function (ok, mal) {
      if (global.XLSX) return ok(global.XLSX);
      if (!navigator.onLine) return mal(new Error('Excel necesita conexión la primera vez. Sin señal, exporta a CSV.'));
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = function () { ok(global.XLSX); };
      s.onerror = function () { _xlsx = null; mal(new Error('No se pudo cargar el generador de Excel')); };
      document.head.appendChild(s);
    });
    return _xlsx;
  }

  function exportar(formato) {
    var marca = new Date().toISOString().slice(0, 10);
    if (formato === 'csv') {
      descargar('florandes-observaciones-' + marca + '.csv', aCSV(), 'text/csv;charset=utf-8');
      return Promise.resolve();
    }
    if (formato === 'txt') {
      descargar('florandes-observaciones-' + marca + '.txt', aTXT(), 'text/plain;charset=utf-8');
      return Promise.resolve();
    }
    return cargarXLSX().then(function (XLSX) {
      var hoja = XLSX.utils.json_to_sheet(filas(), { header: COLUMNAS });
      var libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Observaciones');
      var buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
      descargar('florandes-observaciones-' + marca + '.xlsx',
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    });
  }

  global.Observaciones = {
    cargar: cargar, todas: todas, obtener: obtener, crear: crear, actualizar: actualizar,
    eliminar: eliminar, guardar: guardar, alCambiar: alCambiar,
    recalcularCandidatos: recalcularCandidatos,
    pendientes: pendientes, conError: conError, listasSinVer: listasSinVer,
    marcarVista: marcarVista, marcarTodasVistas: marcarTodasVistas, reintentar: reintentar,
    ubicacion: ubicacion, enlaceMapa: enlaceMapa,
    exportar: exportar, descargar: descargar
  };
})(window);
