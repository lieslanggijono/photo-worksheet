import { useRef, useState } from "react";
import { Crayon } from "./ui.jsx";

// One moment in the grid. When a moment has several takes, swipe the tile
// sideways to see them; the dots show which take is on top.
function MomentTile({ unit, onPick, action }) {
  const takes = unit.takes;
  const index = Math.max(0, takes.findIndex((t) => t.id === unit.photo.id));
  const drag = useRef(null);
  const [dx, setDx] = useState(0);

  const pointer =
    takes.length > 1
      ? {
          onPointerDown: (e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = e.clientX;
          },
          onPointerMove: (e) => drag.current != null && setDx(e.clientX - drag.current),
          onPointerUp: () => {
            if (dx < -24 && index < takes.length - 1) onPick(takes[index + 1].id);
            if (dx > 24 && index > 0) onPick(takes[index - 1].id);
            drag.current = null;
            setDx(0);
          },
          onPointerCancel: () => {
            drag.current = null;
            setDx(0);
          },
        }
      : {};

  return (
    <div className="mtile">
      <div className="mtile-track" {...pointer} style={{ transform: `translateX(calc(${-index * 100}% + ${dx}px))`, transition: dx ? "none" : undefined }}>
        {takes.map((t, i) => (
          <img key={t.id} src={t.src} alt={takes.length > 1 ? `Take ${i + 1} of ${takes.length}` : ""} draggable={false} />
        ))}
      </div>
      {takes.length > 1 && (
        <div className="dots" aria-hidden>
          {takes.map((t, i) => (
            <span key={t.id} className={i === index ? "on" : ""} />
          ))}
        </div>
      )}
      {action}
    </div>
  );
}

export default function Choose({ story, patch, units, aiDefault, pages, onBack, onGo }) {
  const [adding, setAdding] = useState(false);
  const picked = story.picked ?? aiDefault;
  const chosen = units.filter((u) => picked.has(u.id));
  const left = units.filter((u) => !picked.has(u.id));

  const toggle = (id) =>
    patch((s) => {
      const next = new Set(s.picked ?? aiDefault);
      next.has(id) ? next.delete(id) : next.add(id);
      return { picked: next };
    });
  const pickTake = (momentId, photoId) => patch((s) => ({ takePick: { ...s.takePick, [momentId]: photoId } }));

  return (
    <div className="screen choose">
      <div className="topbar">
        <button className="crayon-btn back" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
            <path d="M14.8 5.2c-2.4 2.1-4.6 4.4-6.6 6.9 2 2.3 4.3 4.6 6.8 6.7" />
          </svg>
        </button>
        <span className="topbar-title">
          <Crayon waxy color="#1f1e1d">
            {story.title}
          </Crayon>
        </span>
        <span />
      </div>
      <div className="scroll">
        <h1 className="display small">We picked {chosen.length} moments</h1>
        <div className="mgrid">
          {chosen.map((u) => (
            <MomentTile
              key={u.id}
              unit={u}
              onPick={(id) => pickTake(u.id, id)}
              action={
                <button className="remove" onClick={() => toggle(u.id)} aria-label="Remove from story">
                  ×
                </button>
              }
            />
          ))}
          {left.length > 0 && (
            <button className="mtile add" onClick={() => setAdding(true)} aria-label={`Add more photos, ${left.length} available`}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" filter="url(#wax)" aria-hidden>
                <path d="M12.3 4.6c-.2 4.9 0 9.8-.4 14.8M4.8 12.2c4.8-.3 9.6-.1 14.5-.4" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="footer">
        <button className="btn big soft compact slip" disabled={!pages.length} onClick={onGo}>
          {pages.length ? "Start writing" : "Add at least one photo"}
        </button>
      </div>

      {adding && (
        <div className="sheet-scrim" onClick={() => setAdding(false)}>
          <div className="sheet tall" role="dialog" aria-label="Add more photos" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 className="display small">Add more</h2>
              <button className="crayon-btn done-check" onClick={() => setAdding(false)} aria-label="Done">
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
                  <path d="M4.6 12.9c1.4 1.2 2.8 2.6 4.1 4.3 2.6-4.1 5.6-7.6 10.4-10.9" />
                </svg>
              </button>
            </div>
            <div className="mgrid">
              {left.map((u) => (
                <button key={u.id} className="mtile pickable" onClick={() => toggle(u.id)} aria-label="Add to story">
                  <img src={u.photo.src} alt="" draggable={false} />
                  <span className="plus crayon-plus" aria-hidden>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" filter="url(#wax)">
                      <path d="M12.3 4.6c-.2 4.9 0 9.8-.4 14.8M4.8 12.2c4.8-.3 9.6-.1 14.5-.4" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
            {!left.length && <p className="hint">Everything from the trip is in your story.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
