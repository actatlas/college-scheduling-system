import { AlertCircle, AlertTriangle, HelpCircle, Loader2, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning" | "info";
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
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loadingRef.current) {
        onCancelRef.current();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === "function") {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  const getBadgeIcon = () => {
    if (isDanger) return <AlertTriangle size={20} />;
    if (isWarning) return <AlertCircle size={20} />;
    return <HelpCircle size={20} />;
  };

  const getEyebrowText = () => {
    if (isDanger) return "Destructive Action";
    if (isWarning) return "Caution";
    return "Action Confirmation";
  };

  const getEyebrowColor = () => {
    if (isDanger) return "#dc2626";
    if (isWarning) return "#d97706";
    return "var(--srcb-green, #3db166)";
  };

  const getIconContainerStyle = () => {
    if (isDanger) {
      return {
        backgroundColor: "rgba(220, 38, 38, 0.12)",
        color: "#dc2626",
      };
    }
    if (isWarning) {
      return {
        backgroundColor: "rgba(245, 158, 11, 0.14)",
        color: "#d97706",
      };
    }
    return {
      backgroundColor: "rgba(61, 177, 102, 0.12)",
      color: "var(--srcb-green, #3db166)",
    };
  };

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
        aria-describedby={message ? "confirm-dialog-description" : undefined}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div className="modal-card__header">
          <div className="modal-card__header-content" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="confirm-modal-icon-badge"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...getIconContainerStyle(),
              }}
            >
              {getBadgeIcon()}
            </div>
            <div>
              <p
                className="eyebrow"
                style={{
                  color: getEyebrowColor(),
                  margin: 0,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {getEyebrowText()}
              </p>
              <h3 id="confirm-dialog-title" style={{ margin: "2px 0 0", fontSize: "1.08rem", fontWeight: 700 }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="icon-button modal-card__close-btn"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close confirmation dialog"
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-card__body">
          {message ? (
            <div
              id="confirm-dialog-description"
              className="muted"
              style={{
                fontSize: "0.92rem",
                lineHeight: 1.55,
                color: "var(--srcb-text-body, #334155)",
                margin: "4px 0 8px",
              }}
            >
              {message}
            </div>
          ) : null}

          <div
            className="modal-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
              margin: "16px -24px -20px -24px",
              padding: "14px 24px",
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
              className={
                isDanger
                  ? "action-button action-button--danger"
                  : isWarning
                  ? "action-button action-button--warning"
                  : "action-button"
              }
              onClick={onConfirm}
              disabled={loading}
              style={
                isDanger
                  ? {
                      backgroundColor: "#dc2626",
                      borderColor: "#dc2626",
                      color: "#ffffff",
                    }
                  : isWarning
                  ? {
                      backgroundColor: "#d97706",
                      borderColor: "#d97706",
                      color: "#ffffff",
                    }
                  : undefined
              }
            >
              {loading && <Loader2 size={16} className="animate-spin" style={{ marginRight: 6 }} />}
              {loading ? "Processing…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
