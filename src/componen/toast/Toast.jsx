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
          <p className={styles.message}>{toast.message}</p>
        </div>
      ))}
    </div>
  )
}

export default Toast
