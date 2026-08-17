/* Pantalla: bienvenida. Réplica de ui_kits/mobile-app/Onboarding.jsx. */
(function (global) {
  'use strict';
  var UI = global.UI, App = global.App, Almacen = global.Almacen, Datos = global.Datos;

  function entrar() {
    Almacen.escribir(Almacen.LLAVES.visto, true);
    App.ir('inicio', {}, true);
  }

  App.registrar('onboarding', {
    titulo: 'Bienvenida',
    sinNav: true,
    sinFab: true,
    html: function () {
      var n = Datos.todas().length;
      return '<div class="onboarding">' +
        UI.montanaOnboarding() +
        '<div class="onboarding__cuerpo">' +
          '<div class="onboarding__marca">FLORANDES</div>' +
          '<div class="onboarding__bajada">Identificación de flora del bosque andino de Antioquia</div>' +
          '<div class="onboarding__pie">' +
            '<div class="onboarding__frase">Toma la foto donde estés. La identificación te alcanza después.</div>' +
            UI.boton({ texto: 'Empezar a registrar', variante: 'primary', tamano: 'lg', accion: 'entrar' }) +
            '<div class="onboarding__nota">' + n.toLocaleString('es-CO') +
              ' especies documentadas, disponibles sin conexión. ' +
              '<button type="button" data-accion="entrar">Entrar sin configurar nada</button></div>' +
          '</div>' +
        '</div></div>';
    },
    acciones: { entrar: entrar }
  });
})(window);
