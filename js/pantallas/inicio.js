/* Pantalla: inicio. Fondo blanco, ubicación, búsqueda, grid de funciones,
   última identificación. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Datos = global.Datos,
      Almacen = global.Almacen, Observaciones = global.Observaciones, IA = global.IA;
  var h = U.h;

  function ultimaIdentificacion() {
    var obs = Observaciones.todas();
    var resuelta = null;
    for (var i = 0; i < obs.length; i++) {
      if (obs[i].identificacion && obs[i].identificacion.estado === 'listo' &&
          obs[i].identificacion.candidatos && obs[i].identificacion.candidatos.length) {
        resuelta = obs[i]; break;
      }
    }
    if (!resuelta) return '';

    var top = resuelta.identificacion.candidatos[0];
    var sp = top.id ? Datos.obtener(top.id) : null;
    var conf = Math.round(top.confianza || 0);
    var fotoId = resuelta.fotos && resuelta.fotos.length ? resuelta.fotos[0] : null;

    return '' +
      '<div class="encabezado-seccion">' +
        '<h2>Última identificación</h2>' +
        '<button type="button" data-accion="verRegistros">ver todas</button>' +
      '</div>' +
      '<button type="button" class="card-id card--clic" data-accion="abrirObs" data-id="' + h(resuelta.id) + '">' +
        '<div class="card-id__foto">' +
          (fotoId
            ? '<img alt="" data-foto="' + h(fotoId) + '" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">'
            : U.Icono.hoja(40)) +
        '</div>' +
        '<div class="card-id__cuerpo">' +
          UI.badge('alta confianza · ' + conf + '%', 'confianza') +
          '<div class="card-id__nc">' + h(top.nc || 'Sin identificar') + '</div>' +
          '<div class="card-id__meta">' + h((sp ? sp.fam || '' : '') + (sp && sp.com ? ' · ' + sp.com : '')) + '</div>' +
          UI.boton({ texto: 'Ver ficha completa', variante: 'primary', bloque: true, accion: 'verFicha', datos: { id: resuelta.id } }) +
        '</div>' +
      '</button>';
  }

  function tarjetaCola() {
    var pendientes = Observaciones.pendientes();
    var listas = Observaciones.listasSinVer();
    var errores = Observaciones.conError();
    var ajustes = Almacen.ajustes();

    if (listas.length) {
      return UI.card(
        '<div class="cola">' +
          '<span class="cola__icono cola__icono--listo">' + U.Icono.listo(20) + '</span>' +
          '<span class="cola__texto"><b>' +
            (listas.length === 1 ? 'Una identificación lista' : listas.length + ' identificaciones listas') +
          '</b><span>Ya cruzadas con el dataset regional</span></span>' +
          U.Icono.derecha(18) +
        '</div>', { accion: 'verRegistros' });
    }
    if (pendientes.length) {
      var procesando = IA.trabajando;
      var detalle = !navigator.onLine
        ? 'Se resuelven solas cuando vuelva la señal'
        : (!ajustes.claveAnthropic
          ? 'Falta tu clave de Anthropic para resolverlas'
          : (procesando ? 'Resolviendo ahora' : 'En cola'));
      return UI.card(
        '<div class="cola">' +
          '<span class="cola__icono">' +
            (procesando ? '<span class="girando" style="display:flex">' + U.Icono.sincronizar(20) + '</span>'
                        : U.Icono.reloj(20)) + '</span>' +
          '<span class="cola__texto"><b>' +
            U.plural(pendientes.length, 'identificación pendiente', 'identificaciones pendientes') +
          '</b><span>' + h(detalle) + '</span></span>' +
          U.Icono.derecha(18) +
        '</div>', { accion: 'verRegistros' });
    }
    if (errores.length) {
      return UI.card(
        '<div class="cola">' +
          '<span class="cola__icono cola__icono--error">' + U.Icono.alerta(20) + '</span>' +
          '<span class="cola__texto"><b>' +
            U.plural(errores.length, 'identificación sin resolver', 'identificaciones sin resolver') +
          '</b><span>' + h(errores[0].identificacion.error ? errores[0].identificacion.error.mensaje : '') +
          '</span></span>' + U.Icono.derecha(18) +
        '</div>', { accion: 'verRegistros' });
    }
    return '';
  }

  App.registrar('inicio', {
    titulo: 'Inicio',
    nav: 'inicio',
    html: function () {
      var ajustes = Almacen.ajustes();
      var obs = Observaciones.todas();

      return '' +
        '<header class="header-home">' +
          '<div class="header-home__ubi">ubicación actual</div>' +
          '<div class="header-home__fila">' +
            '<span class="header-home__lugar">Antioquia, Colombia</span>' +
            UI.iconoBoton('campana', 'Ver registros', { accion: 'verRegistros' }) +
          '</div>' +
        '</header>' +
        '<div class="barra-busqueda">' +
          U.Icono.buscar(18) +
          '<input type="search" placeholder="Buscar especie..." data-entrada="buscar">' +
        '</div>' +
        '<div class="contenido">' +
          tarjetaCola() +
          '<h2 style="font-weight:var(--weight-bold);font-size:var(--text-sm)">Todas las funciones</h2>' +
          '<div class="grid-funciones">' +
            UI.tarjetaFuncion('camara', 'Identificar', 'cyan', 'capturar') +
            UI.tarjetaFuncion('balanza', 'Clave interactiva', 'lima', 'irClave') +
            UI.tarjetaFuncion('libro', 'Mis obs.', 'blanco', 'verRegistros') +
            UI.tarjetaFuncion('sincronizar', 'IA + web', 'blanco', 'verCola') +
          '</div>' +
          ultimaIdentificacion() +
        '</div>';
    },
    acciones: {
      buscar: function (d, nodo) {
        var q = nodo.value.trim();
        if (q.length >= 2) App.ir('especies', { q: q });
      },
      capturar: function () { App.ir('capturar', {}); },
      irClave: function () { App.irPestana('clave'); },
      verRegistros: function () { App.irPestana('registros'); },
      verCola: function () { App.irPestana('registros'); },
      abrirObs: function (d) { App.ir('observacion', { id: d.id }); },
      verFicha: function (d) { App.ir('observacion', { id: d.id }); }
    }
  });
})(window);
