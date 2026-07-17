'use client'
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { db } from '@/src/lib/firebase';
import { ref, set, get, onValue, update, remove, serverTimestamp } from 'firebase/database';
import { useUserName } from '@/src/context/UserNameContext';

const MultiplayerContext = createContext();

// Reglas del juego (igual que en single player)
const REGLAS_VICTORIA = {
  roca:    ['tijera', 'lagarto'],
  papel:   ['roca',   'spock'],
  tijera:  ['papel',  'lagarto'],
  lagarto: ['spock',  'papel'],
  spock:   ['tijera', 'roca'],
};

// Genera un código de sala de 6 caracteres
const generarCodigo = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Una sala se considera abandonada si nadie da señales durante este tiempo.
// OJO: no es "creada hace X" sino "muda desde hace X" -> ver la señal de vida.
const VIDA_SIN_SENAL_MS = 10 * 60 * 1000;   // 10 minutos
const CADA_CUANTO_SENAL_MS = 60 * 1000;     // 1 minuto

export const MultiplayerProvider = ({ children }) => {
  const { setScreen } = useUserName();

  const [codigoSala, setCodigoSala]     = useState(null);
  const [rolJugador, setRolJugador]     = useState(null);   // 'jugador1' | 'jugador2'
  const [datosSala, setDatosSala]       = useState(null);   // datos en tiempo real de Firebase
  const [screenMulti, setScreenMulti]   = useState('lobby'); // 'lobby' | 'espera' | 'juego'
  const [errorSala, setErrorSala]       = useState(null);
  const [cargando, setCargando]         = useState(false);
  const [resultadoRonda, setResultadoRonda] = useState(null);

  // ─── Refs para evitar bucles infinitos ──────────────────────────
  // Guarda el valor actual de screenMulti sin meterlo como dependencia
  const screenMultiRef = useRef('lobby');
  useEffect(() => { screenMultiRef.current = screenMulti; }, [screenMulti]);

  // Evita que el efecto de resultado se ejecute más de una vez por ronda
  const procesandoRondaRef = useRef(false);

  // Guarda el temporizador que cierra la ronda. Sin esto, si alguien
  // abandona mientras corre, el temporizador escribiria sobre una sala ya
  // borrada y update() la RECREARIA, dejando salas huerfanas en Firebase.
  const timeoutRef = useRef(null);
  const cancelarTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  useEffect(() => cancelarTimeout, []);   // limpieza al desmontar

  // ─── Hora de servidor ───────────────────────────────────────────
  // El barrido lo ejecuta el movil de quien crea la sala. Si su reloj va
  // adelantado borraria salas ajenas VIVAS. Firebase publica el desfase
  // entre el reloj local y el suyo: con el, todos razonan con la misma hora.
  const offsetRelojRef = useRef(0);
  useEffect(() => {
    const unsub = onValue(ref(db, '.info/serverTimeOffset'), (s) => {
      offsetRelojRef.current = s.val() || 0;
    });
    return () => unsub();
  }, []);
  const ahoraServidor = () => Date.now() + offsetRelojRef.current;

  // ─── Señal de vida ──────────────────────────────────────────────
  // Mientras haya sala (esperando o jugando) dice "sigo aqui" cada minuto.
  // Es lo que permite que el barrido signifique "muda desde hace 10 min" en
  // vez de "creada hace 10 min", que borraria salas en uso.
  // Al irse a WhatsApp la señal se corta y se reanuda al volver.
  useEffect(() => {
    if (!codigoSala) return;
    const senal = () => {
      update(ref(db, `salas/${codigoSala}`), { ultimaSenal: serverTimestamp() }).catch(() => {});
    };
    senal();
    const iv = setInterval(senal, CADA_CUANTO_SENAL_MS);
    return () => clearInterval(iv);
  }, [codigoSala]);

  // ─── Escucha cambios en tiempo real de la sala ───────────────────
  useEffect(() => {
    if (!codigoSala) return;

    const salaRef = ref(db, `salas/${codigoSala}`);
    const unsub = onValue(salaRef, (snapshot) => {
      const datos = snapshot.val();
      if (!datos) {
        // La sala fue eliminada (el otro jugador abandonó)
        abandonarSala();
        return;
      }
      setDatosSala(datos);

      // Si el jugador 2 se unió, pasar a pantalla de juego
      // Usamos el ref para no necesitar screenMulti como dependencia
      if (datos.jugador2?.nombre && screenMultiRef.current === 'espera') {
        setScreenMulti('juego');
      }
    });

    return () => unsub();
  }, [codigoSala]); // ← sin screenMulti: evita el bucle infinito

  // ─── Detecta cuando ambos eligieron y calcula resultado ──────────
  useEffect(() => {
    if (!datosSala || !rolJugador) return;

    const j1 = datosSala.jugador1;
    const j2 = datosSala.jugador2;

    // Si alguno no tiene mano, resetea el flag y el resultado para la próxima ronda
    if (!j1?.mano || !j2?.mano) {
      procesandoRondaRef.current = false;
      setResultadoRonda(null); // ambos jugadores limpian el resultado
      return;
    }

    // Si ya procesamos esta ronda, no volvemos a hacerlo
    if (procesandoRondaRef.current) return;
    procesandoRondaRef.current = true;

    // Calcula el resultado
    const manoJ1 = j1.mano;
    const manoJ2 = j2.mano;
    let resultado;

    if (manoJ1 === manoJ2) {
      resultado = 'empate';
    } else if (REGLAS_VICTORIA[manoJ1].includes(manoJ2)) {
      resultado = 'jugador1';
    } else {
      resultado = 'jugador2';
    }

    setResultadoRonda(resultado);

    // Solo jugador1 escribe los puntajes (evita doble escritura)
    if (rolJugador === 'jugador1') {
      const nuevasVictorias = {
        victorias1: resultado === 'jugador1' ? (datosSala.victorias1 || 0) + 1 : (datosSala.victorias1 || 0),
        victorias2: resultado === 'jugador2' ? (datosSala.victorias2 || 0) + 1 : (datosSala.victorias2 || 0),
      };

      const totalRondas = datosSala.totalRondas;
      const hayGanador = nuevasVictorias.victorias1 >= totalRondas || nuevasVictorias.victorias2 >= totalRondas;

      // Solo los puntos: el estado NO pasa a finJuego todavia. Asi las dos
      // manos y el mensaje de la ronda siguen en pantalla y da tiempo a ver
      // con que mano se gano.
      update(ref(db, `salas/${codigoSala}`), nuevasVictorias);

      cancelarTimeout();
      timeoutRef.current = setTimeout(() => {
        if (hayGanador) {
          update(ref(db, `salas/${codigoSala}`), { estado: 'finJuego' });
        } else {
          update(ref(db, `salas/${codigoSala}`), {
            'jugador1/mano': null,
            'jugador2/mano': null,
          });
        }
        timeoutRef.current = null;
      }, hayGanador ? 4000 : 2500);
    }
  }, [datosSala, rolJugador, codigoSala]);

  // ─── Revancha: cuando ambos aceptan, jugador1 reinicia la sala ───
  useEffect(() => {
    if (!datosSala || rolJugador !== 'jugador1') return;
    if (datosSala.estado !== 'finJuego') return;

    const r = datosSala.revancha;
    if (!r?.jugador1 || !r?.jugador2) return;   // falta alguno por aceptar

    // Solo jugador1 escribe, igual que con los puntajes (evita colisiones)
    update(ref(db, `salas/${codigoSala}`), {
      victorias1: 0,
      victorias2: 0,
      'jugador1/mano': null,
      'jugador2/mano': null,
      estado: 'jugando',
      revancha: null,
    });
  }, [datosSala, rolJugador, codigoSala]);

  // ─── Barrido de salas mudas ──────────────────────────────────────
  // Ya no hay onDisconnect, asi que una sala cuyo creador desaparezca para
  // siempre se quedaria en Firebase eternamente. Se limpian al crear una
  // nueva, que es el momento natural.
  const barrerSalasMudas = async () => {
    const snap = await get(ref(db, 'salas'));
    const salas = snap.val();
    if (!salas) return;

    const limite = ahoraServidor() - VIDA_SIN_SENAL_MS;
    const mudas = Object.entries(salas)
      .filter(([, v]) => (v.ultimaSenal ?? v.creadoEn ?? 0) < limite)
      .map(([codigo]) => codigo);

    await Promise.all(mudas.map((c) => remove(ref(db, `salas/${c}`))));
  };

  // ─── Crear sala ───────────────────────────────────────────────────
  const crearSala = useCallback(async (nombre, totalRondas) => {
    setCargando(true);
    setErrorSala(null);

    const codigo = generarCodigo();
    const salaRef = ref(db, `salas/${codigo}`);

    const datosSalaInicial = {
      jugador1:    { nombre, mano: null },
      jugador2:    null,
      totalRondas,
      victorias1:  0,
      victorias2:  0,
      estado:      'esperando',
      // serverTimestamp y no Date.now(): si el movil tuviera la hora mal,
      // su sala se barreria al instante o no se barreria jamas.
      creadoEn:    serverTimestamp(),
      ultimaSenal: serverTimestamp(),
    };

    try {
      await set(salaRef, datosSalaInicial);

      // Antes habia un onDisconnect que borraba la sala al desconectarse.
      // Se quito: al irse a WhatsApp, Android congela la pestaña, cae el
      // WebSocket y Firebase lo tomaba por un abandono definitivo, borrando
      // la sala a los ~60s. Ahora solo muere por accion explicita
      // (cancelar / A / volver al inicio) o por el barrido de salas mudas.

      // Limpieza de fondo, sin await: no debe retrasar al usuario
      barrerSalasMudas().catch(() => {});

      setCodigoSala(codigo);
      setRolJugador('jugador1');
      setScreenMulti('espera');
    } catch (err) {
      setErrorSala('Error al crear la sala. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  // ─── Unirse a sala ────────────────────────────────────────────────
  // Devuelve true si entro. La pantalla de invitacion lo necesita para
  // saber si cambiar de pantalla o quedarse mostrando errorSala.
  const unirseASala = useCallback(async (codigo, nombre) => {
    setCargando(true);
    setErrorSala(null);

    const codigoUpper = codigo.toUpperCase().trim();
    const salaRef = ref(db, `salas/${codigoUpper}`);

    try {
      const snapshot = await get(salaRef);

      if (!snapshot.exists()) {
        setErrorSala('Sala no encontrada. Verifica el código.');
        return false;
      }

      const datos = snapshot.val();

      if (datos.jugador2?.nombre) {
        setErrorSala('La sala ya está llena.');
        return false;
      }

      await update(ref(db, `salas/${codigoUpper}/jugador2`), { nombre, mano: null });

      // Actualiza estado de la sala a jugando
      await update(ref(db, `salas/${codigoUpper}`), { estado: 'jugando' });

      setCodigoSala(codigoUpper);
      setRolJugador('jugador2');
      setScreenMulti('juego');
      return true;
    } catch (err) {
      setErrorSala('Error al unirse a la sala. Intenta de nuevo.');
      return false;
    } finally {
      setCargando(false);
    }
  }, []);

  // ─── Elegir mano ─────────────────────────────────────────────────
  const elegirMano = useCallback(async (mano) => {
    if (!codigoSala || !rolJugador) return;

    // Evita elegir si ya eligió
    const manoActual = datosSala?.[rolJugador]?.mano;
    if (manoActual) return;

    await update(ref(db, `salas/${codigoSala}/${rolJugador}`), { mano });
  }, [codigoSala, rolJugador, datosSala]);

  // ─── Pedir revancha ──────────────────────────────────────────────
  // Solo marca tu casilla. La sala se reinicia cuando ambos han aceptado,
  // en el useEffect de arriba.
  const pedirRevancha = useCallback(async () => {
    if (!codigoSala || !rolJugador) return;
    await update(ref(db, `salas/${codigoSala}/revancha`), { [rolJugador]: true });
  }, [codigoSala, rolJugador]);

  // ─── Abandonar sala ───────────────────────────────────────────────
  const abandonarSala = useCallback(async () => {
    // Primero el temporizador: si no, escribiria sobre la sala ya borrada
    // y update() la recrearia como sala huerfana.
    cancelarTimeout();

    if (codigoSala) {
      try {
        await remove(ref(db, `salas/${codigoSala}`));
      } catch (_) {}
    }
    setCodigoSala(null);
    setRolJugador(null);
    setDatosSala(null);
    setScreenMulti('lobby');
    setErrorSala(null);
    setResultadoRonda(null);
    setScreen('landing');
  }, [codigoSala, setScreen]);

  const value = {
    codigoSala,
    rolJugador,
    datosSala,
    screenMulti,
    setScreenMulti,
    errorSala,
    setErrorSala,
    cargando,
    resultadoRonda,
    setResultadoRonda,
    crearSala,
    unirseASala,
    elegirMano,
    pedirRevancha,
    abandonarSala,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) throw new Error('useMultiplayer debe usarse dentro de MultiplayerProvider');
  return context;
};
