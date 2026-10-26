// Illustrated stand-ins for camera-roll photos. Each tag draws a simple
// naive-style scene; `v` (the take number) nudges the composition so takes of
// the same moment look similar but not identical — like a real burst.

const uri = (inner) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">${inner}</svg>`
  )}`;

const sky = (a, b) =>
  `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#s)"/>`;

const mesa = (y, c, j = 0) =>
  `<path d="M0 ${y} L${120 + j} ${y} L${150 + j} ${y - 120} L${330 + j} ${y - 120} L${360 + j} ${y} L${470 + j} ${y} L${500 + j} ${y - 60} L${640 + j} ${y - 60} L${670 + j} ${y} L800 ${y} L800 1000 L0 1000Z" fill="${c}"/>`;

const person = (x, y, shirt, skin = "#e7b48e", s = 1, tilt = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})"><rect x="-70" y="40" width="140" height="260" rx="70" fill="${shirt}"/><circle cx="0" cy="0" r="62" fill="${skin}"/><path d="M-22 14 Q0 34 22 14" stroke="#5a3a2a" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="-20" cy="-8" r="6" fill="#3a2a22"/><circle cx="20" cy="-8" r="6" fill="#3a2a22"/></g>`;

const cloud = (x, y, c, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><ellipse cx="0" cy="0" rx="110" ry="55"/><ellipse cx="80" cy="-30" rx="90" ry="60"/><ellipse cx="160" cy="5" rx="100" ry="50"/></g>`;

const road = (horizon, j = 0) =>
  `<path d="M${380 + j} ${horizon} L${420 + j} ${horizon} L760 1000 L40 1000Z" fill="#4a4440"/>` +
  [0, 1, 2, 3]
    .map((i) => {
      const y = horizon + 40 + i * i * 38 + i * 30;
      const w = 4 + i * 5;
      return `<rect x="${400 + j - w / 2}" y="${y}" width="${w}" height="${20 + i * 18}" fill="#f5e9c8"/>`;
    })
    .join("");

const SCENES = {
  coffee: (j) =>
    `<rect width="800" height="1000" fill="#efe7da"/><rect y="640" width="800" height="360" fill="#b98b62"/><ellipse cx="${400 + j}" cy="640" rx="170" ry="60" fill="#8f6646"/><path d="M${270 + j} 470 L${530 + j} 470 L${500 + j} 640 L${300 + j} 640Z" fill="#fbf8f1"/><ellipse cx="${400 + j}" cy="470" rx="130" ry="34" fill="#6b4226"/><path d="M${530 + j} 510 q70 10 50 70 q-20 40 -60 30" stroke="#fbf8f1" stroke-width="22" fill="none"/>`,
  ticket: (j) =>
    `<rect width="800" height="1000" fill="#1d1b22"/><rect x="${190 + j}" y="150" width="420" height="720" rx="48" fill="#2c2a33"/><rect x="${220 + j}" y="200" width="360" height="620" rx="24" fill="#f4efe6"/><text x="${400 + j}" y="330" font-family="Georgia" font-size="96" fill="#1d1b22" text-anchor="middle">5:58</text><text x="${400 + j}" y="420" font-family="Georgia" font-size="40" fill="#d6453d" text-anchor="middle">SFO → PHX</text><rect x="${260 + j}" y="480" width="280" height="18" rx="9" fill="#d8d0c2"/><rect x="${260 + j}" y="520" width="200" height="18" rx="9" fill="#d8d0c2"/><rect x="${260 + j}" y="640" width="280" height="90" rx="20" fill="#1d1b22"/><text x="${400 + j}" y="698" font-family="Helvetica" font-size="34" fill="#f4efe6" text-anchor="middle">Book flight</text>`,
  airport: (j) =>
    `${sky("#cfe3f2", "#f4efe6")}<rect y="700" width="800" height="300" fill="#9aa3a8"/><g transform="translate(${360 + j} 420) rotate(-12)"><ellipse cx="0" cy="0" rx="230" ry="38" fill="#fbfbfb"/><path d="M-40 0 L60 0 L-60 160 L-120 160Z" fill="#e6e9ec"/><path d="M-200 -10 L-170 -10 L-220 -110 L-250 -110Z" fill="#d6453d"/></g><g stroke="#3d4a52" stroke-width="22"><line x1="0" y1="0" x2="0" y2="1000"/><line x1="400" y1="0" x2="400" y2="1000"/><line x1="800" y1="0" x2="800" y2="1000"/><line x1="0" y1="10" x2="800" y2="10"/></g>`,
  friend: (j, v) =>
    `${sky("#f6d9b8", "#e9a77c")}${person(260 + j, 430 - v * 6, "#5b7bd6", "#e7b48e", 1.25, -6 + v * 3)}${person(540 + j, 450 + v * 4, "#d6453d", "#c98f68", 1.25, 5 - v * 2)}`,
  road: (j) =>
    `${sky("#8fc3e8", "#f3e1c4")}<rect y="560" width="800" height="440" fill="#d9925a"/>${road(560, j)}<g fill="#5f8a4a"><rect x="${110 - j}" y="520" width="34" height="160" rx="17"/><rect x="${74 - j}" y="560" width="26" height="70" rx="13"/><rect x="${640 - j}" y="540" width="26" height="110" rx="13"/></g>`,
  hotel: (j) =>
    `<rect width="800" height="1000" fill="#efe3d3"/><rect x="${200 + j}" y="140" width="400" height="320" rx="10" fill="#8fc3e8"/><rect x="${200 + j}" y="340" width="400" height="120" fill="#d9925a"/><rect x="${200 + j}" y="140" width="400" height="320" rx="10" fill="none" stroke="#fbf8f1" stroke-width="18"/><rect x="60" y="640" width="680" height="300" rx="24" fill="#fbf8f1"/><rect x="100" y="600" width="240" height="90" rx="40" fill="#fff"/><rect x="60" y="760" width="680" height="180" rx="10" fill="#c9d6c0"/>`,
  venue: (j) =>
    `${sky("#2f3a66", "#e79a6d")}<g fill="#c9b8a2"><path d="M${60 + j} 1000 A200 200 0 0 1 ${460 + j} 1000Z"/><path d="M${420 + j} 1000 A170 170 0 0 1 ${760 + j} 1000Z"/></g><g fill="#a8957e"><path d="M${190 + j} 1000 A70 70 0 0 1 ${330 + j} 1000Z"/></g><g fill="#ffe6a8">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${120 + i * 140 + j}" cy="${380 - (i % 2) * 40}" r="7"/>`).join("")}</g>`,
  grounds: (j) =>
    `${sky("#f2c9a0", "#f7e7d3")}<path d="M${100 + j} 1000 L${100 + j} 520 A300 300 0 0 1 ${700 + j} 520 L${700 + j} 1000Z" fill="#cdbfae"/><g fill="none" stroke="#b3a493" stroke-width="10">${[0, 1, 2, 3].map((i) => `<path d="M${160 + i * 40 + j} 1000 L${160 + i * 40 + j} 560 A${240 - i * 40} ${240 - i * 40} 0 0 1 ${640 - i * 40 + j} 560 L${640 - i * 40 + j} 1000"/>`).join("")}</g><circle cx="${400 + j}" cy="760" r="30" fill="#3a2a22"/><rect x="${370 + j}" y="790" width="60" height="140" rx="30" fill="#5b7bd6"/>`,
  sunset: (j, v) =>
    `${sky("#3b2a5a", "#f59a5b")}<circle cx="${400 + j}" cy="${600 + v * 18}" r="${120 - v * 4}" fill="#ffd27a"/>${mesa(760, "#2b1d2b", j)}`,
  canyon: (j) =>
    `${sky("#bfe0f2", "#fbe6cf")}<path d="M0 420 Q200 ${380 + j} 400 430 T800 410 L800 1000 L0 1000Z" fill="#e08a5a"/><path d="M0 560 Q220 ${520 + j} 420 580 T800 550 L800 1000 L0 1000Z" fill="#c4583a"/><path d="M0 720 Q240 ${690 + j} 440 740 T800 710 L800 1000 L0 1000Z" fill="#a8452f"/><path d="M0 880 Q260 ${850 + j} 480 900 T800 870 L800 1000 L0 1000Z" fill="#7d3324"/>`,
  meditation: (j) =>
    `${sky("#d9d0ee", "#f6efe6")}<rect x="160" y="800" width="480" height="40" rx="20" fill="#b7a6d9"/><path d="M${400 + j} 520 L${560 + j} 800 L${240 + j} 800Z" fill="#7d6bb0"/><circle cx="${400 + j}" cy="470" r="62" fill="#e7b48e"/><path d="M${380 + j} 470 h12 M${408 + j} 470 h12" stroke="#3a2a22" stroke-width="6" stroke-linecap="round"/>`,
  people: (j, v) =>
    `${sky("#f9e0b0", "#f3b07c")}${person(170 + j, 520, "#5f8a4a", "#c98f68", 0.95, -4 + v * 2)}${person(330 + j, 480, "#d6453d", "#e7b48e", 1.05, 3)}${person(480 + j, 500, "#5b7bd6", "#8d5b3e", 1, -2 - v)}${person(630 + j, 530, "#e0b33a", "#e7b48e", 0.9, 5)}`,
  storm: (j) =>
    `${sky("#3d3a52", "#8c8aa3")}${cloud(60 + j, 240, "#2a2838", 1.4)}${cloud(380 + j, 180, "#34324a", 1.2)}<polyline points="${430 + j},300 ${380 + j},470 ${450 + j},470 ${390 + j},660" fill="none" stroke="#fff3b0" stroke-width="14" stroke-linejoin="round"/><rect y="760" width="800" height="240" fill="#8a6a55"/>${mesa(780, "#5c4337", j)}`,
  sedona: (j) =>
    `${sky("#6fb3e6", "#cfe8f5")}<path d="M${80 + j} 1000 L${120 + j} 520 L${180 + j} 440 L${260 + j} 430 L${300 + j} 560 L${320 + j} 1000Z" fill="#c1502e"/><path d="M${380 + j} 1000 L${420 + j} 380 L${470 + j} 300 L${520 + j} 330 L${560 + j} 600 L${600 + j} 1000Z" fill="#a8452f"/><path d="M${560 + j} 1000 L${600 + j} 640 L${700 + j} 600 L${760 + j} 1000Z" fill="#d06a3c"/><g fill="#5f8a4a"><ellipse cx="200" cy="960" rx="120" ry="50"/><ellipse cx="620" cy="980" rx="160" ry="50"/></g>`,
  drivehome: (j) =>
    `${sky("#1e2140", "#d77a61")}<rect y="600" width="800" height="400" fill="#3b2f3a"/>${road(600, j)}<circle cx="${370 + j}" cy="720" r="10" fill="#ff5a4e"/><circle cx="${430 + j}" cy="720" r="10" fill="#ff5a4e"/>`,
  laptop: (j) =>
    `<rect width="800" height="1000" fill="#ddd3c4"/><rect x="${170 + j}" y="300" width="460" height="300" rx="18" fill="#3a3a40"/><rect x="${190 + j}" y="320" width="420" height="260" rx="8" fill="#f4efe6"/><path d="M${120 + j} 620 L${680 + j} 620 L${640 + j} 660 L${160 + j} 660Z" fill="#9a9aa2"/><rect x="${230 + j}" y="360" width="200" height="14" rx="7" fill="#d8d0c2"/><rect x="${230 + j}" y="390" width="300" height="14" rx="7" fill="#d8d0c2"/>`,
  concert: (j) =>
    `<rect width="800" height="1000" fill="#15121c"/><g opacity="0.55"><path d="M${200 + j} 0 L${80 + j} 700 L${320 + j} 700Z" fill="#7d6bb0"/><path d="M${600 + j} 0 L${480 + j} 700 L${720 + j} 700Z" fill="#d6453d"/></g><rect y="700" width="800" height="300" fill="#0d0b12"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${70 + i * 130}" cy="${760 + (i % 2) * 20}" r="44" fill="#2a2535"/>`).join("")}`,
  hike: (j) =>
    `${sky("#cfe6f0", "#f3f0e2")}<path d="M0 640 Q200 ${520 + j} 420 600 T800 560 L800 1000 L0 1000Z" fill="#8fb27a"/><path d="M0 780 Q260 ${700 + j} 500 770 T800 740 L800 1000 L0 1000Z" fill="#5f8a4a"/><path d="M${380 + j} 1000 Q${420 + j} 860 ${470 + j} 780" stroke="#e8d9b6" stroke-width="26" fill="none"/>`,
};

export function scene(tag, v = 0) {
  const draw = SCENES[tag] ?? SCENES.coffee;
  return uri(draw((v % 2 ? 1 : -1) * v * 9, v));
}
