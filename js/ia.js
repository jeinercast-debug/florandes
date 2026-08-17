/* FLORANDES — cola de identificación asistida.
   La foto se toma donde no hay señal. Por eso la IA nunca es parte de la captura:
   se encola y se resuelve sola cuando vuelve la conexión, en orden de llegada. */
(function (global) {
  'use strict';

  var Almacen = global.Almacen, Datos = global.Datos, Clave = global.Clave,
      Observaciones = global.Observaciones;

  var MODELO_POR_DEFECTO = 'claude-sonnet-5';
  var MAX_INTENTOS = 4;

  var trabajando = false;
  var oyentes = [];

  function alCambiar(fn) { oyentes.push(fn); }
  function avisar(evento) { oyentes.forEach(function (fn) { fn(evento); }); }

  /* ── Errores con nombre ────────────────────────────────────────────── */
  function ErrorIA(clase, mensaje, permanente) {
    var e = new Error(mensaje);
    e.clase = clase;
    e.permanente = !!permanente;
    return e;
  }

  var MENSAJES = {
    sin_clave: 'Falta tu clave de Anthropic. Agrégala en Perfil › Claves de API.',
    clave_invalida: 'La clave de Anthropic no es válida. Revísala en Perfil › Claves de API.',
    sin_saldo: 'La cuenta de Anthropic no tiene saldo o superó su límite. La captura queda encolada.',
    limite: 'El servicio está limitando las peticiones. Se reintenta más adelante.',
    servicio: 'El servicio de identificación no respondió. Se reintenta más adelante.',
    red: 'Sin conexión estable. Se reintenta cuando vuelva la señal.',
    respuesta: 'La respuesta llegó incompleta. Se reintenta más adelante.'
  };

  /* ── PlantNet: paso visual ─────────────────────────────────────────── */
  function plantnet(blobs, clave) {
    if (!clave) return Promise.resolve([]);
    var forma = new FormData();
    blobs.slice(0, 5).forEach(function (b, i) {
      forma.append('images', b, 'foto' + (i + 1) + '.jpg');
      forma.append('organs', i === 0 ? 'leaf' : 'auto');
    });
    var url = 'https://my-api.plantnet.org/v2/identify/all?include-related-images=false&no-reject=false&api-key=' +
      encodeURIComponent(clave);
    return fetch(url, { method: 'POST', body: forma })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw ErrorIA('clave_invalida', 'Clave de PlantNet inválida', true);
        if (!r.ok) throw ErrorIA('servicio', 'PlantNet respondió ' + r.status);
        return r.json();
      })
      .then(function (json) {
        return (json.results || []).slice(0, 8).map(function (r) {
          return {
            nc: r.species && r.species.scientificNameWithoutAuthor,
            familia: r.species && r.species.family && r.species.family.scientificNameWithoutAuthor,
            comunes: (r.species && r.species.commonNames) || [],
            confianza: Math.round((r.score || 0) * 100)
          };
        }).filter(function (r) { return r.nc; });
      })
      .catch(function (e) {
        // PlantNet es un apoyo, no un requisito: si falla, seguimos con la IA.
        console.warn('[florandes] PlantNet no disponible:', e.message);
        return [];
      });
  }

  /* ── Contexto regional que se le entrega al modelo ─────────────────── */
  function contextoRegional(obs, candidatosOffline) {
    var lineas = [];
    lineas.push('CONTEXTO DE CAMPO');
    lineas.push('Región: bosque andino de Antioquia, Colombia.');
    if (obs.alt !== null && obs.alt !== undefined) {
      var zona = Datos.zonaDeAltitud(obs.alt);
      lineas.push('Altitud registrada: ' + obs.alt + ' msnm' +
        (zona ? ' (franja ' + Datos.ZONAS_ETIQUETA[zona] + ')' : ''));
    } else {
      lineas.push('Altitud: no disponible.');
    }
    if (obs.lat !== null && obs.lat !== undefined) {
      lineas.push('Coordenadas: ' + obs.lat.toFixed(4) + ', ' + obs.lon.toFixed(4));
    }
    var chars = Object.keys(obs.chars);
    if (chars.length) {
      lineas.push('Caracteres observados en campo por el investigador:');
      chars.forEach(function (k) {
        var def = Clave.definicion(k);
        lineas.push('  - ' + (def ? def.titulo : k) + ': ' + Clave.etiqueta(k, obs.chars[k]));
      });
    }
    if (obs.nota) lineas.push('Nota del investigador: ' + obs.nota);

    if (candidatosOffline && candidatosOffline.length) {
      lineas.push('');
      lineas.push('CANDIDATOS DEL DATASET REGIONAL (especies documentadas para la zona,');
      lineas.push('ordenadas por compatibilidad con los caracteres observados):');
      candidatosOffline.slice(0, 12).forEach(function (c) {
        var sp = c.especie;
        lineas.push('  - ' + sp.nc + (sp.fam ? ' (' + sp.fam + ')' : '') +
          (sp.com ? ' — "' + sp.com + '"' : '') +
          ' · ' + sp.alt_min + '-' + sp.alt_max + ' msnm' +
          ' · compatibilidad ' + c.confianza + '%');
      });
    }
    return lineas.join('\n');
  }

  var SISTEMA = [
    'Eres un botánico especializado en la flora del bosque andino de Antioquia, Colombia.',
    'Identificas plantas a partir de fotografías de campo y de caracteres diagnósticos observados.',
    '',
    'REGLAS INNEGOCIABLES:',
    '1. Prioriza siempre las especies documentadas para la región y el rango altitudinal indicados.',
    '   El dataset regional que recibes es evidencia de peso, no una sugerencia.',
    '2. Si propones una especie que no está en el dataset regional, decláralo y explica por qué.',
    '3. Nunca inventes un nombre para llenar el hueco. Si la evidencia no alcanza, la lista puede',
    '   quedar vacía o con confianza baja: eso es una respuesta válida y útil.',
    '4. La confianza es un número honesto entre 0 y 100, no una cortesía.',
    '5. Justifica cada candidato con caracteres morfológicos verificables frente a la planta,',
    '   no con generalidades.',
    '',
    'Verifica la validez taxonómica de los nombres con búsqueda web cuando tengas dudas',
    '(POWO, Tropicos, Catálogo de plantas y líquenes de Colombia).',
    '',
    'Responde SIEMPRE con un único bloque ```json con esta forma exacta:',
    '{"candidatos":[{"nc":"Género especie","comun":"nombre común o \\"\\"",',
    '  "confianza":0-100,"razones":["carácter observable que lo sostiene o lo descarta"]}],',
    ' "resumen":"una o dos frases para el investigador",',
    ' "caracter_que_resolveria":"qué habría que mirar en la planta para dirimir, o \\"\\""}',
    'Sin texto fuera del bloque json.'
  ].join('\n');

  function extraerJSON(texto) {
    var bloque = texto.match(/```json\s*([\s\S]*?)```/i) || texto.match(/```\s*([\s\S]*?)```/);
    var crudo = bloque ? bloque[1] : texto;
    var inicio = crudo.indexOf('{');
    var fin = crudo.lastIndexOf('}');
    if (inicio < 0 || fin < 0) throw ErrorIA('respuesta', MENSAJES.respuesta);
    try {
      return JSON.parse(crudo.slice(inicio, fin + 1));
    } catch (e) {
      throw ErrorIA('respuesta', MENSAJES.respuesta);
    }
  }

  function anthropic(obs, blobs, candidatosOffline, ajustes, sugerenciasPlantNet) {
    if (!ajustes.claveAnthropic) throw ErrorIA('sin_clave', MENSAJES.sin_clave, true);

    return Promise.all(blobs.slice(0, 3).map(function (b) {
      return Almacen.blobABase64(b).then(function (b64) {
        return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } };
      });
    })).then(function (imagenes) {
      var texto = contextoRegional(obs, candidatosOffline);
      if (sugerenciasPlantNet && sugerenciasPlantNet.length) {
        texto += '\n\nRECONOCIMIENTO VISUAL PREVIO (PlantNet, ranking global sin filtro regional):\n' +
          sugerenciasPlantNet.map(function (s) {
            return '  - ' + s.nc + (s.familia ? ' (' + s.familia + ')' : '') + ' · ' + s.confianza + '%';
          }).join('\n');
      }
      texto += '\n\nIdentifica la planta de las fotografías. Cruza el reconocimiento visual con el ' +
        'dataset regional y con los caracteres observados. Devuelve el bloque json.';

      var cuerpo = {
        model: ajustes.modelo || MODELO_POR_DEFECTO,
        max_tokens: 2000,
        system: SISTEMA,
        messages: [{ role: 'user', content: imagenes.concat([{ type: 'text', text: texto }]) }]
      };
      if (navigator.onLine) {
        cuerpo.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }];
      }

      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ajustes.claveAnthropic,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(cuerpo)
      });
    }).then(function (r) {
      if (r.status === 401) throw ErrorIA('clave_invalida', MENSAJES.clave_invalida, true);
      if (r.status === 403) throw ErrorIA('clave_invalida', MENSAJES.clave_invalida, true);
      if (r.status === 400) {
        return r.json().catch(function () { return null; }).then(function (j) {
          var msg = j && j.error && j.error.message || '';
          if (/credit|balance/i.test(msg)) throw ErrorIA('sin_saldo', MENSAJES.sin_saldo, true);
          if (/model/i.test(msg)) {
            throw ErrorIA('clave_invalida',
              'El modelo "' + (Almacen.ajustes().modelo || MODELO_POR_DEFECTO) +
              '" no está disponible para tu cuenta. Cámbialo en Perfil › Claves de API.', true);
          }
          throw ErrorIA('servicio', msg || MENSAJES.servicio);
        });
      }
      if (r.status === 429) throw ErrorIA('limite', MENSAJES.limite);
      if (!r.ok) throw ErrorIA('servicio', MENSAJES.servicio);
      return r.json();
    }).then(function (json) {
      var texto = (json.content || [])
        .filter(function (b) { return b.type === 'text'; })
        .map(function (b) { return b.text; }).join('\n');
      if (!texto) throw ErrorIA('respuesta', MENSAJES.respuesta);
      return extraerJSON(texto);
    });
  }

  /* ── Resolución de una observación ─────────────────────────────────── */
  function resolver(obs) {
    var ajustes = Almacen.ajustes();
    var candidatosOffline = Observaciones.recalcularCandidatos(obs.id);

    return Almacen.fotosDe(obs.id).then(function (fotos) {
      var blobs = fotos.map(function (f) { return f.blob; }).filter(Boolean);
      if (!blobs.length) {
        throw ErrorIA('sin_foto', 'Esta observación no tiene fotos para identificar.', true);
      }
      return plantnet(blobs, ajustes.clavePlantNet).then(function (sugerencias) {
        if (ajustes.claveAnthropic) {
          return anthropic(obs, blobs, candidatosOffline, ajustes, sugerencias)
            .then(function (respuesta) {
              return { respuesta: respuesta, plantnet: sugerencias, soloPlantNet: false };
            });
        }
        if (sugerencias.length) {
          return {
            respuesta: {
              candidatos: sugerencias.map(function (s) {
                return { nc: s.nc, comun: s.comunes && s.comunes[0] || '', confianza: s.confianza, razones: ['Identificación visual PlantNet' + (s.familia ? ' — familia ' + s.familia : '')] };
              }),
              resumen: 'Identificación con PlantNet (sin verificación de Claude). Resultados basados en reconocimiento visual global.',
              caracter_que_resolveria: ''
            },
            plantnet: sugerencias,
            soloPlantNet: true
          };
        }
        throw ErrorIA('servicio', 'PlantNet no devolvió resultados. Intenta con otra foto más clara.');
      });
    }).then(function (paquete) {
      var propuestas = (paquete.respuesta.candidatos || []).map(function (c) {
        return { nc: c.nc, comun: c.comun, confianza: c.confianza, razones: c.razones || [], origen: paquete.soloPlantNet ? 'plantnet' : 'ia' };
      });
      var anclados = Clave.anclar(propuestas, obs.chars, { altitud: obs.alt });

      Observaciones.actualizar(obs.id, {
        vista: false,
        identificacion: {
          estado: 'listo',
          intentos: obs.identificacion.intentos,
          error: null,
          ts: Date.now(),
          candidatos: anclados.map(function (c) {
            return {
              nc: c.nombre, id: c.especie ? c.especie.id : null, comun: c.comun,
              confianza: c.confianza, confianzaIA: c.confianzaIA,
              razones: c.razones, avisos: c.avisos, fuera: c.fuera, origen: c.origen
            };
          }),
          resumen: paquete.respuesta.resumen || '',
          caracterQueResolveria: paquete.respuesta.caracter_que_resolveria || '',
          plantnet: paquete.plantnet,
          modelo: paquete.soloPlantNet ? 'PlantNet' : (ajustes.modelo || MODELO_POR_DEFECTO)
        }
      });
      avisar({ tipo: 'resuelta', obs: obs.id });
    });
  }

  function fallar(obs, error) {
    var intentos = (obs.identificacion.intentos || 0) + 1;
    var agotado = error.permanente || intentos >= MAX_INTENTOS;
    Observaciones.actualizar(obs.id, {
      identificacion: Object.assign({}, obs.identificacion, {
        estado: agotado ? 'error' : 'pendiente',
        intentos: intentos,
        error: { clase: error.clase || 'servicio', mensaje: error.message, permanente: !!error.permanente },
        ts: Date.now()
      })
    });
    avisar({ tipo: 'error', obs: obs.id, error: error });
  }

  /* ── Trabajador de la cola ─────────────────────────────────────────── */
  function puedeTrabajar() {
    var ajustes = Almacen.ajustes();
    return navigator.onLine && (!!ajustes.claveAnthropic || !!ajustes.clavePlantNet) && ajustes.resolverSolo !== false;
  }

  function procesar() {
    if (trabajando) return Promise.resolve();
    if (!puedeTrabajar()) return Promise.resolve();

    var cola = Observaciones.pendientes().filter(function (o) {
      return o.identificacion.estado === 'pendiente';
    }).sort(function (a, b) { return a.ts - b.ts; });

    if (!cola.length) return Promise.resolve();

    trabajando = true;
    avisar({ tipo: 'trabajando', pendientes: cola.length });

    var siguiente = function (i) {
      if (i >= cola.length || !navigator.onLine) {
        trabajando = false;
        avisar({ tipo: 'fin' });
        return Promise.resolve();
      }
      var obs = Observaciones.obtener(cola[i].id);
      if (!obs || obs.identificacion.estado !== 'pendiente') return siguiente(i + 1);

      Observaciones.actualizar(obs.id, {
        identificacion: Object.assign({}, obs.identificacion, { estado: 'procesando' })
      });
      avisar({ tipo: 'procesando', obs: obs.id });

      return resolver(obs)
        .catch(function (e) { fallar(Observaciones.obtener(obs.id), e); })
        .then(function () { return siguiente(i + 1); });
    };

    return siguiente(0).catch(function (e) {
      trabajando = false;
      console.error('[florandes] la cola se detuvo:', e);
      avisar({ tipo: 'fin' });
    });
  }

  /* Fuerza la resolución de una observación concreta, ignorando el modo automático. */
  function resolverAhora(idObs) {
    var obs = Observaciones.obtener(idObs);
    if (!obs) return Promise.reject(new Error('La observación ya no existe'));
    if (!navigator.onLine) return Promise.reject(ErrorIA('red', MENSAJES.red));
    Observaciones.actualizar(idObs, {
      identificacion: Object.assign({}, obs.identificacion, { estado: 'procesando', error: null })
    });
    avisar({ tipo: 'procesando', obs: idObs });
    return resolver(Observaciones.obtener(idObs))
      .catch(function (e) { fallar(Observaciones.obtener(idObs), e); throw e; });
  }

  function iniciar() {
    global.addEventListener('online', function () {
      avisar({ tipo: 'conexion', online: true });
      setTimeout(procesar, 800);
    });
    global.addEventListener('offline', function () {
      avisar({ tipo: 'conexion', online: false });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) procesar();
    });
    setInterval(procesar, 60000);
    setTimeout(procesar, 1500);
  }

  global.IA = {
    MENSAJES: MENSAJES,
    MODELO_POR_DEFECTO: MODELO_POR_DEFECTO,
    iniciar: iniciar, procesar: procesar, resolverAhora: resolverAhora,
    alCambiar: alCambiar, puedeTrabajar: puedeTrabajar,
    get trabajando() { return trabajando; }
  };
})(window);
