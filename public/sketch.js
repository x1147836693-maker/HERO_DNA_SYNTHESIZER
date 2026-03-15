/*
🟦 [Overview] 
🟩 [Design Intent] 
🟥 [HACK]
🟪 [External Context] 
*/
/*
  🟦 [Overview] sketch.js
  ────────────────────────────────────
  p5.js rendering only. Owns the machine animation and nothing else.
  All game state lives in game.js; this file reads from it read-only
  (STAT_COLORS, STAT_LABELS, drawnStats) and calls back via onRevealComplete().

  Animation state machine:
    IDLE
      │  p5instance.triggerPull(result) called by game.js
      ▼
    PULLING  → handleAnimT counts up to 1 (handle lever swing)
      │  handleAnimT >= 1
      ▼
    DROPPING → capsule falls under gravity, bounces on tray
      │  capsule settles (|dropVY| < 1)
      ▼
    REVEALING → result card rises from tray
      │  card reaches targetY
      ▼
    SHOW  → card held in final position, onRevealComplete() called
      │  p5instance.resetMachine() called by game.js
      ▼
    IDLE
*/

// canvas and machine geometry constants
const CW      = 340;  // canvas width
const CH      = 480;  // canvas height
const MCX     = 170;  // machine centre X
const DOME_CY = 148;  // dome centre Y
const DOME_R  = 95;   // dome radius
const TRAY_Y  = 425;  // Y where the capsule lands on the tray

let animState   = 'IDLE';
let handleAnimT = 0;   // 0→1 progress of the handle pull animation

// decorative gem capsules orbiting inside the dome
let domeCapsules = [];

// falling capsule state
let dropX     = MCX;
let dropY     = 0;
let dropVY    = 0;
let dropColor = '#fff';

let cardY         = 0;     // rising result card Y position
let pendingResult = null;  // result object for the current pull (set by triggerPull)

let p5instance;

new p5(function(p) {
  p5instance = p;
  let portalImg;
  let cardImg;

  p.preload = function() {
    portalImg = p.loadImage('2.png');
    cardImg   = p.loadImage('title.png');
  };


  // ———— Setup ————

  p.setup = function() {
    const cnv = p.createCanvas(CW, CH);
    cnv.parent('p5canvas');
    p.textFont('Bangers');

    // one gem per stat, each starting evenly spaced around the orbit
    const gemColors = Object.values(STAT_COLORS);
    for (let i = 0; i < 6; i++) {
      domeCapsules.push({
        angle: (i / 6) * p.TWO_PI, // evenly spread the 6 gems across 360°
        speed: 0.013,               // orbit speed in radians/frame
        rad:   12,
        col:   gemColors[i],
      });
    }
  };


  // ———— Draw loop ————

  p.draw = function() {
    p.background(255);

    // halftone dot backdrop
    p.fill(240);
    p.noStroke();
    for (let x = 0; x < CW; x += 12) {
      for (let y = 0; y < CH; y += 12) {
        if ((x + y) % 24 === 0) p.circle(x, y, 3);
      }
    }

    // portal background image
    if (portalImg) {
      p.imageMode(p.CENTER);
      p.image(portalImg, MCX, DOME_CY + 40, 370, 320);
      p.imageMode(p.CORNER);
    }

    // orbiting gem capsules inside the dome
    for (const c of domeCapsules) {
      c.angle += c.speed;
      const orbitR   = 57;
      const orbitCX  = MCX;
      const orbitCY  = DOME_CY + 43;
      const gemX     = orbitCX + orbitR * p.cos(c.angle);
      const gemY     = orbitCY + orbitR * p.sin(c.angle);
      drawCapsule(gemX, gemY, c.col, c.rad);
    }

    // PULLING: count up handleAnimT, then transition to DROPPING
    if (animState === 'PULLING') {
      handleAnimT += 0.045;
      if (handleAnimT >= 1) {
        animState = 'DROPPING';
        dropX     = MCX;
        dropY     = DOME_CY + 40;
        dropVY    = 0;
        dropColor = pendingResult.color;
      }
    }

    // DROPPING: simple gravity + bounce until capsule settles on the tray
    if (animState === 'DROPPING') {
      dropVY += 0.6;
      dropY  += dropVY;

      if (dropY >= TRAY_Y) {
        dropY  = TRAY_Y;
        /*
          🟩 [Design Intent] 0.45 restitution gives one visible bounce before
          settling. Higher values (>0.6) bounce forever; lower (<0.3) feel
          like the capsule hits wet concrete. The |dropVY| < 1 threshold
          stops the micro-bounce loop that would otherwise run for many frames.
        */
        dropVY = -dropVY * 0.45;
        if (Math.abs(dropVY) < 1) {
          dropVY    = 0;
          animState = 'REVEALING';
          cardY     = TRAY_Y + 20;
        }
      }
      drawCapsule(dropX, dropY, dropColor, 16);
    }

    // REVEALING: card rises from tray up to targetY
    if (animState === 'REVEALING') {
      cardY -= 3;
      const targetY = TRAY_Y - 90;
      if (cardY <= targetY) {
        cardY     = targetY;
        animState = 'SHOW';
        onRevealComplete(); // hands control back to game.js
      }
      drawResultCard(dropX, cardY, pendingResult, (TRAY_Y - cardY) / 90);
    }

    // SHOW: card held in final position until the next pull resets the machine
    if (animState === 'SHOW') {
      drawResultCard(dropX, TRAY_Y - 90, pendingResult, 1);
    }
  };


  // ———— Drawing helpers ————

  // draws a gem-style capsule: outer glow ellipse, coloured body, specular highlight
  function drawCapsule(x, y, col, r) {
    p.push();
    p.translate(x, y);

    p.noStroke();
    p.fill(p.red(col), p.green(col), p.blue(col), 80);
    p.ellipse(0, 0, r * 3.5, r * 2.5);

    p.stroke(0);
    p.strokeWeight(1.5);
    p.fill(col);
    p.ellipse(0, 0, r * 2, r * 1.4);

    p.noStroke();
    p.fill(255, 255, 255, 180);
    p.ellipse(-r * 0.4, -r * 0.25, r * 0.7, r * 0.35);

    p.pop();
  }

  // draws the result card that rises after the capsule lands
  function drawResultCard(x, y, result, progress) {
    if (!result) return;
    const w = 230;
    const h = 150;

    p.push();
    p.translate(x, y);
    /*
      🟩 [Design Intent] scale from 0.6→1.0 as progress goes 0→1 so the card
      "pops" into existence rather than just sliding up. This is intentionally
      quick.
    */
    p.scale(0.6 + progress * 0.4);

    if (cardImg) {
      p.imageMode(p.CENTER);
      p.image(cardImg, 0, 0, w, h);
    }

    p.fill(result.color);
    p.textSize(16);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(STAT_LABELS[result.stat], 0, -h / 2 + 45);

    p.fill(0);
    p.textSize(47);
    p.text(result.value, 0, 3);

    p.textSize(13);
    p.textFont('Comic Neue');
    p.text(result.hero, 0, h / 2 - 43);

    p.pop();
  }


  // ———— Public API called by game.js ————

  p.triggerPull = function(result) {
    // ignore if an animation is already running (only IDLE or SHOW can start a new pull)
    if (animState !== 'IDLE' && animState !== 'SHOW') return;
    pendingResult = result;
    animState     = 'PULLING';
    handleAnimT   = 0;
    cardY         = 0;
  };

  p.resetMachine = function() {
    animState     = 'IDLE';
    pendingResult = null;
    cardY         = 0;
  };

}, document.getElementById('p5canvas'));
