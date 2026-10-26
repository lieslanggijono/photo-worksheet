import { scene } from "./scenes.js";

// A photo: { id, src, time: Date, moment, tag, sharp }
// A moment: a burst of near-duplicate takes of the same thing.

const YEAR = 2026;
const at = (day, h, m, s = 0, month = 9) => new Date(YEAR, month, day, h, m, s);

// The sample camera roll. Three stories live in it:
// FORM Arcosanti (Oct 9–11, with a day on either side so "show the day
// before / after" has something to reveal), a concert (Sep 27) and a hike (Sep 14).
const SAMPLE_MOMENTS = [
  // Mt. Tam hike, Sep 14
  { tag: "coffee", mo: 8, day: 14, t: [7, 40], takes: 1, why: "Fuel before the climb" },
  { tag: "road", mo: 8, day: 14, t: [8, 30], takes: 1 },
  { tag: "hike", mo: 8, day: 14, t: [9, 50], takes: 3, why: "The trail opens up", cover: true },
  { tag: "friend", mo: 8, day: 14, t: [11, 15], takes: 4, why: "Summit selfie, 4 takes" },
  { tag: "hike", mo: 8, day: 14, t: [12, 5], takes: 2, why: "The view from the top" },
  { tag: "sunset", mo: 8, day: 14, t: [18, 50], takes: 2, why: "Sunset on the way down" },
  // Concert night, Sep 27
  { tag: "drivehome", mo: 8, day: 27, t: [18, 30], takes: 1 },
  { tag: "people", mo: 8, day: 27, t: [19, 20], takes: 2, why: "Waiting in line" },
  { tag: "friend", mo: 8, day: 27, t: [20, 5], takes: 3, why: "Before the lights went down" },
  { tag: "concert", mo: 8, day: 27, t: [21, 10], takes: 4, why: "Your favorite song, 4 takes", cover: true },
  { tag: "concert", mo: 8, day: 27, t: [22, 30], takes: 2, why: "The encore" },
  // Arizona, Oct 8–12
  { tag: "coffee", day: 8, t: [16, 12], takes: 1 },
  { tag: "ticket", day: 9, t: [5, 58], takes: 1, why: "Where it started — 5:58am" },
  { tag: "airport", day: 9, t: [7, 40], takes: 2 },
  { tag: "friend", day: 9, t: [9, 15], takes: 5, why: "You took 5 of these" },
  { tag: "road", day: 9, t: [12, 30], takes: 2, why: "The drive in" },
  { tag: "hotel", day: 9, t: [15, 10], takes: 1 },
  { tag: "venue", day: 9, t: [17, 40], takes: 2, why: "First look at the venue" },
  { tag: "grounds", day: 9, t: [18, 20], takes: 3 },
  { tag: "sunset", day: 9, t: [19, 5], takes: 4, why: "Golden hour, 4 takes", cover: true },
  { tag: "canyon", day: 10, t: [8, 30], takes: 2, why: "Big landscape" },
  { tag: "meditation", day: 10, t: [11, 0], takes: 1, why: "A quiet moment" },
  { tag: "people", day: 10, t: [14, 10], takes: 3, why: "New faces" },
  { tag: "storm", day: 10, t: [16, 45], takes: 2, why: "The weather turned" },
  { tag: "sedona", day: 11, t: [10, 20], takes: 3, why: "Detour to Sedona" },
  { tag: "drivehome", day: 11, t: [18, 0], takes: 1 },
  { tag: "laptop", day: 12, t: [9, 0], takes: 1 },
];

// Stories the app found in the sample roll, newest first: one hero, two below.
export const SUGGESTIONS = [
  { id: "arizona", title: "Arizona", range: [at(9, 0, 0), at(11, 0, 0)] },
  { id: "concert", title: "Concert night", range: [at(27, 0, 0, 0, 8), at(27, 0, 0, 0, 8)] },
  { id: "hike", title: "Mt. Tam hike", range: [at(14, 0, 0, 0, 8), at(14, 0, 0, 0, 8)] },
];

export function sampleLibrary() {
  const photos = [];
  SAMPLE_MOMENTS.forEach((m) => {
    // Stable ids (month, day, time, tag) so saved stories survive new sample data.
    const mid = `m-${m.mo ?? 9}-${m.day}-${m.t[0]}${String(m.t[1]).padStart(2, "0")}-${m.tag}`;
    for (let k = 0; k < m.takes; k++) {
      photos.push({
        id: `${mid}-${k}`,
        src: scene(m.tag, k),
        time: at(m.day, m.t[0], m.t[1], k * 4, m.mo ?? 9),
        moment: mid,
        tag: m.tag,
        // the middle take is the "sharpest" in the sample set
        sharp: k === Math.floor(m.takes / 2) ? 1 : 0.5,
        why: m.why,
        cover: m.cover,
      });
    }
  });
  return photos;
}

export const SAMPLE_RANGE = SUGGESTIONS[0].range;

export function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d, n) {
  const x = dayStart(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function inRange(photo, [from, to]) {
  const t = photo.time.getTime();
  return t >= dayStart(from).getTime() && t < addDays(to, 1).getTime();
}

// Group photos into moments, keeping the library's own grouping.
export function momentsOf(photos) {
  const map = new Map();
  for (const p of photos) {
    if (!map.has(p.moment)) map.set(p.moment, []);
    map.get(p.moment).push(p);
  }
  return [...map.entries()]
    .map(([id, takes]) => {
      takes.sort((a, b) => a.time - b.time);
      const best = takes.reduce((a, b) => (b.sharp > a.sharp ? b : a));
      return { id, takes, best, time: takes[0].time, tag: takes[0].tag, why: takes[0].why, cover: takes.some((t) => t.cover) };
    })
    .sort((a, b) => a.time - b.time);
}

// ---------- the person's own photos ----------

// Read DateTimeOriginal from a JPEG's EXIF block; null when absent.
async function exifDate(file) {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off < v.byteLength - 4) {
      const marker = v.getUint16(off);
      const len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        const tiff = off + 10;
        const le = v.getUint16(tiff) === 0x4949;
        const u16 = (o) => v.getUint16(o, le);
        const u32 = (o) => v.getUint32(o, le);
        const readIfd = (ifd, wanted) => {
          const n = u16(ifd);
          for (let i = 0; i < n; i++) {
            const e = ifd + 2 + i * 12;
            if (u16(e) === wanted) return e;
          }
          return null;
        };
        const ptr = readIfd(tiff + u32(tiff + 4), 0x8769);
        if (ptr == null) return null;
        const entry = readIfd(tiff + u32(ptr + 8), 0x9003);
        if (entry == null) return null;
        const str = new TextDecoder().decode(new Uint8Array(buf, tiff + u32(entry + 8), 19));
        const [d, t] = str.split(" ");
        const [Y, M, D] = d.split(":").map(Number);
        const [h, m, s] = t.split(":").map(Number);
        return new Date(Y, M - 1, D, h, m, s);
      }
      off += 2 + len;
    }
  } catch {
    // unreadable EXIF: fall back to the file date
  }
  return null;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// 8x8 average hash plus a rough sharpness score (edge energy) from a tiny
// grayscale thumbnail. Enough to tell "same shot, another take" apart from
// "different shot", and to pick the crispest take.
function fingerprint(img) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, 32, 32);
  const px = g.getImageData(0, 0, 32, 32).data;
  const gray = new Float32Array(32 * 32);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  }
  const small = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      let s = 0;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) s += gray[(y * 4 + dy) * 32 + x * 4 + dx];
      small.push(s / 16);
    }
  const mean = small.reduce((a, b) => a + b, 0) / 64;
  const hash = small.map((s) => (s > mean ? 1 : 0));
  let sharp = 0;
  for (let y = 1; y < 31; y++)
    for (let x = 1; x < 31; x++) {
      const i = y * 32 + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - 32] - gray[i + 32];
      sharp += lap * lap;
    }
  return { hash, sharp };
}

const hamming = (a, b) => a.reduce((n, bit, i) => n + (bit !== b[i] ? 1 : 0), 0);

// Someone's own photos, picked from their camera roll. Each one is shrunk on
// the device (long edge 1600px) so hundreds of photos stay light, dated from
// its EXIF capture time, and fingerprinted for near-duplicate detection.
// `onProgress(done, total)` lets the UI show how far along it is.
const PICKABLE = /^image\/(jpeg|png|webp|gif|heic|heif)$/;
export async function libraryFromFiles(files, onProgress) {
  const imgs = [...files].filter((f) => PICKABLE.test(f.type) || (!f.type && /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name ?? "")));
  const photos = [];
  for (const [i, f] of imgs.entries()) {
    const original = URL.createObjectURL(f);
    const time = f.takenAt ? new Date(f.takenAt) : (await exifDate(f)) ?? new Date(f.lastModified || Date.now());
    try {
      const img = await loadImage(original);
      const blob = await shrink(img, 1600);
      const src = URL.createObjectURL(blob);
      const { hash, sharp } = fingerprint(img);
      photos.push({ id: `u${i}`, src, blob, time, hash, sharp, tag: "yours" });
    } catch {
      // a format this browser can't open: skip it
    } finally {
      URL.revokeObjectURL(original);
    }
    onProgress?.(i + 1, imgs.length);
  }
  return groupTakes(photos, "u");
}

function shrink(img, max) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85));
}

// Picked photos are kept on this device (IndexedDB), so a reload doesn't
// lose them. Nothing is uploaded anywhere.
const DB = "pw-camera-roll";
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveLibrary(photos) {
  try {
    const d = await db();
    const tx = d.transaction("photos", "readwrite");
    const store = tx.objectStore("photos");
    store.clear();
    photos.forEach((p, i) => store.put({ blob: p.blob, time: p.time.getTime() }, i));
    await new Promise((res, rej) => ((tx.oncomplete = res), (tx.onerror = () => rej(tx.error))));
  } catch {
    // storage blocked (private mode): photos just won't survive a reload
  }
}
export async function loadSavedLibrary() {
  try {
    const d = await db();
    const rows = await new Promise((res, rej) => {
      const r = d.transaction("photos").objectStore("photos").getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (!rows.length) return null;
    const files = rows.map((r) => Object.assign(new File([r.blob], "photo.jpg", { type: "image/jpeg" }), { takenAt: r.time }));
    return libraryFromFiles(files);
  } catch {
    return null;
  }
}
export async function clearSavedLibrary() {
  try {
    const d = await db();
    d.transaction("photos", "readwrite").objectStore("photos").clear();
  } catch {
    // nothing saved
  }
}

// Takes of the same moment: shot within 90 seconds of each other and
// looking alike (hash distance ≤ 14 of 64).
function groupTakes(photos, prefix) {
  photos.sort((a, b) => a.time - b.time);
  let current = null;
  photos.forEach((p, i) => {
    const prev = photos[i - 1];
    const sameMoment = prev && p.time - prev.time <= 90_000 && hamming(p.hash, prev.hash) <= 14;
    if (!sameMoment) current = `${prefix}-m${i}`;
    p.moment = current;
  });
  return photos;
}

// Files in public/ live under the site's base path (e.g. /photo-worksheet/
// on GitHub Pages), so every "/photos/..." path goes through here.
export const asset = (path) => import.meta.env.BASE_URL + path.replace(/^\//, "");

// The real camera roll for the prototype: four trips exported from Photos,
// shrunk into public/photos with a manifest of when each was taken.
export async function loadTrips() {
  const { trips } = await fetch(asset("/photos/manifest.json")).then((r) => r.json());
  const library = [];
  await Promise.all(
    trips.map(async (t) => {
      const photos = await Promise.all(
        t.photos.map(async (p) => {
          const time = new Date(p.time);
          try {
            const { hash, sharp } = fingerprint(await loadImage(asset(p.file)));
            return { id: p.file, src: asset(p.file), time, hash, sharp, tag: t.id, cover: p.file === t.cover };
          } catch {
            return null;
          }
        })
      );
      library.push(...groupTakes(photos.filter(Boolean), t.id));
    })
  );
  library.sort((a, b) => a.time - b.time);
  const suggestions = trips.map((t) => {
    const mine = library.filter((p) => p.tag === t.id);
    return { id: t.id, title: t.title, place: t.place, cover: asset(t.cover), range: rangeOf(mine) };
  });
  return { library, suggestions };
}

export function rangeOf(photos) {
  if (!photos.length) return SAMPLE_RANGE;
  return [dayStart(photos[0].time), dayStart(photos[photos.length - 1].time)];
}

export const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtTime = (d) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
