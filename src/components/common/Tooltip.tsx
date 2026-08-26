import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  delay = 100,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [computedPosition, setComputedPosition] = useState<"top" | "bottom" | "left" | "right">(position);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto collision detection to ensure tooltips are never cut off by viewport edges
  const checkBoundsAndSetPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    
    let targetPos = position;
    // If requested top, but too close to the top of viewport (e.g. in the topbar header)
    if (position === "top" && rect.top < 65) {
      targetPos = "bottom";
    } else if (position === "bottom" && rect.bottom > window.innerHeight - 65) {
      targetPos = "top";
    } else if (position === "left" && rect.left < 100) {
      targetPos = "right";
    } else if (position === "right" && rect.right > window.innerWidth - 100) {
      targetPos = "left";
    }

    setComputedPosition(targetPos);
  }, [position]);

  const handleShow = () => {
    checkBoundsAndSetPosition();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      checkBoundsAndSetPosition();
      setIsVisible(true);
    }, delay);
  };

  const handleHide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Compute position variants for Apple-style subtle floating motion with correct centering
  const getVariants = () => {
    switch (computedPosition) {
      case "bottom":
        return {
          initial: { opacity: 0, x: "-50%", y: -6, scale: 0.94 },
          animate: { opacity: 1, x: "-50%", y: 0, scale: 1 },
          exit: { opacity: 0, x: "-50%", y: -4, scale: 0.96 },
        };
      case "left":
        return {
          initial: { opacity: 0, x: 6, y: "-50%", scale: 0.94 },
          animate: { opacity: 1, x: 0, y: "-50%", scale: 1 },
          exit: { opacity: 0, x: 4, y: "-50%", scale: 0.96 },
        };
      case "right":
        return {
          initial: { opacity: 0, x: -6, y: "-50%", scale: 0.94 },
          animate: { opacity: 1, x: 0, y: "-50%", scale: 1 },
          exit: { opacity: 0, x: -4, y: "-50%", scale: 0.96 },
        };
      case "top":
      default:
        return {
          initial: { opacity: 0, x: "-50%", y: 6, scale: 0.94 },
          animate: { opacity: 1, x: "-50%", y: 0, scale: 1 },
          exit: { opacity: 0, x: "-50%", y: 4, scale: 0.96 },
        };
    }
  };

  const variants = getVariants();

  return (
    <div
      ref={triggerRef}
      className={`srcb-tooltip-wrapper ${className}`}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      style={{
        display: "inline-flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}

      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            className={`srcb-apple-tooltip srcb-apple-tooltip--${computedPosition}`}
            role="tooltip"
            aria-hidden="true"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="srcb-apple-tooltip__label">{content}</span>
            <span className="srcb-apple-tooltip__arrow" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
