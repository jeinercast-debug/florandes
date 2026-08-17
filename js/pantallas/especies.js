/* Pantalla: catálogo de especies. Buscar y filtrar, todo sin conexión. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Datos = global.Datos;
  var h = U.h;

  var estado = { consulta: '', habito: '', zona: '', familia: '', soloAntioquia: true };
  var TOPE = 60;

  function resultados() {
    return Datos.buscar(estado.consulta, {
      habito: estado.habito,
      zona: estado.zona,
      familia: estado.familia,
      soloAntioquia: estado.soloAntioquia
    });
  }

  function fila(sp) {
    var etiquetas = [];
    if (sp.propia) etiquetas.push(UI.badge('Registro propio', 'primary'));
    else if (sp.corregida) etiquetas.push(UI.badge('Corregida', 'primary'));
    if (sp.amenaza === 'EN') etiquetas.push(UI.badge('En peligro', 'danger'));
    else if (sp.amenaza === 'VU') etiquetas.push(UI.badge('Vulnerable', 'warning'));

    return UI.card(
      '<div class="fila">' +
        UI.miniatura({ especie: sp.nc }) +
        '<span class="fila__cuerpo">' +
          '<span class="fila__nc">' + h(sp.nc) + '</span>' +
          '<span class="fila__com">' + h(sp.com || sp.fam || '—') + '</span>' +
          '<span class="fila__meta">' +
            h([sp.hab, sp.alt_str].filter(Boolean).join(' · ') || 'Sin datos de rango') +
          '</span>' +
        '</span>' + etiquetas.join('') +
      '</div>',
      { accion: 'abrirEspecie', datos: { id: sp.id } });
  }

  function pintarLista(pantalla) {
    var lista = resultados();
    var caja = U.$('#lista-especies', pantalla);
    var conteo = U.$('#conteo-especies', pantalla);
    conteo.textContent = lista.length
      ? U.numero(lista.length) + (lista.length === 1 ? ' especie' : ' especies')
      : 'Sin resultados';
    caja.innerHTML = lista.length
      ? lista.slice(0, TOPE).map(fila).join('') +
        (lista.length > TOPE
          ? '<p class="campo__ayuda" style="text-align:center">Se muestran las primeras ' + TOPE +
            '. Afina la búsqueda para ver el resto.</p>'
          : '')
      : UI.vacio('lupa', 'Ninguna especie coincide',
          'Prueba con menos filtros, o busca por género, familia o nombre común.');
    UI.hidratarImagenes(caja);
  }

  App.registrar('especies', {
    titulo: 'Especies',
    nav: 'especies',
    html: function () {
      var habitos = [
        { valor: '', texto: 'Cualquier hábito' },
        { valor: 'árbol', texto: 'Árbol' },
        { valor: 'arbusto', texto: 'Arbusto' },
        { valor: 'palma', texto: 'Palma' },
        { valor: 'trepadora', texto: 'Trepadora' }
      ];
      var zonas = [{ valor: '', texto: 'Cualquier franja' }].concat(
        Object.keys(Datos.ZONAS_ETIQUETA).map(function (k) {
          return { valor: k, texto: Datos.ZONAS_ETIQUETA[k] };
        }));
      var familias = [{ valor: '', texto: 'Cualquier familia' }].concat(
        Datos.familias().map(function (f) { return { valor: f, texto: f }; }));

      return '' +
        '<header class="barra"><span class="barra__titulo">Especies</span>' +
          '<span class="barra__accion"><span class="badge" id="conteo-especies"></span></span></header>' +
        '<div class="contenido">' +
          UI.campoTexto({
            placeholder: 'Busca por nombre científico, común o familia',
            valor: estado.consulta, entrada: 'buscar'
          }) +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">' +
            UI.campoSelect({ opciones: habitos, valor: estado.habito, cambio: 'filtroHabito' }) +
            UI.campoSelect({ opciones: zonas, valor: estado.zona, cambio: 'filtroZona' }) +
          '</div>' +
          UI.campoSelect({ opciones: familias, valor: estado.familia, cambio: 'filtroFamilia' }) +
          UI.check({ etiqueta: 'Solo especies documentadas para Antioquia', activo: estado.soloAntioquia, cambio: 'filtroRegion' }) +
          '<div class="lista" id="lista-especies"></div>' +
        '</div>';
    },
    montar: function (pantalla, params) {
      if (params && params.q) { estado.consulta = params.q; }
      pintarLista(pantalla);
      var caja = U.$('.entrada', pantalla);
      if (params && params.q) { caja.value = params.q; }
      caja.addEventListener('input', U.debounce(function () {
        estado.consulta = caja.value;
        pintarLista(pantalla);
      }, 220));
    },
    acciones: {
      abrirEspecie: function (d) { App.ir('especie', { id: d.id }); },
      filtroHabito: function (d, nodo) { estado.habito = nodo.value; App.refrescar(); },
      filtroZona: function (d, nodo) { estado.zona = nodo.value; App.refrescar(); },
      filtroFamilia: function (d, nodo) { estado.familia = nodo.value; App.refrescar(); },
      filtroRegion: function (d, nodo) { estado.soloAntioquia = nodo.checked; App.refrescar(); }
    }
  });
})(window);
