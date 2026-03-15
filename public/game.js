/*
🟦 [Overview] 
🟩 [Design Intent] 
🟥 [HACK]
🟪 [External Context] 
*/
/*
  🟦 [Overview] game.js
  ──────────────────────────────────
  All game logic that is NOT p5 rendering. Owns:
    - pull state (pullCount, drawnStats, heroSourceData)
    - fetching hero data from the API proxy
    - updating the stats panel and radar chart (DOM + canvas)
    - building and showing the final synthesis result overlay

  Calls into sketch.js via the global p5instance:
    p5instance.triggerPull(result)   → starts the drop animation
    p5instance.resetMachine()        → resets animation state to IDLE

  sketch.js calls back into game.js via:
    onRevealComplete()               → fired when the card finishes rising
*/

const MAX_PULLS = 6;
const STAT_KEYS = [
  "intelligence",
  "strength",
  "speed",
  "durability",
  "power",
  "combat",
];

const STAT_LABELS = {
  intelligence: "INTEL",
  strength: "STRENGTH",
  speed: "SPEED",
  durability: "DURABILITY",
  power: "POWER",
  combat: "COMBAT",
};

const STAT_COLORS = {
  intelligence: "#4169E1",
  strength: "#ED1D24",
  speed: "#FFC20E",
  durability: "#32CD32",
  power: "#9B30FF",
  combat: "#FF8C00",
};

let pullCount = 0;
let drawnStats = {}; // { statKey: { hero, value, heroData } }
let heroSourceData = []; // unique hero objects used across all pulls, for the final result

// ─── Pull ───

async function triggerPull() {
  if (pullCount >= MAX_PULLS) return;

  const pullBtn = document.getElementById("pullBtn");
  pullBtn.disabled = true;
  document.getElementById("pullInfoBar").classList.remove("show");

  // pick a random stat to reveal this pull — the player can't choose
  const stat = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
  const randomId = Math.floor(Math.random() * 731) + 1;
  const res = await fetch(`/api/hero/${randomId}`);
  const hero = await res.json();

  if (hero.response !== "success") {
    pullBtn.disabled = false;
    pullBtn.textContent = "⚡ TRY AGAIN ⚡";
    return;
  }

  const rawVal = parseInt(hero.powerstats[stat]);

  /*
    🟩 [Design Intent] Some heroes in the API have "null" or "-" for certain
    stats. Rather than showing a broken 0 or NaN, fall back to a random
    mid-range value so every pull still feels meaningful.
  */

  let value;
  if (isNaN(rawVal)) {
    value = Math.floor(Math.random() * 40 + 30);
  } else {
    value = rawVal;
  }

  drawnStats[stat] = {
    hero: hero.name,
    stat,
    value,
    color: STAT_COLORS[stat],
    heroData: hero,
  };

  // keep one copy of each hero for the final result — avoid duplicates by id
  if (!heroSourceData.find((h) => h.id === hero.id)) {
    heroSourceData.push(hero);
  }

  pullCount++;
  document.getElementById("pullCountDisplay").textContent = pullCount;

  p5instance.triggerPull(drawnStats[stat]);
}

// called by sketch.js once the reveal card animation finishes rising
function onRevealComplete() {
  updateStatsUI();

  const lastStat = Object.keys(drawnStats).pop();
  if (lastStat) showPullInfo(drawnStats[lastStat]);

  document.getElementById("pullBtn").disabled = false;

  if (pullCount >= MAX_PULLS) {
    setTimeout(showFinalResult, 800);
  } else {
    document.getElementById("pullBtn").textContent = "CLAIM AGAIN";
  }
}

function resetGame() {
  drawnStats = {};
  heroSourceData = [];
  pullCount = 0;

  document.getElementById("pullCountDisplay").textContent = "0";
  document.getElementById("resultOverlay").classList.remove("show");
  document.getElementById("pullBtn").textContent = "CLAIM YOUR POWER";
  document.getElementById("pullInfoBar").classList.remove("show");

  p5instance.resetMachine();
  updateStatsUI();
}

// ─── Info bar ───
/*
🟪 [External Context] 
I acknowledge the use of [1] Gemini (https://gemini.google.com/) to [2] develop defensive programming 
strategies for cleaning and formatting inconsistent data retrieved from an external API. I entered the 
following prompts on 26 February 2026:[3] "When fetching data from a superhero API, some missing fields 
are returned as the literal string 'null' or a dash '-'. Also, the occupation field is often too long 
(e.g., 'Inventor, Industrialist, Philanthropist'). How can I sanitize these edge cases and extract only 
the first occupation to display cleanly in the UI?"
[4] The output from the generative artificial intelligence suggested using conditional fallbacks to catch 
literal string anomalies (like 'null' or '-') and replacing them with default text like 'Unknown Origin'. 
It also provided the .split(',')[0].trim() method to isolate the primary occupation. I integrated this logic 
into my showPullInfo function to ensure robust data rendering and prevent the UI from breaking due to unstandardized third-party data.
*/
function showPullInfo(result) {
  const bar = document.getElementById("pullInfoBar");
  const hero = result.heroData;

  let race;
  if (
    hero.appearance?.race &&
    hero.appearance.race !== "null" &&
    hero.appearance.race !== "-"
  ) {
    race = hero.appearance.race;
  } else {
    race = "Unknown Origin";
  }

  let occ;
  if (hero.work?.occupation && hero.work.occupation !== "-") {
    occ = hero.work.occupation.split(",")[0].trim();
  } else {
    occ = "Classified";
  }

  let align;
  if (hero.biography?.alignment) {
    align = hero.biography.alignment;
  } else {
    align = "Neutral";
  }

  bar.innerHTML = `
    <span>${result.hero}</span> ·
    ${race} · ${occ} · Alignment: ${align} ·
    ${STAT_LABELS[result.stat]}: <span>${result.value}</span>
  `;
  bar.classList.add("show");
}

// ─── Stats panel ───

function updateStatsUI() {
  const slotsEl = document.getElementById("statSlots");

  slotsEl.innerHTML = STAT_KEYS.map((stat) => {
    const d = drawnStats[stat];
    const color = STAT_COLORS[stat];

    if (d) {
      return `
        <div class="stat-slot" style="border-color:${color}">
          <div class="slot-fill" style="background:${color}; width:${d.value}%"></div>
          <div class="slot-left">
            <div class="slot-name" style="color:${color}">${STAT_LABELS[stat]}</div>
            <div class="slot-from">${d.hero}</div>
          </div>
          <div class="slot-value" style="color:${color}">${d.value}</div>
        </div>
      `;
    } else {
      return `
        <div class="stat-slot">
          <div class="slot-left">
            <div class="slot-name" style="color:#ccc">${STAT_LABELS[stat]}</div>
          </div>
          <div class="slot-empty">?</div>
        </div>
      `;
    }
  }).join("");

  drawRadar("radarCanvas", 160);
}

// ─── Radar chart ───
/*
🟪 [External Context] 
I acknowledge the use of [1] Gemini (https://gemini.google.com/) to [2] iterate on the visual aesthetics 
and UI feedback mechanisms of the canvas radar chart. I entered the following prompts on 15 March 2026:
[3] "I have built the basic mathematical structure of a radar chart using HTML5 Canvas. How can I style 
it to look more visually appealing, establish a clear data hierarchy, and match a comic-book aesthetic? 
Additionally, how should I visually handle the stats that the user hasn't unlocked yet?"
[4] The output from the generative artificial intelligence suggested several specific visual rendering 
techniques which I implemented in my drawRadar function:
1.Hierarchy: Drawing the outermost grid ring with a thicker stroke while keeping inner rings thin to establish a clear boundary.
2.Visibility: Using a semi-transparent fill for the stat polygon with a solid border, ensuring the background grid remains visible.
3.Comic Aesthetic: Adding coloured dots with thick black strokes at each vertex to emphasize a comic-book style.
4.3D Typography: Drawing the axis labels twice (once with a black offset) to create a faux 3D drop-shadow effect.
Status Feedback: Rendering un-pulled/locked stats in grey to provide clear, immediate visual feedback to the user.
*/
function drawRadar(canvasId, size) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = size * 0.37;
  const n = STAT_KEYS.length;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, w, h);

  // halftone dot pattern — decorative background texture
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let x = 0; x < w; x += 10) {
    for (let y = 0; y < h; y += 10) {
      if ((x + y) % 20 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5 concentric grid rings; outermost is darker to mark the 100% boundary
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = (r * ring) / 5;
      if (i === 0) ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
      else ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.closePath();
    if (ring === 5) {
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
    }
    ctx.stroke();
  }

  // axis lines from centre to each vertex
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // filled polygon for the player's current stat values (0–100 normalised to 0–1)
  const vals = STAT_KEYS.map((s) => {
    if (drawnStats[s]) {
      return drawnStats[s].value / 100;
    } else {
      return 0;
    }
  });

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rv = r * vals[i];
    if (i === 0) ctx.moveTo(cx + rv * Math.cos(a), cy + rv * Math.sin(a));
    else ctx.lineTo(cx + rv * Math.cos(a), cy + rv * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(237, 29, 36, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "#ED1D24";
  ctx.lineWidth = 3;
  ctx.stroke();

  // coloured dot at each vertex (only drawn when that stat has been pulled)
  for (let i = 0; i < n; i++) {
    if (vals[i] === 0) continue;
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rv = r * vals[i];
    const col = STAT_COLORS[STAT_KEYS[i]];
    ctx.beginPath();
    ctx.arc(cx + rv * Math.cos(a), cy + rv * Math.sin(a), 5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  // axis labels — coloured if pulled, grey if not yet
  ctx.font = "bold 11px Bangers, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const lr = r + 22;
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    const col = STAT_COLORS[STAT_KEYS[i]];
    const label = STAT_LABELS[STAT_KEYS[i]];

    ctx.fillStyle = "#000"; // black shadow offset
    ctx.fillText(label, lx + 1, ly + 1);
    ctx.fillStyle = drawnStats[STAT_KEYS[i]] ? col : "#aaa";
    ctx.fillText(label, lx, ly);
  }
}

// ─── Helpers ───
/*
  🟩 [Design Intent] The Superhero API is inconsistent — some fields are '-',
  some are 'null' strings, some are actual null. Uses the rest parameter (...keys) 
  to accept an infinite number of fallback property names. The function loops through 
  them in order, returning the first valid value it finds while filtering out 
  API anomalies like literal "null" strings or "-" dashes.
*/
function getVal(obj, ...keys) {
  for (const k of keys) {
    if (
      obj &&
      obj[k] &&
      obj[k] !== "-" &&
      obj[k] !== "null" &&
      obj[k] !== null
    ) {
      return obj[k];
    }
  }
  return null;
}

// returns the hero that contributed a specific stat, or the first hero overall as a fallback
function getHeroForStat(stat) {
  if (drawnStats[stat]) {
    return drawnStats[stat].heroData;
  } else {
    if (heroSourceData[0]) {
      return heroSourceData[0];
    } else {
      return null;
    }
  }
}

// ─── Final result overlay ────

function showFinalResult() {
  const sorted = Object.values(drawnStats).sort((a, b) => b.value - a.value);
  const missing = STAT_KEYS.filter((s) => !drawnStats[s]);

  // each appearance trait is sourced from the hero who contributed that specific stat
  const intelH = getHeroForStat("intelligence");
  const speedH = getHeroForStat("speed");
  const powerH = getHeroForStat("power");
  const combatH = getHeroForStat("combat");
  const durH = getHeroForStat("durability");
  const topH = sorted[0] ? sorted[0].heroData : heroSourceData[0];

  // < Appearance section >
  const race = (combatH && getVal(combatH.appearance, "race")) || "Unknown";
  const gender = (powerH && getVal(powerH.appearance, "gender")) || "Unknown";
  const eyeColor =
    (intelH &&
      (getVal(intelH.appearance, "eye-color") ||
        getVal(intelH.appearance, "eyeColor"))) ||
    "?";
  const hairColor =
    (speedH &&
      (getVal(speedH.appearance, "hair-color") ||
        getVal(speedH.appearance, "hairColor"))) ||
    "?";
  const avgHeight = Math.floor(Math.random() * 300 + 120) + "cm";

  const appearanceCards = [
    {
      label: "RACE",
      value: race,
      src: combatH?.name || "?",
      hl: race !== "Human" && race !== "Unknown",
    },
    { label: "GENDER", value: gender, src: powerH?.name || "?", hl: false },
    {
      label: "EYE COLOR",
      value: eyeColor,
      src: intelH?.name || "?",
      hl: false,
    },
    {
      label: "HAIR COLOR",
      value: hairColor,
      src: speedH?.name || "?",
      hl: false,
    },
    {
      label: "AVG HEIGHT",
      value: avgHeight,
      src: "All pulled heroes",
      hl: false,
    },
    {
      label: "WEAK SPOTS",
      value: missing.length
        ? missing.map((s) => STAT_LABELS[s]).join(", ")
        : "None ✦",
      src: "Your fate",
      hl: missing.length > 0,
    },
  ];

  let appearanceHTML = "";
  for (const card of appearanceCards) {
    appearanceHTML += `
      <div class="dna-card${card.hl ? " hl" : ""}">
        <div class="dna-card-label">${card.label}</div>
        <div class="dna-card-value">${card.value}</div>
        <div class="dna-card-source">from ${card.src}</div>
      </div>
    `;
  }
  document.getElementById("appearanceGrid").innerHTML = appearanceHTML;

  // < Biography section >
  let occupation = (topH && getVal(topH.work, "occupation")) || "Unknown";
  occupation = occupation.split(",")[0].trim();

  /*
    🟩 [Design Intent] Alignment is a majority vote across all pulled heroes
    rather than just taking the top hero's value. This means a player who
    pulls mostly villain heroes ends up with an anti-hero result even if their
    highest single stat came from a good character.
  */
  const alignments = heroSourceData
    .map((h) => h.biography?.alignment)
    .filter(Boolean);
  const goodCount = alignments.filter((a) => a === "good").length;
  let alignment;
  if (goodCount >= alignments.length / 2) {
    alignment = "✦ GOOD";
  } else {
    alignment = "✦ ANTI-HERO / CHAOTIC";
  }
  /* 🟪 [External Context] 
I acknowledge the use of [1] Gemini (https://gemini.google.com/) to [2] implement 
data aggregation logic for analyzing the biography traits of the hero database. 
I entered the following prompts on 27 February 2026:[3] "I have an array of hero objects. 
How can I extract all their 'alignment' values, remove any missing data, and then calculate 
if the majority of the heroes are 'good' or 'bad' to create a dynamic label for my UI?"
[4] The output from the generative artificial intelligence suggested using the .map() 
and .filter(Boolean) pattern to create a clean list of traits, and then using .filter().length 
to count specific occurrences. I used this logic to build the majority-vote system that determines 
whether to display the "✦ GOOD" or "✦ ANTI-HERO / CHAOTIC" label in the final assessment summary.
  */

  let birthplace = getVal(durH?.biography, "place-of-birth", "placeOfBirth");
  if (!birthplace) {
    birthplace = "Unknown";
  }

  let firstApp = getVal(topH?.biography, "first-appearance", "firstAppearance");
  if (!firstApp) {
    firstApp = "?";
  }

  let publisher = getVal(topH?.biography, "publisher");
  if (!publisher) {
    publisher = "?";
  }
  /* 🟪 [External Context] 
  I acknowledge the use of [1] Gemini (https://gemini.google.com/) to [2] implement a flexible data 
  retrieval system that handles naming inconsistencies in third-party API responses. I entered the 
  following prompts on 27 February 2026:[3] "When accessing biography data from an API, some objects 
  use 'place-of-birth' (kebab-case) while others use 'placeOfBirth' (camelCase). How can I write a clean 
  way to check for both possibilities and provide a default string like 'Unknown' if neither exists?"
  [4] The output from the generative artificial intelligence suggested using a helper function combined 
  with logical fallback checks. I implemented this to safely extract the 'birthplace', 'first-appearance', 
  and 'publisher' fields. This ensures that even if the API structure changes slightly or data is missing, 
  the UI remains populated with meaningful placeholders rather than 'undefined' or empty strings.
  */

  const bioCards = [
    { label: "OCCUPATION", value: occupation, src: topH?.name || "?" },
    { label: "ALIGNMENT", value: alignment, src: "Majority vote" },
    { label: "BIRTHPLACE", value: birthplace, src: durH?.name || "?" },
    { label: "FIRST COMIC", value: firstApp, src: publisher },
  ];

  let bioHTML = "";
  for (const card of bioCards) {
    bioHTML += `
      <div class="dna-card">
        <div class="dna-card-label">${card.label}</div>
        <div class="dna-card-value">${card.value}</div>
        <div class="dna-card-source">from ${card.src}</div>
      </div>
    `;
  }
  document.getElementById("bioGrid").innerHTML = bioHTML;

  drawRadar("resultRadar", 160);
  document.getElementById("resultOverlay").classList.add("show");
}

// ─── Init ───

updateStatsUI();
document.getElementById("pullBtn").disabled = false;
document.getElementById("pullBtn").textContent = "CLAIM YOUR POWER";

/* References:
[1] O. Kislev (orrkislev), "Radar Chart sketch," p5.js Web Editor. [Online]. Available: https://editor.p5js.org/orrkislev/sketches/UAtDtDhTC. (Accessed: Mar. 15, 2026).
*/
