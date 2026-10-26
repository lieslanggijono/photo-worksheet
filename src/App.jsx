import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DECIDED, DECISIONS, DEFAULT_LAB, FIXED, SAMPLE_WRITING } from "./decisions.js";
import {
  addDays,
  fmtDay,
  fmtShort,
  inRange,
  asset,
  clearSavedLibrary,
  libraryFromFiles,
  loadSavedLibrary,
  momentsOf,
  saveLibrary,
  rangeOf,
  loadTrips,
} from "./photos.js";
import { Crayon, Phone, Toast } from "./ui.jsx";
import { playKey } from "./sound.js";
import Write from "./Write.jsx";
import Choose from "./Choose.jsx";
import { Share, Story } from "./Story.jsx";

const TRACK_DEFAULTS = { martina: -0.04, heldane: -0.04 };
const TRACK_PRESETS = [0, -0.01, -0.02, -0.03, -0.04];

const SCREENS = [
  ["permission", "Photo access"],
  ["scan", "Loading"],
  ["home", "Home"],
  ["choose", "Choose photos"],
  ["write", "Worksheet"],
  ["story", "Your story"],
  ["share", "Share"],
];

function loadLab() {
  try {
    const saved = JSON.parse(localStorage.getItem("pw-lab"));
    if (saved) {
      // Drop saved answers to options that no longer exist (e.g. an old photo size).
      const valid = Object.fromEntries(
        DECISIONS.filter((d) => d.options.some((o) => o.value === saved[d.key])).map((d) => [d.key, saved[d.key]])
      );
      // One-time switch to the new Magazine writing font (Oct 2026).
      if (!saved.magazineFont) delete valid.font;
      // One-time switch: Allow photo access now lives at the bottom of the paper.
      if (!saved.allowOnPaper) delete valid.allowStyle;
      // One-time switch to the snug title spacing she preferred.
      if (!saved.snugTitle) delete valid.titleGap;
      return { ...DEFAULT_LAB, ...valid, ...FIXED, magazineFont: true, allowOnPaper: true, snugTitle: true };
    }
  } catch {
    // ignore unreadable storage
  }
  return { ...DEFAULT_LAB, magazineFont: true, allowOnPaper: true, snugTitle: true };
}

// Stories survive a refresh (sample roll only: your own photos are
// object URLs that don't outlive the page).
const packStory = (st) => ({
  ...st,
  range: st.range.map((d) => d.toISOString()),
  picked: st.picked ? [...st.picked] : null,
  skipped: [...st.skipped],
});
const unpackStory = (st) => ({
  ...st,
  range: st.range.map((d) => new Date(d)),
  picked: st.picked ? new Set(st.picked) : null,
  skipped: new Set(st.skipped),
});

// The sample trips and someone's own camera roll each keep their own session.
const SESSION = "pw-session-v3";
const OWN_SESSION = "pw-session-own";
function saveSession({ screen, access, stories, activeId, rollPicked }, key = SESSION) {
  try {
    const packed = Object.fromEntries(Object.entries(stories).map(([id, st]) => [id, packStory(st)]));
    localStorage.setItem(key, JSON.stringify({ screen, access, activeId, stories: packed, rollPicked: rollPicked ? [...rollPicked] : null }));
  } catch {
    // storage blocked: progress just won't survive a refresh
  }
}

function loadSession(key = SESSION) {
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (!s) return null;
    // Older sessions held a single story: that one was Arizona.
    const raw = s.stories ?? (s.story ? { arizona: s.story } : {});
    const stories = Object.fromEntries(Object.entries(raw).map(([id, st]) => [id, unpackStory(st)]));
    return {
      screen: s.screen,
      access: s.access,
      activeId: s.activeId ?? "arizona",
      stories,
      rollPicked: s.rollPicked ? new Set(s.rollPicked) : null,
    };
  } catch {
    return null;
  }
}

function freshStory(range, title) {
  return {
    title,
    range,
    before: false,
    after: false,
    picked: null, // Set of unit ids for "pick yourself" / "AI picks"
    takePick: {},
    entries: {},
    skipped: new Set(),
    index: 0,
  };
}

// The public build (GitHub Pages) shows only the phone: no decision lab, no caption.
const PUBLIC = import.meta.env.VITE_PUBLIC === "1";

// A real phone (the prototype shows full screen there, no lab or frame).
const onPhone = () => window.matchMedia?.("(max-width: 600px)").matches;

// A name for a trip found in someone's own photos, from when it happened:
// "A day in October", "A weekend in March", "Five days in July".
const COUNT = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
function tripTitle(photos) {
  const [a, b] = rangeOf(photos);
  const days = Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / 864e5) + 1;
  const month = a.toLocaleDateString("en-US", { month: "long" });
  if (days <= 1) return `A day in ${month}`;
  if (days <= 3 && [5, 6, 0].includes(a.getDay())) return `A weekend in ${month}`;
  return days <= 10 ? `${COUNT[days]} days in ${month}` : `${month} days`;
}

export default function App() {
  const [saved] = useState(loadSession);
  const [lab, setLab] = useState(loadLab);
  const [screen, setScreen] = useState(saved?.screen ?? "permission");
  const [access, setAccess] = useState(saved?.access ?? null);
  // The camera roll: four real trips, loaded from public/photos.
  const [library, setLibrary] = useState([]);
  const [tripSugs, setTripSugs] = useState([]);
  const [ready, setReady] = useState(false);
  const trips = useRef(null);
  const [ownPhotos, setOwnPhotos] = useState(false);
  // The onboarding's floating photos: a separate, hand-picked set.
  const [introPhotos, setIntroPhotos] = useState([]);
  useEffect(() => {
    fetch(asset("/photos/onboarding/list.json"))
      .then((r) => r.json())
      .then((list) => setIntroPhotos(list.map(asset)))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadTrips()
      .then(async (t) => {
        trips.current = t;
        setTripSugs(t.suggestions);
        // Someone who picked their own camera roll before gets it back.
        const mine = await loadSavedLibrary();
        if (mine?.length) {
          setLibrary(mine);
          setOwnPhotos(true);
          const own = loadSession(OWN_SESSION);
          setStories(own?.stories ?? {});
          setAccess(own?.access ?? "full");
          if (own?.activeId) setActiveId(own.activeId);
          setScreen(own?.screen && own.screen !== "permission" ? own.screen : "home");
        } else setLibrary(t.library);
      })
      .finally(() => setReady(true));
  }, []);
  const [stories, setStories] = useState(() => saved?.stories ?? {});
  const [activeId, setActiveId] = useState(saved?.activeId ?? "arizona");
  // Suggested stories come from the roll; their state is created on first open.
  // Photos the person chose from their camera roll; null = not chosen yet (all).
  // Photo picking now happens per story (after Start writing), so the camera
  // roll is always used whole here.
  const [rollPicked, setRollPicked] = useState(null);
  const roll = useMemo(
    () => (ownPhotos || !rollPicked ? library : library.filter((p) => rollPicked.has(p.id))),
    [library, rollPicked, ownPhotos]
  );
  // "AI makes the trips": cluster the chosen photos by time (a new trip starts
  // after a 36-hour gap) and name each from where most of its photos are from.
  // A stand-in for the real model, which would also use places and faces.
  const madeTrips = useMemo(() => {
    if (!roll.length) return [];
    const sorted = [...roll].sort((a, b) => a.time - b.time);
    const groups = [];
    for (const p of sorted) {
      const last = groups[groups.length - 1];
      if (last && p.time - last[last.length - 1].time < 36 * 3600 * 1000) last.push(p);
      else groups.push([p]);
    }
    const seen = {};
    return groups
      .map((g) => {
        const counts = {};
        g.forEach((p) => (counts[p.tag] = (counts[p.tag] ?? 0) + 1));
        const tag = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const known = tripSugs.find((t) => t.id === tag);
        seen[tag] = (seen[tag] ?? 0) + 1;
        const id = seen[tag] > 1 ? `${tag}-${seen[tag]}` : tag;
        return { id, title: known?.title ?? tripTitle(g), place: known?.place, range: rangeOf(g), count: g.length };
      })
      .reverse();
  }, [roll, tripSugs]);

  const suggestions = madeTrips;
  const storyFor = useCallback(
    (id) => {
      if (stories[id]) return stories[id];
      const sug = suggestions.find((x) => x.id === id) ?? suggestions[0];
      if (!sug) return freshStory([new Date(), new Date()], "");
      return freshStory(sug.range, sug.title);
    },
    [stories, suggestions]
  );
  const story = storyFor(activeId);
  const setStory = useCallback(
    (next) => setStories((all) => ({ ...all, [activeId]: typeof next === "function" ? next(all[activeId] ?? story) : next })),
    [activeId, story]
  );
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const rollPicker = useRef(null);
  // Backing out of the photo picker during onboarding falls back to the sample trips.
  const screenNow = useRef(screen);
  screenNow.current = screen;
  useEffect(() => {
    const el = rollPicker.current;
    const onCancel = () => screenNow.current === "permission" && setScreen("scan");
    el?.addEventListener("cancel", onCancel);
    return () => el?.removeEventListener("cancel", onCancel);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pw-lab", JSON.stringify(lab));
    } catch {
      // storage blocked: settings just won't persist
    }
  }, [lab]);

  // Letter-spacing for the two serifs we're choosing between, in em. Tuned
  // live from the lab; every Martina / Heldane line in the app follows it.
  const [track, setTrack] = useState(() => {
    const out = { ...TRACK_DEFAULTS };
    try {
      // One-time reset to the new tightest default (-0.04em).
      if (localStorage.getItem("pw-track-v") !== "3") {
        localStorage.setItem("pw-track-v", "3");
        for (const [k, v] of Object.entries(out)) localStorage.setItem(`pw-track-${k}`, String(v));
        return out;
      }
      for (const k of Object.keys(out)) {
        const v = parseFloat(localStorage.getItem(`pw-track-${k}`));
        if (Number.isFinite(v)) out[k] = v;
      }
    } catch {
      // ignore unreadable storage
    }
    return out;
  });
  // Worksheet photo size and corner radius, tuned live from the lab sliders.
  const [ws, setWs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pw-ws"));
      // The paper matches the onboarding worksheet's 4px corners (once, over the old 22px).
      if (saved) return { ...saved, paperR: saved.paperV === 2 ? saved.paperR : 4, paperV: 2, homeR: saved.homeV === 1 ? saved.homeR : 15, homeV: 1 };
    } catch {
      // ignore unreadable storage
    }
    return { photoH: 190, radius: 10, paperR: 4, paperV: 2, homeR: 15, homeV: 1 };
  });
  useEffect(() => {
    document.documentElement.style.setProperty("--ws-photo-h", `${ws.photoH}px`);
    document.documentElement.style.setProperty("--ws-radius", `${ws.radius}px`);
    document.documentElement.style.setProperty("--ws-paper-r", `${ws.paperR}px`);
    document.documentElement.style.setProperty("--home-r", `${ws.homeR ?? 15}px`);
    try {
      localStorage.setItem("pw-ws", JSON.stringify(ws));
    } catch {
      // storage blocked: setting just won't persist
    }
  }, [ws]);

  useEffect(() => {
    for (const [k, v] of Object.entries(track)) {
      document.documentElement.style.setProperty(`--track-${k}`, `${v}em`);
      try {
        localStorage.setItem(`pw-track-${k}`, String(v));
      } catch {
        // storage blocked: setting just won't persist
      }
    }
  }, [track]);

  useEffect(() => {
    saveSession({ screen: screen === "scan" ? "home" : screen, access, stories, activeId, rollPicked }, ownPhotos ? OWN_SESSION : SESSION);
  }, [ownPhotos, screen, access, stories, activeId, rollPicked]);

  const say = useCallback((text, action) => {
    setToast({ text, action, id: Math.random() });
  }, []);

  const patch = useCallback((p) => setStory((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) })), [setStory]);

  // ---------- what's in the story ----------
  const range = useMemo(() => {
    const [from, to] = story.range;
    const dates = lab.choose === "dates";
    return [dates && story.before ? addDays(from, -1) : from, dates && story.after ? addDays(to, 1) : to];
  }, [story.range, story.before, story.after, lab.choose]);

  const scoped = useMemo(() => roll.filter((p) => inRange(p, range)), [roll, range]);
  const moments = useMemo(() => momentsOf(scoped), [scoped]);
  const stacked = lab.dupes !== "every";

  // A unit is what becomes one page: a moment (stacked) or a single photo.
  const units = useMemo(() => {
    if (!stacked) {
      const byMoment = Object.fromEntries(moments.map((m) => [m.id, m]));
      return scoped
        .slice()
        .sort((a, b) => a.time - b.time)
        .map((p) => ({ id: p.id, photo: p, moment: byMoment[p.moment], takes: [p] }));
    }
    return moments.map((m) => {
      const chosen = m.takes.find((t) => t.id === story.takePick[m.id]);
      return { id: m.id, photo: chosen ?? m.best, moment: m, takes: m.takes };
    });
  }, [stacked, moments, scoped, lab.dupes, story.takePick]);

  // "AI picks": a stand-in until a model does it. Keep up to 12 moments,
  // spread evenly across the trip, so long trips don't become 40 pages.
  const aiDefault = useMemo(() => {
    // For the prototype: 11 photos per trip, spread evenly, cover included.
    const N = 11;
    if (units.length <= N) return new Set(units.map((u) => u.id));
    const cover = units.find((u) => u.takes.some((t) => t.cover));
    const step = units.length / N;
    const idx = Array.from({ length: N }, (_, i) => Math.floor(i * step + step / 2));
    if (cover) {
      const ci = units.indexOf(cover);
      if (!idx.includes(ci)) {
        // swap the nearest pick for the cover
        let k = 0;
        idx.forEach((v, j) => (Math.abs(v - ci) < Math.abs(idx[k] - ci) ? (k = j) : 0));
        idx[k] = ci;
      }
    }
    return new Set(idx.map((i) => units[i].id));
  }, [units]);

  const pages = useMemo(() => {
    let list = units;
    if (lab.choose === "manual") list = units.filter((u) => story.picked?.has(u.id));
    if (lab.choose === "ai") list = units.filter((u) => (story.picked ?? aiDefault).has(u.id));
    list = list.filter((u) => !story.skipped.has(u.id));
    // Pages you've rearranged in the all-pages grid keep your order.
    if (story.order) {
      const at = Object.fromEntries(story.order.map((id, i) => [id, i]));
      list = [...list].sort((x, y) => (at[x.id] ?? 1e6 + x.photo.time) - (at[y.id] ?? 1e6 + y.photo.time));
    }
    return list;
  }, [units, lab.choose, story.picked, story.skipped, story.order, aiDefault]);

  // ---------- navigation ----------
  // A story you start yourself gets its own slot; nothing is replaced.
  const startStory = useCallback(
    (title, r) => {
      const id = `own-${Date.now()}`;
      setStories((all) => ({ ...all, [id]: freshStory(r ?? rangeOf(library), title) }));
      setActiveId(id);
      setScreen(lab.choose === "straight" ? "write" : "choose");
    },
    [library, lab.choose]
  );

  const openStory = (id) => {
    const st = storyFor(id);
    setActiveId(id);
    if (!stories[id]) setStories((all) => ({ ...all, [id]: st }));
    const started = st.index > 0 || Object.values(st.entries).some((t) => t.trim()) || st.picked;
    setScreen(started ? "write" : "choose");
  };

  // Someone's real camera roll: read, shrink and keep the photos on this
  // device, group them into trips by date, then fly through them into Home.
  const [picking, setPicking] = useState(null); // { done, total } while reading
  const loadOwn = async (files) => {
    if (!files?.length) return false;
    setLoading(true);
    setPicking({ done: 0, total: files.length });
    const photos = await libraryFromFiles(files, (done, total) => setPicking({ done, total }));
    setLoading(false);
    setPicking(null);
    if (!photos.length) {
      say("Couldn't read those photos. Try choosing them again.");
      return false;
    }
    setLibrary(photos);
    setOwnPhotos(true);
    setStories({});
    saveLibrary(photos);
    setAccess("full");
    setScreen("scan");
    return true;
  };

  const useSamples = () => {
    if (trips.current) setLibrary(trips.current.library);
    clearSavedLibrary();
    setOwnPhotos(false);
    setStories(loadSession()?.stories ?? {});
    setActiveId("arizona");
  };

  // Jumping to "Photo access" always replays the intro from the start.
  const [introRun, setIntroRun] = useState(0);
  const goto = (id) => {
    if (id === "permission") setIntroRun((n) => n + 1);
    if (id !== "permission" && !access) setAccess("full");
    if (id === "permission") setAccess(null);
    setScreen(id);
  };

  return (
    <div className={`app ${PUBLIC ? "public" : ""}`}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="crayon">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" />
        </filter>
        {/* Scanned-print ink: a hair of edge roughness plus tiny speckles
            where the ink didn't take, like text scanned off real paper. */}
        {/* Waxy crayon: grainy, broken edges like crayon dragged over paper. */}
        <filter id="wax" x="-5%" y="-120%" width="110%" height="340%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 2.6" numOctaves="2" seed="11" result="tooth" />
          <feDisplacementMap in="SourceGraphic" in2="tooth" scale="2.2" result="rough" />
          <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.75" result="holes" />
          <feComposite in="rough" in2="holes" operator="in" />
        </filter>
        <filter id="inked" x="-2%" y="-15%" width="104%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="3" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="0.45" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="2" seed="8" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.75 0 0 0 1.21" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
        <filter id="smudge" x="-10%" y="-80%" width="120%" height="260%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" />
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </svg>

      <aside className="lab">
        <header className="lab-head">
          <h1>
            What do we want to <Crayon>build here?</Crayon>
          </h1>
          <p>Each toggle is one open question. Flip it and use the prototype to feel the difference.</p>
        </header>

        <section className="lab-block">
          <h2>Jump to</h2>
          <div className="chips">
            {SCREENS.map(([id, label]) => (
              <button key={id} className={screen === id ? "chip on" : "chip"} onClick={() => goto(id)}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="lab-block">
          <h2>Home</h2>
          <div className="decision">
            <div className="q">How round are the trip cards?</div>
            <div className="track-row">
              <input type="range" min={0} max={48} step={1} value={ws.homeR ?? 15} onChange={(e) => setWs((w) => ({ ...w, homeR: +e.target.value }))} aria-label="How round are the trip cards?" />
              <span className="track-value">{ws.homeR ?? 15}px</span>
            </div>
            <div className="track-ends">
              <span>Square</span>
              <span>Pebble</span>
            </div>
          </div>
        </section>

        <section className="lab-block">
          <h2>Worksheet photo and paper</h2>
          {[
            ["photoH", "How big is the photo?", 150, 300, 5, "px tall"],
            ["radius", "How round are the photo's corners?", 0, 32, 1, "px"],
            ["paperR", "How round is the paper?", 0, 32, 1, "px"],
          ].map(([k, q, min, max, step, unit]) => (
            <div className="decision" key={k}>
              <div className="q">{q}</div>
              <div className="track-row">
                <input type="range" min={min} max={max} step={step} value={ws[k]} onChange={(e) => setWs((w) => ({ ...w, [k]: +e.target.value }))} aria-label={q} />
                <span className="track-value">
                  {ws[k]}
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="lab-block">
          <h2>Type</h2>
          {[
            ["martina", "Martina Plantijn"],
          ].map(([k, name]) => (
            <div className="decision" key={k}>
              <div className="q">How tight is {name.split(" ")[0]}?</div>
              <p className={`track-sample track-${k}`}>Stories in your camera roll, one photo at a time.</p>
              <div className="track-row">
                <input
                  type="range"
                  min="-0.04"
                  max="0.03"
                  step="0.0025"
                  value={track[k]}
                  onChange={(e) => setTrack((t) => ({ ...t, [k]: parseFloat(e.target.value) }))}
                  aria-label={`${name} letter-spacing`}
                />
                <span className="track-value">{track[k] === 0 ? "0" : track[k].toFixed(4).replace(/0+$/, "")}em</span>
              </div>
              <div className="seg">
                {TRACK_PRESETS.map((v) => (
                  <button key={v} className={v === track[k] ? "on" : ""} onClick={() => setTrack((t) => ({ ...t, [k]: v }))}>
                    {v === 0 ? "Default" : v}
                  </button>
                ))}
              </div>
              <p className="note">Applies to every {name} line in the app, so check a few screens.</p>
            </div>
          ))}
        </section>

        <section className="lab-block">
          <h2>Decided</h2>
          <div className="decided">
            {DECIDED.map((d) => (
              <details key={d.question}>
                <summary>
                  <span className="q">{d.question}</span>
                  <span className="a">{d.answer}</span>
                </summary>
                <p className="note">{d.why}</p>
              </details>
            ))}
          </div>
        </section>

        {groupBy(DECISIONS).map(([group, decisions]) => (
          <section className="lab-block" key={group}>
            <h2>{group}</h2>
            {decisions.map((d) => {
              const current = d.options.find((o) => o.value === lab[d.key]) ?? d.options[0];
              return (
                <div className="decision" key={d.key}>
                  <div className="q">{d.question}</div>
                  <div className="seg">
                    {d.options.map((o) => (
                      <button
                        key={String(o.value)}
                        className={o.value === lab[d.key] ? "on" : ""}
                        onClick={() => setLab((l) => ({ ...l, [d.key]: o.value }))}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="note">{current.note}</p>
                </div>
              );
            })}
          </section>
        ))}

        <section className="lab-block">
          <h2>Test data</h2>
          <p className="note">
            Test mode is on: questions are canned and nothing calls an AI. Load your real trip photos (JPEG or PNG) to try
            near-duplicate detection on them. They stay in this browser.
          </p>
          <div className="row">
            <label className="btn small">
              {loading ? "Reading photos…" : "Load my photos"}
              <input type="file" accept="image/*" multiple hidden onChange={(e) => loadOwn(e.target.files)} />
            </label>
            {ownPhotos && (
              <button className="btn small ghost" onClick={useSamples}>
                Back to my trips
              </button>
            )}
          </div>
          <button
            className="btn small ghost"
            onClick={() =>
              patch((st) => {
                const entries = { ...st.entries };
                pages.forEach((p) => {
                  const text = SAMPLE_WRITING[p.photo.src.split("/").pop()];
                  if (text) entries[p.id] = text;
                });
                return { entries };
              })
            }
          >
            Fill with sample writing
          </button>
          <button
            className="btn small ghost"
            onClick={() => {
              setStories({});
              setActiveId(ownPhotos ? "mine" : "arizona");
              setRollPicked(null);
              setAccess(null);
              setScreen("permission");
            }}
          >
            Reset to first open
          </button>
        </section>
      </aside>

      <main className="stage">
        <Phone>
          {screen === "permission" && (
            <Permission
              key={introRun}
              font={lab.titleFont}
              allowStyle={lab.allowStyle}
              corners={lab.driftCorners}
              titlePlace={lab.titlePlace}
              titleGap={lab.titleGap}
              covers={tripSugs.map((t) => t.cover)}
              photos={introPhotos.length ? introPhotos : library.map((p) => p.src)}
              onAnswer={(a) => {
                setAccess(a);
                // On a phone, "Allow" opens the real photo picker (the tap
                // still counts as the user's gesture). Anywhere else, or if
                // they back out of the picker, the sample trips are used.
                if (a !== "denied" && onPhone()) return rollPicker.current?.click();
                setScreen(a === "denied" ? "home" : "scan");
              }}
            />
          )}
          {screen === "scan" && (
            <RollScan photos={ownPhotos ? library.map((p) => p.src) : introPhotos.length ? introPhotos : library.map((p) => p.src)} onDone={() => setScreen("home")} />
          )}
          {screen === "home" && (
            <Home
              access={access}
              library={roll}
              ownPhotos={ownPhotos}
              suggestions={suggestions}
              stories={stories}
              storyFor={storyFor}
              onOpen={openStory}
              onRead={(id) => {
                setActiveId(id);
                setScreen("story");
              }}
              onStart={startStory}
              onEnable={() => {
                setAccess("full");
                say("Photo access is on (in the real app this happens in iOS Settings)");
              }}
              say={say}
            />
          )}
          {screen === "choose" && (
            <Choose
              lab={lab}
              story={story}
              patch={patch}
              units={units}
              aiDefault={aiDefault}
              range={range}
              pages={pages}
              onBack={() => setScreen("home")}
              onGo={() => {
                patch({ index: 0 });
                setScreen("write");
              }}
            />
          )}
          {screen === "write" && (
            <Write
              lab={lab}
              story={story}
              patch={patch}
              pages={pages}
              say={say}
              onBack={() => setScreen("home")}
              onDone={() => setScreen("story")}
            />
          )}
          {screen === "story" && (
            <Story story={story} patch={patch} pages={pages} onBack={() => setScreen("write")} onShare={() => setScreen("share")} />
          )}
          {screen === "share" && <Share story={story} pages={pages} onBack={() => setScreen("story")} onHome={() => setScreen("home")} say={say} patch={patch} />}
          {!ready && (
            <div className="loading-roll">
              <div className="spinner" />
              Looking through your camera roll…
            </div>
          )}
          <input
            ref={rollPicker}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const ok = await loadOwn(e.target.files);
              e.target.value = "";
              if (!ok && screen === "permission") setScreen("scan");
            }}
          />
          {picking && (
            <div className="loading-roll">
              <div className="spinner" />
              Reading your photos… {picking.done} of {picking.total}
            </div>
          )}
          {toast && <Toast key={toast.id} toast={toast} onDone={() => setToast(null)} />}
        </Phone>
        <div className="stage-caption">
          {SCREENS.find(([id]) => id === screen)?.[1]} · {pages.length} pages ·{" "}
          {story.title} · {ownPhotos ? "photos you loaded" : "your four trips"}
        </div>
      </main>
    </div>
  );
}

function groupBy(decisions) {
  const out = [];
  for (const d of decisions) {
    const last = out[out.length - 1];
    if (last && last[0] === d.group) last[1].push(d);
    else out.push([d.group, [d]]);
  }
  return out;
}

// ---------- first open ----------

// The opening: your photos drift up through the screen at different depths,
// tilted slightly in 3D, like the reference reel. They keep drifting behind
// the title once the intro hands over.
const DRIFT = Array.from({ length: 18 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const depth = r(1); // 0 far · 1 near
  return {
    x: 4 + r(2) * 78,
    w: 54 + depth * 70,
    dur: 9 - depth * 3.5,
    delay: -r(3) * 9,
    tilt: -14 + r(4) * 28,
    depth,
  };
});

function PhotoDrift({ photos, corners = "round" }) {
  if (!photos.length) return null;
  return (
    <div className={`drift corners-${corners}`} aria-hidden>
      {DRIFT.map((d, i) => (
        <img
          key={i}
          src={photos[(i * 7) % photos.length]}
          alt=""
          style={{
            left: `${d.x}%`,
            width: d.w,
            zIndex: Math.round(d.depth * 10),
            opacity: 0.8 + d.depth * 0.2,
            filter: d.depth < 0.25 ? "blur(1px)" : "none",
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            "--tilt": `${d.tilt}deg`,
          }}
        />
      ))}
    </div>
  );
}

// Times the hand-off after the photos start drifting: the title eases in,
// then the rest of the page follows. The title itself is one element that
// never moves or swaps, so there's no cut.
// After the typed question: the photos fill the page for a beat, a soft clear
// space opens in the middle, and the sheet writes itself one piece at a time.
//   none → open → title → underline → lift → sentence → smile → complete
function useIntroTimeline(stage, setPhase) {
  useEffect(() => {
    if (stage !== "drift") return;
    const a = setTimeout(() => setPhase((p) => (p === "none" ? "open" : p)), 1200);
    const b = setTimeout(() => setPhase((p) => (p === "open" ? "title" : p)), 3000);
    return () => [a, b].forEach(clearTimeout);
  }, [stage, setPhase]);
}

// Counts up one character at a time while `run`; all of it when `full`.
function useTypewriter(length, run, full, onDone, speed = 42) {
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!run || full) return;
    if (n >= length) {
      const t = setTimeout(() => done.current?.(), 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      playKey("a"); // the typed onboarding words click like keys
      setN((x) => x + 1);
    }, speed * (0.6 + Math.random() * 0.8));
    return () => clearTimeout(t);
  }, [run, full, n, length, speed]);
  return full ? length : n;
}

// Every letter is laid out from the start (invisible until typed), so the
// words never re-wrap or shuffle while typing; letters just appear in place.
function Reveal({ text, n, offset = 0, caretAt }) {
  return [...text].map((ch, i) => (
    <span key={i} className={`ch${offset + i < n ? " on" : ""}${caretAt === offset + i + 1 ? " caret-after" : ""}${ch === "!" ? " bang" : ""}`}>
      {ch}
    </span>
  ));
}

const TITLE_A = "Your photos already ";
const TITLE_B = "remember.";
// The sentence types out; "school days" stays on one line with the crayon
// "!" and the smiley that get drawn after it.
const PROMISE_HEAD = "We put them into a worksheet you fill out while referencing the photo, just how you would during your elementary ";
const PROMISE_TAIL = "school\u00a0days";
const PROMISE = PROMISE_HEAD + PROMISE_TAIL + "!";
const AFTER = (p, ...list) => list.includes(p);

function TypedTitle({ phase, onDone }) {
  const full = AFTER(phase, "underline", "lift", "sentence", "smile", "complete");
  const len = TITLE_A.length + TITLE_B.length;
  const n = useTypewriter(len, phase === "title", full, onDone, 60);
  const caretAt = phase === "title" ? n : -1;
  return (
    <span className="typed-title">
      <Reveal text={TITLE_A} n={n} caretAt={caretAt} />
      <Crayon waxy>
        <Reveal text={TITLE_B} n={n} offset={TITLE_A.length} caretAt={caretAt} />
      </Crayon>
    </span>
  );
}

function TypedPromise({ phase, onDone }) {
  const full = AFTER(phase, "smile", "complete");
  const len = PROMISE_HEAD.length + PROMISE_TAIL.length;
  const n = useTypewriter(len, phase === "sentence", full, onDone, 30);
  const caretAt = phase === "sentence" ? n : -1;
  return (
    <span className="typed-promise">
      <Reveal text={PROMISE_HEAD} n={n} caretAt={caretAt} />
      <span className="keep-together">
        <Reveal text={PROMISE_TAIL} n={n} offset={PROMISE_HEAD.length} caretAt={caretAt} />
        <CrayonBang />
        {"\u00a0"}
        <CrayonSmile />
      </span>
    </span>
  );
}

// A crayon "!" drawn after "days": a wobbly stroke, then the dot.
function CrayonBang() {
  return (
    <svg className="crayon-bang" viewBox="0 0 10 24" aria-hidden>
      <path d="M5.6 2.6 C 5.1 7.5, 5.4 11.2, 4.7 15.6" pathLength="1" filter="url(#wax)" />
      <ellipse className="dot" cx="4.6" cy="20.4" rx="1.5" ry="1.35" />
    </svg>
  );
}

// A little crayon smiley: a hand-drawn, not-quite-round face whose stroke
// overshoots where it closes, two dot eyes, and a lopsided smile.
function CrayonSmile() {
  return (
    <svg className="crayon-smile" viewBox="0 0 24 24" aria-hidden>
      <path
        className="face"
        d="M12.4 3.1 C 6.6 2.4, 2.4 6.9, 3.2 12.6 C 3.9 18.1, 8.6 21.6, 13.4 20.7 C 18.7 19.8, 21.6 15.4, 20.6 10.6 C 19.9 6.3, 16.6 3.2, 12.2 3.5 C 11.1 3.6, 10.3 4.1, 9.7 4.9"
        pathLength="1"
        filter="url(#wax)"
      />
      <ellipse className="eye" cx="8.8" cy="9.6" rx="1.15" ry="1.5" />
      <ellipse className="eye" cx="15.2" cy="9.4" rx="1.15" ry="1.5" />
      <path className="mouth" d="M7.4 14.4 C 9.4 17.6, 14.4 17.9, 16.8 13.6" pathLength="1" filter="url(#wax)" />
    </svg>
  );
}

// The title, set straight. Shared by the intro and the screen it hands over
// to, so it never jumps. Its typeface is an A/B test in the lab.
function IntroArc({ titled, font = "martina" }) {
  return (
    <div className={`intro-arc ${titled ? "titled" : ""}`}>
      <h1 className={`arc-title font-${font}`}>Your photos already remember.</h1>
    </div>
  );
}

// Before the photos: the question that sets up the whole app, typed out
// letter by letter, then the answer it implies, then it fades away.
const TYPED = ["Have you ever wanted to write about an experience,", "but forgot…?"];

function TypedOpening({ font, onDone }) {
  // One line at a time: type it, hold, clear the screen, then the next.
  const [line, setLine] = useState(0);
  const [text, setText] = useState("");
  const [clearing, setClearing] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let t;
    let ch = 0;
    const full = TYPED[line];
    setText("");
    setClearing(false);
    const step = () => {
      ch += 1;
      playKey(full[ch - 1]);
      setText(full.slice(0, ch));
      if (ch < full.length) t = setTimeout(step, 38 + Math.random() * 40);
      else
        t = setTimeout(() => {
          setClearing(true);
          t = setTimeout(() => (line < TYPED.length - 1 ? setLine(line + 1) : done.current()), 800);
        }, line < TYPED.length - 1 ? 1100 : 1300);
    };
    t = setTimeout(step, line === 0 ? 500 : 250);
    return () => clearTimeout(t);
  }, [line]);
  return (
    <div className={`typed font-${font} ${clearing ? "fading" : ""}`} aria-label={TYPED.join(" ")}>
      <p className={line === 1 ? "second" : ""}>
        {text}
        <span className="caret" />
      </p>
    </div>
  );
}

const ALLOW_LABEL = "Allow photo access";

// A paper-tearing sound, made on the fly: bursts of filtered noise that
// crackle and fade, like fibers giving way along the perforation.
function playRip() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const dur = 0.55;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Crackle: noise gated by quick random pulses, louder in the middle.
      const crackle = Math.random() < 0.18 ? 1 : 0.25;
      const env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6 * (1 - t * 0.6);
      data[i] = (Math.random() * 2 - 1) * crackle * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(2600, ctx.currentTime);
    band.frequency.linearRampToValueAtTime(1500, ctx.currentTime + dur);
    band.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start();
    src.onended = () => ctx.close();
  } catch {
    // no audio: the tear still happens silently
  }
}

// Four takes on the one action on this screen; picked in the lab.
function AllowButton({ style, onClick, clip }) {
  if (style === "caps")
    return (
      <button className="allow allow-caps" onClick={onClick}>
        {ALLOW_LABEL}
      </button>
    );
  if (style === "underline")
    return (
      <button className="allow allow-underline" onClick={onClick}>
        <Crayon>{ALLOW_LABEL}</Crayon>
      </button>
    );
  if (style === "slip")
    return (
      <button className="allow allow-slip" onClick={onClick} style={clip ? { "--tear-slip": clip } : undefined}>
        {ALLOW_LABEL}
      </button>
    );
  return (
    <button className="allow allow-arrow" onClick={onClick} aria-label={ALLOW_LABEL}>
      <span className="allow-arrow-label">{ALLOW_LABEL}</span>
      <span className="allow-arrow-dot" aria-hidden>
        →
      </span>
    </button>
  );
}

// Between "Allow" and Home: a fly-through of the camera roll. Photos float
// at different depths and the view glides forward through them, so you
// pass your own pictures like walking through a room of prints; then
// everything drifts back into specks and fades into Home.
const SCAN_MS = 4200;
function RollScan({ photos, onDone }) {
  const done = useRef(onDone);
  done.current = onDone;
  const [leaving, setLeaving] = useState(false);
  const cards = useMemo(() => {
    const step = Math.max(1, Math.floor(photos.length / 34));
    const pick = photos.filter((_, n) => n % step === 0).slice(0, 34);
    // A seeded spread so the layout is the same every run.
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    return pick.map((src, n) => {
      const angle = rnd() * Math.PI * 2;
      const r = 70 + rnd() * 210; // keep the very centre clear for the words
      return {
        src,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r * 1.35,
        z: -200 - (n / pick.length) * 3000 - rnd() * 200,
        w: 74 + rnd() * 56,
        tilt: (rnd() - 0.5) * 10,
      };
    });
  }, [photos]);
  const refs = useRef([]);
  useEffect(() => {
    if (!cards.length) {
      const t = setTimeout(() => done.current(), 1200);
      return () => clearTimeout(t);
    }
    let raf;
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const frame = (now) => {
      const t = Math.min(1, (now - start) / SCAN_MS);
      // Glide forward through the cloud, then ease back so it shrinks to specks.
      const cam = t < 0.78 ? ease(t / 0.78) * 3100 : 3100 - ease((t - 0.78) / 0.22) * 2600;
      cards.forEach((c, n) => {
        const el = refs.current[n];
        if (!el) return;
        const z = c.z + cam;
        const far = Math.min(1, Math.max(0, (z + 3200) / 900));
        const near = Math.min(1, Math.max(0, (520 - z) / 260));
        el.style.transform = `translate3d(${c.x}px, ${c.y}px, ${z}px) rotate(${c.tilt}deg)`;
        el.style.opacity = String(far * near);
      });
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const out = setTimeout(() => setLeaving(true), SCAN_MS - 500);
    const end = setTimeout(() => done.current(), SCAN_MS + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(out);
      clearTimeout(end);
    };
  }, [cards]);

  return (
    <div className={`roll-scan ${leaving ? "phase-leave" : ""}`} aria-live="polite">
      <div className="scan-space" aria-hidden>
        {cards.map((c, n) => (
          <img key={c.src} ref={(el) => (refs.current[n] = el)} className="scan-float" src={c.src} alt="" style={{ width: c.w, marginLeft: -c.w / 2 }} />
        ))}
      </div>
      <p className="scan-line">
        <span>Flipping through your camera roll…</span>
      </p>
    </div>
  );
}

function Permission({ onAnswer, covers = [], photos = [], font, allowStyle = "caps", corners, titlePlace = "on", titleGap = "roomy" }) {
  const [asking, setAsking] = useState(false);
  // type: the typed question · drift: photos rise, title arrives · done
  const [stage, setStage] = useState("type");
  const [phase, setPhase] = useState("none");
  // Tapping the slip tears it off the sheet along the dashed line, like real
  // paper, then the iOS permission prompt appears.
  const paperRef = useRef(null);
  const [tear, setTear] = useState(null);
  const tearSlip = () => {
    if (tear) return;
    const paper = paperRef.current;
    const slip = paper?.querySelector(".allow-slip");
    if (!paper || !slip) return setAsking(true);
    const y = slip.offsetTop; // the dashed line
    // One jagged edge, shared by the sheet (its new bottom) and the slip (its top).
    const pts = Array.from({ length: 23 }, (_, i) => [(i / 22) * 100, ((i * 7919) % 5) + ((i * 31) % 3) - 1]);
    const edge = (sign) => pts.map(([x, d]) => `${x.toFixed(1)}% calc(${y}px + ${sign * d}px)`);
    setTear({
      box: {
        top: paper.offsetTop + slip.offsetTop,
        left: paper.offsetLeft + slip.offsetLeft,
        width: slip.offsetWidth,
        height: slip.offsetHeight,
      },
      paper: `polygon(0 0, 100% 0, ${edge(1).reverse().join(", ")})`,
      slip: `polygon(${pts.map(([x, d]) => `${x.toFixed(1)}% ${Math.max(0, d + 1)}px`).join(", ")}, 100% 100%, 0 100%)`,
    });
    navigator.vibrate?.([8, 30, 8, 30, 12]);
    playRip();
    setTimeout(() => setAsking(true), 1000);
  };
  const titled = AFTER(phase, "lift", "sentence", "smile", "complete");
  const endIntro = useCallback(() => {
    setPhase("complete");
    setStage("done");
  }, []);
  useIntroTimeline(stage, setPhase);
  const later = (from, to, ms) => setTimeout(() => setPhase((p) => (p === from ? to : p)), ms);
  const titleTyped = useCallback(() => {
    setPhase("underline");
    later("underline", "lift", 1300); // crayon draws, then the title makes room
    later("lift", "sentence", 3600); // the sheet rises in, then the writing starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const promiseTyped = useCallback(() => {
    setPhase("smile");
    setTimeout(endIntro, 2300); // the crayon "!" and smiley get drawn first
  }, [endIntro]);
  const intro = stage !== "done";
  return (
    <div className={`screen permission ${intro ? "in-intro" : "after-intro"} stage-${stage} ${titled ? "card-in" : ""} place-${titlePlace} phase-${phase}`}>
      {stage !== "type" && <PhotoDrift photos={photos} corners={corners} />}
      {/* A soft, blurred clearing in the middle of the photos for the words. */}
      <div className="clearing" aria-hidden />
      {stage === "type" && <TypedOpening font={font} onDone={() => setStage("drift")} />}
      {intro && (
        <button className="skip-intro" onClick={endIntro}>
          Skip intro
        </button>
      )}
      {/* The worksheet: the title (on the paper or above it, a lab test), the
          promise on the ruled lines, and the tear-off slip to say yes. It
          rises in as one piece. */}
      <div className={`intro-sheet title-${titlePlace} gap-${titleGap} phase-${phase}`}>
        {titlePlace === "above" && (
          <h1 className={`paper-title font-${font}`} aria-label={TITLE_A + TITLE_B}>
            <TypedTitle phase={phase} onDone={titleTyped} />
          </h1>
        )}
        {tear && (
          <div className={`torn-slip font-${font}`} style={{ ...tear.box, clipPath: tear.slip }} aria-hidden>
            {ALLOW_LABEL}
          </div>
        )}
        <div className={`intro-paper font-${font} ${tear ? "torn" : ""}`} ref={paperRef} style={tear ? { "--tear-paper": tear.paper } : undefined}>
          {titlePlace === "on" && (
            <h1 className="paper-title" aria-label={TITLE_A + TITLE_B}>
              <TypedTitle phase={phase} onDone={titleTyped} />
            </h1>
          )}
          <p aria-label={PROMISE}>
            <TypedPromise phase={phase} onDone={promiseTyped} />
          </p>
          {allowStyle === "slip" && <AllowButton style="slip" onClick={tearSlip} />}
        </div>
      </div>
      {allowStyle !== "slip" && <AllowButton style={allowStyle} onClick={() => setAsking(true)} />}

      {asking && (
        <div className="ios-scrim">
          <div className="ios-alert">
            <div className="ios-title">"Worksheet" would like to access your photos</div>
            <div className="ios-body">We look at dates and places to find stories worth writing. Nothing leaves your phone.</div>
            <button onClick={() => onAnswer("limited")}>Limit access…</button>
            <button className="strong" onClick={() => onAnswer("full")}>
              Allow full access
            </button>
            <button onClick={() => onAnswer("denied")}>Don't allow</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- home ----------

// One story card: the photo fills it, words sit on top (hero is full width).
// Each card plays its trip as a slow slideshow: one photo crossfades into the
// next with a gentle drift. Cards start at different times so they don't all
// change together.
// A trip name that shrinks until it fits on one line inside the card's
// even 16px side margins (from `max` down to 14px).
function FitTitle({ max, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = max;
      el.style.setProperty("--fit", `${size}px`);
      while (el.scrollWidth > el.clientWidth && size > 14) {
        size -= 0.5;
        el.style.setProperty("--fit", `${size}px`);
      }
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [max, children]);
  return (
    <div className="scard-title" ref={ref}>
      {children}
    </div>
  );
}

function StoryCard({ hero, title, meta, status, state, cover, slides = [], offset = 0, onClick }) {
  const shots = slides.length ? slides : [cover];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (shots.length < 2) return;
    let id;
    const start = setTimeout(() => {
      setI((n) => (n + 1) % shots.length);
      id = setInterval(() => setI((n) => (n + 1) % shots.length), 3200);
    }, 1600 + offset * 1100);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [shots.length, offset]);
  return (
    <button className={`scard ${hero ? "hero" : ""}`} onClick={onClick} aria-label={`${title}. ${meta}. ${status}`}>
      {shots.map((src, n) => (
        <img key={src} src={src} alt="" className={n === i ? "on" : ""} />
      ))}
      <div className="scard-edge" />
      <div className="scard-shade" />
      <div className="scard-status">
        <span className={`scard-dot ${state}`} />
        {status}
      </div>
      <div className="scard-text">
        <FitTitle max={hero ? 26 : 20}>{title}</FitTitle>
        <div className="scard-meta">{meta}</div>
      </div>

    </button>
  );
}

function Home({ access, library, ownPhotos, suggestions, stories, storyFor, onOpen, onRead, onStart, onEnable }) {
  const [sheet, setSheet] = useState(false);
  const denied = access === "denied";
  const days = useMemo(() => [...new Set(library.map((p) => p.time.toDateString()))].map((d) => new Date(d)), [library]);
  const [from, to] = rangeOf(library);

  const cardFor = (id, title, range) => {
    const st = storyFor(id);
    const photos = library.filter((p) => inRange(p, range));
    const moments = momentsOf(photos);
    const written = Object.values(st.entries).filter((t) => t.trim()).length;
    // How many pages the story has: what you approved, else the AI's default
    // pick (up to 12 moments, plus the cover).
    const total = Math.max(
      1,
      (st.picked ? st.picked.size : moments.length <= 12 ? moments.length : 12 + (moments.some((m) => m.cover) ? 1 : 0)) -
        st.skipped.size
    );
    // Two states only: a new trip, or one you've started writing.
    const state = !written ? "new" : "progress";
    // Cover: the moment marked as the cover, else the one you shot the most takes of.
    const lead = moments.find((m) => m.cover) ?? [...moments].sort((x, y) => y.takes.length - x.takes.length)[0];
    const sameDay = range[0].toDateString() === range[1].toDateString();
    return {
      id,
      title: st.title || title,
      cover: lead?.best.src,
      // Slideshow: the cover first, then every moment in time order.
      slides: [lead?.best.src, ...moments.filter((m) => m !== lead).map((m) => m.best.src)].filter(Boolean),
      count: photos.length,
      meta: `${fmtShort(range[0])}${sameDay ? "" : `–${fmtShort(range[1])}`}`,
      state,
      status: state === "new" ? "New story" : "In progress",
      started: written > 0,
    };
  };

  const all = suggestions.map((s) => cardFor(s.id, s.title, s.range)).filter((c) => c.count);
  // Finished stories leave the main grid and wait in a "Completed" pop-up.
  const found = all;
  const done = [
    ...all.filter((c) => c.state === "done"),
    ...Object.entries(stories)
      .filter(([id]) => id.startsWith("own-"))
      .map(([id, st]) => cardFor(id, st.title, st.range))
      .filter((c) => c.count && c.state === "done"),
  ];
  const [showDone, setShowDone] = useState(false);
  const own = Object.entries(stories)
    .filter(([id]) => id.startsWith("own-"))
    .map(([id, st]) => cardFor(id, st.title, st.range))
    .filter((c) => c.count && c.state !== "done")
    .reverse();
  const [hero, ...rest] = found;

  return (
    <div className="screen home">
      <div className="home-top">
        <h1 className="display home-title">
          Stories in your <Crayon waxy color="#1f1e1d">camera roll</Crayon>
          {/* Start your own: a small + right after the words, part of the same line. */}
          <button className="home-add crayon-btn" onClick={() => setSheet(true)} aria-label="Start your own story">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" filter="url(#wax)">
              <path d="M12.3 4.6c-.2 4.9 0 9.8-.4 14.8M4.8 12.2c4.8-.3 9.6-.1 14.5-.4" />
            </svg>
          </button>
        </h1>
      </div>

      {access === "limited" && (
        <div className="banner">
          You're sharing some photos, so we may miss trips.
          <button className="text-btn" onClick={onEnable}>
            Share more
          </button>
        </div>
      )}

      {denied ? (
        <div className="empty-card">
          <p>Photo access is off, so we can't find stories in your camera roll.</p>
          <p className="small">You can still start one yourself with the + button and pick photos by hand.</p>
          <button className="btn small" onClick={onEnable}>
            Open Settings
          </button>
        </div>
      ) : !hero ? (
        <div className="empty-card">
          <p>No trips or days out found yet. Stories show up here after you take a batch of photos somewhere.</p>
        </div>
      ) : (
        <div className="scroll home-scroll">
          <div className="scards">
            <StoryCard hero offset={0} {...hero} onClick={() => onOpen(hero.id)} />
            {/* Two portrait cards per row; an odd one out goes full width. */}
            {rest.map((c, i) => (
              <StoryCard key={c.id} offset={i + 1} hero={rest.length % 2 === 1 && i === rest.length - 1} {...c} onClick={() => onOpen(c.id)} />
            ))}
          </div>
          {own.length > 0 && (
            <>
              <h2 className="home-sub">Started by you</h2>
              <div className="scards">
                {own.map((c) => (
                  <StoryCard key={c.id} {...c} onClick={() => onOpen(c.id)} />
                ))}
              </div>
            </>
          )}
          {ownPhotos && <p className="footnote">Found in the photos you loaded.</p>}

        </div>
      )}

      {showDone && (
        <div className="sheet-scrim" onClick={() => setShowDone(false)}>
          <div className="sheet tall" role="dialog" aria-label="Completed stories" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div className="sheet-head">
              <h2 className="display small">Completed</h2>
              <button className="text-btn" onClick={() => setShowDone(false)}>
                Close
              </button>
            </div>
            <div className="done-list">
              {done.map((c) => (
                <button key={c.id} className="done-row" onClick={() => onRead(c.id)}>
                  <img src={c.cover} alt="" />
                  <div>
                    <div className="done-title">{c.title}</div>
                    <div className="done-meta">{c.meta}</div>
                  </div>
                  <span className="done-go">Read ›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <StartOwn
          days={days}
          from={from}
          to={to}
          onCancel={() => setSheet(false)}
          onGo={(title, r) => {
            setSheet(false);
            onStart(title, r);
          }}
        />
      )}
    </div>
  );
}

function StartOwn({ days, from, to, onCancel, onGo }) {
  const [title, setTitle] = useState("");
  const [range, setRange] = useState([from, to]);
  const [picking, setPicking] = useState(false);
  const same = range[0].toDateString() === range[1].toDateString();
  const label = same ? fmtShort(range[0]) : `${fmtShort(range[0])} – ${fmtShort(range[1])}`;
  const photoDays = useMemo(() => new Set(days.map((d) => d.toDateString())), [days]);

  return (
    <div className="own-page" role="dialog" aria-label="Start your own story">
      <button className="crayon-btn own-close" onClick={onCancel} aria-label="Close">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" filter="url(#wax)">
          <path d="M6.2 5.8c4 3.9 7.9 8 11.8 12.3M17.9 5.6c-4.2 4-8.1 8.2-11.9 12.6" />
        </svg>
      </button>
      <div className="start-own">
        <h2 className="display small own-q">I want to write about…</h2>
        {/* Type straight onto the page; the grey hint disappears as you write. */}
        <input
          className="own-title"
          placeholder="FORM Arcosanti"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="What do you want to write about?"
          autoFocus
        />
        <button className={`date-btn ${picking ? "on" : ""}`} onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
          <CalendarIcon />
          {label}
        </button>
        {picking && <CalendarRange range={range} setRange={setRange} photoDays={photoDays} />}
        <button className="btn big soft compact slip" onClick={() => onGo(title.trim() || "Untitled", range)}>
          Start writing
        </button>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="4" y="5.5" width="16" height="14" rx="3" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </svg>
  );
}

// A month calendar for picking a date range: tap the first day, then the
// last. Days you have photos from get a small dot.
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function CalendarRange({ range, setRange, photoDays }) {
  const [month, setMonth] = useState(() => new Date(range[1].getFullYear(), range[1].getMonth(), 1));
  const [anchor, setAnchor] = useState(null); // first tap of a new range
  const start = new Date(month);
  start.setDate(1 - month.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const rows = cells.slice(35).every((d) => d.getMonth() !== month.getMonth()) ? 5 : 6;
  const t = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const [a, b] = range.map(t);
  const tap = (d) => {
    if (!anchor) {
      setAnchor(d);
      setRange([d, d]);
    } else {
      setRange(t(d) < t(anchor) ? [d, anchor] : [anchor, d]);
      setAnchor(null);
    }
  };
  const fmtLong = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <div className="cal">
      <div className="cal-head">
        <div className="cal-month">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} aria-label="Previous month">
            ‹
          </button>
          <button onClick={() => shift(1)} aria-label="Next month">
            ›
          </button>
        </div>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {cells.slice(0, rows * 7).map((d) => {
          const x = t(d);
          const out = d.getMonth() !== month.getMonth();
          const isStart = x === a;
          const isEnd = x === b && a !== b;
          const inside = x > a && x < b;
          const col = d.getDay();
          return (
            <button
              key={x}
              className={["cal-day", out && "out", inside && "in", isStart && "start", isEnd && "end", a !== b && (isStart || isEnd) && "edge", col === 0 && "c0", col === 6 && "c6"].filter(Boolean).join(" ")}
              onClick={() => tap(d)}
            >
              <span>{d.getDate()}</span>
              {photoDays.has(d.toDateString()) && <i className="cal-dot" />}
            </button>
          );
        })}
      </div>
      <div className="cal-sel">
        Selected: {fmtLong(range[0])}
        {a !== b && (
          <>
            {" - "}
            <b>{fmtLong(range[1])}</b>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- choosing from the camera roll ----------

// AI picks the photos for your trips; you can untick any before it makes
// them. Starts with everything the AI found selected, so the default path is
// one tap.
function RollPicker({ library, picked, setPicked, onDone }) {
  useEffect(() => {
    if (!picked && library.length) setPicked(new Set(library.map((p) => p.id)));
  }, [picked, library, setPicked]);
  const sel = picked ?? new Set(library.map((p) => p.id));
  const months = useMemo(() => {
    const map = new Map();
    [...library]
      .sort((a, b) => b.time - a.time)
      .forEach((p) => {
        const k = p.time.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(p);
      });
    return [...map.entries()];
  }, [library]);
  const toggle = (ids, on) =>
    setPicked((prev) => {
      const next = new Set(prev ?? []);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  return (
    <div className="screen roll">
      <div className="roll-head">
        <h1 className="display small">We picked these for your stories</h1>
        <button className="text-btn" onClick={() => toggle(library.map((p) => p.id), sel.size < library.length)}>
          {sel.size < library.length ? "Select all" : "Clear"}
        </button>
      </div>
      <div className="scroll">
        {months.map(([month, photos]) => {
          const all = photos.every((p) => sel.has(p.id));
          return (
            <section key={month} className="roll-month">
              <div className="roll-month-head">
                <h3>{month}</h3>
                <button className="link" onClick={() => toggle(photos.map((p) => p.id), !all)}>
                  {all ? "Deselect" : "Select month"}
                </button>
              </div>
              <div className="roll-grid">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    className={`roll-cell ${sel.has(p.id) ? "on" : ""}`}
                    onClick={() => toggle([p.id], !sel.has(p.id))}
                    aria-pressed={sel.has(p.id)}
                    aria-label={`Photo from ${fmtShort(p.time)}`}
                  >
                    <img src={p.src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="footer">
        <button className="btn big" disabled={!sel.size} onClick={onDone}>
          {sel.size ? `Looks good · make my trips` : "Choose some photos"}
        </button>
      </div>
    </div>
  );
}

// "AI is making your trips": a short beat so the grouping feels considered.
function Making({ photos, count, trips, onDone, corners }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="screen making">
      <PhotoDrift photos={photos} corners={corners} />
      <div className="making-text">
        <div className="display small">Finding the stories in {count} photos…</div>
        <div className="making-sub">{trips} {trips === 1 ? "trip" : "trips"} so far</div>
      </div>
    </div>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
    </svg>
  );
}
