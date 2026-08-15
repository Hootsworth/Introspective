import { createContext, useCallback, useContext, useMemo, useState } from "react";
import styles from "./ToastProvider.module.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, options = {}) => {
    const id = crypto.randomUUID();
    const toast = { id, message, tone: options.tone || "neutral", action: options.action };
    setToasts((current) => [...current.slice(-2), toast]);
    if (options.duration !== 0) {
      window.setTimeout(() => dismiss(id), options.duration || 3600);
    }
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`} role="status">
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.message}>{toast.message}</span>
            {toast.action && <button className={styles.action} onClick={() => { toast.action.onClick(); dismiss(toast.id); }}>{toast.action.label}</button>}
            <button className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
