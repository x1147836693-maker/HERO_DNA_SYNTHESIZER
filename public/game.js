const MAX_PULLS = 6;
const STAT_KEYS = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'];

const STAT_LABELS = {
  intelligence: 'INTEL',
  strength:     'STRENGTH',
  speed:        'SPEED',
  durability:   'DURABILITY',
  power:        'POWER',
  combat:       'COMBAT',
};

const STAT_COLORS = {
  intelligence: '#4169E1',
  strength:     '#ED1D24', 
  speed:        '#FFC20E',
  durability:   '#32CD32',
  power:        '#9B30FF', 
  combat:       '#FF8C00', 
};

let pullCount      = 0;
let drawnStats     = {};   // { statKey: { hero, value, heroData, legendary } }
let heroSourceData = [];   // All unique hero objects used across pulls

async function triggerPull() {
  if (pullCount >= MAX_PULLS) return;

  const pullBtn = document.getElementById('pullBtn');
  pullBtn.disabled = true;
  document.getElementById('pullInfoBar').classList.remove('show');

  const stat = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];

  try {
    const randomId = Math.floor(Math.random() * 731) + 1;
    const res = await fetch(`/api/hero/${randomId}`);
    const hero = await res.json();

    if (hero.response === 'success') {

      const rawVal = parseInt(hero.powerstats[stat]);
      const value  = isNaN(rawVal) ? Math.floor(Math.random() * 40 + 30) : rawVal;

      const result = {
        hero:      hero.name,
        stat,
        value,
        color:     STAT_COLORS[stat],
        heroData:  hero,
      };

      drawnStats[stat] = result;

      if (!heroSourceData.find(h => h.id === hero.id)) {
        heroSourceData.push(hero);
      }

      pullCount++;
      document.getElementById('pullCountDisplay').textContent = pullCount;

      p5instance.triggerPull(result);
    } else {
      throw new Error('Hero fetch failed');
    }
  } catch (e) {
    console.warn('API Error:', e);
    pullBtn.disabled = false;
    pullBtn.textContent = '⚡ TRY AGAIN ⚡';
  }
}

function onRevealComplete() {
  updateStatsUI();

  const lastStat = Object.keys(drawnStats).pop();
  if (lastStat) showPullInfo(drawnStats[lastStat]);

  document.getElementById('pullBtn').disabled = false;

  if (pullCount >= MAX_PULLS) {
    setTimeout(showFinalResult, 800);
  } else {
    document.getElementById('pullBtn').textContent =
      `CLAIM AGAIN`;
  }
}

function resetGame() {
  drawnStats     = {};
  heroSourceData = [];
  pullCount      = 0;

  document.getElementById('pullCountDisplay').textContent = '0';
  document.getElementById('resultOverlay').classList.remove('show');
  document.getElementById('pullBtn').textContent = 'CLAIM YOUR POWER';
  document.getElementById('pullInfoBar').classList.remove('show');

  p5instance.resetMachine();
  updateStatsUI();
}

function showPullInfo(result) {
  const bar  = document.getElementById('pullInfoBar');
  const hero = result.heroData;

  const race   = hero.appearance && hero.appearance.race && hero.appearance.race !== 'null' && hero.appearance.race !== '-'
    ? hero.appearance.race : 'Unknown Origin';

  const occ    = hero.work && hero.work.occupation && hero.work.occupation !== '-'
    ? hero.work.occupation.split(',')[0].trim() : 'Classified';

  const align  = hero.biography && hero.biography.alignment ? hero.biography.alignment : 'Neutral';

  bar.innerHTML = `
    <span>${result.hero}</span> ·
    ${race} · ${occ} · Alignment: ${align} ·
    ${STAT_LABELS[result.stat]}: <span>${result.value}</span>
  `;
  bar.classList.add('show');
}

function updateStatsUI() {
  const slotsEl = document.getElementById('statSlots');

  slotsEl.innerHTML = STAT_KEYS.map(stat => {
    const d     = drawnStats[stat];
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
  }).join('');

  drawRadar('radarCanvas', 160);
}

// Draws the hexagon radar chart onto a <canvas> element
function drawRadar(canvasId, size) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r  = size * 0.37;
  const n  = STAT_KEYS.length;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  // Halftone dot pattern on background
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let x = 0; x < w; x += 10) {
    for (let y = 0; y < h; y += 10) {
      if ((x + y) % 20 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Grid rings (5 levels)
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a  = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = r * ring / 5;
      if (i === 0) ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
      else         ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.closePath();
if (ring === 5) {
  ctx.strokeStyle = '#999';
  ctx.lineWidth   = 2;
} else {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth   = 1;
}
    ctx.stroke();
  }

  // Axis lines from centre to each vertex
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // Filled polygon (player's current stats)
  const vals = STAT_KEYS.map(s => drawnStats[s] ? drawnStats[s].value / 100 : 0);

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a  = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rv = r * vals[i];
    if (i === 0) ctx.moveTo(cx + rv * Math.cos(a), cy + rv * Math.sin(a));
    else         ctx.lineTo(cx + rv * Math.cos(a), cy + rv * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle   = 'rgba(237, 29, 36, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#ED1D24';
  ctx.lineWidth   = 3;
  ctx.stroke();

  // Coloured dots at each vertex
  for (let i = 0; i < n; i++) {
    const a   = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rv  = r * vals[i];
    const col = STAT_COLORS[STAT_KEYS[i]];
    if (vals[i] > 0) {
      ctx.beginPath();
      ctx.arc(cx + rv * Math.cos(a), cy + rv * Math.sin(a), 5, 0, Math.PI * 2);
      ctx.fillStyle   = col;
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 2;
      ctx.fill();
      ctx.stroke();
    }
  }

  // Axis labels
  ctx.font          = 'bold 11px Bangers, sans-serif';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';

  for (let i = 0; i < n; i++) {
    const a   = (i / n) * Math.PI * 2 - Math.PI / 2;
    const lr  = r + 22;
    const lx  = cx + lr * Math.cos(a);
    const ly  = cy + lr * Math.sin(a);
    const col = STAT_COLORS[STAT_KEYS[i]];

    // Black shadow
    ctx.fillStyle = '#000';
    ctx.fillText(STAT_LABELS[STAT_KEYS[i]], lx + 1, ly + 1);

    // Coloured label (grey if not yet pulled)
    if (drawnStats[STAT_KEYS[i]]) {
  ctx.fillStyle = col;
} else {
  ctx.fillStyle = '#aaa';
}
    ctx.fillText(STAT_LABELS[STAT_KEYS[i]], lx, ly);
  }
}

function getVal(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] && obj[k] !== '-' && obj[k] !== 'null' && obj[k] !== null) {
      return obj[k];
    }
  }
  return null;
}

function getHeroForStat(stat) {
  if (drawnStats[stat]) {
    return drawnStats[stat].heroData;
  } else {
    return heroSourceData[0] || null;
  }
}

function showFinalResult() {
  const sorted  = Object.values(drawnStats).sort((a, b) => b.value - a.value);
  const missing = STAT_KEYS.filter(s => !drawnStats[s]);


const intelH  = getHeroForStat('intelligence');
const speedH  = getHeroForStat('speed');
const powerH  = getHeroForStat('power');
const combatH = getHeroForStat('combat');
const durH    = getHeroForStat('durability');
let topH;
if (sorted[0]) {
  topH = sorted[0].heroData;
} else {
  topH = heroSourceData[0];
}

  // --- Synthesise appearance from API data ---
  // Each trait is taken from the hero who contributed that stat
  const race      = (combatH && getVal(combatH.appearance, 'race'))     || 'Unknown';
  const gender    = (powerH  && getVal(powerH.appearance,  'gender'))   || 'Unknown';
  const eyeColor  = (intelH  && (getVal(intelH.appearance, 'eye-color') || getVal(intelH.appearance, 'eyeColor'))) || '?';
  const hairColor = (speedH  && (getVal(speedH.appearance, 'hair-color') || getVal(speedH.appearance, 'hairColor'))) || '?';

  const avgHeight = Math.floor(Math.random() * 300 + 120) + 'cm';

const appearanceCards = [
  { label: 'RACE',       value: race,      src: combatH ? combatH.name : '?', hl: race !== 'Human' && race !== 'Unknown' },
  { label: 'GENDER',     value: gender,    src: powerH  ? powerH.name  : '?', hl: false },
  { label: 'EYE COLOR',  value: eyeColor,  src: intelH  ? intelH.name  : '?', hl: false },
  { label: 'HAIR COLOR', value: hairColor, src: speedH  ? speedH.name  : '?', hl: false },
  { label: 'AVG HEIGHT', value: avgHeight, src: 'All pulled heroes',           hl: false },
  { label: 'WEAK SPOTS', value: missing.length ? missing.map(s => STAT_LABELS[s]).join(', ') : 'None ✦',
    src: 'Your fate', hl: missing.length > 0 },
];

let appearanceHTML = '';
for (const card of appearanceCards) {
  const hlClass = card.hl ? ' hl' : '';
  appearanceHTML += `
    <div class="dna-card${hlClass}">
      <div class="dna-card-label">${card.label}</div>
      <div class="dna-card-value">${card.value}</div>
      <div class="dna-card-source">from ${card.src}</div>
    </div>
  `;
}
document.getElementById('appearanceGrid').innerHTML = appearanceHTML;

  // --- Synthesise biography from API data ---
  let occupation = (topH && getVal(topH.work, 'occupation')) || 'Unknown';
  occupation = occupation.split(',')[0].trim();

  // Alignment: majority vote across all pulled heroes
  const alignments = heroSourceData.map(h => h.biography && h.biography.alignment).filter(Boolean);
  const goodCount  = alignments.filter(a => a === 'good').length;
let alignment;
if (goodCount >= alignments.length / 2) {
  alignment = '✦ GOOD';
} else {
  alignment = '✦ ANTI-HERO / CHAOTIC';
}

const birthplace = getVal(durH?.biography, 'place-of-birth', 'placeOfBirth') || 'Unknown';
const firstApp   = getVal(topH?.biography, 'first-appearance', 'firstAppearance') || '?';
const publisher  = getVal(topH?.biography, 'publisher') || '?';

let topHName = '?';
if (topH) { topHName = topH.name; }

let durHName = '?';
if (durH) { durHName = durH.name; }

const bioCards = [
  { label: 'OCCUPATION', value: occupation, src: topHName },
  { label: 'ALIGNMENT',  value: alignment,  src: 'Majority vote' },
  { label: 'BIRTHPLACE', value: birthplace, src: durHName },
  { label: 'FIRST COMIC',value: firstApp,   src: publisher },
];

let bioHTML = '';
for (const card of bioCards) {
  bioHTML += `
    <div class="dna-card">
      <div class="dna-card-label">${card.label}</div>
      <div class="dna-card-value">${card.value}</div>
      <div class="dna-card-source">from ${card.src}</div>
    </div>
  `;
}
document.getElementById('bioGrid').innerHTML = bioHTML;

  drawRadar('resultRadar', 160);
  document.getElementById('resultOverlay').classList.add('show');
}

updateStatsUI();
document.getElementById('pullBtn').disabled = false;
document.getElementById('pullBtn').textContent = 'CLAIM YOUR POWER';