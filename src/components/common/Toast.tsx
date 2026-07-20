import React, { createContext, useCallback, useContext, useState } from "react";

type Toast = {
  id: number;
  message: string;
  type?: "info" | "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

const ToastContext = createContext<any>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback(
    (
      message: string,
      type: Toast["type"] = "info",
      actionLabel?: string,
      onAction?: () => void,
    ) => {
      // Prevent duplicate messages stacking quickly
      setToasts((current) => {
        if (current.some((c) => c.message === message)) return current;
        const id = Date.now();
        // auto remove after 6s
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
        return [...current, { id, message, type, actionLabel, onAction }];
      });
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className={
          "toast-container" +
          (typeof window !== "undefined" &&
          window.location &&
          window.location.pathname === "/login"
            ? " toast-center"
            : "")
        }
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <span className="toast__icon">
              {t.type === "success" ? "✓" : t.type === "error" ? "!" : "i"}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <div style={{ flex: 1 }}>{t.message}</div>
              {t.actionLabel && t.onAction ? (
                <button
                  onClick={() => {
                    try {
                      t.onAction && t.onAction();
                    } catch (e) {
                      // ignore
                    }
                  }}
                  className="ghost-button"
                >
                  {t.actionLabel}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx as {
    push: (
      msg: string,
      type?: Toast["type"],
      actionLabel?: string,
      onAction?: () => void,
    ) => void;
  };
}

export default ToastProvider;
