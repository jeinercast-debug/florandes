/* Pantalla: detalle de una observación.
   Aquí se cumple "resultado verificable": cada candidato con su confianza y con
   los caracteres diagnósticos que lo sostienen o lo descartan, y paso directo a
   la clave con ese grupo ya cargado. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Datos = global.Datos,
      Clave = global.Clave, Observaciones = global.Observaciones, IA = global.IA;
  var h = U.h;

  function caracteresHTML(cand) {
    var filas = [];
    (cand.coinciden || []).forEach(function (c) {
      filas.push('<div class="caracter caracter--coincide">' + U.Icono.listo(14) +
        '<span><b>' + h(Clave.definicion(c.clave) ? Clave.definicion(c.clave).titulo : c.clave) + ':</b> ' +
        h(Clave.etiqueta(c.clave, c.valor)) + ' — coincide</span></div>');
    });
    (cand.difieren || []).forEach(function (c) {
      filas.push('<div class="caracter caracter--difiere">' + U.Icono.cerrar(14) +
        '<span><b>' + h(Clave.definicion(c.clave) ? Clave.definicion(c.clave).titulo : c.clave) + ':</b> ' +
        'la planta es ' + h(Clave.etiqueta(c.clave, c.esperado)) + ', pero esta especie es ' +
        h(Clave.etiqueta(c.clave, c.valor)) + '</span></div>');
    });
    return filas.length ? '<div class="caracteres">' + filas.join('') + '</div>' : '';
  }

  function avisosHTML(cand) {
    if (!cand.avisos || !cand.avisos.length) return '';
    return '<div style="margin-top:var(--space-2);display:flex;flex-direction:column;gap:6px">' +
      cand.avisos.map(function (a) {
        return '<div class="caracter" style="color:var(--status-warning)">' + U.Icono.alerta(14) +
          '<span>' + h(a.texto) + '</span></div>';
      }).join('') + '</div>';
  }

  function tarjetaCandidato(cand, idx, obs) {
    var confirmado = obs.especieConfirmada && cand.id === obs.especieConfirmada;
    var razones = (cand.razones && cand.razones.length)
      ? '<ul style="margin:var(--space-2) 0 0;padding-left:18px;color:var(--text-secondary);font-size:var(--text-2xs)">' +
        cand.razones.slice(0, 4).map(function (r) { return '<li>' + h(r) + '</li>'; }).join('') + '</ul>'
      : '';

    return UI.card(
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3)">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="cientifico" style="font-size:var(--text-md)">' + h(cand.nc || cand.nombre) +
            (idx === 0 ? ' <span class="badge badge--secondary" style="vertical-align:middle">Candidato #1</span>' : '') +
          '</div>' +
          (cand.comun ? '<div class="fila__com">' + h(cand.comun) + '</div>' : '') +
        '</div>' +
        UI.badge(cand.confianza + '%', cand.confianza >= 60 ? 'secondary' : (cand.confianza < 35 ? 'warning' : 'primary')) +
      '</div>' +
      UI.barraConfianza(cand.confianza) +
      (typeof cand.confianzaIA === 'number' && cand.confianzaIA !== cand.confianza
        ? '<div class="campo__ayuda" style="margin-top:6px">IA sin filtro regional: ' + cand.confianzaIA +
          '% · ajustado a la región: ' + cand.confianza + '%</div>'
        : '') +
      razones +
      caracteresHTML(cand) +
      avisosHTML(cand) +
      '<div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap">' +
        (cand.id ? UI.boton({ texto: 'Ver ficha', variante: 'ghost', tamano: 'sm', accion: 'verFicha', datos: { id: cand.id } }) : '') +
        (cand.id ? UI.boton({ texto: 'Dirimir en la clave', variante: 'outline', tamano: 'sm', accion: 'dirimir' }) : '') +
        (cand.id
          ? UI.boton({
              texto: confirmado ? 'Confirmada' : 'Confirmar esta',
              variante: confirmado ? 'secondary' : 'primary', tamano: 'sm',
              accion: 'confirmar', datos: { id: cand.id }, desactivado: confirmado
            })
          : '') +
      '</div>');
  }

  function bloqueResultado(obs) {
    var ident = obs.identificacion;

    if (ident.estado === 'listo') {
      var cands = ident.candidatos || [];
      var confiable = cands.length && cands[0].confianza >= Clave.UMBRAL_CONFIABLE;
      var cabeza = confiable
        ? ''
        : UI.card('<div class="cola">' +
            '<span class="cola__icono cola__icono--error">' + U.Icono.info(20) + '</span>' +
            '<span class="cola__texto"><b>Sin identificación confiable</b><span>' +
            h(ident.caracterQueResolveria
              ? 'Mira en la planta: ' + ident.caracterQueResolveria
              : 'Ningún candidato supera el umbral. Usa la clave para acotar.') +
            '</span></span></div>');
      return cabeza +
        (ident.resumen ? '<p class="texto-largo">' + h(ident.resumen) + '</p>' : '') +
        (cands.length
          ? cands.map(function (c, i) { return tarjetaCandidato(c, i, obs); }).join('')
          : UI.vacio('info', 'La IA no propuso ningún nombre',
              'Puede pasar con fotos difíciles. Usa la clave con lo que observaste.')) +
        (ident.modelo ? '<p class="campo__ayuda" style="text-align:center">Resuelto con ' + h(ident.modelo) + '</p>' : '');
    }

    if (ident.estado === 'procesando') {
      return UI.card('<div class="cola"><span class="cola__icono">' +
        '<span class="girando" style="display:flex">' + U.Icono.sincronizar(20) + '</span></span>' +
        '<span class="cola__texto"><b>Identificando ahora</b><span>Cruzando la foto con el dataset regional</span></span></div>');
    }

    if (ident.estado === 'error') {
      var err = ident.error || {};
      return UI.card('<div class="cola"><span class="cola__icono cola__icono--error">' +
        U.Icono.alerta(20) + '</span><span class="cola__texto"><b>No se pudo resolver</b>' +
        '<span>' + h(err.mensaje || 'Error desconocido') + '</span></span></div>' +
        '<div style="margin-top:var(--space-3)">' +
        (err.permanente
          ? UI.boton({ texto: 'Reintentar de todos modos', variante: 'outline', bloque: true, accion: 'reintentar' })
          : UI.boton({ texto: 'Reintentar ahora', variante: 'primary', bloque: true, accion: 'reintentar' })) +
        '</div>');
    }

    if (ident.estado === 'pendiente') {
      var detalle = !navigator.onLine
        ? 'Sin señal. Se resolverá sola apenas reconectes.'
        : (!global.IA.puedeTrabajar()
          ? 'Falta tu clave de Anthropic (Perfil › Claves de API). Queda encolada.'
          : 'En cola. Empieza en breve.');
      return UI.card('<div class="cola"><span class="cola__icono">' + U.Icono.reloj(20) + '</span>' +
        '<span class="cola__texto"><b>Identificación asistida pendiente</b><span>' + h(detalle) + '</span></span></div>' +
        (navigator.onLine && global.IA.puedeTrabajar()
          ? '<div style="margin-top:var(--space-3)">' +
            UI.boton({ texto: 'Resolver ahora', variante: 'primary', bloque: true, accion: 'resolverAhora' }) + '</div>'
          : ''));
    }

    // sin_ia / borrador
    return UI.card('<div class="cola"><span class="cola__icono">' + U.Icono.info(20) + '</span>' +
      '<span class="cola__texto"><b>Sin identificación asistida</b>' +
      '<span>Esta observación no tiene fotos. Sus candidatos salen del dataset regional.</span></span></div>');
  }

  function bloqueCandidatosOffline(obs) {
    if (!obs.candidatos || !obs.candidatos.length) return '';
    if (obs.identificacion.estado === 'listo') return ''; // ya se muestran los de la IA
    return '<div class="encabezado-seccion"><h2>Candidatos regionales</h2></div>' +
      '<p class="campo__ayuda">Con lo que ya sabe la aplicación, sin depender de la señal.</p>' +
      '<div class="lista">' + obs.candidatos.slice(0, 5).map(function (c) {
        var sp = Datos.obtener(c.id);
        return UI.card('<div class="fila">' + UI.miniatura({ especie: c.nc }) +
          '<span class="fila__cuerpo"><span class="fila__nc">' + h(c.nc) + '</span>' +
          (sp && sp.com ? '<span class="fila__com">' + h(sp.com) + '</span>' : '') +
          UI.barraConfianza(c.confianza) + '</span>' +
          UI.badge(c.confianza + '%', c.fuera ? 'warning' : 'secondary') + '</div>',
          c.id ? { accion: 'verFicha', datos: { id: c.id } } : {});
      }).join('') + '</div>';
  }

  App.registrar('observacion', {
    titulo: 'Observación',
    nav: 'registros',
    html: function (params) {
      var obs = Observaciones.obtener(params.id);
      if (!obs) {
        return '<header class="barra">' + UI.iconoBoton('izquierda', 'Volver', { accion: 'volver' }) +
          '<span class="barra__titulo">Observación</span></header>' +
          '<div class="contenido">' + UI.vacio('alerta', 'Esta observación ya no existe', '') + '</div>';
      }
      Observaciones.marcarVista(obs.id);

      var fotos = obs.fotos.length
        ? '<div class="tira-fotos" style="margin-bottom:var(--space-2)">' +
          obs.fotos.map(function (idFoto) {
            return '<figure style="width:96px;height:96px"><img alt="" loading="lazy" data-foto="' + h(idFoto) + '"></figure>';
          }).join('') + '</div>'
        : '';

      var chars = Object.keys(obs.chars);
      var bloqueChars = chars.length
        ? '<div class="chips">' + chars.map(function (k) {
            var def = Clave.definicion(k);
            return '<span class="tag">' + h((def ? def.titulo : k) + ': ' + Clave.etiqueta(k, obs.chars[k])) + '</span>';
          }).join('') + '</div>'
        : '<p class="campo__ayuda">No registraste caracteres en esta observación.</p>';

      var enlaceMapa = Observaciones.enlaceMapa(obs);
      var ubic = obs.lat !== null
        ? (obs.lat.toFixed(5) + ', ' + obs.lon.toFixed(5) + (obs.alt !== null ? ' · ' + obs.alt + ' msnm' : ''))
        : 'Sin ubicación registrada';

      return '' +
        '<header class="barra">' + UI.iconoBoton('izquierda', 'Volver', { accion: 'volver' }) +
          '<span class="barra__titulo">Observación</span>' +
          '<span class="barra__accion">' + UI.iconoBoton('basura', 'Eliminar', { accion: 'eliminar' }) + '</span>' +
        '</header>' +
        '<div class="contenido">' +
          fotos +
          '<div class="dato"><span class="dato__k">' + U.Icono.reloj(16) + ' Fecha</span>' +
            '<span class="dato__v">' + h(U.fechaCorta(obs.ts)) + '</span></div>' +
          '<div class="dato"><span class="dato__k">' + U.Icono.marcador(16) + ' Ubicación</span>' +
            '<span class="dato__v">' + (enlaceMapa
              ? '<a href="' + enlaceMapa + '" target="_blank" rel="noopener">' + h(ubic) + '</a>'
              : h(ubic)) + '</span></div>' +
          (obs.nota ? '<p class="texto-largo">' + h(obs.nota) + '</p>' : '') +
          '<div class="encabezado-seccion"><h2>Lo que observaste</h2></div>' +
          bloqueChars +
          '<div class="encabezado-seccion"><h2>Resultado</h2></div>' +
          bloqueResultado(obs) +
          bloqueCandidatosOffline(obs) +
        '</div>';
    },
    acciones: {
      volver: function () { App.volver('observaciones'); },
      verFicha: function (d) { App.ir('especie', { id: d.id }); },
      dirimir: function () {
        var obs = Observaciones.obtener(App.actual().params.id);
        var cands = (obs.identificacion.candidatos || []).filter(function (c) { return c.id; })
          .slice(0, 6).map(function (c) { return c.id; });
        App.ir('clave', { seleccion: Object.assign({}, obs.chars), soloIds: cands });
      },
      confirmar: function (d) {
        Observaciones.actualizar(App.actual().params.id, { especieConfirmada: d.id });
        UI.toast('Especie confirmada para esta observación.', 'success');
        App.refrescar();
      },
      resolverAhora: function () {
        var id = App.actual().params.id;
        UI.toast('Identificando…');
        IA.resolverAhora(id).then(function () { App.refrescar(); })
          .catch(function (e) { UI.toast(e.message || 'No se pudo resolver.', 'danger', 6000); App.refrescar(); });
      },
      reintentar: function () {
        var id = App.actual().params.id;
        Observaciones.reintentar(id);
        if (navigator.onLine && IA.puedeTrabajar()) {
          UI.toast('Reintentando…');
          IA.resolverAhora(id).then(function () { App.refrescar(); })
            .catch(function (e) { UI.toast(e.message || 'Falló de nuevo.', 'danger', 6000); App.refrescar(); });
        } else {
          UI.toast('Vuelve a la cola. Se resolverá al reconectar.');
          App.refrescar();
        }
      },
      eliminar: function () {
        var id = App.actual().params.id;
        UI.confirmar('¿Eliminar la observación?',
          'Se borran también sus fotos de este dispositivo. No se puede deshacer.',
          'Sí, eliminar', true).then(function (si) {
          if (!si) return;
          Observaciones.eliminar(id).then(function () {
            UI.toast('Observación eliminada.');
            App.volver('observaciones');
          });
        });
      }
    }
  });
})(window);
