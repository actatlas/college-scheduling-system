import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  isOpen,
  title,
  description,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Registrar action</p>
            <h3 id="modal-title">{title}</h3>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-card__body">{children}</div>
      </div>
    </div>
  );
}
