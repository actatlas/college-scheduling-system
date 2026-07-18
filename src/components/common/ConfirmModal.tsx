import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Confirmation</p>
            <h3>{title}</h3>
            {message ? <p className="muted">{message}</p> : null}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-card__body">
          <div className="table-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="button" className="action-button" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
