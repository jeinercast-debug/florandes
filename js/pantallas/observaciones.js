/* Pantalla: lista de observaciones (Registros) + exportación. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App,
      Observaciones = global.Observaciones, Datos = global.Datos, Datos_ = global.Datos;
  var h = U.h;

  var ESTADOS = {
    borrador: { texto: 'Borrador', tono: 'neutral' },
    sin_ia: { texto: 'Sin identificación IA', tono: 'neutral' },
    pendiente: { texto: 'Identificación pendiente', tono: 'primary' },
    procesando: { texto: 'Identificando', tono: 'primary' },
    listo: { texto: 'Identificación lista', tono: 'success' },
    error: { texto: 'Sin resolver', tono: 'danger' }
  };

  function estadoBadge(obs) {
    var e = ESTADOS[obs.identificacion.estado] || ESTADOS.pendiente;
    return UI.badge(e.texto, e.tono);
  }

  function primerCandidato(obs) {
    var lista = (obs.identificacion.candidatos && obs.identificacion.candidatos.length)
      ? obs.identificacion.candidatos : obs.candidatos;
    return lista && lista[0] ? lista[0] : null;
  }

  function tarjeta(obs) {
    var cand = primerCandidato(obs);
    var titulo = obs.especieConfirmada
      ? (Datos.obtener(obs.especieConfirmada) || {}).nc
      : (cand ? (cand.nc || cand.nombre) : null);

    var meta = [U.fechaCorta(obs.ts)];
    if (obs.alt !== null && obs.alt !== undefined) meta.push(obs.alt + ' msnm');
    if (obs.fotos.length) meta.push(U.plural(obs.fotos.length, 'foto', 'fotos'));

    var thumb = obs.fotos.length
      ? UI.miniatura({ foto: obs.fotos[0] })
      : (cand ? UI.miniatura({ especie: cand.nc || cand.nombre }) : UI.miniatura({}));

    return UI.card(
      '<div class="fila">' + thumb +
        '<span class="fila__cuerpo">' +
          (titulo
            ? '<span class="fila__nc">' + h(titulo) + '</span>' +
              (cand && !obs.especieConfirmada ? '<span class="fila__com">candidato · ' + cand.confianza + '% de confianza</span>' : '')
            : '<span class="fila__nc" style="font-style:normal;font-family:var(--font-sans)">Sin identificar aún</span>') +
          '<span class="fila__meta">' + h(meta.join(' · ')) + '</span>' +
        '</span>' +
        (obs.identificacion.estado === 'listo' && !obs.vista ? '<span class="badge badge--primary">Nueva</span>' : estadoBadge(obs)) +
      '</div>',
      { accion: 'abrir', datos: { id: obs.id } });
  }

  App.registrar('observaciones', {
    titulo: 'Registros',
    nav: 'registros',
    montar: function () { Observaciones.marcarTodasVistas(); },
    html: function () {
      var todas = Observaciones.todas();
      var pendientes = Observaciones.pendientes();
      var errores = Observaciones.conError();

      var resumen = '';
      if (pendientes.length || errores.length) {
        resumen = UI.card('<div style="display:flex;flex-direction:column;gap:var(--space-2)">' +
          (pendientes.length
            ? '<div class="cola"><span class="cola__icono">' + U.Icono.reloj(18) + '</span>' +
              '<span class="cola__texto"><b>' + U.plural(pendientes.length, 'pendiente', 'pendientes') + '</b>' +
              '<span>' + (navigator.onLine ? 'Se resuelven en orden' : 'Esperando señal') + '</span></span></div>'
            : '') +
          (errores.length
            ? '<div class="cola"><span class="cola__icono cola__icono--error">' + U.Icono.alerta(18) + '</span>' +
              '<span class="cola__texto"><b>' + U.plural(errores.length, 'sin resolver', 'sin resolver') + '</b>' +
              '<span>Ábrelas para ver qué pasó y reintentar</span></span></div>'
            : '') +
          '</div>');
      }

      return '' +
        '<header class="barra"><span class="barra__titulo">Registros</span>' +
          '<span class="barra__accion">' +
            (todas.length ? UI.iconoBoton('descargar', 'Exportar', { accion: 'exportar' }) : '') +
          '</span>' +
        '</header>' +
        '<div class="contenido">' +
          resumen +
          (todas.length
            ? '<div class="lista">' + todas.map(tarjeta).join('') + '</div>'
            : UI.vacio('libro', 'Aún no tienes observaciones',
                'Sal a caminar y registra la primera. Toca el botón de la cámara.',
                UI.boton({ texto: 'Registrar la primera', variante: 'primary', accion: 'capturar' }))) +
        '</div>';
    },
    acciones: {
      abrir: function (d) { App.ir('observacion', { id: d.id }); },
      capturar: function () { App.capturar(); },
      exportar: function () {
        UI.hoja({
          titulo: 'Exportar observaciones',
          html:
            '<p class="campo__ayuda">' + U.plural(Observaciones.todas().length, 'observación', 'observaciones') +
            ' en este dispositivo. Las coordenadas solo salen si tú lo decides aquí.</p>' +
            UI.boton({ texto: 'Excel (.xlsx)', variante: 'primary', bloque: true, accion: 'xlsx', icono: 'descargar' }) +
            UI.boton({ texto: 'CSV', variante: 'outline', bloque: true, accion: 'csv', icono: 'descargar' }) +
            UI.boton({ texto: 'Texto plano', variante: 'outline', bloque: true, accion: 'txt', icono: 'descargar' }),
          acciones: {
            xlsx: function () { exportar('xlsx'); },
            csv: function () { exportar('csv'); },
            txt: function () { exportar('txt'); }
          }
        });
      }
    }
  });

  function exportar(formato) {
    Observaciones.exportar(formato)
      .then(function () { UI.toast('Archivo generado.', 'success'); })
      .catch(function (e) { UI.toast(e.message || 'No se pudo exportar.', 'danger', 6000); });
  }
})(window);
