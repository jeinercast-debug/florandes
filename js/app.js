/* FLORANDES — armazón: navegación, estado global y arranque.
   Nav inferior con cámara centrada como tab elevado. */
(function (global) {
  'use strict';

  var U = global.U, UI = global.UI, Almacen = global.Almacen, Datos = global.Datos,
      Observaciones = global.Observaciones, IA = global.IA;

  var vistas = {};
  var pila = [];
  var raiz, cinta, fab, nav;

  var PESTANAS = [
    { clave: 'inicio', etiqueta: 'Inicio', icono: 'inicio', vista: 'inicio' },
    { clave: 'clave', etiqueta: 'Clave', icono: 'balanza', vista: 'clave' },
    { clave: 'capturar', etiqueta: '', icono: 'camara', vista: 'capturar', central: true },
    { clave: 'registros', etiqueta: 'Registros', icono: 'libro', vista: 'observaciones' },
    { clave: 'perfil', etiqueta: 'Perfil', icono: 'usuario', vista: 'perfil' }
  ];

  function registrar(nombre, definicion) { vistas[nombre] = definicion; }

  function actual() { return pila[pila.length - 1] || null; }

  function ir(nombre, params, reemplazar) {
    if (!vistas[nombre]) throw new Error('No existe la pantalla ' + nombre);
    var entrada = { nombre: nombre, params: params || {} };
    if (reemplazar || (actual() && actual().nombre === nombre)) pila[pila.length - 1] = entrada;
    else pila.push(entrada);
    pintar();
  }

  function irPestana(clave) {
    var p = PESTANAS.filter(function (x) { return x.clave === clave; })[0];
    if (!p) return;
    pila = [{ nombre: p.vista, params: {} }];
    pintar();
  }

  function volver(porDefecto) {
    if (pila.length > 1) pila.pop();
    else pila = [{ nombre: porDefecto || 'inicio', params: {} }];
    pintar();
  }

  function refrescar() { pintar(); }

  function pintar() {
    var entrada = actual();
    if (!entrada) return;
    var def = vistas[entrada.nombre];

    UI.liberarImagenes();
    raiz.scrollTop = 0;
    raiz.innerHTML = '<div class="pantalla">' + def.html(entrada.params) + '</div>';
    var pantalla = raiz.firstElementChild;

    if (def.acciones) U.enlazar(pantalla, def.acciones);
    UI.hidratarImagenes(pantalla);
    if (def.montar) def.montar(pantalla, entrada.params);

    pintarNav(def);
    actualizarCinta();
    document.title = def.titulo ? def.titulo + ' · Florandes' : 'Florandes';
  }

  function pintarNav(def) {
    var oculto = def && def.sinNav;
    nav.classList.toggle('oculto', !!oculto);
    fab.classList.toggle('oculto', true);
    if (oculto) return;

    var activa = def && def.nav;
    var pendientes = Observaciones.pendientes().length;
    var listas = Observaciones.listasSinVer().length;

    nav.innerHTML = PESTANAS.map(function (p) {
      var avisa = p.clave === 'registros' && (pendientes + listas) > 0;
      var esCentral = p.central;
      return '<button type="button" data-accion="pestana" data-clave="' + p.clave + '"' +
        (p.clave === activa ? ' aria-current="page"' : '') +
        (esCentral ? ' class="nav-cam"' : '') + '>' +
        U.Icono[p.icono](esCentral ? 24 : 22) +
        '<span>' + p.etiqueta + '</span>' +
        (avisa ? '<span class="punto" aria-label="Hay identificaciones por revisar"></span>' : '') +
        '</button>';
    }).join('');
  }

  function actualizarCinta() {
    var sinRed = !navigator.onLine;
    cinta.classList.toggle('oculto', !sinRed);
    if (sinRed) {
      cinta.innerHTML = U.Icono.sinSenal(14) +
        '<span>Sin señal. Todo lo que registres queda guardado y se resuelve al reconectar.</span>';
    }
  }

  function capturar() {
    ir('capturar', {});
  }

  function revisarEspacio() {
    Almacen.espacio().then(function (e) {
      if (e && e.apretado) {
        UI.toast('El almacenamiento del dispositivo va lleno (' + U.pesoLegible(e.usado) +
          ' usados). Libera fotos desde Perfil.', 'warning', 7000);
      }
    });
  }

  function iniciar() {
    raiz = U.$('#vista');
    cinta = U.$('#cinta');
    fab = U.$('#fab');
    nav = U.$('#nav');

    try {
      Datos.iniciar();
    } catch (e) {
      raiz.innerHTML = '<div class="contenido">' +
        UI.vacio('alerta', 'No se pudo cargar el dataset',
          'Falta data/dataset.js o está dañado. Sin él la aplicación no puede identificar nada.') +
        '</div>';
      console.error(e);
      return;
    }

    Observaciones.cargar();

    fab.classList.add('oculto');
    nav.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-accion="pestana"]');
      if (b) {
        if (b.dataset.clave === 'capturar') capturar();
        else irPestana(b.dataset.clave);
      }
    });

    global.addEventListener('online', function () { actualizarCinta(); });
    global.addEventListener('offline', function () { actualizarCinta(); });

    Observaciones.alCambiar(function () {
      var def = vistas[actual() ? actual().nombre : ''];
      if (def && !def.sinNav) pintarNav(def);
    });

    IA.alCambiar(function (evento) {
      if (evento.tipo === 'resuelta') {
        var listas = Observaciones.listasSinVer().length;
        UI.toast(listas === 1
          ? 'Una identificación quedó lista.'
          : listas + ' identificaciones quedaron listas.', 'success');
      }
      if (evento.tipo === 'error' && evento.error && evento.error.permanente) {
        UI.toast(evento.error.message, 'danger', 6500);
      }
      var nombre = actual() ? actual().nombre : '';
      if (nombre === 'inicio' || nombre === 'observaciones' || nombre === 'observacion') refrescar();
      else pintarNav(vistas[nombre] || {});
    });

    IA.iniciar();
    setTimeout(revisarEspacio, 3000);

    if (Almacen.leer(Almacen.LLAVES.visto, false)) ir('inicio');
    else ir('onboarding');

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('[florandes] no se registró el service worker:', e.message);
      });
    }
  }

  global.App = {
    registrar: registrar, ir: ir, irPestana: irPestana, volver: volver,
    refrescar: refrescar, iniciar: iniciar, capturar: capturar, actual: actual,
    PESTANAS: PESTANAS
  };
})(window);
