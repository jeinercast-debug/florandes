/* Pantalla: clave interactiva (policlave).
   Puede llegar con un grupo precargado desde una especie o desde una observación,
   para dirimir entre los dos o tres finalistas. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Datos = global.Datos, Clave = global.Clave;
  var h = U.h;

  var seleccion = {};
  var soloIds = null;

  function universo() {
    if (!soloIds) return Datos.todas();
    return soloIds.map(Datos.obtener).filter(Boolean);
  }

  function ranking() {
    return Clave.candidatos(seleccion, { universo: universo() });
  }

  function grupo(car) {
    return '<div class="grupo-chips">' +
      '<span class="grupo-chips__titulo">' + h(car.titulo) + '</span>' +
      '<div class="chips">' +
        car.opciones.map(function (o) {
          return UI.tag(o.l, {
            activo: seleccion[car.clave] === o.v,
            accion: 'alternar', datos: { clave: car.clave, valor: o.v }
          });
        }).join('') +
      '</div></div>';
  }

  function pintarResultados(pantalla) {
    var caja = U.$('#clave-resultados', pantalla);
    var stats = U.$('#clave-stats', pantalla);
    var claves = Object.keys(seleccion);

    if (!claves.length) {
      stats.textContent = 'Selecciona caracteres para filtrar';
      caja.innerHTML = '<p class="campo__ayuda">Marca lo que ves en la planta. La lista se acota en cada toque.</p>';
      return;
    }

    var lista = ranking().filter(function (c) { return c.difieren.length === 0 && c.conocidos > 0; });
    var descartadosPorDif = ranking().filter(function (c) { return c.difieren.length > 0; }).length;

    stats.textContent = U.plural(lista.length, 'candidato', 'candidatos') + ' con ' +
      U.plural(claves.length, 'carácter', 'caracteres');

    var sugerencia = '';
    if (lista.length > 1) {
      var disc = Clave.caracterDiscriminante(lista, seleccion);
      if (disc) {
        sugerencia = UI.card('<div class="cola"><span class="cola__icono">' + U.Icono.balanza(18) + '</span>' +
          '<span class="cola__texto"><b>Para acotar más, mira: ' + h(disc.caracter.titulo) + '</b>' +
          '<span>Reparte los finalistas en grupos distintos</span></span></div>');
      }
    }

    if (!lista.length) {
      caja.innerHTML = UI.vacio('lupa', 'Sin candidatos con esa combinación',
        descartadosPorDif ? descartadosPorDif + ' especies quedaron descartadas por caracteres que no coinciden. Revisa lo observado.'
                          : 'Verifica los caracteres observados.');
      return;
    }

    caja.innerHTML = sugerencia + '<div class="lista">' + lista.slice(0, 30).map(function (c) {
      var sp = c.especie;
      return UI.card(
        '<div class="fila">' + UI.miniatura({ especie: sp.nc }) +
          '<span class="fila__cuerpo">' +
            '<span class="fila__nc">' + h(sp.nc) + '</span>' +
            '<span class="fila__com">' + h(sp.fam + (sp.com ? ' · ' + sp.com : '')) + '</span>' +
            '<span class="fila__meta">' + h([sp.hab, sp.alt_str].filter(Boolean).join(' · ')) +
              ' · ' + c.coinciden.length + '/' + c.conocidos + ' coinciden</span>' +
            UI.barraConfianza(c.confianza) +
          '</span>' +
          (c.fuera ? UI.badge('Fuera de zona', 'warning') : UI.badge(c.confianza + '%', 'secondary')) +
        '</div>',
        { accion: 'abrir', datos: { id: sp.id } });
    }).join('') + '</div>';
    UI.hidratarImagenes(caja);
  }

  App.registrar('clave', {
    titulo: 'Clave',
    nav: 'clave',
    html: function (params) {
      seleccion = params.seleccion ? Object.assign({}, params.seleccion) : (seleccion || {});
      soloIds = params.soloIds || null;

      return '' +
        '<header class="barra">' +
          (soloIds ? UI.iconoBoton('izquierda', 'Volver', { accion: 'volver' }) : '') +
          '<span class="barra__titulo">Clave interactiva</span>' +
          '<span class="barra__accion">' +
            UI.boton({ texto: 'Reiniciar', variante: 'ghost', tamano: 'sm', accion: 'reiniciar' }) +
          '</span>' +
        '</header>' +
        '<div class="contenido">' +
          (soloIds
            ? UI.card('<div class="cola"><span class="cola__icono cola__icono--listo">' + U.Icono.balanza(18) + '</span>' +
              '<span class="cola__texto"><b>Dirimiendo entre ' + soloIds.length + ' finalistas</b>' +
              '<span>Solo se comparan los candidatos de tu observación</span></span></div>')
            : '') +
          '<span class="badge" id="clave-stats" style="align-self:flex-start"></span>' +
          '<div style="display:flex;flex-direction:column;gap:var(--space-4)">' +
            Clave.CARACTERES.map(grupo).join('') +
          '</div>' +
          '<div class="encabezado-seccion"><h2>Candidatos</h2></div>' +
          '<div id="clave-resultados"></div>' +
        '</div>';
    },
    montar: function (pantalla) { pintarResultados(pantalla); },
    acciones: {
      volver: function () { App.volver('registros'); },
      alternar: function (d) {
        if (seleccion[d.clave] === d.valor) delete seleccion[d.clave];
        else seleccion[d.clave] = d.valor;
        var pantalla = U.$('#vista .pantalla');
        U.$$('.tag[data-clave="' + d.clave + '"]', pantalla).forEach(function (b) {
          b.setAttribute('aria-pressed', b.dataset.valor === seleccion[d.clave] ? 'true' : 'false');
        });
        pintarResultados(pantalla);
      },
      reiniciar: function () {
        seleccion = {};
        var params = App.actual().params;
        params.seleccion = {};
        App.refrescar();
      },
      abrir: function (d) { App.ir('especie', { id: d.id }); }
    }
  });
})(window);
