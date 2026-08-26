import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="modal-card modal-card--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 440 }}
      >
        <div className="modal-card__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isDanger && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "rgba(220, 38, 38, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#dc2626",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
            )}
            <div>
              <p className="eyebrow" style={{ color: isDanger ? "#dc2626" : undefined }}>
                {isDanger ? "Destructive Action" : "Confirmation"}
              </p>
              <h3 id="confirm-dialog-title" style={{ margin: 0 }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close confirmation dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-card__body">
          {message ? (
            <div
              className="muted"
              style={{
                fontSize: "0.9rem",
                lineHeight: 1.5,
                color: "var(--srcb-text, #334155)",
                marginBottom: 20,
              }}
            >
              {message}
            </div>
          ) : null}

          <div
            className="table-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={isDanger ? "action-button action-button--danger" : "action-button"}
              onClick={onConfirm}
              disabled={loading}
              style={
                isDanger
                  ? {
                      backgroundColor: "#dc2626",
                      borderColor: "#dc2626",
                      color: "#ffffff",
                    }
                  : undefined
              }
            >
              {loading ? "Processing…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
