const CW       = 340;   
const CH       = 480;   
const MCX      = 170;  
const DOME_CY  = 148;  
const DOME_R   = 95;   
const TRAY_Y   = 425;   

let animState    = 'IDLE';
let handleAnimT = 0;

let domeCapsules = [];   
let dropX        = MCX;  
let dropY        = 0;   
let dropVY       = 0;    
let dropColor    = '#fff';

let cardY        = 0;    
let pendingResult = null; 
let p5instance;

new p5(function(p) {
  p5instance = p;
  let portalImg;
  let cardImg;

  p.preload = function() {
    portalImg = p.loadImage('2.png');
    cardImg = p.loadImage('title.png');
  };

p.setup = function() {
    const cnv = p.createCanvas(CW, CH);
    cnv.parent('p5canvas');
    p.textFont('Bangers');

    const gemColors = Object.values(STAT_COLORS); 
    
    for (let i = 0; i < 6; i++) {
      domeCapsules.push({
        angle: (i / 6) * p.TWO_PI, 
        speed: 0.013,              
        rad:   12, 
        col:   gemColors[i]
      });
    }
  };
  p.draw = function() {
    p.background(255);
    p.fill(240);
    p.noStroke();
    for (let x = 0; x < CW; x += 12) {
      for (let y = 0; y < CH; y += 12) {
        if ((x + y) % 24 === 0) p.circle(x, y, 3);
      }
    }
    if (portalImg) {
      p.imageMode(p.CENTER);
      p.image(portalImg, MCX, DOME_CY+40, 370, 320); 
      p.imageMode(p.CORNER);
    }

    for (const c of domeCapsules) {
      c.angle += c.speed; 
      const r = 57; 
      const centerX = MCX;
      const centerY = DOME_CY + 43; 
      const gemX = centerX + r * p.cos(c.angle);
      const gemY = centerY + r * p.sin(c.angle);

      p.push(); 
      p.translate(gemX, gemY);

      p.noStroke();
      p.fill(p.red(c.col), p.green(c.col), p.blue(c.col), 80);
      p.ellipse(0, 0, c.rad * 3.5, c.rad * 2.5);

      p.stroke(0);
      p.strokeWeight(1.5);
      p.fill(c.col);
      p.ellipse(0, 0, c.rad * 2, c.rad * 1.4);

      p.noStroke();
      p.fill(255, 255, 255, 180);
      p.ellipse(-c.rad * 0.4, -c.rad * 0.25, c.rad * 0.7, c.rad * 0.35);

      p.pop(); 
    }

      if (animState === 'PULLING') {
      handleAnimT += 0.045; 
      
      if (handleAnimT >= 1) {
        animState   = 'DROPPING';
        dropX  = MCX;
        dropY  = DOME_CY + 40; 
        dropVY = 0;
        dropColor = pendingResult.color;
      }
    }

    if (animState === 'DROPPING') {
      dropVY += 0.6;   // Gravity
      dropY  += dropVY;
      if (dropY >= TRAY_Y) {
        dropY  = TRAY_Y;
        dropVY = -dropVY * 0.45; // Bounce
      if (Math.abs(dropVY) < 1) {
        dropVY    = 0;
        animState = 'REVEALING';
        cardY     = TRAY_Y + 20;
}
      }
      drawCapsule(dropX, dropY, dropColor, 16);
    }

    if (animState === 'REVEALING') {
      cardY -= 3;
      const targetY = TRAY_Y - 90;
      if (cardY <= targetY) {
        cardY     = targetY;
        animState = 'SHOW';
        onRevealComplete(); // Call back into game.js
      }
      drawResultCard(dropX, cardY, pendingResult, (TRAY_Y - cardY) / 90);
    }

    if (animState === 'SHOW') {
      drawResultCard(dropX, TRAY_Y - 90, pendingResult, 1);
    }
  };

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

  function drawResultCard(x, y, result, progress) {
    if (!result) return;
    const w = 230; 
    const h = 150;

    p.push();
    p.translate(x, y);
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
    p.text(result.hero, 0, h / 2 - 43 ); 
    p.pop();
  }

  p.triggerPull = function(result) {
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
