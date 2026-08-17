/* Pantalla: perfil. Réplica de Profile.jsx + claves de API, aportes y almacenamiento.
   La clave de API se queda en el dispositivo: no se envía a ningún lado ni se
   incluye al exportar aportes. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Almacen = global.Almacen,
      Datos = global.Datos, Observaciones = global.Observaciones, IA = global.IA;
  var h = U.h;

  var MODELOS = [
    { valor: 'claude-sonnet-5', texto: 'Claude Sonnet 5 (recomendado)' },
    { valor: 'claude-opus-5', texto: 'Claude Opus 5 (más preciso, más costoso)' },
    { valor: 'claude-haiku-4-5-20251001', texto: 'Claude Haiku 4.5 (más rápido y económico)' }
  ];

  /* ── Claves de API ─────────────────────────────────────────────────── */
  function abrirClaves() {
    var a = Almacen.ajustes();
    var borrador = { claveAnthropic: a.claveAnthropic, clavePlantNet: a.clavePlantNet, modelo: a.modelo };

    var control = UI.hoja({
      titulo: 'Claves de API',
      html:
        '<p class="campo__ayuda">Cada quien usa su propia clave. Se guarda solo en este ' +
        'dispositivo y nunca se comparte al exportar aportes.</p>' +
        UI.campoTexto({
          etiqueta: 'Clave de Anthropic (Claude)', tipo: 'password',
          placeholder: 'sk-ant-…', valor: a.claveAnthropic, entrada: 'anthropic',
          ayuda: 'Necesaria para la identificación asistida. console.anthropic.com'
        }) +
        UI.campoSelect({ etiqueta: 'Modelo', opciones: MODELOS, valor: a.modelo || IA.MODELO_POR_DEFECTO, cambio: 'modelo' }) +
        UI.campoTexto({
          etiqueta: 'Clave de PlantNet (opcional)', tipo: 'password',
          placeholder: '2b10…', valor: a.clavePlantNet, entrada: 'plantnet',
          ayuda: 'Añade el paso visual previo. my.plantnet.org'
        }) +
        UI.boton({ texto: 'Guardar claves', variante: 'primary', bloque: true, accion: 'guardar' }),
      acciones: {
        anthropic: function (d, n) { borrador.claveAnthropic = n.value.trim(); },
        plantnet: function (d, n) { borrador.clavePlantNet = n.value.trim(); },
        modelo: function (d, n) { borrador.modelo = n.value; },
        guardar: function () {
          Almacen.guardarAjustes(borrador);
          control.cerrar();
          UI.toast('Claves guardadas en este dispositivo.', 'success');
          if (borrador.claveAnthropic) setTimeout(function () { IA.procesar(); }, 400);
          App.refrescar();
        }
      }
    });
  }

  /* ── Aportes ───────────────────────────────────────────────────────── */
  function exportarAportes() {
    var paquete = Datos.exportarAportes();
    var total = Object.keys(paquete.correcciones).length + paquete.especies.length;
    if (!total) { UI.toast('Todavía no tienes aportes que compartir.'); return; }
    Observaciones.descargar(
      'florandes-aportes-' + new Date().toISOString().slice(0, 10) + '.json',
      JSON.stringify(paquete, null, 2), 'application/json');
    UI.toast('Aportes exportados. Compártelos con tu grupo.', 'success');
  }

  function importarAportes(archivo) {
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var paquete = JSON.parse(lector.result);
        var r = Datos.importarAportes(paquete);
        UI.toast('Importado: ' + r.correcciones + ' correcciones, ' + r.especies + ' especies.', 'success', 5000);
        App.refrescar();
      } catch (e) {
        UI.toast(e.message || 'No se pudo leer el archivo.', 'danger', 5000);
      }
    };
    lector.readAsText(archivo);
  }

  /* ── Almacenamiento ────────────────────────────────────────────────── */
  function abrirAlmacenamiento() {
    Promise.all([Almacen.espacio(), Almacen.todasLasFotos(), Almacen.referenciasGuardadas()])
      .then(function (r) {
        var esp = r[0], fotos = r[1], refs = r[2];
        var pesoFotos = fotos.reduce(function (n, f) { return n + (f.blob ? f.blob.size : 0); }, 0);
        UI.hoja({
          titulo: 'Almacenamiento',
          html:
            (esp
              ? UI.card('<div class="dato"><span class="dato__k">Usado en el dispositivo</span>' +
                  '<span class="dato__v">' + U.pesoLegible(esp.usado) +
                  (esp.cuota ? ' de ' + U.pesoLegible(esp.cuota) : '') + '</span></div>' +
                  '<div class="dato"><span class="dato__k">Fotos de campo</span><span class="dato__v">' +
                  U.plural(fotos.length, 'foto', 'fotos') + ' · ' + U.pesoLegible(pesoFotos) + '</span></div>' +
                  '<div class="dato"><span class="dato__k">Fotos de referencia cacheadas</span>' +
                  '<span class="dato__v">' + refs.length + '</span></div>')
              : '<p class="campo__ayuda">Este navegador no reporta el espacio disponible.</p>') +
            '<p class="campo__ayuda">Las fotos de referencia se vuelven a descargar cuando haya señal. ' +
            'Las fotos de campo solo se borran al eliminar su observación.</p>' +
            UI.boton({ texto: 'Vaciar fotos de referencia cacheadas', variante: 'outline', bloque: true, accion: 'limpiarRef' }),
          acciones: {
            limpiarRef: function (d, n, ev) {
              Almacen.limpiarReferencias().then(function () {
                UI.toast('Caché de referencia vaciada.');
                var hoja = ev.target.closest('.overlay');
                if (hoja) hoja.remove();
              });
            }
          }
        });
      });
  }

  App.registrar('perfil', {
    titulo: 'Perfil',
    nav: 'perfil',
    html: function () {
      var a = Almacen.ajustes();
      var obs = Observaciones.todas();
      var corregidas = Datos.especiesCorregidas().length;
      var propias = Datos.todas().filter(function (s) { return s.propia; }).length;
      var totalCorr = Datos.totalCorrecciones();
      var nombre = a.nombre || 'Investigador de campo';

      return '' +
        '<header style="padding:var(--space-7) var(--space-5);background:var(--neutral-950);color:#fff;' +
          'display:flex;align-items:center;gap:var(--space-4);border-radius:0 0 var(--radius-xl) var(--radius-xl)">' +
          '<span class="miniatura" style="width:56px;height:56px;background:var(--neutral-800);color:var(--neutral-400)">' +
            U.Icono.usuario(26) + '</span>' +
          '<div style="flex:1"><div style="font-weight:700;font-size:var(--text-md)">' + h(nombre) + '</div>' +
            '<div style="font-size:var(--text-xs);color:var(--neutral-300)">Bosque andino de Antioquia</div></div>' +
          UI.iconoBoton('lapiz', 'Editar nombre', { accion: 'editarNombre', clase: 'icon-btn--sobre-color' }) +
        '</header>' +
        '<div class="contenido">' +
          '<div class="estadisticas">' +
            UI.card('<div class="n" style="color:var(--color-primary)">' + obs.length + '</div><div class="r">Observaciones</div>') +
            UI.card('<div class="n" style="color:var(--color-secondary)">' + totalCorr + '</div><div class="r">Datos corregidos</div>') +
            UI.card('<div class="n" style="color:var(--color-accent-press)">' + propias + '</div><div class="r">Registros propios</div>') +
          '</div>' +

          '<div class="encabezado-seccion"><h2>Identificación asistida</h2></div>' +
          UI.card('<div class="cola">' +
            '<span class="cola__icono ' + (a.claveAnthropic ? 'cola__icono--listo' : 'cola__icono--error') + '">' +
              U.Icono.llave(20) + '</span>' +
            '<span class="cola__texto"><b>' + (a.claveAnthropic ? 'Clave de Anthropic activa' : 'Sin clave de Anthropic') + '</b>' +
            '<span>' + (a.claveAnthropic ? 'Modelo: ' + h(a.modelo || IA.MODELO_POR_DEFECTO) : 'La identificación no puede resolverse') +
            (a.clavePlantNet ? ' · PlantNet activo' : '') + '</span></span>' + U.Icono.derecha(18) +
            '</div>', { accion: 'claves' }) +
          UI.card('<div style="display:flex;flex-direction:column;gap:var(--space-4)">' +
            UI.interruptor({ etiqueta: 'Resolver la cola automáticamente al reconectar', activo: a.resolverSolo !== false, cambio: 'resolverSolo' }) +
            UI.interruptor({ etiqueta: 'Descargar fotos de referencia con señal', activo: a.fotosReferencia !== false, cambio: 'fotosReferencia' }) +
            UI.interruptor({ etiqueta: 'Pedir ubicación automáticamente al capturar', activo: a.gpsAutomatico !== false, cambio: 'gpsAutomatico' }) +
            '</div>') +

          '<div class="encabezado-seccion"><h2>Aportes al dataset</h2></div>' +
          '<p class="campo__ayuda">Comparte tus correcciones y registros con el grupo mediante un archivo. ' +
            'Sin servidor: tú decides qué sale y qué entra.</p>' +
          (corregidas + propias > 0
            ? UI.card('<div class="cola"><span class="cola__icono cola__icono--listo">' + U.Icono.lapiz(18) + '</span>' +
              '<span class="cola__texto"><b>' + U.plural(corregidas + propias, 'aporte listo', 'aportes listos') + '</b>' +
              '<span>' + totalCorr + ' correcciones · ' + propias + ' registros propios</span></span></div>')
            : '') +
          '<input type="file" accept="application/json,.json" id="archivo-aportes" class="sr" data-cambio="importar">' +
          UI.boton({ texto: 'Exportar mis aportes', variante: 'outline', bloque: true, accion: 'exportar', icono: 'descargar' }) +
          UI.boton({ texto: 'Importar aportes de un colega', variante: 'outline', bloque: true, accion: 'importar', icono: 'subir' }) +

          '<div class="encabezado-seccion"><h2>Datos y dispositivo</h2></div>' +
          UI.card('<div class="cola"><span class="cola__icono">' + U.Icono.libro(18) + '</span>' +
            '<span class="cola__texto"><b>Dataset ' + h(Datos.version()) + '</b>' +
            '<span>' + U.numero(Datos.todas().length) + ' especies</span></span></div>') +
          UI.boton({ texto: 'Exportar observaciones', variante: 'outline', bloque: true, accion: 'exportarObs', icono: 'descargar' }) +
          UI.boton({ texto: 'Ver almacenamiento', variante: 'ghost', bloque: true, accion: 'almacenamiento' }) +

          '<div class="credito">' +
            '<img src="assets/logos/grupo-ecosistemas-clima-territorio.png" alt="Grupo de Investigación Ecosistemas, Clima y Territorio">' +
            '<span>Con el respaldo del Grupo de Investigación Ecosistemas, Clima y Territorio · ITM</span>' +
          '</div>' +
        '</div>';
    },
    acciones: {
      claves: abrirClaves,
      editarNombre: function () {
        var borrador = Almacen.ajustes().nombre || '';
        var control = UI.hoja({
          titulo: 'Tu nombre',
          html:
            UI.campoTexto({
              etiqueta: 'Como quieres que aparezca', placeholder: 'Por ejemplo, Ana Restrepo',
              valor: borrador, entrada: 'nombre'
            }) +
            UI.boton({ texto: 'Guardar', variante: 'primary', bloque: true, accion: 'guardar' }),
          acciones: {
            nombre: function (d, n) { borrador = n.value; },
            guardar: function () {
              Almacen.guardarAjustes({ nombre: borrador.trim() });
              control.cerrar();
              UI.toast('Nombre guardado.', 'success');
              App.refrescar();
            }
          }
        });
      },
      resolverSolo: function (d, n) { Almacen.guardarAjustes({ resolverSolo: n.checked }); if (n.checked) IA.procesar(); },
      fotosReferencia: function (d, n) { Almacen.guardarAjustes({ fotosReferencia: n.checked }); },
      gpsAutomatico: function (d, n) { Almacen.guardarAjustes({ gpsAutomatico: n.checked }); },
      exportar: exportarAportes,
      importar: function () { U.$('#archivo-aportes').click(); },
      importarArchivo: null,
      exportarObs: function () {
        if (!Observaciones.todas().length) { UI.toast('No tienes observaciones que exportar.'); return; }
        Observaciones.exportar('xlsx').then(function () { UI.toast('Excel generado.', 'success'); })
          .catch(function (e) { UI.toast(e.message, 'danger', 6000); });
      },
      almacenamiento: abrirAlmacenamiento
    },
    montar: function (pantalla) {
      var input = U.$('#archivo-aportes', pantalla);
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) importarAportes(input.files[0]);
        input.value = '';
      });
    }
  });
})(window);
