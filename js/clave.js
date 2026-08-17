/* FLORANDES — clave interactiva y ranking regional de candidatos.
   Un candidato nunca se oculta por venir de fuera del rango documentado: se
   muestra señalado. Esa decisión es del investigador, no de la aplicación. */
(function (global) {
  'use strict';

  var Datos = global.Datos;

  /* Caracteres de la policlave. `campo` indica de dónde se lee el valor en la
     especie: 'hab' es campo directo, el resto vive en `chars`. */
  var CARACTERES = [
    {
      clave: 'habito', campo: 'hab', titulo: 'Hábito', ayuda: 'Porte general de la planta',
      opciones: [
        { v: 'árbol', l: 'Árbol' },
        { v: 'arbusto', l: 'Arbusto' },
        { v: 'palma', l: 'Palma' },
        { v: 'trepadora', l: 'Trepadora' }
      ]
    },
    {
      clave: 'hojas', titulo: 'Tipo de hoja', ayuda: 'Lámina simple o dividida en folíolos',
      opciones: [
        { v: 'simples', l: 'Simple' },
        { v: 'compuestas pinnadas', l: 'Compuesta pinnada' },
        { v: 'compuestas bipinnadas', l: 'Compuesta bipinnada' },
        { v: 'compuestas trifoliadas', l: 'Trifoliada' }
      ]
    },
    {
      clave: 'disp', titulo: 'Disposición', ayuda: 'Cómo se insertan las hojas en la rama',
      opciones: [
        { v: 'alternas', l: 'Alternas' },
        { v: 'opuestas', l: 'Opuestas / decusadas' },
        { v: 'verticiladas', l: 'Verticiladas' }
      ]
    },
    {
      clave: 'estipulas', titulo: 'Estípulas', ayuda: 'Apéndices en la base del pecíolo',
      opciones: [
        { v: 'presentes', l: 'Presentes' },
        { v: 'ausentes', l: 'Ausentes' }
      ]
    },
    {
      clave: 'margen', titulo: 'Margen de la hoja',
      opciones: [
        { v: 'entero', l: 'Entero' },
        { v: 'aserrado', l: 'Aserrado / serrado' },
        { v: 'dentado', l: 'Dentado' },
        { v: 'lobulado', l: 'Lobulado' }
      ]
    },
    {
      clave: 'indumento', titulo: 'Indumento', ayuda: 'Pelos sobre la lámina o las ramas',
      opciones: [
        { v: 'glabro', l: 'Glabro (sin pelos)' },
        { v: 'pubescente', l: 'Pubescente' },
        { v: 'tomentoso', l: 'Tomentoso (denso)' }
      ]
    },
    {
      clave: 'hojas_nuevas', titulo: 'Hojas nuevas',
      opciones: [
        { v: 'rojizas/gránate', l: 'Rojizas / granate' },
        { v: 'verde pálido', l: 'Verde pálido' },
        { v: 'café/doradas', l: 'Café / doradas' }
      ]
    },
    {
      clave: 'latex', titulo: 'Exudado', ayuda: 'Al cortar la corteza o el pecíolo',
      opciones: [
        { v: 'látex blanco', l: 'Látex blanco' },
        { v: 'exudado colorido', l: 'Exudado colorido' }
      ]
    },
    {
      clave: 'tallo', titulo: 'Tallo y ramas',
      opciones: [
        { v: 'cuadrangular', l: 'Cuadrangular' },
        { v: 'lenticelado', l: 'Lenticelado' }
      ]
    },
    {
      clave: 'espinas', titulo: 'Espinas',
      opciones: [{ v: 'sí', l: 'Con espinas' }]
    },
    {
      clave: 'olor', titulo: 'Olor',
      opciones: [{ v: 'aromático', l: 'Aromático al estrujar' }]
    },
    {
      clave: 'fruto', titulo: 'Fruto',
      opciones: [
        { v: 'baya', l: 'Baya' },
        { v: 'drupa', l: 'Drupa' },
        { v: 'cápsula', l: 'Cápsula' },
        { v: 'legumbre/vaina', l: 'Legumbre / vaina' },
        { v: 'bellota/nuez', l: 'Bellota / nuez' },
        { v: 'sámara', l: 'Sámara' }
      ]
    }
  ];

  var PORCLAVE = {};
  CARACTERES.forEach(function (c) { PORCLAVE[c.clave] = c; });

  /* Caracteres que el spec pide en la captura rápida: dos o tres para acotar. */
  var CARACTERES_CAPTURA = ['habito', 'hojas', 'disp'];

  function definicion(clave) { return PORCLAVE[clave] || null; }

  function etiqueta(clave, valor) {
    var c = PORCLAVE[clave];
    if (!c) return valor;
    var o = c.opciones.filter(function (x) { return x.v === valor; })[0];
    return o ? o.l : valor;
  }

  function valorDe(sp, clave) {
    var c = PORCLAVE[clave];
    if (!c) return '';
    return c.campo ? (sp[c.campo] || '') : ((sp.chars && sp.chars[clave]) || '');
  }

  /* ── Comparación de una especie contra lo observado ─────────────────── */
  function comparar(sp, seleccion) {
    var claves = Object.keys(seleccion);
    var coinciden = [], difieren = [], sinDato = [];
    claves.forEach(function (clave) {
      var esperado = seleccion[clave];
      var valor = valorDe(sp, clave);
      if (!valor) sinDato.push({ clave: clave, esperado: esperado });
      else if (valor === esperado) coinciden.push({ clave: clave, valor: valor });
      else difieren.push({ clave: clave, valor: valor, esperado: esperado });
    });
    return { coinciden: coinciden, difieren: difieren, sinDato: sinDato };
  }

  /* ── Ajuste regional ───────────────────────────────────────────────── */
  var TOLERANCIA_ALTITUD = 200; // msnm: margen antes de declarar fuera de rango

  function ajusteRegional(sp, contexto) {
    contexto = contexto || {};
    var avisos = [];
    var factor = 1;

    if (!sp.antioquia) {
      factor *= 0.7;
      avisos.push({ tipo: 'zona', texto: 'No documentada para Antioquia' });
    }

    var msnm = contexto.altitud;
    if (typeof msnm === 'number' && !isNaN(msnm) && sp.alt_max < 9999) {
      if (msnm < sp.alt_min - TOLERANCIA_ALTITUD || msnm > sp.alt_max + TOLERANCIA_ALTITUD) {
        factor *= 0.55;
        avisos.push({
          tipo: 'altitud',
          texto: 'Fuera del rango documentado (' + sp.alt_min + '–' + sp.alt_max + ' msnm)'
        });
      } else if (msnm < sp.alt_min || msnm > sp.alt_max) {
        factor *= 0.85;
        avisos.push({
          tipo: 'altitud',
          texto: 'En el límite del rango documentado (' + sp.alt_min + '–' + sp.alt_max + ' msnm)'
        });
      }
    }
    return { factor: factor, avisos: avisos };
  }

  /* ── Ranking de candidatos ─────────────────────────────────────────── */
  /* seleccion: {caracter: valor}
     contexto:  {altitud, familia, universo}
     Devuelve candidatos ordenados, cada uno con su confianza y su evidencia. */
  function candidatos(seleccion, contexto) {
    contexto = contexto || {};
    var claves = Object.keys(seleccion || {});
    var universo = contexto.universo || Datos.todas();

    var lista = universo.map(function (sp) {
      if (contexto.familia && sp.fam && sp.fam !== contexto.familia) return null;

      var ev = comparar(sp, seleccion);
      var conocidos = ev.coinciden.length + ev.difieren.length;
      var puntaje;

      if (!claves.length) {
        puntaje = 0.5;
      } else if (conocidos === 0) {
        // Sin caracteres documentados: no se premia ni se descarta.
        puntaje = 0.35;
      } else {
        puntaje = ev.coinciden.length / conocidos;
        // Cada diferencia pesa fuerte: es evidencia en contra, no ruido.
        puntaje *= Math.pow(0.3, ev.difieren.length);
        // Premia a las especies bien documentadas frente a las de un solo dato.
        puntaje *= 0.75 + 0.25 * (conocidos / claves.length);
      }

      var reg = ajusteRegional(sp, contexto);
      var confianza = Math.round(100 * puntaje * reg.factor);

      return {
        especie: sp,
        confianza: Math.max(0, Math.min(99, confianza)),
        coinciden: ev.coinciden,
        difieren: ev.difieren,
        sinDato: ev.sinDato,
        conocidos: conocidos,
        avisos: reg.avisos,
        fuera: reg.avisos.length > 0,
        origen: 'regional'
      };
    }).filter(Boolean);

    lista.sort(function (a, b) {
      if (b.confianza !== a.confianza) return b.confianza - a.confianza;
      if (b.conocidos !== a.conocidos) return b.conocidos - a.conocidos;
      if (a.fuera !== b.fuera) return a.fuera ? 1 : -1;
      return a.especie.nc.localeCompare(b.especie.nc, 'es');
    });

    return lista;
  }

  var UMBRAL_CONFIABLE = 35;

  function esConfiable(lista) {
    return !!(lista.length && lista[0].confianza >= UMBRAL_CONFIABLE);
  }

  /* ── Qué carácter resolvería la duda ───────────────────────────────── */
  /* Busca, entre los caracteres aún no elegidos, el que mejor parte en dos el
     grupo de finalistas. Es lo que se le sugiere al investigador cuando la
     identificación no alcanza el umbral. */
  function caracterDiscriminante(lista, seleccion, cuantos) {
    var finalistas = lista.slice(0, cuantos || 8).map(function (c) { return c.especie; });
    if (finalistas.length < 2) return null;

    var mejor = null;
    CARACTERES.forEach(function (car) {
      if (seleccion && seleccion[car.clave]) return;
      var conteo = {}, conDato = 0;
      finalistas.forEach(function (sp) {
        var v = valorDe(sp, car.clave);
        if (!v) return;
        conDato++;
        conteo[v] = (conteo[v] || 0) + 1;
      });
      var valores = Object.keys(conteo);
      if (valores.length < 2 || conDato < 2) return;
      // Mejor reparto = el bloque mayoritario más pequeño posible.
      var mayor = Math.max.apply(null, valores.map(function (v) { return conteo[v]; }));
      var puntaje = (conDato / finalistas.length) * (1 - mayor / conDato);
      if (!mejor || puntaje > mejor.puntaje) {
        mejor = { caracter: car, puntaje: puntaje, valores: valores, cobertura: conDato };
      }
    });
    return mejor;
  }

  /* ── Cruce de un resultado externo (IA) con el dataset regional ─────── */
  /* Cada nombre propuesto se busca en el dataset; si existe, hereda sus
     caracteres diagnósticos y sus avisos regionales. Si no existe, se marca. */
  function anclar(propuestas, seleccion, contexto) {
    contexto = contexto || {};
    return (propuestas || []).map(function (p) {
      var sp = Datos.porNombre(p.nc);
      if (!sp) {
        return {
          nombre: p.nc,
          comun: p.comun || '',
          especie: null,
          confianza: Math.round(p.confianza || 0),
          confianzaIA: Math.round(p.confianza || 0),
          coinciden: [], difieren: [], sinDato: [],
          razones: p.razones || [],
          avisos: [{ tipo: 'dataset', texto: 'No está en el dataset regional de Antioquia' }],
          fuera: true,
          origen: p.origen || 'ia'
        };
      }
      var ev = comparar(sp, seleccion || {});
      var reg = ajusteRegional(sp, contexto);
      // La confianza de la IA se corrige contra lo que sabemos de la región.
      var confianza = Math.round((p.confianza || 0) * reg.factor);
      if (ev.difieren.length) confianza = Math.round(confianza * Math.pow(0.5, ev.difieren.length));
      return {
        nombre: sp.nc,
        comun: sp.com || p.comun || '',
        especie: sp,
        confianza: Math.max(0, Math.min(99, confianza)),
        confianzaIA: Math.round(p.confianza || 0),
        coinciden: ev.coinciden,
        difieren: ev.difieren,
        sinDato: ev.sinDato,
        razones: p.razones || [],
        avisos: reg.avisos,
        fuera: reg.avisos.length > 0,
        origen: p.origen || 'ia'
      };
    }).sort(function (a, b) { return b.confianza - a.confianza; });
  }

  global.Clave = {
    CARACTERES: CARACTERES,
    CARACTERES_CAPTURA: CARACTERES_CAPTURA,
    UMBRAL_CONFIABLE: UMBRAL_CONFIABLE,
    definicion: definicion, etiqueta: etiqueta, valorDe: valorDe,
    comparar: comparar, candidatos: candidatos, esConfiable: esConfiable,
    caracterDiscriminante: caracterDiscriminante, anclar: anclar
  };
})(window);
