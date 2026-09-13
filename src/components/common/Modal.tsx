import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export function Modal({
  isOpen,
  title,
  description,
  eyebrow,
  icon,
  onClose,
  children,
  footer,
  size,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lock body scroll, manage keyboard accessibility (Escape), initial focus & focus trap (Tab)
  useEffect(() => {
    if (!isOpen) return;

    // Save previous focus target for restoration on close (Heuristic #7: Flexibility and efficiency)
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // Prevent background scrolling behind modal (Heuristic #3: User control and freedom)
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Set initial focus inside dialog only if active element is outside
    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      // Accessible Focus Trap (Heuristic #7 & #1)
      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
      // Restore focus to trigger element when dialog closes
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === "function") {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass =
    size === "xl"
      ? "modal-card--xl"
      : size === "lg"
      ? "modal-card--lg"
      : size === "md"
      ? "modal-card--md"
      : size === "sm"
      ? "modal-card--sm"
      : size === "full"
      ? "modal-card--full"
      : "";

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`modal-card ${sizeClass} ${className || ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div className="modal-card__header-content">
            {icon && <div className="modal-card__header-icon">{icon}</div>}
            <div className="modal-card__header-text">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h3 id="modal-title">{title}</h3>
              {description ? (
                <p id="modal-description" className="modal-description muted">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="icon-button modal-card__close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-card__body">{children}</div>
        {footer && <div className="modal-card__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
