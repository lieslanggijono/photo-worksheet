import { useEffect, useState } from "react";
import { textSpot } from "./overlay.js";
import { fmtShort, fmtTime } from "./photos.js";

const words = (story, p) => (story.entries[p.id] ?? "").trim();

const loadImg = (src) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const COVER_FONT = "400 96px 'Martina Plantijn', Georgia, serif";
const QUOTE_FONT = "42px 'Tiempos Text', 'Source Serif 4', Georgia, serif";
// Same -0.04em tracking as on screen (the lab's Martina tightness), in px.
const track = (px) => `${(-0.04 * px).toFixed(2)}px`;

// Draws one 1080×1350 (4:5) slide in the Interview Magazine style: words on
// tight white boxes, placed in the calmest part of the photo (see overlay.js).
async function renderSlide({ src, caption, title, subtitle, spot }) {
  const W = 1080;
  const H = 1350;
  const M = 72;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const img = await loadImg(src);
  const s = Math.max(W / img.width, H / img.height);
  g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
  await document.fonts?.ready;
  g.textBaseline = "alphabetic";

  if (title) {
    // Headline: uppercase, every word on its own white box, centered.
    g.font = COVER_FONT;
    g.letterSpacing = track(96);
    const lines = wrap(g, title, W - 2 * M - 40);
    const lh = 118;
    const block = lines.length * lh;
    let y = spot?.v === "top" ? H * 0.1 : H * 0.86 - block;
    for (const line of lines) {
      const ws = line.split(" ");
      const gap = 18;
      const widths = ws.map((w) => g.measureText(w).width + 24);
      const total = widths.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      let x = (W - total) / 2;
      ws.forEach((w, i) => {
        g.fillStyle = "#fff";
        g.fillRect(x, y, widths[i], lh - 14);
        g.fillStyle = "#111";
        g.fillText(w, x + 12, y + lh - 34);
        x += widths[i] + gap;
      });
      y += lh;
    }
    if (subtitle) {
      g.font = "30px 'Die Grotesk', sans-serif";
      g.letterSpacing = "0px";
      const tw = g.measureText(subtitle).width;
      g.fillStyle = "#fff";
      g.fillText(subtitle, (W - tw) / 2, spot?.v === "top" ? y + 40 : Math.min(H - 40, y + 44));
    }
  } else if (caption) {
    // Quote: “your words”, serif, each line on a white strip.
    g.font = QUOTE_FONT;
    g.letterSpacing = track(42);
    const maxW = spot?.h === "center" ? W * 0.72 : W * 0.62;
    const lines = wrap(g, `\u201c${caption}\u201d`, maxW).slice(0, 9);
    const lh = 60;
    const block = lines.length * lh;
    let y = spot?.v === "top" ? H * 0.08 : H * 0.92 - block;
    for (const line of lines) {
      const tw = g.measureText(line).width;
      const x = spot?.h === "right" ? W - M - tw : spot?.h === "center" ? (W - tw) / 2 : M;
      g.fillStyle = "#fff";
      g.fillRect(x - 10, y, tw + 20, lh - 6);
      g.fillStyle = "#111";
      g.fillText(line, x, y + 42);
      y += lh;
    }
  }
  return new Promise((res) => c.toBlob(res, "image/png"));
}

async function saveSlides(story, slides, coverSrc) {
  const range = `${fmtShort(story.range[0])} – ${fmtShort(story.range[1])}`;
  const specs = [
    { src: coverSrc, title: story.title, subtitle: range, spot: await textSpot(coverSrc, "cover") },
    ...(await Promise.all(
      slides.map(async (p) => ({ src: p.photo.src, caption: words(story, p), spot: await textSpot(p.photo.src, "quote") }))
    )),
  ];
  const blobs = await Promise.all(specs.map(renderSlide));
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "story";
  const files = blobs.map((b, i) => new File([b], `${slug}-${String(i + 1).padStart(2, "0")}.png`, { type: "image/png" }));
  if (navigator.canShare?.({ files })) {
    await navigator.share({ files });
    return "shared";
  }
  for (const f of files) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    await new Promise((r) => setTimeout(r, 250));
  }
  return "downloaded";
}

export function Story({ story, patch, pages, onBack, onShare }) {
  return (
    <div className="screen story">
      <div className="topbar">
        <button className="crayon-btn back" onClick={onBack} aria-label="Back to writing">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
            <path d="M14.8 5.2c-2.4 2.1-4.6 4.4-6.6 6.9 2 2.3 4.3 4.6 6.8 6.7" />
          </svg>
        </button>
        <span />
        <button className="crayon-btn share-btn" onClick={onShare} aria-label="Share">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
            <path d="M12 15.5V4.2M7.8 8.2l4.2-4.3 4.3 4.2M6 12.5v5.8c0 1 .8 1.8 1.8 1.8h8.5c1 0 1.8-.8 1.8-1.8v-5.8" />
          </svg>
        </button>
      </div>
      <div className="scroll">
        <input className="story-title display" aria-label="Story title" value={story.title} onChange={(e) => patch({ title: e.target.value })} />
        <div className="story-dates">
          {fmtShort(story.range[0])}
          {story.range[0].toDateString() !== story.range[1].toDateString() && ` – ${fmtShort(story.range[1])}`}
        </div>
        {pages.map((p, i) => (
          <button key={p.id} className="story-page" onClick={() => (patch({ index: i }), onBack())}>
            <img src={p.photo.src} alt="" />
            <div className="story-time">
              <i>{story.title}</i>
              {"\u2003"}
              {fmtTime(p.photo.time)}
            </div>
            {words(story, p) ? <p>{words(story, p)}</p> : <p className="unwritten">Nothing yet. Tap to write.</p>}
          </button>
        ))}
      </div>
      <div className="footer">
        <button className="btn big soft compact slip" onClick={onShare}>
          Share your story
        </button>
      </div>
    </div>
  );
}

export function Share({ story, pages, onBack, onHome, say, patch }) {
  const [format, setFormat] = useState("carousel");
  const [saving, setSaving] = useState(false);
  // What just happened (saved, copied), shown as a quiet line above the button.
  const [note, setNote] = useState("");
  const written = pages.filter((p) => words(story, p));
  const hidden = new Set(story.hiddenSlides ?? []);
  // Slide captions can be edited here without touching the worksheet.
  const caption = (p) => (story.captions?.[p.id] ?? words(story, p)).trim();
  const slides = (written.length ? written : pages.slice(0, 6)).filter((p) => !hidden.has(p.id));
  const removeSlide = (id) => {
    patch((s) => ({ hiddenSlides: [...(s.hiddenSlides ?? []), id] }));
    say("Slide removed", {
      label: "Undo",
      run: () => patch((s) => ({ hiddenSlides: (s.hiddenSlides ?? []).filter((x) => x !== id) })),
    });
  };
  // The cover never repeats a slide's photo: the trip's cover photo if it's in
  // the story, else a page that isn't a slide, else the first page (which then
  // only appears as the cover).
  const coverPage =
    pages.find((p) => (p.takes ?? [p.photo]).some((t) => t.cover)) ?? pages.find((p) => !slides.includes(p)) ?? slides[0];
  const coverSrc = coverPage?.photo.src;
  const quoteSlides = slides.filter((p) => p !== coverPage);

  const draft = [
    story.title,
    `${fmtShort(story.range[0])} – ${fmtShort(story.range[1])}`,
    "",
    ...slides.map((p) => `[photo · ${fmtTime(p.photo.time)}]\n${words(story, p) || "…"}`),
  ].join("\n\n");

  return (
    <div className="screen share">
      <div className="topbar">
        <button className="crayon-btn back" onClick={onBack} aria-label="Back to story">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#wax)">
            <path d="M14.8 5.2c-2.4 2.1-4.6 4.4-6.6 6.9 2 2.3 4.3 4.6 6.8 6.7" />
          </svg>
        </button>
        <span className="topbar-title">Share</span>
        <span />
      </div>
      <div className="seg big-seg">
        <button className={format === "carousel" ? "on" : ""} onClick={() => (setFormat("carousel"), setNote(""))}>
          Carousel
        </button>
        <button className={format === "substack" ? "on" : ""} onClick={() => (setFormat("substack"), setNote(""))}>
          Substack draft
        </button>
      </div>

      {format === "carousel" ? (
        <>
          <p className="share-hint">Sized 4:5, ready for an Instagram carousel</p>
          <div className="carousel">
            <Slide src={coverSrc} kind="cover">
              <div className="ix-cover">
                <span
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  aria-label="Cover title"
                  onBlur={(e) => patch({ title: e.currentTarget.textContent.trim() || story.title })}
                >
                  {story.title}
                </span>
              </div>
              <div className="ix-sub">
                {fmtShort(story.range[0])} – {fmtShort(story.range[1])}
              </div>
            </Slide>
            {quoteSlides.map((p) => (
              <Slide key={p.id} src={p.photo.src} kind="quote" onRemove={() => removeSlide(p.id)}>
                <p className="ix-quote">
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    aria-label="Slide caption"
                    onBlur={(e) => {
                      const t = e.currentTarget.textContent.replace(/^\u201c|\u201d$/g, "").trim();
                      patch((s) => ({ captions: { ...(s.captions ?? {}), [p.id]: t } }));
                    }}
                  >
                    {caption(p) ? `\u201c${caption(p)}\u201d` : "no words yet"}
                  </span>
                </p>
              </Slide>
            ))}
          </div>
          <div className="share-gap tight" aria-hidden />
          <div className="footer share-foot">
            <p className="share-note" aria-live="polite">{note}</p>
            <button
              className="btn big soft compact"
              disabled={saving || !slides.length}
              onClick={async () => {
                setSaving(true);
                try {
                  const how = await saveSlides({ ...story, entries: { ...story.entries, ...(story.captions ?? {}) } }, quoteSlides, coverSrc);
                  setNote(how === "shared" ? "Slides ready to post" : `${quoteSlides.length + 1} slides saved to your downloads`);
                } catch (e) {
                  if (e?.name !== "AbortError") setNote("Couldn't make the slides. Try again.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Making slides…" : `Save ${quoteSlides.length + 1} slides`}
            </button>
            <button className="text-btn home-link" onClick={onHome}>
              I'm done, back home
            </button>
          </div>
          <div className="share-gap" aria-hidden />
        </>
      ) : (
        <>
          <div className="scroll substack">
            <div className="post-title">{story.title}</div>
            <div className="post-sub">
              {fmtShort(story.range[0])} – {fmtShort(story.range[1])}
            </div>
            {slides.map((p) => (
              <div key={p.id} className="post-block">
                <img src={p.photo.src} alt="" />
                <p>{words(story, p) || <span className="unwritten">…</span>}</p>
              </div>
            ))}
          </div>
          <div className="footer share-foot">
            <p className="share-note" aria-live="polite">{note}</p>
            <button
              className="btn big soft compact"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(draft)
                  .then(() => setNote("Draft copied. Paste it into Substack."))
                  .catch(() => setNote("Couldn't reach the clipboard"))
              }
            >
              Copy draft
            </button>
            <button className="text-btn home-link" onClick={onHome}>
              I'm done, back home
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// One carousel slide; the text block moves to wherever the photo is calmest.
function Slide({ src, kind, children, onRemove }) {
  const [spot, setSpot] = useState(null);
  useEffect(() => {
    let live = true;
    if (src) textSpot(src, kind).then((sp) => live && setSpot(sp));
    return () => {
      live = false;
    };
  }, [src, kind]);
  return (
    <div className={`slide ix ${kind} ${spot ? `v-${spot.v} h-${spot.h}` : "pending"}`}>
      <img src={src} alt="" />
      <div className="ix-text">{children}</div>
      {onRemove && (
        <button className="slide-x" onClick={onRemove} aria-label="Remove this slide">
          ×
        </button>
      )}
    </div>
  );
}
