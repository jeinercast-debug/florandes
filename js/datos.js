/* FLORANDES — capa de datos taxonómicos.
   El dataset vive en data/dataset.js (dato puro). Aquí solo se aplica encima:
     · correcciones locales del investigador (reversibles, pendientes de consolidar),
     · especies o morfotipos registrados en campo.
   Ninguna corrección modifica el archivo fuente: se guardan aparte y se exportan. */
(function (global) {
  'use strict';

  var U = global.U, Almacen = global.Almacen;

  var CAMPOS_EDITABLES = [
    { clave: 'com', etiqueta: 'Nombres comunes', tipo: 'texto' },
    { clave: 'fam', etiqueta: 'Familia', tipo: 'texto' },
    { clave: 'hab', etiqueta: 'Hábito', tipo: 'opcion', opciones: ['árbol', 'arbusto', 'palma', 'trepadora', 'hierba'] },
    { clave: 'alt_min', etiqueta: 'Altitud mínima (msnm)', tipo: 'numero' },
    { clave: 'alt_max', etiqueta: 'Altitud máxima (msnm)', tipo: 'numero' },
    { clave: 'depts', etiqueta: 'Departamentos', tipo: 'texto' },
    { clave: 'texto', etiqueta: 'Descripción', tipo: 'largo' }
  ];

  var base = [];          // dataset del archivo, intacto
  var porId = {};         // id → especie ya resuelta (con correcciones aplicadas)
  var resueltas = [];     // lista viva usada por toda la app
  var correcciones = {};  // id → { campo: {antes, ahora, ts} }
  var propias = [];       // especies/morfotipos registrados en campo

  function version() {
    return (global.FLORANDES_DATASET && global.FLORANDES_DATASET.version) || 'desconocida';
  }

  function normalizarEspecie(sp) {
    var copia = Object.assign({}, sp);
    copia.chars = Object.assign({}, sp.chars || {});
    copia.alt_min = typeof copia.alt_min === 'number' ? copia.alt_min : 0;
    copia.alt_max = typeof copia.alt_max === 'number' ? copia.alt_max : 9999;
    if (!copia.alt_str && copia.alt_max < 9999) {
      copia.alt_str = copia.alt_min + ' - ' + copia.alt_max + ' msnm';
    }
    return copia;
  }

  function aplicarCorrecciones(sp) {
    var cor = correcciones[sp.id];
    if (!cor) return sp;
    var copia = normalizarEspecie(sp);
    Object.keys(cor).forEach(function (campo) {
      if (campo.indexOf('chars.') === 0) {
        var llave = campo.slice(6);
        var valor = cor[campo].ahora;
        if (valor === '' || valor === null) delete copia.chars[llave];
        else copia.chars[llave] = valor;
      } else {
        copia[campo] = cor[campo].ahora;
      }
    });
    copia.corregida = true;
    copia.correcciones = cor;
    if (copia.alt_min || copia.alt_max) {
      copia.alt_str = copia.alt_min + ' - ' + copia.alt_max + ' msnm';
    }
    return copia;
  }

  function reconstruir() {
    resueltas = base.map(aplicarCorrecciones)
      .concat(propias.map(function (sp) {
        var copia = normalizarEspecie(sp);
        copia.propia = true;
        return copia;
      }));
    porId = {};
    resueltas.forEach(function (sp) { porId[sp.id] = sp; });
    return resueltas;
  }

  function iniciar() {
    var fuente = global.FLORANDES_DATASET;
    if (!fuente || !Array.isArray(fuente.especies)) {
      throw new Error('No se pudo cargar data/dataset.js');
    }
    base = fuente.especies.map(normalizarEspecie);
    correcciones = Almacen.leer(Almacen.LLAVES.correcciones, {});
    propias = Almacen.leer(Almacen.LLAVES.especiesPropias, []);
    return reconstruir();
  }

  function todas() { return resueltas; }
  function obtener(idEspecie) { return porId[idEspecie] || null; }

  function porNombre(nc) {
    var buscado = U.normalizar(nc);
    for (var i = 0; i < resueltas.length; i++) {
      if (U.normalizar(resueltas[i].nc) === buscado) return resueltas[i];
    }
    // Coincidencia por género + epíteto, tolerando autoría o subespecie al final
    var partes = buscado.split(/\s+/).slice(0, 2).join(' ');
    for (var j = 0; j < resueltas.length; j++) {
      if (U.normalizar(resueltas[j].nc).indexOf(partes) === 0) return resueltas[j];
    }
    return null;
  }

  function familias() {
    var set = {};
    resueltas.forEach(function (sp) { if (sp.fam) set[sp.fam] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  }

  function buscar(consulta, filtros) {
    filtros = filtros || {};
    var q = U.normalizar(consulta || '');
    return resueltas.filter(function (sp) {
      if (filtros.habito && sp.hab !== filtros.habito) return false;
      if (filtros.familia && sp.fam !== filtros.familia) return false;
      if (filtros.zona) {
        var z = ZONAS[filtros.zona];
        if (z && !(sp.alt_min <= z[1] && sp.alt_max >= z[0])) return false;
      }
      if (filtros.soloAntioquia && !sp.antioquia) return false;
      if (filtros.soloConCaracteres && !Object.keys(sp.chars).length) return false;
      if (!q) return true;
      return U.normalizar(sp.nc).indexOf(q) >= 0 ||
        U.normalizar(sp.com).indexOf(q) >= 0 ||
        U.normalizar(sp.fam).indexOf(q) >= 0;
    });
  }

  var ZONAS = {
    subandino: [1000, 2000],
    andino: [2000, 3000],
    altoandino: [3000, 3600],
    paramo: [3600, 4500]
  };

  var ZONAS_ETIQUETA = {
    subandino: 'Subandino (1.000–2.000)',
    andino: 'Andino (2.000–3.000)',
    altoandino: 'Altoandino (3.000–3.600)',
    paramo: 'Páramo (más de 3.600)'
  };

  function zonaDeAltitud(msnm) {
    if (msnm === null || msnm === undefined) return null;
    var llaves = Object.keys(ZONAS);
    for (var i = 0; i < llaves.length; i++) {
      var r = ZONAS[llaves[i]];
      if (msnm >= r[0] && msnm < r[1]) return llaves[i];
    }
    return msnm >= 4500 ? 'paramo' : 'subandino';
  }

  /* ── Correcciones ──────────────────────────────────────────────────── */
  function corregir(idEspecie, campo, valorNuevo) {
    var original = base.filter(function (s) { return s.id === idEspecie; })[0];
    if (!original) return null;
    var antes = campo.indexOf('chars.') === 0
      ? (original.chars[campo.slice(6)] || '')
      : (original[campo] !== undefined ? original[campo] : '');
    correcciones[idEspecie] = correcciones[idEspecie] || {};
    if (String(antes) === String(valorNuevo)) {
      delete correcciones[idEspecie][campo];
      if (!Object.keys(correcciones[idEspecie]).length) delete correcciones[idEspecie];
    } else {
      correcciones[idEspecie][campo] = { antes: antes, ahora: valorNuevo, ts: Date.now() };
    }
    Almacen.escribir(Almacen.LLAVES.correcciones, correcciones);
    reconstruir();
    return obtener(idEspecie);
  }

  function revertir(idEspecie, campo) {
    if (!correcciones[idEspecie]) return obtener(idEspecie);
    if (campo) delete correcciones[idEspecie][campo];
    else delete correcciones[idEspecie];
    if (correcciones[idEspecie] && !Object.keys(correcciones[idEspecie]).length) {
      delete correcciones[idEspecie];
    }
    Almacen.escribir(Almacen.LLAVES.correcciones, correcciones);
    reconstruir();
    return obtener(idEspecie);
  }

  function correccionesDe(idEspecie) { return correcciones[idEspecie] || null; }

  function totalCorrecciones() {
    return Object.keys(correcciones).reduce(function (n, id) {
      return n + Object.keys(correcciones[id]).length;
    }, 0);
  }

  function especiesCorregidas() {
    return Object.keys(correcciones).map(obtener).filter(Boolean);
  }

  /* ── Especies registradas en campo ─────────────────────────────────── */
  function agregarPropia(datos) {
    var sp = normalizarEspecie(Object.assign({
      id: 'propia-' + U.id(),
      nc: '', fam: '', com: '', texto: '', hab: '',
      alt_min: 0, alt_max: 9999, depts: 'Antioquia', region: 'Andes',
      amenaza: '', chars: {}, antioquia: true,
      fuente: 'Registro de campo'
    }, datos));
    propias.push(sp);
    Almacen.escribir(Almacen.LLAVES.especiesPropias, propias);
    reconstruir();
    return obtener(sp.id);
  }

  function eliminarPropia(idEspecie) {
    propias = propias.filter(function (s) { return s.id !== idEspecie; });
    Almacen.escribir(Almacen.LLAVES.especiesPropias, propias);
    reconstruir();
  }

  /* ── Exportar / importar aportes ───────────────────────────────────── */
  function exportarAportes() {
    return {
      app: 'florandes',
      formato: 1,
      datasetVersion: version(),
      exportado: new Date().toISOString(),
      correcciones: correcciones,
      especies: propias
    };
  }

  function importarAportes(paquete) {
    if (!paquete || paquete.app !== 'florandes') {
      throw new Error('El archivo no es un paquete de aportes de Florandes.');
    }
    var nuevasCorrecciones = 0, nuevasEspecies = 0;
    Object.keys(paquete.correcciones || {}).forEach(function (idEspecie) {
      var entrantes = paquete.correcciones[idEspecie];
      correcciones[idEspecie] = correcciones[idEspecie] || {};
      Object.keys(entrantes).forEach(function (campo) {
        var mia = correcciones[idEspecie][campo];
        // Ante conflicto gana la corrección más reciente.
        if (!mia || (entrantes[campo].ts || 0) > (mia.ts || 0)) {
          correcciones[idEspecie][campo] = entrantes[campo];
          nuevasCorrecciones++;
        }
      });
    });
    (paquete.especies || []).forEach(function (sp) {
      if (!propias.some(function (p) { return p.id === sp.id; })) {
        propias.push(normalizarEspecie(sp));
        nuevasEspecies++;
      }
    });
    Almacen.escribir(Almacen.LLAVES.correcciones, correcciones);
    Almacen.escribir(Almacen.LLAVES.especiesPropias, propias);
    reconstruir();
    return { correcciones: nuevasCorrecciones, especies: nuevasEspecies };
  }

  /* ── Fotos de referencia (iNaturalist) ─────────────────────────────── */
  var enVuelo = {};

  function fotoReferencia(nc) {
    return Almacen.leerReferencia(nc).then(function (guardada) {
      if (guardada && guardada.blob) return guardada;
      if (!navigator.onLine || !Almacen.ajustes().fotosReferencia) return null;
      if (enVuelo[nc]) return enVuelo[nc];
      enVuelo[nc] = descargarReferencia(nc).finally(function () { delete enVuelo[nc]; });
      return enVuelo[nc];
    }).catch(function () { return null; });
  }

  function descargarReferencia(nc) {
    var url = 'https://api.inaturalist.org/v1/taxa?rank=species&per_page=1&q=' + encodeURIComponent(nc);
    return fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        var t = json && json.results && json.results[0];
        var foto = t && t.default_photo;
        if (!foto || !foto.medium_url) return null;
        return fetch(foto.medium_url).then(function (r) { return r.ok ? r.blob() : null; })
          .then(function (blob) {
            if (!blob) return null;
            var atribucion = foto.attribution || 'iNaturalist';
            return Almacen.guardarReferencia(nc, blob, atribucion)
              .then(function () { return { nc: nc, blob: blob, atribucion: atribucion }; });
          });
      })
      .catch(function () { return null; });
  }

  global.Datos = {
    CAMPOS_EDITABLES: CAMPOS_EDITABLES,
    ZONAS: ZONAS, ZONAS_ETIQUETA: ZONAS_ETIQUETA, zonaDeAltitud: zonaDeAltitud,
    iniciar: iniciar, version: version, todas: todas, obtener: obtener, porNombre: porNombre,
    familias: familias, buscar: buscar,
    corregir: corregir, revertir: revertir, correccionesDe: correccionesDe,
    totalCorrecciones: totalCorrecciones, especiesCorregidas: especiesCorregidas,
    agregarPropia: agregarPropia, eliminarPropia: eliminarPropia,
    exportarAportes: exportarAportes, importarAportes: importarAportes,
    fotoReferencia: fotoReferencia
  };
})(window);
