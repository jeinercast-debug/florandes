/* Pantalla: ficha de especie. Estilo lámina de campo digital.
   El dato original nunca se pierde: toda corrección muestra qué decía antes y se revierte. */
(function (global) {
  'use strict';
  var U = global.U, UI = global.UI, App = global.App, Datos = global.Datos, Clave = global.Clave;
  var h = U.h;

  function etiquetaCampo(campo) {
    if (campo.indexOf('chars.') === 0) {
      var def = Clave.definicion(campo.slice(6));
      return def ? def.titulo : campo.slice(6);
    }
    var c = Datos.CAMPOS_EDITABLES.filter(function (x) { return x.clave === campo; })[0];
    return c ? c.etiqueta : campo;
  }

  function recorte(valor) {
    var s = String(valor === '' || valor === null || valor === undefined ? '—' : valor);
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  }

  /* ── Hoja de corrección ────────────────────────────────────────────── */
  function abrirCorreccion(sp) {
    var borrador = {};

    var campos = Datos.CAMPOS_EDITABLES.map(function (c) {
      var valor = sp[c.clave];
      if (c.tipo === 'largo') {
        return UI.campoArea({ etiqueta: c.etiqueta, valor: valor, entrada: 'editar', datos: { campo: c.clave } });
      }
      if (c.tipo === 'opcion') {
        return UI.campoSelect({
          etiqueta: c.etiqueta,
          opciones: [{ valor: '', texto: 'Sin dato' }].concat(c.opciones.map(function (o) {
            return { valor: o, texto: U.capitalizar(o) };
          })),
          valor: valor || '', cambio: 'editar', datos: { campo: c.clave }
        });
      }
      return UI.campoTexto({
        etiqueta: c.etiqueta, valor: valor,
        tipo: c.tipo === 'numero' ? 'number' : 'text',
        inputmode: c.tipo === 'numero' ? 'numeric' : null,
        entrada: 'editar', datos: { campo: c.clave, numero: c.tipo === 'numero' ? '1' : '' }
      });
    }).join('');

    var caracteres = Clave.CARACTERES.filter(function (car) { return !car.campo; }).map(function (car) {
      return UI.campoSelect({
        etiqueta: car.titulo,
        opciones: [{ valor: '', texto: 'Sin dato' }].concat(car.opciones.map(function (o) {
          return { valor: o.v, texto: o.l };
        })),
        valor: sp.chars[car.clave] || '',
        cambio: 'editar', datos: { campo: 'chars.' + car.clave }
      });
    }).join('');

    var control = UI.hoja({
      titulo: 'Corregir ' + sp.nc,
      html:
        '<p class="campo__ayuda">La corrección aplica de inmediato en tu dispositivo y queda ' +
        'marcada como pendiente de consolidar al conjunto oficial. Siempre puedes revertirla.</p>' +
        campos +
        '<div class="encabezado-seccion"><h2>Caracteres diagnósticos</h2></div>' +
        caracteres +
        '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">' +
          UI.boton({ texto: 'Guardar corrección', variante: 'primary', bloque: true, accion: 'guardar' }) +
        '</div>',
      acciones: {
        editar: function (d, nodo) {
          borrador[d.campo] = d.numero === '1' ? (nodo.value === '' ? 0 : Number(nodo.value)) : nodo.value;
        },
        guardar: function () {
          var cambios = 0;
          Object.keys(borrador).forEach(function (campo) {
            var antes = campo.indexOf('chars.') === 0
              ? (sp.chars[campo.slice(6)] || '')
              : (sp[campo] === undefined ? '' : sp[campo]);
            if (String(antes) === String(borrador[campo])) return;
            Datos.corregir(sp.id, campo, borrador[campo]);
            cambios++;
          });
          control.cerrar();
          if (cambios) {
            UI.toast(U.plural(cambios, 'dato corregido', 'datos corregidos') +
              ' — pendiente de consolidar.', 'success');
            App.refrescar();
          } else {
            UI.toast('No cambiaste ningún dato.');
          }
        }
      }
    });
  }

  /* ── Vista ─────────────────────────────────────────────────────────── */
  App.registrar('especie', {
    titulo: 'Especie',
    nav: 'especies',
    html: function (params) {
      var sp = Datos.obtener(params.id);
      if (!sp) {
        return '<header class="barra">' +
          UI.iconoBoton('izquierda', 'Volver', { accion: 'volver' }) +
          '<span class="barra__titulo">Especie</span></header>' +
          '<div class="contenido">' +
          UI.vacio('alerta', 'Esa especie ya no está', 'Puede que la hayas eliminado de tus registros.') +
          '</div>';
      }

      var etiquetas = [];
      if (sp.antioquia) etiquetas.push(UI.badge('Documentada en Antioquia', 'secondary'));
      else etiquetas.push(UI.badge('Fuera del registro de Antioquia', 'warning'));
      if (sp.amenaza === 'EN') etiquetas.push(UI.badge('En peligro', 'danger'));
      if (sp.amenaza === 'VU') etiquetas.push(UI.badge('Vulnerable', 'warning'));
      if (sp.propia) etiquetas.push(UI.badge('Registro propio', 'primary'));
      if (sp.corregida) etiquetas.push(UI.badge('Corregida por ti', 'primary'));

      var chars = Object.keys(sp.chars);
      var bloqueChars = chars.length
        ? UI.card('<div class="card__titulo">Caracteres diagnósticos</div>' +
            '<div class="chips" style="margin-top:var(--space-3)">' +
            chars.map(function (k) {
              var def = Clave.definicion(k);
              return '<span class="tag">' + h((def ? def.titulo : k) + ': ' + Clave.etiqueta(k, sp.chars[k])) + '</span>';
            }).join('') + '</div>' +
            '<div style="margin-top:var(--space-4)">' +
              UI.boton({ texto: 'Usar en la clave', variante: 'outline', tamano: 'sm', accion: 'usarEnClave' }) +
            '</div>')
        : UI.card('<div class="card__titulo">Caracteres diagnósticos</div>' +
            '<p class="campo__ayuda" style="margin-top:6px">Esta especie todavía no tiene caracteres ' +
            'estructurados. Si la conoces en campo, agrégalos con «Corregir un dato»: entra a la clave ' +
            'desde ese momento.</p>');

      var correcciones = Datos.correccionesDe(sp.id);
      var bloqueCorrecciones = correcciones
        ? UI.card('<div class="card__titulo">Correcciones pendientes de consolidar</div>' +
            '<div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-3)">' +
            Object.keys(correcciones).map(function (campo) {
              var c = correcciones[campo];
              return '<div class="correccion">' +
                '<b>' + h(etiquetaCampo(campo)) + '</b><br>' +
                '<del>' + h(recorte(c.antes)) + '</del> <ins>' + h(recorte(c.ahora)) + '</ins><br>' +
                '<button type="button" class="btn btn--ghost btn--sm" style="padding-left:0" ' +
                'data-accion="revertir" data-campo="' + h(campo) + '">' +
                U.Icono.deshacer(14) + 'Revertir</button>' +
                '</div>';
            }).join('') + '</div>')
        : '';

      var datosFicha = [
        ['Familia', sp.fam || 'Sin registrar'],
        ['Hábito', U.capitalizar(sp.hab) || 'Sin registrar'],
        ['Rango altitudinal', sp.alt_str || 'Sin registrar'],
        ['Departamentos', sp.depts || 'Sin registrar'],
        ['Región', sp.region || 'Sin registrar'],
        ['Fuente', sp.fuente || '—']
      ];

      var filaDatosItems = [
        { icono: 'hoja', valor: sp.hab ? U.capitalizar(sp.hab) : '—' },
        { icono: 'montana', valor: sp.alt_str || '—' },
        { icono: 'marcador', valor: sp.antioquia ? 'Antioquia' : sp.depts || '—' },
        { icono: 'info', valor: sp.amenaza || 'LC' }
      ];

      var esConfundible = sp.texto && sp.texto.toLowerCase().indexOf('confund') >= 0;

      return '' +
        '<div class="lamina-header">' +
          '<div>' +
            '<div class="lamina-header__marca">Florandes</div>' +
            '<div class="lamina-header__sub">Lámina de campo digital</div>' +
          '</div>' +
          '<div style="display:flex;gap:var(--space-2);align-items:center">' +
            UI.iconoBoton('izquierda', 'Volver', { accion: 'volver' }) +
            UI.iconoBoton('ajustes', 'Opciones', { accion: 'corregir' }) +
          '</div>' +
        '</div>' +
        '<div class="contenido" style="padding-top:0">' +
          '<div class="chips">' + etiquetas.join('') + '</div>' +
          UI.lamina(sp) +
          UI.filaDatos(filaDatosItems) +
          (sp.texto ? '<p class="texto-largo">' + h(sp.texto) + '</p>' : '') +
          (esConfundible ? '<div>' + UI.badge('confundible con especie similar', 'danger') + '</div>' : '') +
          bloqueChars +
          UI.card('<div class="card__titulo">Ficha</div><div style="margin-top:var(--space-2)">' +
            datosFicha.map(function (d) {
              return '<div class="dato"><span class="dato__k">' + h(d[0]) + '</span>' +
                '<span class="dato__v">' + h(d[1]) + '</span></div>';
            }).join('') + '</div>') +
          bloqueCorrecciones +
          UI.boton({ texto: 'Guardar en herbario digital', variante: 'primary', tamano: 'lg', bloque: true, accion: 'registrar', icono: 'marcador' }) +
          UI.boton({ texto: 'Corregir un dato', variante: 'outline', bloque: true, accion: 'corregir', icono: 'lapiz' }) +
          (sp.propia
            ? UI.boton({ texto: 'Eliminar este registro propio', variante: 'danger', bloque: true, accion: 'eliminarPropia' })
            : '') +
        '</div>';
    },
    acciones: {
      volver: function () { App.volver('especies'); },
      corregir: function () { abrirCorreccion(Datos.obtener(App.actual().params.id)); },
      revertir: function (d) {
        Datos.revertir(App.actual().params.id, d.campo);
        UI.toast('Se restauró el dato original.');
        App.refrescar();
      },
      registrar: function () { App.ir('capturar', { especie: App.actual().params.id }); },
      usarEnClave: function () {
        var sp = Datos.obtener(App.actual().params.id);
        var seleccion = {};
        if (sp.hab) seleccion.habito = sp.hab;
        Object.keys(sp.chars).slice(0, 4).forEach(function (k) { seleccion[k] = sp.chars[k]; });
        App.ir('clave', { seleccion: seleccion });
      },
      eliminarPropia: function () {
        var id = App.actual().params.id;
        UI.confirmar('¿Eliminar el registro?',
          'Se borra de tu dispositivo. Las observaciones que lo mencionen conservan su nota.',
          'Sí, eliminar', true).then(function (si) {
          if (!si) return;
          Datos.eliminarPropia(id);
          UI.toast('Registro eliminado.');
          App.volver('especies');
        });
      }
    }
  });
})(window);
