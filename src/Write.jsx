import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GENERIC_SPEECH, SAMPLE_SPEECH, questionsFor } from "./decisions.js";
import { playKey, playMic } from "./sound.js";
import { fmtDay, fmtTime } from "./photos.js";

// Live dictation. Uses the browser's speech recognition when it works;
// otherwise plays back a sample sentence word by word so the flow can still
// be felt. (Wispr Flow needs nothing from us: it types straight into the
// lines like a keyboard.)
function useDictation({ onFinal, onActivity, fallbackText, onFallback }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef(null);
  const sim = useRef(null);
  const cb = useRef({ onFinal, onActivity, fallbackText, onFallback });
  cb.current = { onFinal, onActivity, fallbackText, onFallback };

  const simulate = useCallback(() => {
    cb.current.onFallback?.();
    const words = cb.current.fallbackText.split(" ");
    let i = 0;
    setListening(true);
    sim.current = setInterval(() => {
      i += 1;
      playKey("a"); // each word landing on the line clicks like a key
      cb.current.onActivity();
      if (i >= words.length) {
        clearInterval(sim.current);
        sim.current = null;
        setInterim("");
        setListening(false);
        cb.current.onFinal(words.join(" "));
      } else setInterim(words.slice(0, i).join(" "));
    }, 170);
  }, []);

  const stop = useCallback(() => {
    playMic(false);
    if (sim.current) {
      clearInterval(sim.current);
      sim.current = null;
      setInterim((t) => {
        if (t) cb.current.onFinal(t);
        return "";
      });
      setListening(false);
    }
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    playMic(true); // the crayon mic turns dark with a click
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return simulate();
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    let heard = false;
    r.onresult = (e) => {
      heard = true;
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) cb.current.onFinal(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      const said = live.trim();
      setInterim((was) => {
        if (said.split(" ").length > (was ? was.split(" ").length : 0)) playKey("a");
        return said;
      });
      cb.current.onActivity();
    };
    r.onerror = () => {
      rec.current = null;
      setListening(false);
      if (!heard) simulate();
    };
    r.onend = () => {
      if (rec.current === r) rec.current = null;
      setListening(false);
      setInterim("");
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      simulate();
    }
  }, [simulate]);

  useEffect(() => () => stop(), [stop]);
  return { listening, interim, start, stop };
}

const PHOTO_H = { medium: 220, between: 185, small: 150 };
const COLLAPSED_H = 72;
const FONT = { magazine: 14.5, heldane: 14, serif: 14.5, hand: 19, sans: 14 };

function Sheet({
  page,
  text,
  lab,
  question,
  showQ,
  dragStyle,
  pointer,
  readOnly,
  onText,
  interim,
  listening,
  textRef,
  pageLabel,
  place,
  micStyle,
  onMic,
}) {
  const shown = interim ? `${text}${text && !/\s$/.test(text) ? " " : ""}${interim}` : text;
  const localRef = useRef(null);
  const ref = textRef ?? localRef;
  // A blinking cursor first; if you haven't started after 2 seconds, a soft
  // hint appears.
  const [hint, setHint] = useState(false);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    setHint(false);
    if (readOnly) return;
    const t = setTimeout(() => setHint(true), 2000);
    ref.current?.focus({ preventScroll: true });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, readOnly]);
  const [collapsedAt, setCollapsedAt] = useState(null);
  const collapsed = lab.overflow === "grow" && collapsedAt != null;

  // Keep long writing on the page, per the overflow decision.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const base = FONT[lab.font];
    let size = base;
    const apply = () => {
      el.style.fontSize = `${size}px`;
      el.style.setProperty("--lh", `${Math.round(Math.max(size * 1.8, 22))}px`);
    };
    apply();
    if (lab.overflow === "shrink") {
      while (el.scrollHeight > el.clientHeight + 1 && size > 12) {
        size -= 1;
        apply();
      }
    }
    if (lab.overflow === "grow") {
      if (collapsedAt == null && el.scrollHeight > el.clientHeight + 1) setCollapsedAt(shown.length);
      if (collapsedAt != null && shown.length < collapsedAt - 20) setCollapsedAt(null);
    }
  }, [shown, lab.font, lab.overflow, lab.photoSize, lab.layout, collapsedAt, ref]);

  const pnum = pageLabel && <div className="pnum">{pageLabel}</div>;

  return (
    <div className={`sheet ${lab.layout} corners-${lab.corners} frame-${lab.frame}`} style={dragStyle} {...pointer}>
      <div className="photo-card">
        <div className="photo-frame" style={{ height: collapsed ? COLLAPSED_H : "var(--ws-photo-h, 220px)" }}>
          {/* Fixed height, natural width: the whole photo shows, never cropped. */}
          <div className="photo-fit">
            <img src={page.photo.src} alt="" draggable={false} />
          </div>
        </div>
        {/* Where and when, on one quiet line under the photo. */}
        {place != null && (
          <div className={`photo-meta align-${lab.metaAlign ?? "center"}`}>
            <span className="place">{place}</span> {fmtDay(page.photo.time)} · {fmtTime(page.photo.time)}
          </div>
        )}
      </div>
      <div className="paper-card">
        <div className="dream">
          <p key={question} className={`dq ${lab.appear} ${showQ ? "show" : ""}`} aria-live="polite" aria-hidden={!showQ}>
            {question}
          </p>
        </div>
        {micStyle === "crayon" && (
          <button className={`mic-crayon ${listening || pressed ? "on" : ""}`} onPointerDown={() => setPressed(true)} onPointerUp={() => setTimeout(() => setPressed(false), 400)} onClick={onMic} aria-label={listening ? "Stop dictation" : "Start dictation"} tabIndex={readOnly ? -1 : 0}>
            <CrayonMic />
          </button>
        )}
        <textarea
          ref={ref}
          className={`lines ${lab.paper} font-${lab.font} ${listening ? "listening" : ""} ${micStyle === "crayon" ? "with-mic" : ""}`}
          value={shown}
          readOnly={readOnly || !!interim}
          placeholder={hint ? "Tap the mic and talk" : ""}
          aria-label="Write about this photo"
          onChange={(e) => onText?.(e.target.value)}
        />
        {pnum}
      </div>
      {micStyle === "button" && (
        <button className={`mic mic-under ${listening ? "on" : ""}`} onClick={onMic} aria-label={listening ? "Stop dictation" : "Start dictation"} tabIndex={readOnly ? -1 : 0}>
          <MicIcon />
          {listening && <span className="pulse" />}
        </button>
      )}
    </div>
  );
}

export default function Write({ lab, story, patch, pages, say, onBack, onDone }) {
  const index = Math.min(story.index, Math.max(0, pages.length - 1));
  const page = pages[index];
  const [leaving, setLeaving] = useState(null);
  const [enter, setEnter] = useState(null);
  const [drag, setDrag] = useState(null);
  const [menu, setMenu] = useState(false);
  const [overview, setOverview] = useState(false);
  const wheel = useRef({ sum: 0, until: 0, reset: null });
  const hold = useRef({ timer: null, fired: false });
  const [showQ, setShowQ] = useState(false);
  const [qi, setQi] = useState(0);
  const last = useRef(Date.now());
  const textRef = useRef(null);

  const text = page ? story.entries[page.id] ?? "" : "";
  const setText = useCallback(
    (v) => page && patch((s) => ({ entries: { ...s.entries, [page.id]: v } })),
    [page, patch]
  );

  const activity = useCallback(() => {
    last.current = Date.now();
    setShowQ((was) => {
      if (was) setQi((q) => q + 1);
      return false;
    });
  }, []);

  const dict = useDictation({
    onFinal: (words) =>
      page &&
      patch((s) => {
        const prev = s.entries[page.id] ?? "";
        return { entries: { ...s.entries, [page.id]: prev + (prev && !/\s$/.test(prev) ? " " : "") + words } };
      }),
    onActivity: activity,
    fallbackText: SAMPLE_SPEECH[page?.photo.tag] ?? GENERIC_SPEECH,
    onFallback: () => say("No mic here, so this is a sample sentence. Open in Chrome to talk for real."),
  });

  // The dream question: shows after `delay` seconds without typing or talking,
  // then moves on to a new question every 3 seconds while it stays quiet.
  const shownAt = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (dict.interim || Date.now() - last.current < lab.delay * 1000) return;
      setShowQ((was) => {
        if (!was) shownAt.current = Date.now();
        else if (Date.now() - shownAt.current >= 3000) {
          shownAt.current = Date.now();
          setQi((q) => q + 1);
        }
        return true;
      });
    }, 300);
    return () => clearInterval(id);
  }, [lab.delay, dict.interim]);

  useEffect(() => {
    last.current = Date.now();
    setShowQ(false);
    setQi(0);
    setMenu(false);
  }, [page?.id]);

  // Left/right keys move along the timeline when you're not typing.
  const goRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") goRef.current?.(1);
      if (e.key === "ArrowLeft") goRef.current?.(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!page) {
    return (
      <div className="screen write empty">
        <div className="topbar">
          <button className="crayon-btn back" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
              <path d="M14.8 5.2c-2.4 2.1-4.6 4.4-6.6 6.9 2 2.3 4.3 4.6 6.8 6.7" />
            </svg>
          </button>
          <span className="topbar-title">{story.title}</span>
          <span />
        </div>
        <div className="empty-card">
          {story.skipped.size ? (
            <>
              <p>You left every photo out, so there's nothing to write on.</p>
              <button className="btn small" onClick={() => patch({ skipped: new Set(), index: 0 })}>
                Bring back {story.skipped.size} skipped
              </button>
            </>
          ) : (
            <>
              <p>There are no photos from these dates.</p>
              <button className="btn small" onClick={onBack}>
                Choose different dates
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const questions = questionsFor(page.photo.tag, lab.voice);
  const question = questions[qi % questions.length];
  const pageLabel = `${index + 1}/${pages.length}`;
  const swipeNav = true;

  const snapshot = (kind) => ({ page, text, kind, id: Math.random() });

  const go = (dir) => {
    const next = index + dir;
    if (dict.listening) dict.stop();
    if (next < 0) return;
    if (next >= pages.length) return onDone();
    // Left to right, in the order things happened: the page you finish slides
    // off to the left and the next moment slides in from the right.
    setLeaving(snapshot(dir > 0 ? "slide-next" : "slide-prev"));
    setEnter(dir > 0 ? "slide-in-right" : "slide-in-left");
    patch({ index: next });
  };
  goRef.current = go;

  const skip = () => {
    if (dict.listening) dict.stop();
    setMenu(false);
    const id = page.id;
    setLeaving(snapshot("skip"));
    patch((s) => ({ skipped: new Set([...s.skipped, id]), index: Math.min(s.index, pages.length - 2) }));
    say("Left out of the story", {
      label: "Undo",
      run: () =>
        patch((s) => {
          const sk = new Set(s.skipped);
          sk.delete(id);
          return { skipped: sk };
        }),
    });
    if (pages.length === 1) onDone();
  };

  const nextTake = () => {
    const takes = page.takes;
    const i = takes.findIndex((t) => t.id === page.photo.id);
    const t = takes[(i + 1) % takes.length];
    patch((s) => ({ takePick: { ...s.takePick, [page.moment.id]: t.id } }));
    setMenu(false);
  };

  // Swipe left for the next moment, right for the one before. Flicking up
  // leaves a photo out when that option is on; a long press opens the photo
  // menu when "Hold" is on.
  const startHold = () => {
    clearTimeout(hold.current.timer);
    hold.current.fired = false;
    if (lab.skip !== "hold") return;
    hold.current.timer = setTimeout(() => {
      hold.current.fired = true;
      setDrag(null);
      setMenu(true);
      navigator.vibrate?.(10);
    }, 500);
  };
  const pointer = {
    onPointerDown: (e) => {
      if (e.target.closest("button, textarea")) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
      startHold();
    },
    onPointerMove: (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 8) clearTimeout(hold.current.timer);
      setDrag((d) => d && { ...d, dx, dy });
    },
    onPointerUp: () => {
      clearTimeout(hold.current.timer);
      if (!drag || hold.current.fired) return setDrag(null);
      const { dx, dy } = drag;
      setDrag(null);
      const vertical = Math.abs(dy) > Math.abs(dx);
      if (!vertical && dx < -60) go(1);
      else if (!vertical && dx > 60) go(-1);
      else if (vertical && dy < -90 && lab.skip === "swipe-up") skip();
    },
    onPointerCancel: () => {
      clearTimeout(hold.current.timer);
      setDrag(null);
    },
  };

  // A trackpad's sideways swipe moves along the timeline too.
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const w = wheel.current;
    if (Date.now() < w.until) return;
    w.sum += e.deltaX;
    clearTimeout(w.reset);
    w.reset = setTimeout(() => (w.sum = 0), 180);
    if (Math.abs(w.sum) > 60) {
      go(w.sum > 0 ? 1 : -1);
      w.sum = 0;
      w.until = Date.now() + 650;
    }
  };

  const vertical = drag && Math.abs(drag.dy) > Math.abs(drag.dx);
  const dragStyle = drag
    ? vertical
      ? lab.skip === "swipe-up" && drag.dy < 0
        ? { transform: `translateY(${drag.dy * 0.6}px)`, opacity: 1 - Math.min(-drag.dy, 200) / 400, transition: "none" }
        : undefined
      : { transform: `translateX(${drag.dx * 0.55}px)`, transition: "none" }
    : undefined;

  const nextPage = pages[index + 1];

  const photoMenu = menu && (
    <>
      <div className="menu-scrim" onClick={() => setMenu(false)} />
      <div className={`photo-menu ${lab.skip}`} role="menu">
        {page.takes.length > 1 && (
          <button role="menuitem" onClick={nextTake}>
            Try another take ({page.takes.length})
          </button>
        )}
        <button role="menuitem" onClick={skip}>
          Leave this photo out
        </button>
      </div>
    </>
  );

  const hint =
    index === 0 &&
    [
      "Swipe left for what happened next",
      lab.skip === "swipe-up" && "flick up to leave it out",
      lab.skip === "hold" && "hold it for options",
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="screen write">
      <div className="topbar">
        <button className="crayon-btn back" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
            <path d="M14.8 5.2c-2.4 2.1-4.6 4.4-6.6 6.9 2 2.3 4.3 4.6 6.8 6.7" />
          </svg>
        </button>
        <span />
        <div className="topbar-right">
          <button
            className={`crayon-btn ${overview ? "on" : ""}`}
            onClick={() => setOverview((v) => !v)}
            aria-label="See all pages"
            aria-pressed={overview}
          >
            <CrayonGrid />
          </button>
          <DoneButton style={lab.doneStyle} onClick={onDone} />
        </div>
      </div>

      {photoMenu}

      {overview && (
        <PagesGrid
          story={story}
          pages={pages}
          index={index}
          patch={patch}
          say={say}
          onClose={() => setOverview(false)}
          onJump={(i) => {
            if (dict.listening) dict.stop();
            patch({ index: i });
            setOverview(false);
          }}
        />
      )}

      <div className="book" onWheel={onWheel}>
        <div key={page.id} className={`page-holder ${enter ?? ""}`} onAnimationEnd={() => setEnter(null)}>
          <Sheet
            page={page}
            text={text}
            lab={lab}
            question={question}
            showQ={showQ}
            dragStyle={dragStyle}
            pointer={pointer}
            onText={(v) => {
              setText(v);
              activity();
            }}
            interim={dict.interim}
            listening={dict.listening}
            textRef={textRef}
            pageLabel={pageLabel}
            place={story.title}
            micStyle={lab.micStyle}
            onMic={() => (dict.listening ? dict.stop() : (activity(), dict.start()))}
          />
        </div>
        {leaving && (
          <div key={leaving.id} className={`page-holder leaving ${leaving.kind}`} onAnimationEnd={() => setLeaving(null)}>
            <Sheet page={leaving.page} text={leaving.text} lab={lab} question="" showQ={false} readOnly place={story.title} micStyle={lab.micStyle} />
          </div>
        )}
      </div>

      <Timeline
        story={story}
        pages={pages}
        index={index}
        onJump={(i) => {
          if (i === index) return;
          if (dict.listening) dict.stop();
          setLeaving(snapshot(i > index ? "slide-next" : "slide-prev"));
          setEnter(i > index ? "slide-in-right" : "slide-in-left");
          patch({ index: i });
        }}
      />

      <div className="swipe-hint">{hint || " "}</div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

// Every page at a glance while writing: what's written, what's still blank.
// Three takes on the same idea, switched from the lab.
function Overview({ variant, story, pages, index, onClose, onJump }) {
  const entry = (p) => (story.entries[p.id] ?? "").trim();
  const written = pages.filter(entry).length;
  return (
    <div className="overview" role="dialog" aria-label="All pages">
      <div className="overview-head">
        <div>
          <div className="overview-title">{story.title}</div>
          <div className="overview-meta">
            {written}/{pages.length} written
          </div>
        </div>
        <button className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className={`overview-body ${variant}`}>
        {pages.map((p, i) => {
          const words = entry(p);
          const label = `Page ${i + 1}${words ? ", written" : ", blank"}`;
          if (variant === "contact") {
            return (
              <button key={p.id} className={`ov-contact ${i === index ? "current" : ""}`} onClick={() => onJump(i)} aria-label={label}>
                <img src={p.photo.src} alt="" />
                {words && <span className="ov-dot" />}
              </button>
            );
          }
          if (variant === "list") {
            return (
              <button key={p.id} className={`ov-row ${i === index ? "current" : ""}`} onClick={() => onJump(i)} aria-label={label}>
                <img src={p.photo.src} alt="" />
                <div>
                  <div className="ov-row-meta">
                    {i + 1}/{pages.length} · {fmtDay(p.photo.time)} · {fmtTime(p.photo.time)}
                  </div>
                  <p className={words ? "" : "blank"}>{words || "Nothing yet"}</p>
                </div>
              </button>
            );
          }
          return (
            <button key={p.id} className={`ov-tile ${i === index ? "current" : ""}`} onClick={() => onJump(i)} aria-label={label}>
              <div className="ov-photo">
                <img src={p.photo.src} alt="" />
                <span className="ov-num">{i + 1}</span>
              </div>
              <p className={words ? "" : "blank"}>{words || "Nothing yet"}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The filmstrip stays above the page instead of covering it.
function Filmstrip({ story, pages, index, onJump }) {
  const current = useRef(null);
  useEffect(() => {
    current.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);
  return (
    <div className="filmstrip" role="list" aria-label="All pages">
      {pages.map((p, i) => {
        const words = (story.entries[p.id] ?? "").trim();
        return (
          <button
            key={p.id}
            ref={i === index ? current : null}
            role="listitem"
            className={`fs-frame ${i === index ? "current" : ""}`}
            onClick={() => onJump(i)}
            aria-label={`Page ${i + 1}${words ? ", written" : ", blank"}`}
          >
            <img src={p.photo.src} alt="" />
            {words && <span className="ov-dot" />}
          </button>
        );
      })}
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

// The timeline along the bottom, like the scrubber in iPhone Photos: every
// moment as a thumbnail at its real shape, tightly packed, in the order it
// happened. The current one sits larger in the middle; when the page
// changes the whole strip glides slowly to bring the new one to centre. You
// can also drag the strip to scrub through the pages, or tap a thumbnail.
const TL_SMALL = 22;
const TL_BIG = 32;
const TL_GAP = 1;
function Timeline({ story, pages, index, onJump }) {
  const strip = useRef(null);
  const [ratios, setRatios] = useState({});
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState(null); // { start, base, x, moved }
  const page = pages[index];

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Where the track sits so the current thumbnail's centre is the strip's centre,
  // worked out from the final sizes so the glide and the growing land together.
  const restX = useMemo(() => {
    let left = 0;
    for (let i = 0; i < index; i++) left += TL_SMALL * (ratios[pages[i].id] ?? 0.75) + TL_GAP;
    const cur = page ? TL_BIG * (ratios[page.id] ?? 0.75) : 0;
    return width / 2 - (left + cur / 2);
  }, [index, ratios, pages, page, width]);

  const nearestToCentre = () => {
    const box = strip.current?.getBoundingClientRect();
    const thumbs = strip.current?.querySelectorAll(".tl-thumb");
    if (!box || !thumbs) return index;
    const mid = box.left + box.width / 2;
    let best = index;
    let dist = Infinity;
    thumbs.forEach((t, i) => {
      const r = t.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < dist) (dist = d), (best = i);
    });
    return best;
  };

  const pointer = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ start: e.clientX, base: restX, x: restX, moved: false });
    },
    onPointerMove: (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.start;
      const moved = drag.moved || Math.abs(dx) > 4;
      setDrag({ ...drag, x: drag.base + dx, moved });
      if (moved) {
        const i = nearestToCentre();
        if (i !== index) onJump(i);
      }
    },
    onPointerUp: (e) => {
      if (drag && !drag.moved) {
        // A tap: jump to the thumbnail under the finger.
        const t = document.elementFromPoint(e.clientX, e.clientY)?.closest(".tl-thumb");
        const i = t ? [...strip.current.querySelectorAll(".tl-thumb")].indexOf(t) : -1;
        if (i >= 0 && i !== index) onJump(i);
      }
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
  };

  if (!page) return null;
  return (
    <div className="timeline">
      <div className="tl-label">
        <div className="tl-title">
          {fmtDay(page.photo.time)} · {fmtTime(page.photo.time)}
        </div>
        <div className="tl-place">{story.title}</div>
        <div className="tl-tick" />
      </div>
      <div className={`tl-strip ${drag?.moved ? "scrubbing" : ""}`} ref={strip} {...pointer}>
        <div className="tl-track" style={{ transform: `translateX(${drag ? drag.x : restX}px)` }}>
          {pages.map((p, i) => {
            const r = ratios[p.id] ?? 0.75;
            const written = (story.entries[p.id] ?? "").trim();
            return (
              <button
                key={p.id}
                className={`tl-thumb ${i === index ? "current" : ""} ${written ? "written" : ""}`}
                style={{ "--r": r }}
                tabIndex={-1}
                aria-label={`Moment ${i + 1}, ${fmtTime(p.photo.time)}${written ? ", written" : ""}`}
              >
                <img
                  src={p.photo.src}
                  alt=""
                  draggable={false}
                  onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    if (w && h) setRatios((m) => (m[p.id] ? m : { ...m, [p.id]: w / h }));
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// How you finish a story: an A/B/C test in the lab.
function DoneButton({ style, onClick }) {
  if (style === "text")
    return (
      <button className="text-btn" onClick={onClick}>
        Done
      </button>
    );
  if (style === "story")
    return (
      <button className="text-btn" onClick={onClick}>
        See story →
      </button>
    );
  return (
    <button className="crayon-btn done-check" onClick={onClick} aria-label="Done">
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
        <path d="M4.6 12.9c1.4 1.2 2.8 2.6 4.1 4.3 2.6-4.1 5.6-7.6 10.4-10.9" />
      </svg>
    </button>
  );
}

// All pages, as a grid you can rearrange like a dating-profile photo grid:
// long-press a page to pick it up, drag it to a new spot, × to take it out.
function PagesGrid({ story, pages, index, patch, say, onClose, onJump }) {
  const [order, setOrder] = useState(() => pages.map((p) => p.id));
  const [lift, setLift] = useState(null); // { id, dx, dy }
  const grid = useRef(null);
  const press = useRef(null);
  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
  const ids = order.filter((id) => byId[id]);

  useEffect(() => setOrder(pages.map((p) => p.id)), [pages]);

  const geometry = () => {
    const el = grid.current;
    const first = el?.children[0];
    if (!el || !first) return null;
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
    const cols = 3;
    const gap = 8;
    return { el, scale, cols, w: first.offsetWidth + gap, h: first.offsetHeight + gap, rect: el.getBoundingClientRect() };
  };
  const slotAt = (g, x, y) => {
    const lx = (x - g.rect.left) / g.scale;
    const ly = (y - g.rect.top) / g.scale + g.el.scrollTop;
    const c = Math.max(0, Math.min(g.cols - 1, Math.floor(lx / g.w)));
    const r = Math.max(0, Math.floor(ly / g.h));
    return Math.min(ids.length - 1, r * g.cols + c);
  };

  const down = (id) => (e) => {
    if (e.target.closest(".remove")) return;
    const start = { x: e.clientX, y: e.clientY };
    press.current = {
      id,
      start,
      moved: false,
      timer: setTimeout(() => {
        navigator.vibrate?.(12);
        setLift({ id, dx: 0, dy: 0, from: start });
      }, 380),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    const pr = press.current;
    if (!pr) return;
    if (!lift) {
      if (Math.hypot(e.clientX - pr.start.x, e.clientY - pr.start.y) > 8) {
        clearTimeout(pr.timer);
        pr.moved = true;
      }
      return;
    }
    const g = geometry();
    if (!g) return;
    const target = slotAt(g, e.clientX, e.clientY);
    const cur = ids.indexOf(lift.id);
    if (target !== cur && target >= 0) {
      const next = ids.filter((x) => x !== lift.id);
      next.splice(target, 0, lift.id);
      setOrder(next);
    }
    // Follow the finger, measured from the tile's current slot.
    const slot = target >= 0 ? target : cur;
    const sx = (slot % g.cols) * g.w;
    const sy = Math.floor(slot / g.cols) * g.h - g.el.scrollTop;
    const lx = (e.clientX - g.rect.left) / g.scale - g.w / 2 + 4;
    const ly = (e.clientY - g.rect.top) / g.scale - g.h / 2 + 4;
    setLift((l) => l && { ...l, dx: lx - sx, dy: ly - sy });
  };
  const up = (id) => () => {
    const pr = press.current;
    press.current = null;
    if (pr) clearTimeout(pr.timer);
    if (lift) {
      setLift(null);
      patch({ order: ids });
      return;
    }
    if (pr && !pr.moved) onJump(pages.findIndex((p) => p.id === id));
  };
  const remove = (id) => {
    patch((s) => ({ skipped: new Set([...s.skipped, id]) }));
    say("Taken out of the story", {
      label: "Undo",
      run: () =>
        patch((s) => {
          const sk = new Set(s.skipped);
          sk.delete(id);
          return { skipped: sk };
        }),
    });
  };

  return (
    <div className="overview pages-grid" role="dialog" aria-label="All pages">
      <div className="overview-head pg-head">
        <div>
          <h1 className="display small pg-title">Your {ids.length} pages</h1>
          <div className="overview-meta">Hold a page to move it</div>
        </div>
        <button className="icon-btn close-x" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className={`pg-grid ${lift ? "dragging" : ""}`} ref={grid}>
        {ids.map((id, i) => {
          const p = byId[id];
          const lifted = lift?.id === id;
          const written = (story.entries[id] ?? "").trim();
          return (
            <div
              key={id}
              className={`pg-tile ${lifted ? "lifted" : ""} ${pages[index]?.id === id ? "current" : ""}`}
              style={lifted ? { transform: `translate(${lift.dx}px, ${lift.dy}px) scale(1.06)` } : undefined}
              onPointerDown={down(id)}
              onPointerMove={move}
              onPointerUp={up(id)}
              onPointerCancel={up(id)}
            >
              <img src={p.photo.src} alt="" draggable={false} />
              <span className="pg-num">{i + 1}</span>
              {written && <span className="ov-dot" />}
              <button className="remove" onClick={() => remove(id)} aria-label="Take this page out">
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// A little crayon drawing of a microphone: grey until you're talking.
function CrayonMic() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)" aria-hidden>
      <path d="M12.2 3.4c-1.7-.1-3 1.2-3 2.9l.1 5.4c0 1.7 1.3 2.9 2.9 2.9 1.6 0 2.9-1.3 2.9-3l-.1-5.3c0-1.6-1.2-2.8-2.8-2.9z" />
      <path d="M6.1 11.2c.2 3.4 2.7 5.9 6 5.9 3.2-.1 5.6-2.6 5.8-6" />
      <path d="M12.1 17.3l-.1 3.4M9.3 20.8l5.6-.1" />
    </svg>
  );
}

// A hand-drawn grid of four little squares, in crayon.
function CrayonGrid() {
  // Four chunky rounded squares, hand-drawn, so they stay readable at icon size.
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)" aria-hidden>
      <path d="M6 4.3h3.3c1 0 1.6.6 1.6 1.6v3.4c0 1-.6 1.6-1.6 1.6H5.9c-1 0-1.6-.6-1.6-1.6V5.9c0-1 .7-1.6 1.7-1.6z" />
      <path d="M14.8 4.4h3.3c1 0 1.6.6 1.6 1.6v3.3c0 1-.6 1.7-1.6 1.7h-3.4c-1 0-1.6-.7-1.6-1.7V6c0-1 .7-1.6 1.7-1.6z" />
      <path d="M5.9 13.1h3.4c1 0 1.6.7 1.6 1.7v3.3c0 1-.6 1.6-1.6 1.6H6c-1 0-1.7-.6-1.7-1.6v-3.4c0-1 .6-1.6 1.6-1.6z" />
      <path d="M14.7 13.2h3.4c1 0 1.6.6 1.6 1.6v3.3c0 1-.7 1.6-1.7 1.6h-3.3c-1 0-1.6-.6-1.6-1.6v-3.3c0-1 .6-1.6 1.6-1.6z" />
    </svg>
  );
}
