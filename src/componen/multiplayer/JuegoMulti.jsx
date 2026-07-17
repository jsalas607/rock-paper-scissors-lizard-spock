'use client'
import Image from 'next/image';
import { useMultiplayer } from '@/src/context/MultiplayerContext';
import { gameOptions } from '@/src/const/const';
import styles from './JuegoMulti.module.css';

const JuegoMulti = () => {
  const {
    datosSala,
    rolJugador,
    resultadoRonda,
    elegirMano,
    pedirRevancha,
    abandonarSala,
    codigoSala,
  } = useMultiplayer();

  if (!datosSala) return null;

  const j1        = datosSala.jugador1;
  const j2        = datosSala.jugador2;
  const yo        = rolJugador === 'jugador1' ? j1 : j2;
  const rival     = rolJugador === 'jugador1' ? j2 : j1;
  const rolRival  = rolJugador === 'jugador1' ? 'jugador2' : 'jugador1';

  const misVictorias   = rolJugador === 'jugador1' ? datosSala.victorias1 : datosSala.victorias2;
  const susVictorias   = rolJugador === 'jugador1' ? datosSala.victorias2 : datosSala.victorias1;
  const totalRondas    = datosSala.totalRondas;
  const juegoTerminado = datosSala.estado === 'finJuego';

  const yoGane     = misVictorias >= totalRondas;
  const ambosEligieron = !!yo?.mano && !!rival?.mano;

  // No puedes elegir si ya elegiste o si se esta mostrando el resultado
  const bloqueada = !!yo?.mano || !!resultadoRonda;

  // Enter y Espacio son las teclas que activan un boton. Una <img> no las
  // maneja sola, hay que hacerlo a mano.
  const handleKeyDown = (e, mano) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();   // Espacio haria scroll de la pagina
      elegirMano(mano);
    }
  };

  // Mensaje del resultado de la ronda
  const mensajeRonda = () => {
    if (!resultadoRonda) return null;
    if (resultadoRonda === 'empate') return { texto: '¡Empate!', color: 'is-warning' };
    const yoGaneRonda = resultadoRonda === rolJugador;
    return yoGaneRonda
      ? { texto: '¡Ganaste la ronda!', color: 'is-success' }
      : { texto: '¡Perdiste la ronda!', color: 'is-error' };
  };

  const msj = mensajeRonda();

  // ── Pantalla de fin de juego ──────────────────────────────────────
  if (juegoTerminado) {
    // Estado de la revancha, derivado de Firebase (nadie guarda estado local)
    const revancha   = datosSala.revancha ?? {};
    const yoPedi     = !!revancha[rolJugador];
    const rivalPidio = !!revancha[rolRival];

    return (
      <div className={styles.finJuego}>
        <h1 className={`nes-text ${yoGane ? 'is-success' : 'is-error'} ${styles.finTitulo}`}>
          {yoGane
            ? `¡${yo.nombre}, ganaste la partida!`
            : `¡${yo.nombre}, perdiste la partida!`}
        </h1>
        <h2 className={`nes-text is-primary ${styles.finPuntaje}`}>
          <span className="nes-text is-success">{yo.nombre}: {misVictorias}</span>
          {' — '}
          <span className="nes-text is-error">{rival?.nombre}: {susVictorias}</span>
        </h2>

        {/* Revancha: hacen falta los dos. Cuando ambos aceptan, el contexto
            reinicia la sala solo. */}
        {rivalPidio && !yoPedi && (
          <p className={`nes-text is-warning ${styles.revanchaAviso}`}>
            ¡{rival?.nombre} quiere la revancha!
          </p>
        )}
        {yoPedi && !rivalPidio && (
          <p className={`nes-text is-disabled ${styles.revanchaAviso}`}>
            esperando a {rival?.nombre ?? 'tu rival'}...
          </p>
        )}

        <div className={styles.finAcciones}>
          <button
            className={`nes-btn ${yoPedi ? 'is-disabled' : 'is-success'} ${styles.finBtn}`}
            onClick={pedirRevancha}
            disabled={yoPedi}
          >
            {rivalPidio ? 'aceptar revancha' : 'revancha'}
          </button>
          <button
            className={`nes-btn is-primary ${styles.finBtn}`}
            onClick={abandonarSala}
          >
            volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ── Pantalla de juego ─────────────────────────────────────────────
  return (
    <div className={styles.juego}>

      {/* Marcador */}
      <div className={styles.marcador}>
        <span className={`nes-text is-success ${styles.marcadorItem}`}>
          {yo.nombre}: {misVictorias}
        </span>
        <span className={`nes-text is-disabled ${styles.marcadorSep}`}>vs</span>
        <span className={`nes-text is-error ${styles.marcadorItem}`}>
          {rival?.nombre ?? '...'}: {susVictorias}
        </span>
      </div>

      {/* Mano del rival (arriba) */}
      <div className={styles.rivalSection}>
        <p className={`nes-text is-disabled ${styles.seccionLabel}`}>{rival?.nombre ?? 'rival'}</p>
        {ambosEligieron && rival?.mano ? (
          // Muestra la mano del rival solo cuando ambos eligieron
          <div className={styles.manoRival}>
            {gameOptions.filter(o => o.name === rival.mano).map(item => (
              <Image
                key={item.name}
                src={item.image}
                alt={item.name}
                width={110}
                height={110}
                className={`${styles.svgHand} ${styles[item.name]}`}
              />
            ))}
          </div>
        ) : rival?.mano ? (
          // El rival ya eligió pero tú aún no
          <p className={`nes-text is-warning ${styles.rivalEsperandoMsj}`}>✓ ya eligió</p>
        ) : (
          // El rival aún no elige
          <p className={`nes-text is-disabled ${styles.rivalEsperandoMsj}`}>pensando...</p>
        )}
      </div>

      {/* Resultado de la ronda */}
      {msj && (
        <div className={styles.resultado}>
          <p className={`nes-text ${msj.color} ${styles.resultadoTexto}`}>{msj.texto}</p>
          {ambosEligieron && (
            <p className={`nes-text is-primary ${styles.resultadoManos}`}>
              {yo.mano} vs {rival.mano}
            </p>
          )}
        </div>
      )}

      {/* Mensaje de estado */}
      {!msj && (
        <div className={styles.estado}>
          {yo.mano
            ? <p className={`nes-text is-warning ${styles.estadoTexto}`}>esperando a {rival?.nombre ?? 'rival'}...</p>
            : <p className={`nes-text is-primary ${styles.estadoTexto}`}>{yo.nombre}, elige tu mano</p>
          }
        </div>
      )}

      {/* Manos del jugador (abajo) */}
      <div className={styles.miSection}>
        <p className={`nes-text is-disabled ${styles.seccionLabel}`}>{yo.nombre} (tú)</p>
        <div className={yo.mano ? styles.manosCentradas : styles.manos}>
          {(yo.mano
            ? gameOptions.filter(o => o.name === yo.mano)
            : gameOptions
          ).map(item => (
            <Image
              key={item.name}
              src={item.image}
              alt={item.name}
              width={110}
              height={110}
              role="button"
              aria-label={`Elegir ${item.name}`}
              aria-disabled={bloqueada}
              tabIndex={bloqueada ? -1 : 0}
              onClick={bloqueada ? undefined : () => elegirMano(item.name)}
              onKeyDown={bloqueada ? undefined : (e) => handleKeyDown(e, item.name)}
              className={`
                ${styles.svgHand}
                ${styles[item.name]}
                ${yo.mano === item.name ? styles.seleccionada : ''}
                ${bloqueada ? styles.deshabilitada : styles.activa}
              `}
            />
          ))}
        </div>
      </div>

      {/* Botón abandonar */}
      <button
        className={`nes-btn is-error ${styles.abandonar}`}
        onClick={abandonarSala}
        title="Abandonar partida"
      >
        A
      </button>
    </div>
  );
};

export default JuegoMulti;
