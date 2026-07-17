'use client'
import { useMultiplayer } from '@/src/context/MultiplayerContext';
import { useUserName } from '@/src/context/UserNameContext';
import { useToast } from '@/src/context/ToastContext';
import styles from './SalaEspera.module.css';

// Copia en cascada, de moderno a legado. navigator.clipboard solo existe en
// contextos seguros (HTTPS o localhost): al abrir el juego por la IP de la
// red local NO esta, y ahi entra execCommand.
const copiarAlPortapapeles = async (texto) => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (_) { /* sigue con la reserva */ }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

const SalaEspera = () => {
  const { codigoSala, abandonarSala } = useMultiplayer();
  const { inputValue } = useUserName();
  const { addToast } = useToast();

  const compartir = async () => {
    const nombre = inputValue?.trim() || 'Un amigo';
    // origin se lee aqui dentro, no en el cuerpo del componente: asi nunca
    // se evalua durante el prerenderizado, donde window no existe.
    const url = `${window.location.origin}/?sala=${codigoSala}&de=${encodeURIComponent(nombre)}`;
    const texto = `¡${nombre} te invita a jugar a Piedra, Papel, Tijera, Lagarto, Spock!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Piedra, Papel, Tijera, Lagarto, Spock', text: texto, url });
      } catch (_) {
        // El usuario cerro el menu de compartir: no es un error
      }
      return;
    }

    const ok = await copiarAlPortapapeles(`${texto} ${url}`);
    addToast(
      ok ? 'Enlace copiado' : 'No se pudo copiar el enlace',
      ok ? 'success' : 'error',
    );
  };

  return (
    <div className={styles.espera}>
      <h1 className={`nes-text is-primary ${styles.titulo}`}>sala creada</h1>

      <div className={`nes-container is-rounded ${styles.card}`}>
        <p className={`nes-text is-disabled ${styles.label}`}>comparte este código</p>
        <p className={`nes-text is-warning ${styles.codigo}`}>{codigoSala}</p>
        <p className={`nes-text is-disabled ${styles.hint}`}>
          dile a tu amigo que lo ingrese para unirse
        </p>
      </div>

      <div className={styles.esperando}>
        <span className={`nes-text is-primary ${styles.puntos}`}>esperando jugador</span>
        <span className={`nes-text is-primary ${styles.animacion}`}>...</span>
      </div>

      <div className={styles.acciones}>
        <button
          className={`nes-btn is-success ${styles.btn}`}
          onClick={compartir}
        >
          compartir invitación
        </button>
        <button
          className={`nes-btn is-error ${styles.btn}`}
          onClick={abandonarSala}
        >
          cancelar
        </button>
      </div>
    </div>
  );
};

export default SalaEspera;
