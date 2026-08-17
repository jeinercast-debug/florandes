/* FLORANDES — utilidades e iconografía.
   Los iconos vienen de ui_kits/mobile-app/Icons.jsx del design system
   (trazo 2px, esquinas redondeadas, sin relleno). */
(function (global) {
  'use strict';

  /* ── Texto ─────────────────────────────────────────────────────────── */
  function h(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, singular, plural_) {
    return n + ' ' + (n === 1 ? singular : plural_);
  }

  function capitalizar(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function saludo(fecha) {
    var hora = (fecha || new Date()).getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function fechaCorta(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  function fechaLarga(ts) {
    return new Date(ts).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function numero(n) {
    return new Intl.NumberFormat('es-CO').format(n);
  }

  function pesoLegible(bytes) {
    if (!bytes) return '0 MB';
    var mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + ' KB';
    return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB';
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* Normaliza para búsqueda: minúsculas y sin tildes. */
  function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* ── DOM ───────────────────────────────────────────────────────────── */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  /* Delegación: enlaza los data-accion de un contenedor a un mapa de funciones. */
  function enlazar(raiz, acciones) {
    raiz.addEventListener('click', function (ev) {
      var nodo = ev.target.closest('[data-accion]');
      if (!nodo || !raiz.contains(nodo)) return;
      var fn = acciones[nodo.dataset.accion];
      if (fn) { ev.preventDefault(); fn(nodo.dataset, nodo, ev); }
    });
    raiz.addEventListener('change', function (ev) {
      var nodo = ev.target.closest('[data-cambio]');
      if (!nodo || !raiz.contains(nodo)) return;
      var fn = acciones[nodo.dataset.cambio];
      if (fn) fn(nodo.dataset, nodo, ev);
    });
    raiz.addEventListener('input', function (ev) {
      var nodo = ev.target.closest('[data-entrada]');
      if (!nodo || !raiz.contains(nodo)) return;
      var fn = acciones[nodo.dataset.entrada];
      if (fn) fn(nodo.dataset, nodo, ev);
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 200);
    };
  }

  /* ── Iconos ────────────────────────────────────────────────────────── */
  function svg(cuerpo, tam) {
    return '<svg width="' + (tam || 22) + '" height="' + (tam || 22) + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + cuerpo + '</svg>';
  }

  var trazos = {
    inicio: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    mapa: '<path d="m9 20-5.5 2V6L9 4l6 2 5.5-2v16L15 22l-6-2Z"/><path d="M9 4v16M15 6v16"/>',
    hoja: '<path d="M11 20A7 7 0 0 1 4 13V9a1 1 0 0 1 1-1h4a7 7 0 0 1 7 7v1a4 4 0 0 1-4 4Z"/><path d="M4 13c0-6 4-10 10-11"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    camara: '<path d="M4 8h3l2-2h6l2 2h3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
    campana: '<path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 3h16Z"/><path d="M9 19a3 3 0 0 0 6 0"/>',
    izquierda: '<path d="M15 5 8 12l7 7"/>',
    derecha: '<path d="M9 5l7 7-7 7"/>',
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    gota: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    listo: '<path d="M20 6 9 17l-5-5"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    nube: '<path d="M17.5 19H7a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.75 4.75 0 0 1 .5 9.5Z"/>',
    sinSenal: '<path d="M2 2l20 20"/><path d="M17.5 19H7a4 4 0 0 1-.6-7.95a5.5 5.5 0 0 1 1.9-3.2"/><path d="M11.3 6.1A5.5 5.5 0 0 1 17 9.5a4.75 4.75 0 0 1 3.3 7.6"/>',
    sincronizar: '<path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-8.5-6"/><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 8.5 6"/><path d="M20.5 3v6h-6"/><path d="M3.5 21v-6h6"/>',
    alerta: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lapiz: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/>',
    deshacer: '<path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.6-7.6L3 8"/>',
    basura: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    descargar: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 21h16"/>',
    subir: '<path d="M12 21V9"/><path d="m7 13 5-5 5 5"/><path d="M4 3h16"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.3.9Z"/>',
    llave: '<circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 8.5-8.5"/><path d="m15 8 2 2"/><path d="m18 5 2 2"/>',
    montana: '<path d="m3 20 6-11 4 6 2.5-4L21 20Z"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>',
    marcador: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    balanza: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0Z"/><path d="m19 7-3 6a3 3 0 0 0 6 0Z"/>',
    libro: '<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2Z"/><path d="M8 3v18"/>',
    mas: '<path d="M12 5v14M5 12h14"/>'
  };

  var Icono = {};
  Object.keys(trazos).forEach(function (nombre) {
    Icono[nombre] = function (tam) { return svg(trazos[nombre], tam); };
  });

  global.U = {
    h: h, plural: plural, capitalizar: capitalizar, saludo: saludo,
    fechaCorta: fechaCorta, fechaLarga: fechaLarga, numero: numero,
    pesoLegible: pesoLegible, id: id, normalizar: normalizar,
    $: $, $$: $$, enlazar: enlazar, debounce: debounce, Icono: Icono
  };
})(window);
