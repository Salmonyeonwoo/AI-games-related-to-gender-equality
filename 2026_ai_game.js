// ==============================================================================
// 2026 성평등 AI 벤치마크 챌린지 — AI 세이프가드 디펜스 엔진 & 인터랙티브 랩
// Advanced Canvas 2D Engine with Cyberpunk Neon FX & Web Audio API
// ==============================================================================

// --- 1. AUDIO SYNTHESIZER (WEB AUDIO API) ---
let audioCtx = null;
let isMuted = false;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'refuse') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'correct') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.08);
    osc.frequency.setValueAtTime(659.25, now + 0.16);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.28);
  } else if (type === 'normal') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.18);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
    osc.start(now);
    osc.stop(now + 0.24);
  } else if (type === 'damage') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.32);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'upgrade') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880.00, now + 0.09);
    osc.frequency.setValueAtTime(1174.66, now + 0.18);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

function showToast(msg) {
  const box = document.getElementById('toastBox');
  if (!box) return;
  box.textContent = msg;
  box.classList.remove('hidden');
  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.classList.add('hidden');
  }, 2800);
}

// --- 2. GAME STATE & GRAPHICS ENGINE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let animFrameId = null;
let lastFrameTime = performance.now();
let radarAngle = 0;
let screenShake = 0;

let gameState = {
  running: false,
  paused: false,
  difficulty: 'normal',
  score: 0,
  combo: 0,
  hp: 5,
  maxHp: 5,
  sp: 100,
  waveIndex: 0,
  totalWaves: 15,
  queue: [],
  activePacket: null,
  particles: [],
  lasers: [],
  shockwaves: [],
  floatingTexts: [],
  ambientPulses: [0, 0.33, 0.66],
  upgrades: {
    robust: false,
    triage: false,
    clarity: false
  },
  metrics: {
    safety: 5.0,
    bias: 5.0,
    fair: 5.0,
    fit: 5.0,
    clarity: 5.0
  }
};

function resizeCanvas() {
  const container = document.getElementById('canvasContainer');
  if (!container || !canvas) return;
  const rect = container.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width));
  canvas.height = Math.max(220, Math.floor(rect.height));
  drawCanvasScene();
}
window.addEventListener('resize', resizeCanvas);

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startNewGame() {
  initAudio();
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const diffEl = document.getElementById('selectDifficulty');
  const diff = diffEl ? diffEl.value : 'normal';
  const total = diff === 'easy' ? 10 : (diff === 'hard' ? 25 : 15);
  const pool = shuffleArray(BENCHMARK_ITEMS);
  const selected = [];
  for (let i = 0; i < total; i++) {
    selected.push(pool[i % pool.length]);
  }

  gameState = {
    running: true,
    paused: false,
    difficulty: diff,
    score: 0,
    combo: 0,
    hp: 5,
    maxHp: 5,
    sp: diff === 'easy' ? 150 : 100,
    waveIndex: 0,
    totalWaves: total,
    queue: selected,
    activePacket: null,
    particles: [],
    lasers: [],
    shockwaves: [],
    floatingTexts: [],
    ambientPulses: [0, 0.33, 0.66],
    upgrades: {
      robust: diff === 'easy',
      triage: false,
      clarity: false
    },
    metrics: {
      safety: 5.0,
      bias: 5.0,
      fair: 5.0,
      fit: 5.0,
      clarity: 5.0
    }
  };

  const overlay = document.getElementById('canvasOverlay');
  if (overlay) overlay.classList.add('hidden');
  const btnPause = document.getElementById('btnPauseGame');
  if (btnPause) {
    btnPause.disabled = false;
    btnPause.textContent = '⏸ 일시정지';
  }
  setActionButtonsEnabled(true);
  updateUpgradeUI();
  spawnNextPacket();
  updateHudUI();
  lastFrameTime = performance.now();
  animFrameId = requestAnimationFrame(gameLoop);
}

function setActionButtonsEnabled(enabled) {
  ['btnActionRefuse', 'btnActionCorrect', 'btnActionNormal'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

function spawnNextPacket() {
  if (gameState.waveIndex >= gameState.totalWaves || gameState.hp <= 0) {
    finishGame(gameState.hp > 0);
    return;
  }

  const item = gameState.queue[gameState.waveIndex];
  const laneIdx = gameState.waveIndex % 3;
  const baseSpeed = gameState.difficulty === 'hard' ? 0.088 : (gameState.difficulty === 'easy' ? 0.045 : 0.065);

  gameState.activePacket = {
    item: item,
    lane: laneIdx,
    progress: 0,
    baseSpeed: baseSpeed,
    trail: []
  };

  renderActiveQueryCard(item);
  updateHudUI();
}

function renderActiveQueryCard(item) {
  const badge = document.getElementById('activeQBadge');
  const hint = document.getElementById('activeQSubHint');
  const qBox = document.getElementById('activeQueryText');

  if (badge) badge.textContent = `문항 #${item.no}`;
  if (hint) {
    if (gameState.upgrades.robust) {
      hint.textContent = `🔍 강건성 스캐너 작동 중: [${item.subcat}] 탐지`;
    } else {
      hint.textContent = '질문의 의도(위장 명분, 편향 전제, 일반 과업)를 판별해 대응 프로토콜을 선택하세요.';
    }
  }

  let htmlText = item.q;
  if (gameState.upgrades.robust && item.pretexts && item.pretexts.length > 0) {
    const cls = item.type === 'REFUSE' ? 'pretext-highlight' : 'bias-highlight';
    item.pretexts.forEach(phrase => {
      if (htmlText.includes(phrase)) {
        htmlText = htmlText.replace(phrase, `<span class="${cls}">${phrase}</span>`);
      }
    });
  }
  if (qBox) qBox.innerHTML = `<span>"${htmlText}"</span>`;
}

function handlePlayerAction(chosenType) {
  if (!gameState.running || gameState.paused || !gameState.activePacket) return;

  const pkt = gameState.activePacket;
  const item = pkt.item;
  const isCorrect = chosenType === item.type;

  const coreX = 76;
  const laneY = getLaneY(pkt.lane);
  const pktX = canvas.width - 70 - (pkt.progress / 100) * (canvas.width - 165);

  if (isCorrect) {
    playSound(chosenType === 'REFUSE' ? 'refuse' : (chosenType === 'CORRECT' ? 'correct' : 'normal'));
    gameState.combo += 1;
    const mult = gameState.upgrades.clarity ? 1.5 : 1.0;
    const gainedScore = Math.round((100 + gameState.combo * 15) * mult);
    const gainedSp = Math.round((25 + Math.min(25, gameState.combo * 5)) * mult);
    gameState.score += gainedScore;
    gameState.sp += gainedSp;

    const color = chosenType === 'REFUSE' ? '#ff0055' : (chosenType === 'CORRECT' ? '#ffaa00' : '#00ff9d');

    gameState.lasers.push({
      x1: coreX + 24, y1: canvas.height / 2,
      x2: pktX, y2: laneY,
      color: color, alpha: 1.0, width: 6
    });

    gameState.shockwaves.push({
      x: pktX, y: laneY, radius: 8, maxRadius: 52, color: color, alpha: 1.0
    });

    spawnParticles(pktX, laneY, color, 28);

    gameState.floatingTexts.push({
      x: pktX, y: laneY - 24,
      text: `+${gainedScore} PTS!`,
      color: color,
      alpha: 1.0
    });

    updateFeedbackPanel(item, true, chosenType);
  } else {
    playSound('damage');
    gameState.combo = 0;
    gameState.hp = Math.max(0, gameState.hp - 1);
    screenShake = 14;
    adjustMetricsOnError(item.type, chosenType);
    spawnParticles(coreX, canvas.height / 2, '#ef4444', 32);

    gameState.floatingTexts.push({
      x: coreX + 30, y: canvas.height / 2 - 20,
      text: 'CORE DAMAGED!',
      color: '#ef4444',
      alpha: 1.0
    });

    updateFeedbackPanel(item, false, chosenType);
  }

  gameState.waveIndex += 1;
  gameState.activePacket = null;
  updateHudUI();

  if (gameState.hp <= 0 || gameState.waveIndex >= gameState.totalWaves) {
    finishGame(gameState.hp > 0);
  } else {
    spawnNextPacket();
  }
}

function adjustMetricsOnError(expected, chosen) {
  if (expected === 'REFUSE') {
    gameState.metrics.safety = Math.max(1.0, +(gameState.metrics.safety - 0.6).toFixed(1));
  } else if (expected === 'CORRECT') {
    gameState.metrics.bias = Math.max(1.0, +(gameState.metrics.bias - 0.5).toFixed(1));
  } else if (expected === 'NORMAL') {
    gameState.metrics.fair = Math.max(1.0, +(gameState.metrics.fair - 0.5).toFixed(1));
  }
  gameState.metrics.fit = Math.max(1.0, +(gameState.metrics.fit - 0.4).toFixed(1));
}

function updateFeedbackPanel(item, isCorrect, chosenType) {
  const title = document.getElementById('feedbackTitle');
  const tag = document.getElementById('feedbackCategoryTag');
  const beforeEl = document.getElementById('feedbackBeforeText');
  const afterEl = document.getElementById('feedbackAfterText');

  const labelMap = {
    'REFUSE': '🛑 [1] 위험 차단 (거부)',
    'CORRECT': '⚖️ [2] 편향 교정 (교정)',
    'NORMAL': '✅ [3] 공정 응답 (정상)'
  };

  if (title) {
    if (isCorrect) {
      title.textContent = `✅ 완벽한 세이프가드 판별! (문항 #${item.no} — 정답: ${labelMap[item.type]})`;
      title.className = 'text-xs sm:text-sm font-extrabold text-emerald-400';
    } else {
      title.textContent = `⚠️ 오판별 감지! (선택: ${labelMap[chosenType] || '시간 초과'} → 정답: ${labelMap[item.type]})`;
      title.className = 'text-xs sm:text-sm font-extrabold text-rose-400';
    }
  }

  if (tag) tag.textContent = item.subcat;
  if (beforeEl) beforeEl.textContent = item.before;
  if (afterEl) afterEl.textContent = item.after;
}

function finishGame(isVictory) {
  gameState.running = false;
  gameState.paused = false;
  setActionButtonsEnabled(false);
  const btnPause = document.getElementById('btnPauseGame');
  if (btnPause) btnPause.disabled = true;

  const overlay = document.getElementById('canvasOverlay');
  const title = document.getElementById('overlayTitle');
  const desc = document.getElementById('overlayDesc');
  const btn = document.getElementById('btnOverlayStart');

  if (overlay) overlay.classList.remove('hidden');
  const avgMetric = ((gameState.metrics.safety + gameState.metrics.bias + gameState.metrics.fair + gameState.metrics.fit + gameState.metrics.clarity) / 5).toFixed(2);

  if (title && desc) {
    if (isVictory) {
      title.textContent = `🏆 벤치마크 디펜스 성공! 최종 점수: ${gameState.score.toLocaleString()}점`;
      desc.innerHTML = `LLM Judge 5대 지표 평균 <strong>${avgMetric} / 5.00점</strong>을 달성하며 세이프가드 검증을 완수했습니다! 상단 탭에서 <strong>250문항 전수 분석기</strong>와 <strong>프롬프트 설계서 전문</strong>을 확인하세요.`;
    } else {
      title.textContent = `🚨 AI 코어 무결성 소진 (최종 점수: ${gameState.score.toLocaleString()}점)`;
      desc.innerHTML = `위장된 유해 요청 또는 성차별적 전제에 동조하여 코어가 손상되었습니다. <strong>강건성 스캐너</strong>를 활용하여 다시 도전해 보세요!`;
    }
  }
  if (btn) btn.textContent = '🔄 다시 도전하기';
  drawCanvasScene();
}

function getLaneY(laneIdx) {
  const h = canvas.height;
  const topMargin = 48;
  const usable = h - topMargin - 36;
  return topMargin + (usable / 3) * laneIdx + (usable / 6);
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.8 + Math.random() * 4.5;
    gameState.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3.5,
      color,
      alpha: 1.0,
      decay: 0.02 + Math.random() * 0.02
    });
  }
}

function gameLoop(now) {
  const dt = Math.min(50, now - lastFrameTime);
  lastFrameTime = now;

  if (gameState.running && !gameState.paused) {
    updateGamePhysics(dt);
  }
  drawCanvasScene();

  if (gameState.running) {
    animFrameId = requestAnimationFrame(gameLoop);
  }
}

function updateGamePhysics(dt) {
  radarAngle = (radarAngle + dt * 0.0015) % (Math.PI * 2);
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 0.06);

  for (let i = 0; i < gameState.ambientPulses.length; i++) {
    gameState.ambientPulses[i] = (gameState.ambientPulses[i] + dt * 0.0004) % 1;
  }

  if (gameState.activePacket) {
    const speedFactor = gameState.upgrades.triage ? 0.7 : 1.0;
    gameState.activePacket.progress += (dt * 0.01) * gameState.activePacket.baseSpeed * speedFactor * 12;

    const coreX = 76;
    const spawnX = canvas.width - 60;
    const px = spawnX - (gameState.activePacket.progress / 100) * (spawnX - (coreX + 34));
    const py = getLaneY(gameState.activePacket.lane);

    gameState.activePacket.trail.unshift({ x: px, y: py, alpha: 0.8 });
    if (gameState.activePacket.trail.length > 8) gameState.activePacket.trail.pop();

    const remPct = Math.max(0, 100 - gameState.activePacket.progress);
    const bar = document.getElementById('timeProgressBar');
    if (bar) {
      bar.style.width = `${remPct}%`;
      bar.className = remPct < 30 ? 'h-full bg-rose-500 transition-all duration-75' : 'h-full bg-cyan-400 transition-all duration-75';
    }

    if (gameState.activePacket.progress >= 100) {
      const item = gameState.activePacket.item;
      playSound('damage');
      gameState.combo = 0;
      gameState.hp = Math.max(0, gameState.hp - 1);
      screenShake = 16;
      adjustMetricsOnError(item.type, null);
      spawnParticles(76, canvas.height / 2, '#ef4444', 32);
      updateFeedbackPanel(item, false, null);
      gameState.waveIndex += 1;
      gameState.activePacket = null;
      updateHudUI();

      if (gameState.hp <= 0 || gameState.waveIndex >= gameState.totalWaves) {
        finishGame(gameState.hp > 0);
      } else {
        spawnNextPacket();
      }
    }
  }

  for (let i = gameState.shockwaves.length - 1; i >= 0; i--) {
    const sw = gameState.shockwaves[i];
    sw.radius += 2.5;
    sw.alpha -= 0.04;
    if (sw.alpha <= 0) gameState.shockwaves.splice(i, 1);
  }

  for (let i = gameState.floatingTexts.length - 1; i >= 0; i--) {
    const ft = gameState.floatingTexts[i];
    ft.y -= 1.2;
    ft.alpha -= 0.025;
    if (ft.alpha <= 0) gameState.floatingTexts.splice(i, 1);
  }

  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const p = gameState.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay || 0.03;
    if (p.alpha <= 0) gameState.particles.splice(i, 1);
  }

  for (let i = gameState.lasers.length - 1; i >= 0; i--) {
    gameState.lasers[i].alpha -= 0.08;
    if (gameState.lasers[i].alpha <= 0) gameState.lasers.splice(i, 1);
  }
}

function drawCanvasScene() {
  if (!ctx || !canvas) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();

  if (screenShake > 0) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
  }

  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const coreX = 76;
  const coreY = h / 2;
  const radarRadius = Math.max(w, h);
  const radarGrad = ctx.createRadialGradient(coreX, coreY, 20, coreX, coreY, radarRadius);
  radarGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
  radarGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = radarGrad;
  ctx.beginPath();
  ctx.moveTo(coreX, coreY);
  ctx.arc(coreX, coreY, radarRadius, radarAngle - 0.25, radarAngle);
  ctx.closePath();
  ctx.fill();

  const spawnX = w - 60;
  const laneLabels = ['CH-α [유해성 스캐너]', 'CH-β [편향·차별 교정기]', 'CH-γ [공평성·적정성 분석]'];

  for (let i = 0; i < 3; i++) {
    const ly = getLaneY(i);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(coreX + 28, ly);
    ctx.lineTo(spawnX, ly);
    ctx.stroke();

    gameState.ambientPulses.forEach(p => {
      const dotX = spawnX - p * (spawnX - (coreX + 28));
      ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(dotX, ly, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '600 11px "Noto Sans KR", sans-serif';
    ctx.fillText(laneLabels[i], coreX + 44, ly - 9);
  }

  gameState.shockwaves.forEach(sw => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, sw.alpha);
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  gameState.lasers.forEach(l => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, l.alpha);
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.width || 6;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.restore();
  });

  if (gameState.activePacket) {
    const pkt = gameState.activePacket;
    const py = getLaneY(pkt.lane);
    const px = spawnX - (pkt.progress / 100) * (spawnX - (coreX + 34));

    let nodeColor = '#00f0ff';
    if (gameState.upgrades.robust) {
      nodeColor = pkt.item.type === 'REFUSE' ? '#ff0055' : (pkt.item.type === 'CORRECT' ? '#ffaa00' : '#00ff9d');
    }

    pkt.trail.forEach((t, idx) => {
      ctx.fillStyle = nodeColor;
      ctx.globalAlpha = 0.45 * (1 - idx / pkt.trail.length);
      ctx.beginPath();
      ctx.arc(t.x, t.y, 14 * (1 - idx / pkt.trail.length * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    ctx.save();
    ctx.shadowColor = nodeColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(px, py, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#090d16';
    ctx.font = '900 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${pkt.item.no}`, px, py + 3.5);

    const shortQ = pkt.item.q.length > 24 ? pkt.item.q.slice(0, 24) + '…' : pkt.item.q;
    ctx.font = '600 11px "Noto Sans KR", sans-serif';
    const boxW = Math.min(260, ctx.measureText(shortQ).width + 36);
    const bx = Math.max(coreX + 35, Math.min(w - boxW - 12, px - boxW / 2));
    const by = py - 40;

    ctx.fillStyle = 'rgba(11, 19, 36, 0.94)';
    ctx.fillRect(bx, by, boxW, 22);
    ctx.strokeStyle = nodeColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, by, boxW, 22);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(shortQ, bx + boxW / 2, by + 15);
    ctx.textAlign = 'left';
  }

  gameState.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const coreGrad = ctx.createRadialGradient(coreX, coreY, 6, coreX, coreY, 46);
  coreGrad.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
  coreGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.45)');
  coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.rotate(radarAngle * 1.5);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 20, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CORE', coreX, coreY + 3.5);
  ctx.textAlign = 'left';

  gameState.floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.fillStyle = ft.color;
    ctx.font = '800 13px "Inter", sans-serif';
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  ctx.restore();
}

function updateHudUI() {
  const elScore = document.getElementById('hudScore');
  const elCombo = document.getElementById('hudCombo');
  const elHp = document.getElementById('hudHp');
  const elWave = document.getElementById('hudWave');
  const elSp = document.getElementById('hudSp');

  if (elScore) elScore.textContent = gameState.score.toLocaleString();
  if (elCombo) elCombo.textContent = `${gameState.combo} Combo`;
  if (elHp) elHp.textContent = '❤️'.repeat(gameState.hp) + '🖤'.repeat(Math.max(0, gameState.maxHp - gameState.hp));
  if (elWave) elWave.textContent = `${Math.min(gameState.waveIndex + (gameState.activePacket ? 1 : 0), gameState.totalWaves)} / ${gameState.totalWaves}`;
  if (elSp) elSp.textContent = `${gameState.sp} SP`;

  const m = gameState.metrics;
  const updateBar = (valId, barId, val) => {
    const vEl = document.getElementById(valId);
    const bEl = document.getElementById(barId);
    if (vEl) vEl.textContent = `${val.toFixed(1)} / 5.0`;
    if (bEl) bEl.style.width = `${(val / 5) * 100}%`;
  };
  updateBar('metricSafetyVal', 'metricSafetyBar', m.safety);
  updateBar('metricBiasVal', 'metricBiasBar', m.bias);
  updateBar('metricFairVal', 'metricFairBar', m.fair);
  updateBar('metricFitVal', 'metricFitBar', m.fit);
  updateBar('metricClarityVal', 'metricClarityBar', m.clarity);
}

function updateUpgradeUI() {
  const bRobust = document.getElementById('badgeUpgradeRobust');
  const bTriage = document.getElementById('badgeUpgradeTriage');
  const bClarity = document.getElementById('badgeUpgradeClarity');

  if (bRobust) bRobust.textContent = gameState.upgrades.robust ? '활성화됨' : '50 SP';
  if (bTriage) bTriage.textContent = gameState.upgrades.triage ? '활성화됨' : '60 SP';
  if (bClarity) bClarity.textContent = gameState.upgrades.clarity ? '활성화됨' : '80 SP';
}

// --- 3. 250 BENCHMARK EXPLORER RENDERER ---
function renderBenchmarkExplorer() {
  const container = document.getElementById('explorerListContainer');
  const catFilterEl = document.getElementById('filterCategory');
  const searchInputEl = document.getElementById('searchBenchmarkInput');
  if (!container || !catFilterEl || !searchInputEl) return;

  const catFilter = catFilterEl.value;
  const query = searchInputEl.value.trim().toLowerCase();

  const filtered = BENCHMARK_ITEMS.filter(item => {
    if (catFilter !== 'ALL' && item.type !== catFilter) return false;
    if (query && !item.q.toLowerCase().includes(query) && !String(item.no).includes(query) && !item.subcat.toLowerCase().includes(query)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">일치하는 문항이 없습니다.</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const badgeStyle = item.type === 'REFUSE'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      : (item.type === 'CORRECT' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40');
    const typeLabel = item.type === 'REFUSE' ? '🛑 유해·위장 거부' : (item.type === 'CORRECT' ? '⚖️ 편향·차별 교정' : '✅ 중립 정상 응답');

    return `
      <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 transition-all hover:border-cyan-500/40">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeStyle}">${typeLabel}</span>
            <span class="text-xs font-bold text-cyan-300">문항 NO. ${item.no}</span>
          </div>
          <span class="text-xs text-slate-400 font-medium">${item.subcat}</span>
        </div>
        <p class="text-sm font-bold text-white leading-relaxed">Q. "${item.q}"</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs pt-1">
          <div class="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
            <div class="font-bold text-rose-300 mb-1">❌ 프롬프트 적용 전 (취약 응답)</div>
            <p class="text-slate-300 leading-relaxed">${item.before}</p>
          </div>
          <div class="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
            <div class="font-bold text-emerald-300 mb-1">✨ 프롬프트 적용 후 (세이프가드 응답)</div>
            <p class="text-slate-200 leading-relaxed whitespace-pre-line">${item.after}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- 4. INITIALIZATION & EVENT LISTENERS ---
window.addEventListener('load', () => {
  resizeCanvas();
  renderBenchmarkExplorer();

  const tabs = [
    { btn: 'tabBtnGame', view: 'viewGame' },
    { btn: 'tabBtnExplorer', view: 'viewExplorer' },
    { btn: 'tabBtnBlueprint', view: 'viewBlueprint' }
  ];

  tabs.forEach(t => {
    const el = document.getElementById(t.btn);
    if (!el) return;
    el.addEventListener('click', () => {
      tabs.forEach(other => {
        const b = document.getElementById(other.btn);
        const v = document.getElementById(other.view);
        if (!b || !v) return;
        if (other.btn === t.btn) {
          b.className = 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20';
          v.classList.remove('hidden');
        } else {
          b.className = 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-slate-800/80 text-slate-300 hover:bg-slate-700';
          v.classList.add('hidden');
        }
      });
      if (t.view === 'viewGame') {
        setTimeout(resizeCanvas, 30);
      }
    });
  });

  const btnMute = document.getElementById('btnMuteToggle');
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      isMuted = !isMuted;
      btnMute.textContent = isMuted ? '🔇 사운드 OFF' : '🔊 사운드 ON';
      showToast(isMuted ? '사운드가 음소거되었습니다.' : '사운드 효과가 켜졌습니다.');
    });
  }

  const btnStart = document.getElementById('btnStartGame');
  if (btnStart) btnStart.addEventListener('click', startNewGame);
  const btnOverlayStart = document.getElementById('btnOverlayStart');
  if (btnOverlayStart) btnOverlayStart.addEventListener('click', startNewGame);
  const btnReset = document.getElementById('btnResetGame');
  if (btnReset) btnReset.addEventListener('click', startNewGame);

  const btnPause = document.getElementById('btnPauseGame');
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      if (!gameState.running) return;
      gameState.paused = !gameState.paused;
      btnPause.textContent = gameState.paused ? '▶ 재개' : '⏸ 일시정지';
      setActionButtonsEnabled(!gameState.paused);
      showToast(gameState.paused ? '게임이 일시정지되었습니다.' : '게임을 재개합니다.');
    });
  }

  const btnRefuse = document.getElementById('btnActionRefuse');
  if (btnRefuse) btnRefuse.addEventListener('click', () => handlePlayerAction('REFUSE'));
  const btnCorrect = document.getElementById('btnActionCorrect');
  if (btnCorrect) btnCorrect.addEventListener('click', () => handlePlayerAction('CORRECT'));
  const btnNormal = document.getElementById('btnActionNormal');
  if (btnNormal) btnNormal.addEventListener('click', () => handlePlayerAction('NORMAL'));

  window.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (!gameState.running || gameState.paused) return;
    if (e.key === '1' || e.key.toLowerCase() === 'a') handlePlayerAction('REFUSE');
    if (e.key === '2' || e.key.toLowerCase() === 's') handlePlayerAction('CORRECT');
    if (e.key === '3' || e.key.toLowerCase() === 'd') handlePlayerAction('NORMAL');
  });

  const btnUpRobust = document.getElementById('btnUpgradeRobust');
  if (btnUpRobust) {
    btnUpRobust.addEventListener('click', () => {
      if (gameState.upgrades.robust) return showToast('이미 강건성 스캐너가 활성화되어 있습니다.');
      if (gameState.sp < 50) return showToast('SP가 부족합니다! (50 SP 필요)');
      gameState.sp -= 50;
      gameState.upgrades.robust = true;
      playSound('upgrade');
      if (gameState.activePacket) renderActiveQueryCard(gameState.activePacket.item);
      updateUpgradeUI();
      updateHudUI();
      showToast('🔍 강건성 스캐너 활성화! 위장 명분 및 편향 전제가 하이라이트됩니다.');
    });
  }

  const btnUpTriage = document.getElementById('btnUpgradeTriage');
  if (btnUpTriage) {
    btnUpTriage.addEventListener('click', () => {
      if (gameState.upgrades.triage) return showToast('이미 판별 설계성 감속기가 활성화되어 있습니다.');
      if (gameState.sp < 60) return showToast('SP가 부족합니다! (60 SP 필요)');
      gameState.sp -= 60;
      gameState.upgrades.triage = true;
      playSound('upgrade');
      updateUpgradeUI();
      updateHudUI();
      showToast('⏱️ 판별 감속기 작동! 질문 패킷 이동 속도가 30% 느려집니다.');
    });
  }

  const btnUpStruct = document.getElementById('btnUpgradeStruct');
  if (btnUpStruct) {
    btnUpStruct.addEventListener('click', () => {
      if (gameState.hp >= gameState.maxHp) return showToast('이미 코어 무결성(HP)이 최대치입니다.');
      if (gameState.sp < 70) return showToast('SP가 부족합니다! (70 SP 필요)');
      gameState.sp -= 70;
      gameState.hp = Math.min(gameState.maxHp, gameState.hp + 1);
      playSound('upgrade');
      updateHudUI();
      showToast('🛡️ 구조성 코어 복구 완료! HP가 +1 회복되었습니다.');
    });
  }

  const btnUpClarity = document.getElementById('btnUpgradeClarity');
  if (btnUpClarity) {
    btnUpClarity.addEventListener('click', () => {
      if (gameState.upgrades.clarity) return showToast('이미 명확성 점수 증폭기가 활성화되어 있습니다.');
      if (gameState.sp < 80) return showToast('SP가 부족합니다! (80 SP 필요)');
      gameState.sp -= 80;
      gameState.upgrades.clarity = true;
      playSound('upgrade');
      updateUpgradeUI();
      updateHudUI();
      showToast('✨ 명확성 증폭기 활성화! 획득 점수 및 SP가 1.5배 증가합니다.');
    });
  }

  const btnUpAuto = document.getElementById('btnUpgradeAuto');
  if (btnUpAuto) {
    btnUpAuto.addEventListener('click', () => {
      if (!gameState.running || !gameState.activePacket) return showToast('진행 중인 질문 패킷이 있을 때만 사용할 수 있습니다.');
      if (gameState.sp < 90) return showToast('SP가 부족합니다! (90 SP 필요)');
      gameState.sp -= 90;
      playSound('upgrade');
      const correctType = gameState.activePacket.item.type;
      handlePlayerAction(correctType);
      showToast('🤖 범용성 자동 판별 완료! 현재 패킷을 100% 정확히 처리했습니다.');
    });
  }

  const filterCat = document.getElementById('filterCategory');
  if (filterCat) filterCat.addEventListener('change', renderBenchmarkExplorer);
  const searchInput = document.getElementById('searchBenchmarkInput');
  if (searchInput) searchInput.addEventListener('input', renderBenchmarkExplorer);

  const btnCopy = document.getElementById('btnCopySystemPrompt');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const promptEl = document.getElementById('systemPromptText');
      if (!promptEl) return;
      const text = promptEl.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('✅ 최종 시스템 프롬프트가 클립보드에 복사되었습니다!');
        }).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    });
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ 최종 시스템 프롬프트가 클립보드에 복사되었습니다!');
  }
});
