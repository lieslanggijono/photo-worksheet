// The decision lab. Every decision is written as the question we're asking
// ourselves ("what do we want to build here?"), with the options we're
// weighing and the tradeoff each one brings. These double as the deep-dive
// material for the video.

// Decisions already made. They stay visible in the lab so the reasoning is
// on hand for the deep dives, but they're no longer toggles.
export const DECIDED = [
  {
    question: "How do photos get into the story?",
    answer: "AI picks, you approve",
    why: "AI does the heavy lifting, but you see and approve every photo before writing, so it never feels out of your hands.",
  },
  {
    question: "What happens to the 5 selfies of the same moment?",
    answer: "Auto-pick the best, swipe to change",
    why: "One page per moment. The sharpest take shows first; swipe the photo to see the other takes.",
  },
  {
    question: "How long before offering a question?",
    answer: "5 seconds",
    why: "If you haven't typed or talked for 5 seconds, a question drifts in to help you start.",
  },
  {
    question: "Voice or typing first?",
    answer: "Voice first",
    why: "Talking is easier than writing when you're tired or on the go. The keyboard is still one tap away.",
  },
  {
    question: "Where does the page number go?",
    answer: "Bottom right, as 1/9",
    why: "Where a book's page number lives, out of the photo's way. Short enough to read at a glance.",
  },
  {
    question: "How do you get to the next photo?",
    answer: "Swipe left, in time order, with a timeline",
    why: "A story happens in order, so the photos move left to right like a timeline. A strip of thumbnails at the bottom shows where you are in the day and lets you jump. Swiping keeps the quick, scrolling feel our audience already has.",
  },
  {
    question: "Does the photo have a border?",
    answer: "No border",
    why: "No white frames or polaroid looks. The photo is the photo; the page around it is the paper.",
  },
  {
    question: "How should \"Allow photo access\" look?",
    answer: "A tear-off slip at the bottom of the paper",
    why: "The promise and the action are one object: you agree on the same sheet of paper that tells you what you'll get.",
  },
  {
    question: "The worksheet photo",
    answer: "Its own card, rounded (size and roundness tuned with the sliders)",
    why: "Big enough to be the memory cue, small enough to leave room to write. The photo and the paper are two separate cards.",
  },
  {
    question: "What happens when the words run past the lines?",
    answer: "Scroll, with a smaller font",
    why: "Nothing jumps or shrinks while you write; long entries just scroll.",
  },
  {
    question: "What kind of question helps most?",
    answer: "Senses and feelings",
    why: "Temperature, sounds, smells, who was there, how it felt. The five senses pull out details the photo can't hold.",
  },
  {
    question: "What does the all-pages view look like?",
    answer: "A grid you can rearrange",
    why: "Like a dating-profile photo grid: long-press to pick a page up and move it, × to take it out of the story.",
  },
  {
    question: "Which serif?",
    answer: "Martina, everywhere",
    why: "Martina Plantijn, set tight (-0.04em), for onboarding, the worksheet and every serif line. Light, literary, like a magazine essay.",
  },
  {
    question: "Place and time under the photo",
    answer: "Centered",
    why: "Calm and symmetric under the photo: the place in grey italic, then the date and time.",
  },
  {
    question: "How do you finish a story?",
    answer: "A round check",
    why: "Quiet and universal; no words needed on a calm screen.",
  },
];

export const FIXED = { choose: "ai", dupes: "auto", delay: 5, input: "voice", flip: "timeline", pageNum: "bottom-right", frame: "none", allowStyle: "slip", titleFont: "martina", font: "magazine", metaAlign: "center", doneStyle: "check", photoSize: "medium", corners: "round", layout: "two", overflow: "scroll", voice: "senses", overview: "hinge", skip: "grid" };

export const DECISIONS = [
  {
    key: "titlePlace",
    group: "Onboarding",
    question: "Is the title part of the paper?",
    options: [
      { value: "on", label: "On the paper", note: "The title is the worksheet's heading. One object, very literal: this is the sheet you'll fill out." },
      { value: "above", label: "Above the paper", note: "The title floats on the page with the photos, and the paper holds just the promise. More breathing room, more like a cover." },
    ],
  },
  {
    key: "titleGap",
    group: "Onboarding",
    question: "How much space under the title?",
    options: [
      { value: "snug", label: "Snug", note: "The title sits right on top of the first line. Compact, reads as one block." },
      { value: "roomy", label: "Roomy", note: "A clear breath between the underlined title and the lines. Lets the crayon stroke stand on its own." },
      { value: "airy", label: "Airy", note: "A generous gap, like a title at the top of a fresh worksheet with space before you start." },
    ],
  },
  {
    key: "driftCorners",
    group: "Onboarding",
    question: "Floating photos: how round?",
    options: [
      { value: "round", label: "Rounded", note: "Softly rounded 7pt corners, halfway between square and the home cards. Friendly without looking like app icons." },
      { value: "subtle", label: "4pt", note: "Barely rounded, 4pt. Still reads as a print, just takes the sharp edge off." },
      { value: "square", label: "Square", note: "No corner radius, like real prints or a contact sheet. More editorial and honest." },
    ],
  },
  {
    key: "paper",
    group: "The writing space",
    question: "What should the writing space look like?",
    options: [
      { value: "ruled", label: "Ruled lines", note: "The school worksheet. Lines invite a few sentences and make it feel finishable." },
      { value: "open", label: "Open paper", note: "Blank and calm. Feels freer, but loses the worksheet nostalgia." },
    ],
  },
  {
    key: "micStyle",
    group: "The worksheet",
    question: "What does the mic look like?",
    options: [
      { value: "crayon", label: "Crayon mic", note: "A little crayon drawing of a mic right before \"Tap…\", grey until you tap it, then black. Part of the page, not a control." },
      { value: "button", label: "Button", note: "A small round button under the paper. Obvious and tappable, a bit more 'app'." },
    ],
  },
  {
    key: "appear",
    group: "The dream question",
    question: "How should the question arrive?",
    options: [
      { value: "blur", label: "Blur in", note: "Comes into focus like a thought surfacing. The most dream-like." },
      { value: "fade", label: "Fade", note: "Plain opacity. Calm and easy to read, less magical." },
      { value: "drift", label: "Drift up", note: "Floats up from the lines like a passing thought. Playful, a bit more motion." },
    ],
  },
];

export const DEFAULT_LAB = {
  ...Object.fromEntries(DECISIONS.map((d) => [d.key, d.options[0].value])),
  // Liesl's picks in the lab, so a fresh browser (and the recordings) match.
  titlePlace: "above",
  driftCorners: "subtle",
  paper: "ruled",
  appear: "blur",
  photoSize: "between",
  font: "magazine",
  allowStyle: "slip",
  titleGap: "snug",
  doneStyle: "check",
  micStyle: "crayon",
  metaAlign: "center",
  layout: "two",
  nav: "both",
  skip: "topbar",
  corners: "round",
  ...FIXED,
};

// Canned questions for test mode, so iterating costs no AI calls.
const BY_TAG = {
  ticket: ["What kept you awake that night?", "What made you finally press book?"],
  airport: ["How did the airport feel at that hour?", "What were you carrying with you, besides your bag?"],
  friend: ["What was the first thing you said to each other?", "Why this person, for this trip?"],
  road: ["What was playing in the car?", "What did the desert look like out the window?"],
  hotel: ["How long did that nap actually last?", "What did the room smell like?"],
  venue: ["What was your first impression walking in?", "What did you hear before you saw anything?"],
  grounds: ["Where were you walking to?", "What did the concrete feel like under your hand?"],
  sunset: ["Who were you watching this with?", "What changed in you as the light went down?"],
  canyon: ["How small did you feel here?", "What did the morning air feel like?"],
  meditation: ["What did your mind keep wandering back to?", "What did you let go of here?"],
  people: ["Who here do you want to remember?", "What did you talk about?"],
  storm: ["Where were you when the storm rolled in?", "What did the rain smell like?"],
  sedona: ["Whose idea was the detour?", "What color were the rocks, really?"],
  arizona: ["What kept you awake the night you booked this?", "Who were you dancing next to?", "What did the desert sound like after dark?", "What did you feel standing under those concrete arches?"],
  niseko: ["How cold was it, really?", "What did the snow sound like under your boots?", "What were you drinking, and who poured it?"],
  "santa-barbara": ["What did the ocean smell like that morning?", "Who were you with, and what were you laughing about?", "What did you want to slow down here?"],
  "maison-kanatha": ["Which course do you still think about?", "What did the chefs say when they served it?", "Who were you celebrating with?"],
  concert: ["What song were you waiting for?", "Who did you turn to when this started?"],
  hike: ["How did your legs feel by this point?", "What did you talk about on the way up?"],
  coffee: ["What were you thinking about before the day started?", "Who were you with this morning?"],
  drivehome: ["What were you thinking on the drive back?", "What do you want to keep from this trip?"],
};

const SENSES = [
  "What was the temperature like?",
  "Who was there with you?",
  "What were the sounds like?",
  "What did it smell like?",
  "What could you taste?",
  "What did you touch or hold?",
  "What colors stood out?",
  "How were you feeling right then?",
];

const BY_VOICE = {
  senses: SENSES,
  sensory: ["What could you hear right here?", "What did the air feel like on your skin?", "What colors do you remember that the photo missed?"],
  feeling: ["What were you feeling right before you took this?", "Why did you stop to take this one?", "What did this moment mean to you?"],
  next: ["What happened right after this photo?", "Who were you with, and what were they doing?", "Where were you headed next?"],
};

export function questionsFor(tag, voice) {
  if (voice === "senses") return SENSES;
  return [...(BY_TAG[tag] ?? []).slice(0, 1), ...BY_VOICE[voice], ...(BY_TAG[tag] ?? []).slice(1)];
}

// Stand-in for dictation when the browser has no speech recognition.
export const SAMPLE_SPEECH = {
  arizona: "I couldn't sleep at all, it was almost six and I just booked it. No plan, just go.",
  niseko: "The snow was so quiet it felt like the whole town was holding its breath.",
  "santa-barbara": "We sat by the water for an hour and nobody checked their phone once.",
  "maison-kanatha": "Every course came with a little story from the chefs, and I wanted to remember all of them.",
  ticket: "I couldn't sleep at all, it was almost six and I just booked it. No plan, just go.",
  sunset: "The whole sky went pink and orange and nobody was talking, we were all just watching it go.",
  storm: "Out of nowhere the clouds rolled in and it started pouring, and we ran under the arches laughing.",
};
export const GENERIC_SPEECH = "I remember standing right here and thinking, I need to write this down before I forget it.";

// Sample writing for demos and the video: what a finished Arcosanti story
// reads like, keyed by photo file name. "Fill with sample writing" in the lab
// drops these onto the current story's pages.
export const SAMPLE_WRITING = {
  "IMG_7104.jpg": "I booked it at 3am because I couldn't sleep, and by nine I was at gate 46B with a carry-on and no plan. Everyone in line looked like they'd decided weeks ago where they were going. I'd decided six hours ago. I keep thinking about how much of my life I've spent waiting for permission I was never going to get. Nobody tells you that you're allowed to just go. You find out by going.",
  "IMG_7162.jpg": "The first sunset didn't feel real. The whole canyon went pink, then gold, and nobody around me said a word, which never happens at a festival. I thought about taking a better photo, and then I didn't. Maybe that's what awe is: the moment you stop trying to keep something and just let it happen to you. I've been collecting my life instead of living it, and the canyon didn't care either way.",
  "IMG_8225.jpg": "We climbed onto the roof because someone said that's where you watch it from. Strangers on the same strip of warm concrete, legs dangling, phones down for once. I didn't learn anyone's name, and it didn't matter. It occurred to me that most of the people I'll ever feel close to, I'll only know for an evening. I used to think that was sad. Now it feels like the whole point.",
  "IMG_7233.jpg": "At night the desert gets quiet in a way the city never does. The stars were so thick they looked overdone. I lay in the grass and tried to remember the last time I'd looked up for this long, and I couldn't. Some of that light left those stars before anyone I know was born. I am so small, and somehow that was the most comforting thing I'd felt all year.",
  "IMG_7245.jpg": "The vaults lit up blue and everyone drifted toward the music like it was pulling us. I lost my friend for twenty minutes and wasn't even worried. In a place this small, you always find each other again. I wonder if that's what home actually is. Not a place, but the certainty that you'll be found.",
  "IMG_7338.jpg": "In the morning we walked the ridge behind the venue: red rock, dry brush, someone's dog running ahead of us. My legs hurt from dancing and I didn't care. It was the first morning in months I wasn't in a hurry to get to the next thing. I realized I've been treating my own life like a commute, something to get through on the way to the part that counts. This was the part that counts.",
  "IMG_7486.jpg": "Under the steel canopy the light came through in stripes. Thousands of people, and it still felt like a living room that happened to hold a whole town. Someone built this out of concrete in the middle of nowhere because they believed a city could be gentle. Standing inside their stubborn idea, I wanted to build something that stubborn too.",
  "dijie-library-export-EC019277-C609-467C-B3E6-F6DF32058364-11A7C540-E9B0-4309-8BAD-E17FEEB9661C.jpg": "We took this at 1am, both of us too tired to fix our faces. It's my favorite photo from the trip because it's the least careful one. I spend so much energy making my life look a certain way. This is what it actually looks like when it's good: messy, laughing, half out of frame.",
  "dijie-library-export-2736EB73-0D70-40A1-960E-FAFD4CAA6D75-12272660-00CF-442D-8C6A-B5F6ED2AE44B.jpg": "On the last day a storm rolled into Sedona and turned the rocks the color of rust. We stood in the rain on purpose. These rocks have been here for three hundred million years, and they will be here long after I'm a memory in someone else's camera roll. I've never felt so small, and I've never been so okay with it.",
  "IMG_7636.jpg": "Dinner on the drive back, string lights and too much food. We kept saying 'remember when' about things that had happened that same morning. I think we were already afraid of forgetting. Maybe nostalgia isn't about the past at all. Maybe it's how we tell the present that it mattered while we're still inside it.",
  "dijie-library-export-DD9FEAE9-039B-4ED0-B0AA-DB56E0B2888E-FC71B77D-0EF9-40D4-AC31-C2E36844026A.jpg": "The last thing I photographed was a square of sky through a dark doorway. I think I was trying to keep one piece of the light. But you can't keep light; you can only notice it. I'm writing this so I don't have to hold on so tightly. The trip is over, and I'm somehow more here than when I left.",
  "IMG_7108.jpg": "The first thing I did in Arizona was eat a pastry in a rental car in a parking garage, still half asleep. Nothing about it was beautiful, and I remember it perfectly. We rush through the in-between places as if they don't count. But this was the moment the trip became real: a steering wheel, a paper bag, and the strange freedom of having nowhere I was supposed to be.",
  "IMG_7218.jpg": "At dusk the whole amphitheater went quiet before the music, a few thousand people waiting under the same concrete curve. Someone built this half-dome in the desert decades ago, believing that people would come and sit together like this. They were right. I keep thinking about how a building can hold a hope for fifty years until strangers arrive to fill it.",
  "IMG_7235.jpg": "At night Arcosanti looks like a city from a future that never quite arrived. One window glowed blue, as if someone had left the light on for whoever comes next. I stood there longer than I needed to. Maybe every place we love is a little unfinished, and that's exactly what lets us walk into it.",
  "IMG_7279.jpg": "The storm came over the canyon while the rocks below were lit purple, and for a second the whole valley looked invented. Lightning without thunder, too far away to be afraid of. I realized I've spent years bracing for storms that never reached me. This one I just watched, and it was the most beautiful thing in the sky.",
  "IMG_7346.jpg": "After the last set they turned on the work lights, and the stage was suddenly just scaffolding, a crane, and dirt. Somehow I loved it more like this. Every magic thing is held up by something plain. I think that's true of people too, and I want to be more honest about my own scaffolding.",
};
