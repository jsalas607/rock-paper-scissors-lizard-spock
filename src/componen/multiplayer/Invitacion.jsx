'use client'
import { useState } from 'react';
import { useUserName } from '@/src/context/UserNameContext';
import { useMultiplayer } from '@/src/context/MultiplayerContext';
import { useToast } from '@/src/context/ToastContext';
import styles from './Invitacion.module.css';

// Pantalla que ve quien abre un enlace ?sala=CODIGO&de=NOMBRE.
// Va al grano: sin titulo gigante, sin selector de rondas (ya las eligio
// quien creo la sala) y sin boton de un jugador.
const Invitacion = () => {
  const { codigoInvitacion, invitadoPor, setInputValue, setScreen } = useUserName();
  const { unirseASala, errorSala, cargando } = useMultiplayer();
  const { addToast } = useToast();

  const [nombre, setNombre] = useState('');

  const entrar = async (e) => {
    e?.preventDefault();
    if (!nombre.trim()) {
      addToast('Ingresa tu nombre para jugar.');
      return;
    }
    setInputValue(nombre.trim());
    const ok = await unirseASala(codigoInvitacion, nombre.trim());
    // Si falla, errorSala ya trae el motivo y se muestra aqui abajo
    if (ok) setScreen('multiplayer');
  };

  return (
    <main className={styles.invitacion}>
      <h1 className={`nes-text is-primary ${styles.titulo}`}>
        {invitadoPor
          ? `¡${invitadoPor} te ha invitado a jugar!`
          : '¡Te han invitado a jugar!'}
      </h1>

      <p className={`nes-text is-warning ${styles.sala}`}>sala {codigoInvitacion}</p>

      {errorSala && (
        <p className={`nes-text is-error ${styles.error}`}>{errorSala}</p>
      )}

      <form className={styles.form} onSubmit={entrar}>
        <input
          type="text"
          className={`nes-input ${styles.input}`}
          placeholder="nombre de usuario"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={20}
          autoFocus
        />

        <button
          type="submit"
          className={`nes-btn is-success ${styles.btn}`}
          disabled={cargando}
        >
          {cargando ? 'entrando...' : 'entrar a la sala'}
        </button>

        <button
          type="button"
          className={`nes-btn ${styles.btn}`}
          onClick={() => setScreen('landing')}
        >
          volver al inicio
        </button>
      </form>
    </main>
  );
};

export default Invitacion;
