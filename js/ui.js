/* FLORANDES — componentes de interfaz v2.
   Diseño blanco con verde oscuro, estilo lámina botánica. */
(function (global) {
  'use strict';

  var U = global.U, Almacen = global.Almacen, Datos = global.Datos;
  var h = U.h, Icono = U.Icono;

  /* ── Piezas ────────────────────────────────────────────────────────── */
  function badge(texto, tono) {
    return '<span class="badge' + (tono ? ' badge--' + tono : '') + '">' + h(texto) + '</span>';
  }

  function tag(texto, opciones) {
    var o = opciones || {};
    return '<button type="button" class="tag' + (o.clase ? ' ' + o.clase : '') + '" ' +
      'aria-pressed="' + (o.activo ? 'true' : 'false') + '" ' +
      (o.accion ? 'data-accion="' + h(o.accion) + '" ' : '') +
      datos(o.datos) + '>' + h(texto) + '</button>';
  }

  function datos(mapa) {
    if (!mapa) return '';
    return Object.keys(mapa).map(function (k) {
      return 'data-' + k + '="' + h(mapa[k]) + '"';
    }).join(' ');
  }

  function boton(o) {
    var clases = ['btn', 'btn--' + (o.variante || 'primary')];
    if (o.tamano) clases.push('btn--' + o.tamano);
    if (o.bloque) clases.push('btn--bloque');
    return '<button type="' + (o.tipo || 'button') + '" class="' + clases.join(' ') + '" ' +
      (o.accion ? 'data-accion="' + h(o.accion) + '" ' : '') +
      (o.desactivado ? 'disabled ' : '') + datos(o.datos) + '>' +
      (o.icono ? Icono[o.icono](o.tamanoIcono || 18) : '') + h(o.texto) + '</button>';
  }

  function iconoBoton(nombre, etiqueta, o) {
    o = o || {};
    return '<button type="button" class="icon-btn' + (o.clase ? ' ' + o.clase : '') + '" ' +
      'aria-label="' + h(etiqueta) + '" title="' + h(etiqueta) + '" ' +
      (o.accion ? 'data-accion="' + h(o.accion) + '" ' : '') + datos(o.datos) + '>' +
      Icono[nombre](o.tam || 20) + '</button>';
  }

  function card(interior, o) {
    o = o || {};
    var clases = ['card'];
    if (o.plana) clases.push('card--plana');
    if (o.accion) clases.push('card--clic');
    var etiqueta = o.accion ? 'button' : 'div';
    return '<' + etiqueta + ' class="' + clases.join(' ') + '"' +
      (o.accion ? ' type="button" data-accion="' + h(o.accion) + '"' : '') +
      ' ' + datos(o.datos) + '>' + interior + '</' + etiqueta + '>';
  }

  function tabs(items, activo, accion) {
    return '<div class="tabs" role="tablist">' + items.map(function (it) {
      var valor = it.valor !== undefined ? it.valor : it;
      var texto = it.texto !== undefined ? it.texto : it;
      return '<button role="tab" aria-selected="' + (valor === activo ? 'true' : 'false') + '" ' +
        'data-accion="' + h(accion) + '" data-valor="' + h(valor) + '">' + h(texto) + '</button>';
    }).join('') + '</div>';
  }

  function campoTexto(o) {
    return '<label class="campo">' +
      (o.etiqueta ? '<span class="campo__etiqueta">' + h(o.etiqueta) + '</span>' : '') +
      '<input class="entrada" type="' + (o.tipo || 'text') + '" ' +
      'placeholder="' + h(o.placeholder || '') + '" value="' + h(o.valor || '') + '" ' +
      (o.inputmode ? 'inputmode="' + o.inputmode + '" ' : '') +
      (o.error ? 'aria-invalid="true" ' : '') +
      (o.entrada ? 'data-entrada="' + h(o.entrada) + '" ' : '') +
      (o.cambio ? 'data-cambio="' + h(o.cambio) + '" ' : '') + datos(o.datos) + '>' +
      (o.ayuda ? '<span class="campo__ayuda">' + h(o.ayuda) + '</span>' : '') +
      (o.error ? '<span class="campo__error">' + h(o.error) + '</span>' : '') +
      '</label>';
  }

  function campoArea(o) {
    return '<label class="campo">' +
      (o.etiqueta ? '<span class="campo__etiqueta">' + h(o.etiqueta) + '</span>' : '') +
      '<textarea class="area" placeholder="' + h(o.placeholder || '') + '" ' +
      (o.entrada ? 'data-entrada="' + h(o.entrada) + '" ' : '') +
      datos(o.datos) + '>' + h(o.valor || '') + '</textarea>' +
      (o.ayuda ? '<span class="campo__ayuda">' + h(o.ayuda) + '</span>' : '') +
      '</label>';
  }

  function campoSelect(o) {
    return '<label class="campo">' +
      (o.etiqueta ? '<span class="campo__etiqueta">' + h(o.etiqueta) + '</span>' : '') +
      '<select class="selector" ' + (o.cambio ? 'data-cambio="' + h(o.cambio) + '" ' : '') +
      datos(o.datos) + '>' +
      o.opciones.map(function (op) {
        var valor = op.valor !== undefined ? op.valor : op;
        var texto = op.texto !== undefined ? op.texto : op;
        return '<option value="' + h(valor) + '"' + (valor === o.valor ? ' selected' : '') + '>' +
          h(texto) + '</option>';
      }).join('') + '</select>' +
      (o.ayuda ? '<span class="campo__ayuda">' + h(o.ayuda) + '</span>' : '') +
      '</label>';
  }

  function check(o) {
    return '<label class="check">' +
      '<input type="checkbox"' + (o.activo ? ' checked' : '') + ' ' +
      (o.cambio ? 'data-cambio="' + h(o.cambio) + '" ' : '') + datos(o.datos) + '>' +
      '<span class="check__caja">' + Icono.listo(13) + '</span>' +
      '<span>' + h(o.etiqueta) + '</span></label>';
  }

  function interruptor(o) {
    return '<label class="switch">' +
      '<span>' + h(o.etiqueta) + '</span>' +
      '<input type="checkbox"' + (o.activo ? ' checked' : '') + ' ' +
      (o.cambio ? 'data-cambio="' + h(o.cambio) + '" ' : '') + datos(o.datos) + '>' +
      '<span class="switch__pista"></span></label>';
  }

  function vacio(icono, titulo, texto, accionHTML) {
    return '<div class="vacio">' + Icono[icono](40) +
      '<div><b>' + h(titulo) + '</b>' + (texto ? '<p>' + h(texto) + '</p>' : '') + '</div>' +
      (accionHTML || '') + '</div>';
  }

  function barraConfianza(n) {
    var clase = n >= 60 ? ' barra-confianza--alta' : (n < 35 ? ' barra-confianza--baja' : '');
    return '<div class="barra-confianza' + clase + '"><span style="width:' + Math.max(2, n) + '%"></span></div>';
  }

  /* ── Tarjeta de función (grid home) ────────────────────────────────── */
  function tarjetaFuncion(icono, texto, color, accion) {
    return '<button type="button" class="tarjeta-fn tarjeta-fn--' + color + '" data-accion="' + h(accion) + '">' +
      Icono[icono](28) +
      '<span class="tarjeta-fn__texto">' + h(texto) + '</span>' +
      '</button>';
  }

  /* ── Lámina botánica (detalle de especie) ──────────────────────────── */
  var _laminaContador = 0;
  function aRomano(n) {
    var r = '', vals = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    for (var i = 0; i < vals.length; i++) { while (n >= vals[i][0]) { r += vals[i][1]; n -= vals[i][0]; } }
    return r;
  }

  function lamina(sp) {
    _laminaContador++;
    var num = sp.id ? (typeof sp.id === 'number' ? sp.id : _laminaContador) : _laminaContador;
    return '<div class="lamina">' +
      '<span class="lamina__esquina-bi"></span><span class="lamina__esquina-bd"></span>' +
      '<div class="lamina__num">LÁM. ' + aRomano(num > 500 ? (num % 500) + 1 : num) + '</div>' +
      '<div class="lamina__foto">' +
        '<img alt="" loading="lazy" data-especie="' + h(sp.nc) + '" onerror="this.remove()">' +
        Icono.hoja(64) +
      '</div>' +
      '<div class="lamina__nc">' + h(sp.nc) + '</div>' +
      '<div class="lamina__fam">' + h(sp.fam || '') + '</div>' +
      '</div>';
  }

  function filaDatos(items) {
    return '<div class="fila-datos">' + items.map(function (it) {
      return '<div class="fila-datos__item">' +
        (it.icono ? Icono[it.icono](20) : '') +
        '<span>' + h(it.valor) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* Motivo de marca: silueta de montaña con degradado verde. */
  var _montanas = 0;
  function montana(alto, opacidad) {
    var idg = 'mg' + (++_montanas);
    return '<svg class="hero__montana" viewBox="0 0 375 120" preserveAspectRatio="none" ' +
      'style="height:' + (alto || 96) + 'px;opacity:' + (opacidad || 0.28) + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + idg + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.2"/>' +
      '</linearGradient></defs>' +
      '<path d="M0 120 L60 40 L110 78 L170 18 L230 82 L280 44 L375 120 Z" fill="url(#' + idg + ')"/>' +
      '</svg>';
  }

  function montanaOnboarding() {
    return '<svg class="onboarding__montana" viewBox="0 0 375 280" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="mg-onb" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1A4731"/><stop offset="1" stop-color="#34C759"/>' +
      '</linearGradient></defs>' +
      '<path d="M0 280 L60 140 L110 190 L170 90 L230 200 L280 130 L375 280 Z" fill="url(#mg-onb)" opacity="0.9"/>' +
      '<path d="M0 280 L90 210 L150 250 L220 170 L290 250 L375 220 L375 280 Z" fill="#1A4731" opacity="0.35"/>' +
      '</svg>';
  }

  /* ── Avisos ────────────────────────────────────────────────────────── */
  function toast(mensaje, tono, ms) {
    var cont = U.$('#toasts');
    var nodo = document.createElement('div');
    nodo.className = 'toast' + (tono ? ' toast--' + tono : '');
    nodo.innerHTML = '<span>' + h(mensaje) + '</span>' +
      '<button type="button" aria-label="Cerrar">' + Icono.cerrar(16) + '</button>';
    var quitar = function () {
      nodo.style.opacity = '0';
      setTimeout(function () { nodo.remove(); }, 200);
    };
    nodo.querySelector('button').addEventListener('click', quitar);
    cont.appendChild(nodo);
    setTimeout(quitar, ms || 4200);
  }

  /* ── Diálogo modal ─────────────────────────────────────────────────── */
  function dialogo(o) {
    return new Promise(function (resolver) {
      var fondo = document.createElement('div');
      fondo.className = 'overlay overlay--centro';
      fondo.innerHTML = '<div class="dialogo" role="dialog" aria-modal="true">' +
        (o.titulo ? '<div class="dialogo__titulo">' + h(o.titulo) + '</div>' : '') +
        '<div class="dialogo__cuerpo">' + (o.html || h(o.texto || '')) + '</div>' +
        '<div class="dialogo__acciones">' +
        boton({ texto: o.cancelar || 'Cancelar', variante: 'ghost', accion: 'cancelar' }) +
        boton({ texto: o.confirmar || 'Aceptar', variante: o.peligro ? 'danger' : 'primary', accion: 'ok' }) +
        '</div></div>';
      var cerrar = function (valor) { fondo.remove(); resolver(valor); };
      fondo.addEventListener('click', function (ev) {
        if (ev.target === fondo) return cerrar(false);
        var b = ev.target.closest('[data-accion]');
        if (!b) return;
        cerrar(b.dataset.accion === 'ok');
      });
      document.body.appendChild(fondo);
    });
  }

  function confirmar(titulo, texto, textoConfirmar, peligro) {
    return dialogo({ titulo: titulo, texto: texto, confirmar: textoConfirmar || 'Sí, continuar', peligro: peligro });
  }

  /* ── Hoja modal ────────────────────────────────────────────────────── */
  function hoja(o) {
    var fondo = document.createElement('div');
    fondo.className = 'overlay';
    fondo.innerHTML = '<div class="hoja" role="dialog" aria-modal="true">' +
      '<div class="hoja__agarre"></div>' +
      (o.titulo ? '<div class="barra" style="padding:0 0 var(--space-4);background:none;border:none">' +
        '<span class="barra__titulo">' + h(o.titulo) + '</span>' +
        '<span class="barra__accion">' + iconoBoton('cerrar', 'Cerrar', { accion: '__cerrar_hoja' }) + '</span>' +
        '</div>' : '') +
      '<div class="contenido" style="padding:0;gap:var(--space-4)">' + (o.html || '') + '</div>' +
      '</div>';

    var cerrar = function () {
      fondo.remove();
      if (o.alCerrar) o.alCerrar();
    };
    fondo.addEventListener('click', function (ev) {
      if (ev.target === fondo) return cerrar();
      var b = ev.target.closest('[data-accion="__cerrar_hoja"]');
      if (b) cerrar();
    });
    document.body.appendChild(fondo);
    var cuerpo = fondo.querySelector('.contenido');
    if (o.acciones) U.enlazar(cuerpo, o.acciones);
    hidratarImagenes(cuerpo);
    return { nodo: fondo, cuerpo: cuerpo, cerrar: cerrar };
  }

  /* ── Imágenes ──────────────────────────────────────────────────────── */
  var urls = [];

  function ponerBlob(img, blob) {
    var url = URL.createObjectURL(blob);
    urls.push(url);
    img.src = url;
    img.classList.add('cargada');
  }

  function hidratarImagenes(raiz) {
    U.$$('img[data-foto]', raiz || document).forEach(function (img) {
      if (img.dataset.hidratada) return;
      img.dataset.hidratada = '1';
      Almacen.leerFoto(img.dataset.foto).then(function (f) {
        if (f && f.blob) ponerBlob(img, f.blob);
      });
    });
    U.$$('img[data-especie]', raiz || document).forEach(function (img) {
      if (img.dataset.hidratada) return;
      img.dataset.hidratada = '1';
      Datos.fotoReferencia(img.dataset.especie).then(function (ref) {
        if (ref && ref.blob) ponerBlob(img, ref.blob);
      });
    });
  }

  function liberarImagenes() {
    urls.splice(0).forEach(function (u) { URL.revokeObjectURL(u); });
  }

  function miniatura(o) {
    o = o || {};
    var attrs = o.foto ? 'data-foto="' + h(o.foto) + '"' :
      (o.especie ? 'data-especie="' + h(o.especie) + '"' : '');
    return '<span class="miniatura' + (o.clase ? ' ' + o.clase : '') + '">' +
      (attrs ? '<img alt="" loading="lazy" ' + attrs +
        ' style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : Icono.hoja(20)) +
      '</span>';
  }

  global.UI = {
    badge: badge, tag: tag, boton: boton, iconoBoton: iconoBoton, card: card, tabs: tabs,
    campoTexto: campoTexto, campoArea: campoArea, campoSelect: campoSelect,
    check: check, interruptor: interruptor, vacio: vacio, barraConfianza: barraConfianza,
    tarjetaFuncion: tarjetaFuncion, lamina: lamina, filaDatos: filaDatos,
    montana: montana, montanaOnboarding: montanaOnboarding,
    toast: toast, dialogo: dialogo, confirmar: confirmar, hoja: hoja,
    hidratarImagenes: hidratarImagenes, liberarImagenes: liberarImagenes, miniatura: miniatura,
    datos: datos
  };
})(window);
