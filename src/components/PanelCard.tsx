import { useEffect, useRef, useState } from "react";

interface PanelCardProps {
  label: string;
  hint: string;
  value: string;
  isOpen: boolean;
  disabled: boolean;
  onOpen: () => void;
}

const FLIP_DURATION_MS = 220;

function PanelCard({ label, hint, value, isOpen, disabled, onOpen }: PanelCardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleClick() {
    if (disabled || isOpen || isFlipping) return;

    setIsFlipping(true);
    onOpen();

    timeoutRef.current = window.setTimeout(() => {
      setIsFlipping(false);
      timeoutRef.current = null;
    }, FLIP_DURATION_MS);
  }

  const shouldRevealBack = isOpen && !isFlipping;

  return (
    <button
      className={shouldRevealBack ? "panel-card panel-card--open" : isFlipping ? "panel-card panel-card--flipping" : "panel-card"}
      type="button"
      onClick={handleClick}
      disabled={disabled || isFlipping}
    >
      {shouldRevealBack ? (
        <span className="panel-card__face panel-card__face--back">
          <strong>{value}</strong>
          <small>{label}</small>
        </span>
      ) : (
        <span className="panel-card__face panel-card__face--front">
          <strong>{label}</strong>
          <small>{hint}</small>
        </span>
      )}
    </button>
  );
}

export default PanelCard;
