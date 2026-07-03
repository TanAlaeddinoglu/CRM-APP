import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

// Hover/focus ile açılan, body'ye portal edilen tooltip.
// Portal sayesinde kaydırılabilir/overflow'lu kapsayıcılar tarafından kırpılmaz.
export default function InfoTooltip({ text, size = 13 }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const placeAbove = r.top > 160;
    const HALF = 130; // max-width 260 / 2
    const left = Math.min(
      Math.max(r.left + r.width / 2, HALF + 8),
      window.innerWidth - HALF - 8
    );
    setPos({
      left,
      top: placeAbove ? r.top - 8 : r.bottom + 8,
      placement: placeAbove ? "top" : "bottom",
    });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span
      ref={ref}
      className="settings-rule-info"
      tabIndex={0}
      aria-label={text}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <Info size={size} strokeWidth={2.2} />
      {pos &&
        createPortal(
          <span
            className={`hover-tip hover-tip-${pos.placement}`}
            style={{ left: pos.left, top: pos.top }}
            role="tooltip"
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
