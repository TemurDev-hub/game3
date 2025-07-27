const canvas = document.getElementById('plinkoCanvas');
const ctx = canvas.getContext('2d');

// OVOZLAR
const bounceSound = new Audio('ping-82822.mp3');
const winSound = new Audio('success-340660.mp3');
const loseSound = new Audio('spin-fail-295088.mp3');
bounceSound.volume = 0.3;
winSound.volume = 0.5;
loseSound.volume = 0.5;

function playBounceSound() {
  const s = bounceSound.cloneNode();
  s.volume = 0.3;
  s.play();
}

function playWinSound() {
  const s = winSound.cloneNode();
  s.volume = 0.5;
  s.play();
}

function playLoseSound() {
  const s = loseSound.cloneNode();
  s.volume = 0.5;
  s.play();
}

// Responsive parametrlari
let isMobile, pegRadius, ballRadius, pegSpacing;
const pegs = [];
const balls = [];
const rewards = new Array(7).fill(null); // 11 ta slot
const BET_AMOUNT = 300;
let balance = 1000;
let slotElements = [];

function setResponsiveParams() {
  isMobile = window.innerWidth < 600;
  pegRadius = isMobile ? 8 : 10;
  ballRadius = isMobile ? 6 : 8;
  pegSpacing = isMobile ? 45 : 80;
}

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, 1200);
  canvas.height = window.innerHeight * 0.7;
  setResponsiveParams();
}
resizeCanvas();

window.addEventListener('resize', () => {
  resizeCanvas();
  createPegTriangle();
});

class Peg {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, pegRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.closePath();
  }
}

class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 2 - 1;
    this.vy = 2;
    this.gravity = isMobile ? 0.10 : 0.45;
    this.friction = 1;
    this.bounce = isMobile ? 1.6 : 1.3;
    this.scored = false;
    this.lastBounceTime = 0;
    this.hitPegs = new Set();
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.friction;

    pegs.forEach((peg, index) => {
      if (this.hitPegs.has(index)) return;

      const dx = this.x - peg.x;
      const dy = this.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pegRadius + ballRadius) {
        this.hitPegs.add(index);

        const angle = Math.atan2(dy, dx);
        this.vx = Math.cos(angle) * this.bounce;
        this.vy = Math.sin(angle) * this.bounce;
        this.x = peg.x + Math.cos(angle) * (pegRadius + ballRadius);
        this.y = peg.y + Math.sin(angle) * (pegRadius + ballRadius);

        const now = Date.now();
        if (now - this.lastBounceTime > 100) {
          playBounceSound();
          this.lastBounceTime = now;
        }
      }
    });

    if (this.x < ballRadius || this.x > canvas.width - ballRadius) {
      this.vx *= -0.8;
      this.x = Math.max(ballRadius, Math.min(canvas.width - ballRadius, this.x));
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, ballRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, ballRadius);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(1, '#ff9900');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'yellow';
    ctx.closePath();
  }
}

function createPegTriangle() {
  pegs.length = 0;
  rewards.fill(null);
  const rows = 8;
  const startCols = 3;
  const verticalOffset = isMobile ? 10 : 0;

  for (let row = 0; row < rows; row++) {
    const cols = startCols + row;
    const y = row * pegSpacing + 50 + verticalOffset;
    const totalRowWidth = (cols - 1) * pegSpacing;
    const startX = canvas.width / 2 - totalRowWidth / 2;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * pegSpacing;
      pegs.push(new Peg(x, y));
    }
  }

  const slotContainer = document.getElementById('slotContainer');
  slotContainer.innerHTML = '';
  for (let i = 0; i < rewards.length; i++) {
    const div = document.createElement('div');
    div.className = 'slot';
    div.textContent = '';
    slotContainer.appendChild(div);
  }

  slotElements = document.querySelectorAll('.slot');
}

// 🎯 Ehtimollar asosida reward olish funksiyasi
function getRandomReward() {
  const rand = Math.random();

  if (rand < 0.001) return 1000;   // 0.1%
  if (rand < 0.011) return 100;    // +1%
  if (rand < 0.044) return 27;     // +3.3%
  if (rand < 0.21) return 9;       // +10%
  if (rand < 0.41) return 6;       // +20%
  if (rand < 0.71) return 4;       // +30%
  if (rand < 0.85) return 2;       // +14%
  if (rand < 0.95) return 1.6;     // +10%
      // +4%
  return 1.2;                      // qolgan 1%
}

function updateBalls() {
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    ball.update();

    if (!ball.scored && ball.y >= canvas.height - 50) {
      const slotWidth = canvas.width / rewards.length;
      let index = Math.floor(ball.x / slotWidth);
      index = Math.max(0, Math.min(rewards.length - 1, index));

      const reward = getRandomReward();
      rewards[index] = reward;

      const winAmount = Math.round(BET_AMOUNT * reward);
      balance += winAmount;

      if (reward > 1) playWinSound();
      else playLoseSound();

      document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;

      const slot = slotElements[index];
      if (slot) {
        slot.textContent = reward + 'x';
        slot.classList.add('active');
        setTimeout(() => {
          slot.classList.remove('active');
          slot.textContent = '';
        }, 1000);
      }

      ball.scored = true;
      balls.splice(i, 1);
    }

    if (ball.y > canvas.height + 100) {
      balls.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  pegs.forEach(p => p.draw());
  balls.forEach(b => b.draw());

  updateBalls();
  requestAnimationFrame(draw);
}

document.getElementById('dropBall').addEventListener('click', () => {
  if (balance >= BET_AMOUNT) {
    if (balls.length < 10) {
      balance -= BET_AMOUNT;
      document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
      const offset = Math.random() * 80 - 40;
      balls.push(new Ball(canvas.width / 2 + offset, 10));
    } else {
      alert('Juda ko‘p shar bor, kuting!');
    }
  } else {
    alert('Balans yetarli emas!');
  }
});

createPegTriangle();
draw();
