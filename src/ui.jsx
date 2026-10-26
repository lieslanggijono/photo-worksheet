import { useEffect, useState } from "react";

// Words with a soft, smudged highlighter stroke under them.
export function Crayon({ children, color = "var(--pencil)", waxy = false }) {
  if (waxy)
    // A real crayon stroke: two slightly offset passes with a waxy, broken edge.
    return (
      <span className="crayon waxy">
        {children}
        <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
          <path d="M4 9 C 45 5, 105 12, 196 6" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#wax)" pathLength="1" />
          <path className="second" d="M10 10.5 C 60 7, 120 12.5, 190 8.5" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#wax)" pathLength="1" />
        </svg>
      </span>
    );
  return (
    <span className="crayon">
      {children}
      <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
        <path d="M3 7 C 50 3, 110 10, 197 5" stroke={color} strokeWidth="9" fill="none" strokeLinecap="round" filter="url(#smudge)" />
      </svg>
    </span>
  );
}

// A 390×844 phone, scaled to fit the window height.
export function Phone({ children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 64) / 868));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="phone-wrap" style={{ width: 414 * scale, height: 868 * scale }}>
      <div className="phone" style={{ transform: `scale(${scale})` }}>
        <div className="statusbar">
          <span />
          <span className="island" />
          <span />
        </div>
        <div className="viewport">{children}</div>
        <div className="home-indicator" />
      </div>
    </div>
  );
}

export function Toast({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, toast.action ? 4000 : 2400);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  return (
    <div className="toast">
      <span>{toast.text}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action.run();
            onDone();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
