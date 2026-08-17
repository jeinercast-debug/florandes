/* Pantalla: nueva observación. Es la acción core de Florandes.
   Orden innegociable: primero se guarda, después se piensa. La foto, la ubicación
   y la nota quedan en el dispositivo antes de intentar cualquier identificación. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Almacen = global.Almacen,
      Datos = global.Datos, Clave = global.Clave, Observaciones = global.Observaciones,
      IA = global.IA;
  var h = U.h;

  var borrador = { token: null };

  function reiniciar(params) {
    borrador = {
      token: U.id(),
      obsId: null,
      fotos: [],            // {id, url}
      chars: {},
      nota: '',
      familia: '',
      ubicacion: null,      // {lat, lon, alt, precision} | {error}
      altitudManual: null,
      pidiendoGps: false,
      masCaracteres: false,
      confirmada: false
    };
    if (params && params.especie) {
      var sp = Datos.obtener(params.especie);
      if (sp) {
        borrador.familia = sp.fam || '';
        if (sp.hab) borrador.chars.habito = sp.hab;
        Object.keys(sp.chars).slice(0, 2).forEach(function (k) { borrador.chars[k] = sp.chars[k]; });
        borrador.nota = 'Verificando contra ' + sp.nc + '.';
      }
    }
    params.__t = borrador.token;
  }

  function altitud() {
    if (borrador.altitudManual !== null && borrador.altitudManual !== '') return Number(borrador.altitudManual);
    if (borrador.ubicacion && typeof borrador.ubicacion.alt === 'number') return borrador.ubicacion.alt;
    return null;
  }

  /* ── Persistencia inmediata ────────────────────────────────────────── */
  function asegurarObservacion() {
    if (borrador.obsId) return Observaciones.obtener(borrador.obsId);
    var obs = Observaciones.crear({
      identificacion: { estado: 'borrador', intentos: 0, error: null, candidatos: [], resumen: '', ts: null }
    });
    borrador.obsId = obs.id;
    return obs;
  }

  function sincronizar() {
    if (!borrador.obsId) return null;
    var u = borrador.ubicacion || {};
    return Observaciones.actualizar(borrador.obsId, {
      chars: Object.assign({}, borrador.chars),
      nota: borrador.nota,
      familia: borrador.familia,
      lat: typeof u.lat === 'number' ? u.lat : null,
      lon: typeof u.lon === 'number' ? u.lon : null,
      alt: altitud(),
      precision: typeof u.precision === 'number' ? u.precision : null,
      fotos: borrador.fotos.map(function (f) { return f.id; })
    });
  }

  /* ── Fotos ─────────────────────────────────────────────────────────── */
  function agregarFotos(archivos) {
    var obs = asegurarObservacion();
    var tareas = Array.prototype.slice.call(archivos).map(function (archivo) {
      return Almacen.comprimir(archivo, 1280).then(function (blob) {
        var idFoto = U.id();
        return Almacen.guardarFoto({ id: idFoto, obs: obs.id, blob: blob, ts: Date.now() })
          .then(function () {
            borrador.fotos.push({ id: idFoto, url: URL.createObjectURL(blob) });
          });
      }).catch(function (e) {
        UI.toast(e.message || 'No se pudo procesar una de las fotos.', 'danger');
      });
    });
    return Promise.all(tareas).then(function () {
      sincronizar();
      pintarFotos();
      pintarCandidatos();
    });
  }

  function quitarFoto(idFoto) {
    borrador.fotos = borrador.fotos.filter(function (f) {
      if (f.id === idFoto) { URL.revokeObjectURL(f.url); return false; }
      return true;
    });
    Almacen.borrarFoto(idFoto);
    sincronizar();
    pintarFotos();
  }

  function pintarFotos() {
    var caja = U.$('#zona-fotos');
    if (!caja) return;
    if (!borrador.fotos.length) {
      caja.innerHTML =
        '<button type="button" class="zona-foto" data-accion="tomarFoto">' +
          U.Icono.camara(28) +
          '<span>Toca para tomar la foto</span>' +
          '<span class="campo__ayuda">Se guarda en el dispositivo apenas la tomes</span>' +
        '</button>';
      return;
    }
    caja.innerHTML =
      '<div class="tira-fotos">' +
        borrador.fotos.map(function (f) {
          return '<figure><img src="' + f.url + '" alt="">' +
            '<button type="button" aria-label="Quitar foto" data-accion="quitarFoto" ' +
            'data-id="' + f.id + '">' + U.Icono.cerrar(14) + '</button></figure>';
        }).join('') +
        '<button type="button" class="tag" style="align-self:center" data-accion="tomarFoto">' +
          'Agregar otra</button>' +
      '</div>';
  }

  /* ── Ubicación ─────────────────────────────────────────────────────── */
  function pedirUbicacion() {
    borrador.pidiendoGps = true;
    pintarUbicacion();
    return Observaciones.ubicacion().then(function (u) {
      borrador.pidiendoGps = false;
      borrador.ubicacion = u;
      sincronizar();
      pintarUbicacion();
      pintarCandidatos();
    });
  }

  function pintarUbicacion() {
    var caja = U.$('#zona-ubicacion');
    if (!caja) return;
    var u = borrador.ubicacion;
    var msnm = altitud();

    if (borrador.pidiendoGps) {
      caja.innerHTML = UI.card('<div class="cola">' +
        '<span class="cola__icono"><span class="girando" style="display:flex">' +
        U.Icono.sincronizar(20) + '</span></span>' +
        '<span class="cola__texto"><b>Buscando ubicación</b><span>Puede tardar bajo el dosel</span></span>' +
        '</div>');
      return;
    }

    if (u && typeof u.lat === 'number') {
      caja.innerHTML = UI.card(
        '<div class="cola">' +
          '<span class="cola__icono cola__icono--listo">' + U.Icono.marcador(20) + '</span>' +
          '<span class="cola__texto"><b>' + u.lat.toFixed(5) + ', ' + u.lon.toFixed(5) + '</b>' +
          '<span>' + (msnm !== null ? msnm + ' msnm' : 'sin altitud') +
          (u.precision ? ' · precisión ' + u.precision + ' m' : '') + '</span></span>' +
        '</div>' +
        (msnm === null
          ? '<div style="margin-top:var(--space-3)">' + UI.campoTexto({
              etiqueta: 'Altitud a mano (msnm)',
              placeholder: 'Por ejemplo, 2400', tipo: 'number', inputmode: 'numeric',
              valor: borrador.altitudManual === null ? '' : borrador.altitudManual,
              entrada: 'altitudManual',
              ayuda: 'El GPS no reportó altitud. Con ella los candidatos se acotan mucho más.'
            }) + '</div>'
          : ''));
      return;
    }

    caja.innerHTML = UI.card(
      '<div class="cola">' +
        '<span class="cola__icono cola__icono--error">' + U.Icono.marcador(20) + '</span>' +
        '<span class="cola__texto"><b>Sin ubicación</b><span>' +
          h(u && u.error ? u.error : 'Todavía no se ha consultado el GPS') + '</span></span>' +
      '</div>' +
      '<div style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-3)">' +
        UI.campoTexto({
          etiqueta: 'Altitud a mano (msnm)', placeholder: 'Por ejemplo, 2400',
          tipo: 'number', inputmode: 'numeric',
          valor: borrador.altitudManual === null ? '' : borrador.altitudManual,
          entrada: 'altitudManual',
          ayuda: 'Sin altitud la lista de candidatos sale más amplia, pero la observación se guarda igual.'
        }) +
        UI.boton({ texto: 'Reintentar ubicación', variante: 'outline', tamano: 'sm', accion: 'pedirGps' }) +
      '</div>');
  }

  /* ── Caracteres y candidatos ───────────────────────────────────────── */
  function grupoCaracter(car) {
    return '<div class="grupo-chips">' +
      '<span class="grupo-chips__titulo">' + h(car.titulo) +
        (car.ayuda ? ' · <span style="font-weight:400">' + h(car.ayuda) + '</span>' : '') + '</span>' +
      '<div class="chips">' +
        car.opciones.map(function (o) {
          return UI.tag(o.l, {
            activo: borrador.chars[car.clave] === o.v,
            accion: 'alternarCaracter',
            datos: { clave: car.clave, valor: o.v }
          });
        }).join('') +
      '</div></div>';
  }

  function pintarCaracteres() {
    var caja = U.$('#zona-caracteres');
    if (!caja) return;
    var lista = borrador.masCaracteres
      ? Clave.CARACTERES
      : Clave.CARACTERES.filter(function (c) {
          return Clave.CARACTERES_CAPTURA.indexOf(c.clave) >= 0 || borrador.chars[c.clave];
        });
    caja.innerHTML = lista.map(grupoCaracter).join('') +
      '<button type="button" class="btn btn--ghost btn--sm" style="align-self:flex-start;padding-left:0" ' +
      'data-accion="masCaracteres">' +
      (borrador.masCaracteres ? 'Ver solo lo esencial' : 'Ver todos los caracteres') + '</button>';
  }

  function rankingActual() {
    return Clave.candidatos(borrador.chars, {
      altitud: altitud(),
      familia: borrador.familia || null
    });
  }

  function pintarCandidatos() {
    var caja = U.$('#zona-candidatos');
    if (!caja) return;
    var seleccionados = Object.keys(borrador.chars).length;
    if (!seleccionados) {
      caja.innerHTML = '<p class="campo__ayuda">Elige dos o tres caracteres y aquí aparecen, ' +
        'de inmediato y sin conexión, las especies regionales compatibles.</p>';
      return;
    }
    var lista = rankingActual();
    var buenos = lista.filter(function (c) { return c.confianza >= 10; }).slice(0, 5);
    caja.innerHTML =
      '<p class="campo__ayuda">' + U.plural(buenos.length, 'candidato regional compatible',
        'candidatos regionales compatibles') + ' con lo que llevas marcado</p>' +
      '<div class="lista" style="margin-top:var(--space-2)">' +
        buenos.map(function (c) {
          return UI.card(
            '<div class="fila">' + UI.miniatura({ especie: c.especie.nc }) +
            '<span class="fila__cuerpo">' +
              '<span class="fila__nc">' + h(c.especie.nc) + '</span>' +
              '<span class="fila__com">' + h(c.especie.com || c.especie.fam || '—') + '</span>' +
              UI.barraConfianza(c.confianza) +
            '</span>' + UI.badge(c.confianza + '%', c.fuera ? 'warning' : 'secondary') + '</div>',
            { accion: 'abrirEspecie', datos: { id: c.especie.id } });
        }).join('') +
      '</div>';
    UI.hidratarImagenes(caja);
  }

  function pintarAccion() {
    var caja = U.$('#zona-accion');
    if (!caja) return;
    var listo = borrador.fotos.length > 0 || Object.keys(borrador.chars).length > 0;
    var ajustes = Almacen.ajustes();
    var aviso;
    if (!borrador.fotos.length) {
      aviso = 'Sin foto, la observación se guarda con sus candidatos regionales, pero no entra a la cola de identificación.';
    } else if (!navigator.onLine) {
      aviso = 'Sin señal: la identificación asistida queda pendiente y se resolverá sola al reconectar.';
    } else if (!ajustes.claveAnthropic && !ajustes.clavePlantNet) {
      aviso = 'Falta tu clave de PlantNet o Anthropic. La captura queda encolada y se resolverá cuando la agregues.';
    } else {
      aviso = 'La identificación asistida empieza apenas guardes.';
    }
    caja.innerHTML =
      '<p class="campo__ayuda">' + h(aviso) + '</p>' +
      UI.boton({
        texto: 'Guardar observación', variante: 'primary', tamano: 'lg', bloque: true,
        accion: 'guardar', desactivado: !listo
      }) +
      UI.boton({ texto: 'Guardar y tomar otra', variante: 'outline', bloque: true, accion: 'guardarYSeguir', desactivado: !listo });
  }

  /* ── Guardar ───────────────────────────────────────────────────────── */
  function guardar() {
    var obs = asegurarObservacion();
    sincronizar();
    var conFoto = borrador.fotos.length > 0;
    Observaciones.actualizar(obs.id, {
      identificacion: Object.assign({}, obs.identificacion, {
        estado: conFoto ? 'pendiente' : 'sin_ia'
      })
    });
    Observaciones.recalcularCandidatos(obs.id);
    borrador.confirmada = true;
    if (conFoto) setTimeout(function () { IA.procesar(); }, 300);
    return obs.id;
  }

  function salir() {
    if (!borrador.obsId || borrador.confirmada) return App.volver('inicio');
    UI.dialogo({
      titulo: '¿Guardar esta captura?',
      texto: 'Ya tienes datos registrados. Si sales sin guardar, se descartan.',
      cancelar: 'Descartar', confirmar: 'Guardar'
    }).then(function (si) {
      if (si) {
        var id = guardar();
        UI.toast('Observación guardada.', 'success');
        App.ir('observacion', { id: id }, true);
      } else {
        Observaciones.eliminar(borrador.obsId);
        borrador.obsId = null;
        App.volver('inicio');
      }
    });
  }

  App.registrar('capturar', {
    titulo: 'Nueva observación',
    sinFab: true,
    nav: null,
    html: function (params) {
      if (params.__t !== borrador.token) reiniciar(params);

      var familias = [{ valor: '', texto: 'No la sospecho' }].concat(
        Datos.familias().map(function (f) { return { valor: f, texto: f }; }));

      return '' +
        '<header class="barra">' +
          UI.iconoBoton('izquierda', 'Volver', { accion: 'salir' }) +
          '<span class="barra__titulo">Nueva observación</span>' +
        '</header>' +
        '<div class="contenido">' +
          '<input type="file" accept="image/*" capture="environment" multiple ' +
            'id="archivo-foto" class="sr" data-cambio="archivos">' +
          '<div id="zona-fotos"></div>' +
          '<div id="zona-ubicacion"></div>' +
          '<div class="encabezado-seccion"><h2>¿Qué ves en la planta?</h2></div>' +
          '<div id="zona-caracteres" style="display:flex;flex-direction:column;gap:var(--space-4)"></div>' +
          UI.campoSelect({
            etiqueta: 'Familia, si la sospechas', opciones: familias,
            valor: borrador.familia, cambio: 'familia'
          }) +
          UI.campoArea({
            etiqueta: 'Nota', placeholder: 'Lo que no cabe en los caracteres: sustrato, olor, compañía…',
            valor: borrador.nota, entrada: 'nota'
          }) +
          '<div class="encabezado-seccion"><h2>Candidatos regionales</h2></div>' +
          '<div id="zona-candidatos"></div>' +
          '<div id="zona-accion" style="display:flex;flex-direction:column;gap:var(--space-3)"></div>' +
        '</div>';
    },
    montar: function () {
      pintarFotos();
      pintarUbicacion();
      pintarCaracteres();
      pintarCandidatos();
      pintarAccion();
      if (!borrador.ubicacion && !borrador.pidiendoGps && Almacen.ajustes().gpsAutomatico) {
        pedirUbicacion();
      }
    },
    acciones: {
      salir: salir,
      tomarFoto: function () { U.$('#archivo-foto').click(); },
      archivos: function (d, nodo) {
        if (nodo.files && nodo.files.length) agregarFotos(nodo.files).then(function () { pintarAccion(); });
        nodo.value = '';
      },
      quitarFoto: function (d) { quitarFoto(d.id); pintarAccion(); },
      pedirGps: pedirUbicacion,
      altitudManual: function (d, nodo) {
        borrador.altitudManual = nodo.value === '' ? null : nodo.value;
        sincronizar();
        pintarCandidatos();
      },
      alternarCaracter: function (d) {
        if (borrador.chars[d.clave] === d.valor) delete borrador.chars[d.clave];
        else borrador.chars[d.clave] = d.valor;
        asegurarObservacion();
        sincronizar();
        pintarCaracteres();
        pintarCandidatos();
        pintarAccion();
      },
      masCaracteres: function () { borrador.masCaracteres = !borrador.masCaracteres; pintarCaracteres(); },
      familia: function (d, nodo) { borrador.familia = nodo.value; sincronizar(); pintarCandidatos(); },
      nota: function (d, nodo) { borrador.nota = nodo.value; asegurarObservacion(); sincronizar(); },
      abrirEspecie: function (d) { App.ir('especie', { id: d.id }); },
      guardar: function () {
        var id = guardar();
        UI.toast('Observación guardada — gracias por aportar al monitoreo.', 'success');
        App.ir('observacion', { id: id }, true);
      },
      guardarYSeguir: function () {
        guardar();
        UI.toast('Guardada. Sigue caminando.', 'success');
        var params = App.actual().params;
        params.__t = null;
        App.refrescar();
      }
    }
  });
})(window);
