'use client'
import { useToast } from '@/src/context/ToastContext'
import styles from './Toast.module.css'

const Toast = () => {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`nes-container is-rounded ${styles.toast}`}
        >
          {/* Los avisos van en rojo. Las confirmaciones ("Enlace copiado")
              en verde: en rojo pareceria que algo fallo. */}
          <p className={`${styles.message} ${toast.type === 'success' ? styles.exito : ''}`}>
            {toast.message}
          </p>
        </div>
      ))}
    </div>
  )
}

export default Toast
