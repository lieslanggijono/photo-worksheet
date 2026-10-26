// Where to put text on a photo so it doesn't cover the subject.
//
// We look at the photo cropped to the slide (4:5), score how "busy" each
// region is (edges + color), and put the words in the calmest one. Busy
// regions are usually the subject: faces, people, food, a stage. Calm ones are
// sky, snow, walls, tablecloth. A stand-in for real subject detection
// (Vision's saliency request on iOS), but it works on any photo, on-device.

const cache = new Map();
const GW = 36;
const GH = 45;

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function busyMap(img) {
  const c = document.createElement("canvas");
  c.width = GW;
  c.height = GH;
  const g = c.getContext("2d", { willReadFrequently: true });
  // Crop to 4:5 the same way the slide does (cover, centered).
  const s = Math.max(GW / img.width, GH / img.height);
  g.drawImage(img, (GW - img.width * s) / 2, (GH - img.height * s) / 2, img.width * s, img.height * s);
  const px = g.getImageData(0, 0, GW, GH).data;
  const lum = new Float32Array(GW * GH);
  const sat = new Float32Array(GW * GH);
  for (let i = 0; i < lum.length; i++) {
    const r = px[i * 4];
    const gr = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    lum[i] = 0.299 * r + 0.587 * gr + 0.114 * b;
    sat[i] = Math.max(r, gr, b) - Math.min(r, gr, b);
  }
  const busy = new Float32Array(GW * GH);
  for (let y = 1; y < GH - 1; y++)
    for (let x = 1; x < GW - 1; x++) {
      const i = y * GW + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + GW] - lum[i - GW];
      busy[i] = Math.hypot(gx, gy) + 0.25 * sat[i];
    }
  return busy;
}

function score(busy, x0, x1, y0, y1) {
  let sum = 0;
  let n = 0;
  for (let y = Math.floor(y0 * GH); y < Math.ceil(y1 * GH); y++)
    for (let x = Math.floor(x0 * GW); x < Math.ceil(x1 * GW); x++) {
      sum += busy[y * GW + x];
      n++;
    }
  return n ? sum / n : Infinity;
}

// kind "cover": a wide centered headline (top or bottom band).
// kind "quote": a narrower block (top/bottom, left/right/center).
export async function textSpot(src, kind) {
  const key = `${kind}|${src}`;
  if (cache.has(key)) return cache.get(key);
  let spot = { v: "bottom", h: kind === "cover" ? "center" : "left" };
  try {
    const busy = busyMap(await loadImage(src));
    const rows = kind === "cover" ? { top: [0.08, 0.4], bottom: [0.58, 0.9] } : { top: [0.06, 0.36], bottom: [0.62, 0.94] };
    const cols = kind === "cover" ? { center: [0.1, 0.9] } : { left: [0.04, 0.7], right: [0.3, 0.96], center: [0.12, 0.88] };
    let best = Infinity;
    for (const [v, [y0, y1]] of Object.entries(rows))
      for (const [h, [x0, x1]] of Object.entries(cols)) {
        // Small nudge toward bottom-left, Interview's default, when it's a near tie.
        const bias = (v === "bottom" ? 0.97 : 1) * (h === "left" ? 0.98 : 1);
        const sc = score(busy, x0, x1, y0, y1) * bias;
        if (sc < best) {
          best = sc;
          spot = { v, h };
        }
      }
  } catch {
    // unreadable image: keep the default spot
  }
  cache.set(key, spot);
  return spot;
}
