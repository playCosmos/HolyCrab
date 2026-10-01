(() => {
  "use strict";

  const C = window.HolyCrabCore;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = 1440;
  const H = 810;
  canvas.width = W;
  canvas.height = H;

  const ui = {
    title: document.getElementById("title"),
    start: document.getElementById("start-btn"),
    mission: document.getElementById("mission"),
    submission: document.getElementById("submission"),
    suspicion: document.getElementById("suspicion-fill"),
    prompt: document.getElementById("prompt"),
    toast: document.getElementById("toast"),
    journal: document.getElementById("journal"),
    journalBody: document.getElementById("journal-body"),
    puzzle: document.getElementById("puzzle"),
    puzzleBody: document.getElementById("puzzle-body"),
    puzzleResult: document.getElementById("puzzle-result"),
    puzzleSubmit: document.getElementById("puzzle-submit"),
    puzzleClose: document.getElementById("puzzle-close"),
    result: document.getElementById("result"),
    resultTitle: document.getElementById("result-title"),
    resultText: document.getElementById("result-text"),
    resultRank: document.getElementById("result-rank"),
    resultTime: document.getElementById("result-time"),
    resultCaught: document.getElementById("result-caught"),
    restart: document.getElementById("restart-btn")
  };

  const keys = Object.create(null);
  const bounds = { x: 14, y: 14, w: W - 28, h: H - 28 };

  const walls = [
    { x: 430, y: 14, w: 18, h: 258 },
    { x: 430, y: 398, w: 18, h: 398 },
    { x: 960, y: 14, w: 18, h: 206 },
    { x: 960, y: 350, w: 18, h: 446 }
  ];

  const furniture = [
    { x: 58, y: 92, w: 280, h: 132, kind: "bed", label: "침대" },
    { x: 62, y: 438, w: 136, h: 88, kind: "wardrobe", label: "옷장" },
    { x: 272, y: 520, w: 118, h: 70, kind: "desk", label: "책상" },
    { x: 560, y: 118, w: 250, h: 92, kind: "sofa", label: "소파" },
    { x: 640, y: 350, w: 190, h: 106, kind: "table", label: "테이블" },
    { x: 520, y: 540, w: 190, h: 54, kind: "tv", label: "TV" },
    { x: 1030, y: 52, w: 328, h: 66, kind: "counter", label: "조리대" },
    { x: 1080, y: 330, w: 240, h: 102, kind: "island", label: "아일랜드" },
    { x: 1340, y: 130, w: 64, h: 170, kind: "fridge", label: "냉장고" },
    { x: 1030, y: 548, w: 124, h: 92, kind: "pantry", label: "찬장" },
    { x: 1210, y: 564, w: 116, h: 62, kind: "drawer", label: "서랍장" }
  ];

  const solids = walls.concat(furniture);
  const blockers = solids;

  const patrol = [
    { x: 600, y: 300 }, { x: 850, y: 300 }, { x: 1040, y: 280 },
    { x: 1240, y: 200 }, { x: 1380, y: 260 }, { x: 1380, y: 480 },
    { x: 1240, y: 470 }, { x: 1035, y: 460 }, { x: 1035, y: 300 },
    { x: 900, y: 300 }, { x: 900, y: 650 }, { x: 600, y: 650 },
    { x: 520, y: 480 }, { x: 520, y: 300 }
  ];

  const clueDefs = [
    {
      id: "calendar", x: 500, y: 82,
      title: "달력 뒤 메모",
      text: "간장 : 물 = 1 : 1. 짠맛은 끓인 뒤 완전히 식혀서 확인."
    },
    {
      id: "fridge-note", x: 1314, y: 318,
      title: "냉장고 자석 메모",
      text: "단맛은 설탕만 쓰지 말고 매실청을 섞는다."
    },
    {
      id: "pantry-note", x: 1185, y: 676,
      title: "찬장 안쪽 낙서",
      text: "양파·대파·마늘·생강을 넣고 향을 충분히 우린다."
    },
    {
      id: "drawer-note", x: 1360, y: 600,
      title: "비밀 서랍의 쪽지",
      text: "1차 24시간. 게를 건진 뒤 간장을 다시 끓여 완전히 식히고 2차 숙성."
    }
  ];

  const hideSpots = [
    { id: "wardrobe-hide", x: 215, y: 484, kind: "hide", label: "옷장에 숨기" },
    { id: "sofa-hide", x: 835, y: 170, kind: "hide", label: "소파 뒤에 숨기" },
    { id: "island-hide", x: 1060, y: 382, kind: "hide", label: "아일랜드 뒤에 숨기" }
  ];

  const distractionDefs = [
    { id: "tv-noise", x: 740, y: 570, kind: "distraction", label: "TV 리모컨으로 소리 내기", cooldown: 0 },
    { id: "phone-noise", x: 856, y: 92, kind: "distraction", label: "휴대폰 진동 울리기", cooldown: 0 },
    { id: "microwave-noise", x: 1018, y: 150, kind: "distraction", label: "전자레인지 알림음 내기", cooldown: 0 }
  ];

  const safe = { id: "recipe-safe", x: 1392, y: 690, kind: "safe", label: "비밀 레시피 상자 열기" };
  const exitDoor = { id: "exit", x: 730, y: 774, kind: "exit", label: "현관으로 탈출" };

  const puzzleQuestions = [
    {
      q: "1. 기본 간장물 비율은?",
      options: ["간장 1 : 물 1", "간장 2 : 물 1", "간장 1 : 물 2", "간장만 사용"],
      answer: 0
    },
    {
      q: "2. 1차 숙성의 핵심 시간은?",
      options: ["6시간", "24시간", "48시간", "72시간"],
      answer: 1
    },
    {
      q: "3. 1차 숙성 뒤의 비법은?",
      options: [
        "그대로 계속 둔다",
        "게만 뒤집어 다시 넣는다",
        "간장을 다시 끓여 완전히 식힌 뒤 2차 숙성한다",
        "물을 더 붓고 바로 먹는다"
      ],
      answer: 2
    }
  ];

  const player = {
    x: 228, y: 340, r: 16, angle: 0,
    hidden: false, hideSpot: null, moving: false, sneaking: false
  };

  const mom = {
    x: 600, y: 300, r: 19, angle: 0,
    state: "patrol", patrolIndex: 0, target: null, timer: 0
  };

  let gameState = "title";
  let suspicion = 0;
  let clueState = Object.create(null);
  let hasRecipe = false;
  let caught = 0;
  let elapsed = 0;
  let freeze = 0;
  let toastTimer = 0;
  let noiseTimer = 0;
  let footstepTimer = 0;
  let noiseRings = [];
  let puzzleSelections = {};
  let lastFrame = performance.now();

  class AudioEngine {
    constructor() { this.ctx = null; }
    ensure() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    }
    tone(freq, duration, gain = .035, type = "sine", delay = 0) {
      try {
        this.ensure();
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + .01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        o.connect(g).connect(this.ctx.destination);
        o.start(t);
        o.stop(t + duration + .02);
      } catch (_) {}
    }
    pickup() { this.tone(560,.09,.025); this.tone(820,.13,.028,"sine",.07); }
    alert() { this.tone(180,.12,.045,"square"); this.tone(145,.16,.035,"square",.12); }
    success() { this.tone(523,.12,.03); this.tone(659,.12,.03,"sine",.1); this.tone(784,.2,.03,"sine",.2); }
    click() { this.tone(360,.05,.018,"triangle"); }
  }
  const audio = new AudioEngine();

  function resetRun() {
    player.x = 228; player.y = 340; player.angle = 0;
    player.hidden = false; player.hideSpot = null; player.moving = false;
    mom.x = 600; mom.y = 300; mom.angle = 0;
    mom.state = "patrol"; mom.patrolIndex = 0; mom.target = null; mom.timer = 0;
    suspicion = 0;
    clueState = Object.create(null);
    hasRecipe = false;
    caught = 0;
    elapsed = 0;
    freeze = 0;
    footstepTimer = 0;
    noiseRings = [];
    puzzleSelections = {};
    distractionDefs.forEach(d => d.cooldown = 0);
    gameState = "playing";
    ui.result.classList.add("hidden");
    ui.puzzle.classList.add("hidden");
    ui.journal.classList.add("hidden");
    renderJournal();
    showToast("목표: 엄마 몰래 단서 4개를 모아 비밀 레시피 상자를 해독하자.", 3.6);
  }

  function showToast(text, seconds = 2.4) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    toastTimer = seconds;
  }

  function emitNoise(pos, radius, strong = false) {
    noiseRings.push({ x: pos.x, y: pos.y, radius: 8, max: radius, life: .75 });
    if (C.dist(mom, pos) <= radius && mom.state !== "alert") {
      mom.state = "investigate";
      mom.target = { x: pos.x, y: pos.y };
      mom.timer = strong ? 4.5 : 2.2;
    }
  }

  function currentClueCount() {
    return clueDefs.reduce((n, c) => n + (clueState[c.id] ? 1 : 0), 0);
  }

  function updateMission() {
    const n = currentClueCount();
    if (n < clueDefs.length) {
      ui.mission.textContent = `레시피 단서 찾기 (${n}/${clueDefs.length})`;
      ui.submission.textContent = player.hidden ? "숨는 중 · E로 나오기" : "엄마의 시야와 소리를 피해서 집을 뒤져보자.";
    } else if (!hasRecipe) {
      ui.mission.textContent = "부엌의 비밀 레시피 상자 해독하기";
      ui.submission.textContent = "수집한 단서는 TAB에서 다시 확인할 수 있다.";
    } else {
      ui.mission.textContent = "현관으로 빠져나가기";
      ui.submission.textContent = "레시피 확보 완료. 이제 들키지 말고 탈출!";
    }
  }

  function renderJournal() {
    const found = clueDefs.filter(c => clueState[c.id]);
    if (!found.length) {
      ui.journalBody.innerHTML = '<div class="clue"><strong>아직 단서가 없다.</strong><span>반짝이는 조사 지점을 찾아 E를 눌러보자.</span></div>';
      return;
    }
    ui.journalBody.innerHTML = found.map(c =>
      `<div class="clue"><strong>${c.title}</strong><span>${c.text}</span></div>`
    ).join("");
  }

  function getInteractables() {
    const list = [];
    for (const c of clueDefs) {
      if (!clueState[c.id]) list.push({ ...c, kind: "clue", label: `${c.title} 조사` });
    }
    list.push(...hideSpots);
    for (const d of distractionDefs) {
      if (d.cooldown <= 0) list.push(d);
    }
    list.push(safe, exitDoor);
    return list;
  }

  function interactionPrompt(obj) {
    if (!obj) return "";
    if (obj.kind === "safe" && currentClueCount() < clueDefs.length) {
      return `E · 잠겨 있다 — 단서 ${currentClueCount()}/${clueDefs.length}`;
    }
    if (obj.kind === "exit" && !hasRecipe) return "E · 아직 레시피가 없다";
    return `E · ${obj.label}`;
  }

  function interact() {
    if (gameState !== "playing" || freeze > 0) return;
    audio.click();

    if (player.hidden) {
      player.hidden = false;
      player.hideSpot = null;
      showToast("숨는 곳에서 나왔다.", 1.2);
      return;
    }

    const obj = C.nearestInteractable(player, getInteractables(), 70);
    if (!obj) return;

    if (obj.kind === "clue") {
      clueState[obj.id] = true;
      renderJournal();
      audio.pickup();
      showToast(`단서 획득 · ${obj.title}: ${obj.text}`, 3.8);
      return;
    }

    if (obj.kind === "hide") {
      player.hidden = true;
      player.hideSpot = obj.id;
      player.x = obj.x;
      player.y = obj.y;
      showToast("숨었다. 엄마가 지나갈 때까지 기다리자.", 1.8);
      return;
    }

    if (obj.kind === "distraction") {
      obj.cooldown = 12;
      emitNoise(obj, 470, true);
      showToast("일부러 소리를 냈다. 엄마가 확인하러 온다.", 1.8);
      return;
    }

    if (obj.kind === "safe") {
      if (currentClueCount() < clueDefs.length) {
        showToast(`상자에 3자리 조합 문제가 있다. 단서가 더 필요하다. (${currentClueCount()}/4)`, 2.3);
      } else {
        openPuzzle();
      }
      return;
    }

    if (obj.kind === "exit") {
      if (!hasRecipe) showToast("빈손으로 나가면 오늘 밤의 의미가 없다.", 1.8);
      else finishRun();
    }
  }

  function openPuzzle() {
    gameState = "puzzle";
    puzzleSelections = {};
    ui.puzzleResult.textContent = "";
    ui.puzzle.classList.remove("hidden");
    renderPuzzle();
  }

  function renderPuzzle() {
    ui.puzzleBody.innerHTML = puzzleQuestions.map((q, qi) => {
      const options = q.options.map((opt, oi) => {
        const selected = puzzleSelections[qi] === oi ? " selected" : "";
        return `<button class="opt${selected}" data-q="${qi}" data-o="${oi}">${opt}</button>`;
      }).join("");
      return `<div class="q"><strong>${q.q}</strong><div class="opts">${options}</div></div>`;
    }).join("");

    ui.puzzleBody.querySelectorAll(".opt").forEach(btn => {
      btn.addEventListener("click", () => {
        puzzleSelections[Number(btn.dataset.q)] = Number(btn.dataset.o);
        renderPuzzle();
      });
    });
  }

  function submitPuzzle() {
    if (Object.keys(puzzleSelections).length < puzzleQuestions.length) {
      ui.puzzleResult.textContent = "세 문제 모두 선택해야 한다.";
      return;
    }
    const ok = puzzleQuestions.every((q, i) => puzzleSelections[i] === q.answer);
    if (!ok) {
      ui.puzzleResult.textContent = "딸깍… 아니다. 단서를 다시 읽어보자.";
      suspicion = C.clamp(suspicion + .12, 0, 1);
      audio.alert();
      return;
    }
    hasRecipe = true;
    gameState = "playing";
    ui.puzzle.classList.add("hidden");
    audio.success();
    showToast("레시피 확보! ‘24시간 → 간장 재가열·완전 냉각 → 2차 숙성’… 이제 현관으로!", 4.2);
  }

  function finishRun() {
    gameState = "result";
    const rank = C.rankRun({ caught, seconds: elapsed });
    ui.resultRank.textContent = `${rank.rank} · ${rank.label}`;
    ui.resultTime.textContent = C.formatTime(elapsed);
    ui.resultCaught.textContent = `${caught}회`;
    ui.resultTitle.textContent = "작전 성공 — Holy Crab!";
    ui.resultText.textContent = caught === 0
      ? "라먀니는 아무 흔적도 남기지 않고 레시피를 손에 넣었다. 그런데 마지막 장에는 ‘라먀니가 찾을 줄 알았어. 다음엔 같이 만들자.’라는 엄마의 메모가 있었다."
      : "라먀니는 우여곡절 끝에 레시피를 챙겼다. 엄마는 이미 다 알고 있었던 듯 현관 앞에 밥 한 공기와 메모를 놓아두었다. ‘게장은 내일 먹자.’";
    ui.result.classList.remove("hidden");
    audio.success();
  }

  function caughtByMom() {
    caught += 1;
    suspicion = 0;
    freeze = 1.35;
    player.hidden = false;
    player.hideSpot = null;
    player.x = 228;
    player.y = 340;
    mom.x = 600;
    mom.y = 300;
    mom.state = "patrol";
    mom.target = null;
    mom.patrolIndex = 0;
    audio.alert();
    showToast("엄마: “라먀니? 아직 안 잤어?” — 방으로 강제 귀환! 단서는 유지된다.", 3.2);
  }

  function updatePlayer(dt) {
    if (player.hidden) {
      player.moving = false;
      return;
    }

    let dx = 0, dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;

    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    player.moving = Math.abs(dx) + Math.abs(dy) > 0;
    player.sneaking = !!(keys.ShiftLeft || keys.ShiftRight);
    const speed = player.sneaking ? 92 : 178;

    if (player.moving) {
      player.angle = Math.atan2(dy, dx);
      const next = C.moveCircle(player, dx * speed * dt, dy * speed * dt, player.r, solids, bounds);
      player.x = next.x;
      player.y = next.y;

      footstepTimer -= dt;
      if (footstepTimer <= 0) {
        const radius = player.sneaking ? 32 : 145;
        emitNoise(player, radius, false);
        footstepTimer = player.sneaking ? .72 : .46;
      }
    } else {
      footstepTimer = Math.min(footstepTimer, .1);
    }
  }

  function moveMomToward(target, speed, dt) {
    if (!target) return true;
    const dx = target.x - mom.x;
    const dy = target.y - mom.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) return true;
    mom.angle = Math.atan2(dy, dx);
    const next = C.moveCircle(mom, dx / d * speed * dt, dy / d * speed * dt, mom.r, solids, bounds);
    const moved = Math.hypot(next.x - mom.x, next.y - mom.y);
    mom.x = next.x; mom.y = next.y;

    if (moved < .1) {
      const side = C.moveCircle(mom, -dy / d * speed * dt, dx / d * speed * dt, mom.r, solids, bounds);
      mom.x = side.x; mom.y = side.y;
    }
    return false;
  }

  function updateMom(dt) {
    const sees = !player.hidden && C.inVisionCone(mom, player, 255, Math.PI * .39, blockers);

    if (sees) {
      mom.state = "alert";
      mom.target = { x: player.x, y: player.y };
      mom.timer = 1.3;
    }

    if (mom.state === "alert") {
      mom.target = { x: player.x, y: player.y };
      moveMomToward(mom.target, 126, dt);
      if (!sees) {
        mom.timer -= dt;
        if (mom.timer <= 0) {
          mom.state = "investigate";
          mom.timer = 3.2;
        }
      }
      return sees;
    }

    if (mom.state === "investigate") {
      const arrived = moveMomToward(mom.target, 106, dt);
      if (arrived) {
        mom.timer -= dt;
        mom.angle += dt * 1.45;
        if (mom.timer <= 0) {
          mom.state = "patrol";
          mom.target = null;
        }
      }
      return sees;
    }

    const target = patrol[mom.patrolIndex];
    if (moveMomToward(target, 82, dt)) {
      mom.patrolIndex = (mom.patrolIndex + 1) % patrol.length;
    }
    return sees;
  }

  function updateSuspicion(dt, sees) {
    if (sees && !player.hidden) {
      const close = C.dist(mom, player) < 105;
      suspicion += dt * (close ? 1.15 : player.sneaking ? .48 : .68);
    } else {
      suspicion -= dt * .24;
    }
    suspicion = C.clamp(suspicion, 0, 1);
    if (suspicion >= 1 || (!player.hidden && C.dist(mom, player) < 31)) caughtByMom();
  }

  function updateNoise(dt) {
    noiseRings = noiseRings.filter(r => {
      r.life -= dt;
      r.radius += (r.max - r.radius) * Math.min(1, dt * 5);
      return r.life > 0;
    });
    for (const d of distractionDefs) d.cooldown = Math.max(0, d.cooldown - dt);
  }

  function updatePrompt() {
    if (gameState !== "playing") {
      ui.prompt.classList.remove("show");
      return;
    }

    let text = "";
    if (player.hidden) text = "E · 숨는 곳에서 나오기";
    else {
      const obj = C.nearestInteractable(player, getInteractables(), 70);
      text = interactionPrompt(obj);
    }
    if (text) {
      ui.prompt.textContent = text;
      ui.prompt.classList.add("show");
    } else {
      ui.prompt.classList.remove("show");
    }
  }

  function update(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.toast.classList.remove("show");
    }

    if (gameState !== "playing") return;
    elapsed += dt;
    if (freeze > 0) {
      freeze -= dt;
      updateMission();
      updatePrompt();
      return;
    }

    updatePlayer(dt);
    const sees = updateMom(dt);
    updateSuspicion(dt, sees);
    updateNoise(dt);
    updateMission();
    updatePrompt();
    ui.suspicion.style.width = `${Math.round(suspicion * 100)}%`;
  }

  function roundedRect(x, y, w, h, r, fill, stroke) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawFloor() {
    ctx.fillStyle = "#18131b";
    ctx.fillRect(0, 0, W, H);

    roundedRect(20, 20, 410, 770, 20, "#2b2531");
    roundedRect(448, 20, 512, 770, 20, "#2d272d");
    roundedRect(978, 20, 442, 770, 20, "#302629");

    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = "#f7d8bd";
    ctx.font = "700 24px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText("라먀니의 방", 48, 64);
    ctx.fillText("거실", 474, 64);
    ctx.fillText("부엌", 1004, 64);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 42) {
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); ctx.stroke();
    }
  }

  function drawWallsAndFurniture() {
    ctx.fillStyle = "#17131a";
    walls.forEach(w => roundedRect(w.x, w.y, w.w, w.h, 6, "#17131a"));

    for (const f of furniture) {
      let fill = "#554549";
      if (f.kind === "bed") fill = "#715c69";
      if (f.kind === "sofa") fill = "#5a4d62";
      if (f.kind === "table" || f.kind === "island") fill = "#6e5749";
      if (f.kind === "counter" || f.kind === "pantry" || f.kind === "drawer") fill = "#63483e";
      if (f.kind === "fridge") fill = "#6a6a70";
      if (f.kind === "tv") fill = "#25232b";
      roundedRect(f.x, f.y, f.w, f.h, 10, fill, "rgba(255,255,255,.08)");
      ctx.fillStyle = "rgba(255,245,234,.46)";
      ctx.font = "11px Segoe UI, Malgun Gothic, sans-serif";
      ctx.fillText(f.label, f.x + 8, f.y + 18);
    }

    ctx.fillStyle = "rgba(255,226,189,.25)";
    ctx.fillRect(430, 272, 18, 126);
    ctx.fillRect(960, 220, 18, 130);
  }

  function drawInteractables() {
    const pulse = .5 + .5 * Math.sin(performance.now() / 280);

    for (const c of clueDefs) {
      if (clueState[c.id]) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `rgba(246, 183, 96, ${.55 + pulse * .4})`;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }

    ctx.lineWidth = 2;
    for (const h of hideSpots) {
      ctx.strokeStyle = "rgba(151, 184, 205, .34)";
      ctx.beginPath(); ctx.arc(h.x, h.y, 24, 0, Math.PI * 2); ctx.stroke();
    }

    for (const d of distractionDefs) {
      ctx.fillStyle = d.cooldown > 0 ? "rgba(255,255,255,.13)" : "rgba(130,200,214,.6)";
      ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = currentClueCount() === clueDefs.length ? "#f0a96f" : "#6e5960";
    roundedRect(safe.x - 20, safe.y - 16, 40, 32, 6, ctx.fillStyle, "rgba(255,255,255,.15)");
    ctx.fillStyle = "#2a2020";
    ctx.font = "700 12px sans-serif";
    ctx.fillText("秘", safe.x - 7, safe.y + 5);

    ctx.strokeStyle = hasRecipe ? "#9fd68a" : "rgba(255,255,255,.17)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(exitDoor.x - 42, exitDoor.y);
    ctx.lineTo(exitDoor.x + 42, exitDoor.y);
    ctx.stroke();
    ctx.fillStyle = hasRecipe ? "#b9e6a7" : "rgba(255,255,255,.28)";
    ctx.font = "700 12px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText("현관", exitDoor.x - 13, exitDoor.y - 10);
  }

  function drawNoise() {
    for (const r of noiseRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / .75) * .28;
      ctx.strokeStyle = "#b7dce2";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawMomVision() {
    const range = 255;
    const fov = Math.PI * .39;
    ctx.save();
    ctx.translate(mom.x, mom.y);
    ctx.rotate(mom.angle);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, range);
    g.addColorStop(0, suspicion > .45 ? "rgba(244,112,91,.22)" : "rgba(247,205,112,.16)");
    g.addColorStop(1, "rgba(247,205,112,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, -fov / 2, fov / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMom() {
    ctx.save();
    ctx.translate(mom.x, mom.y);
    ctx.rotate(mom.angle + Math.PI / 2);
    ctx.fillStyle = "#402f3b";
    ctx.beginPath();
    ctx.ellipse(0, 8, 15, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5b3f48";
    ctx.beginPath();
    ctx.arc(0, -8, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e3b5a4";
    ctx.beginPath();
    ctx.arc(0, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6d17d";
    ctx.fillRect(-2, -18, 4, 8);
    ctx.restore();

    ctx.fillStyle = "rgba(255,245,234,.68)";
    ctx.font = "700 11px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText(mom.state === "alert" ? "엄마?!" : mom.state === "investigate" ? "엄마 · 확인 중" : "엄마", mom.x - 22, mom.y - 30);
  }

  function drawRamyani() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = player.hidden ? .28 : 1;
    ctx.rotate(player.angle + Math.PI / 2);

    // soft contact shadow
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 19, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // boots / legs
    ctx.fillStyle = "#4a3530";
    roundedRect(-10, 13, 7, 13, 3, ctx.fillStyle);
    roundedRect(3, 13, 7, 13, 3, ctx.fillStyle);

    // dark skirt
    ctx.fillStyle = "#342d32";
    ctx.beginPath();
    ctx.moveTo(-13, 5);
    ctx.lineTo(13, 5);
    ctx.lineTo(10, 18);
    ctx.lineTo(-10, 18);
    ctx.closePath();
    ctx.fill();

    // cream knit cardigan silhouette
    ctx.fillStyle = "#f1e8df";
    ctx.beginPath();
    ctx.ellipse(0, 5, 14.5, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // white ribbed inner top
    ctx.fillStyle = "#fffaf5";
    roundedRect(-7, -1, 14, 13, 5, ctx.fillStyle);
    ctx.strokeStyle = "rgba(197,178,164,.62)";
    ctx.lineWidth = 1;
    for (let x = -4; x <= 4; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 1);
      ctx.lineTo(x, 10);
      ctx.stroke();
    }

    // cardigan sleeves
    ctx.strokeStyle = "#eadfd4";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-16, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(16, 12); ctx.stroke();

    // peach hair back mass
    ctx.fillStyle = "#ef9c68";
    ctx.beginPath();
    ctx.arc(0, -8, 16.5, 0, Math.PI * 2);
    ctx.fill();

    // side curls
    ctx.strokeStyle = "#d97f50";
    ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.arc(-12, -4, 7, Math.PI * .35, Math.PI * 1.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -4, 7, Math.PI * 1.55, Math.PI * 2.65); ctx.stroke();

    // face
    ctx.fillStyle = "#ffe2d2";
    ctx.beginPath();
    ctx.arc(0, -7, 10.7, 0, Math.PI * 2);
    ctx.fill();

    // bangs
    ctx.fillStyle = "#f4ad77";
    ctx.beginPath();
    ctx.moveTo(-10, -13);
    ctx.quadraticCurveTo(-5, -22, 2, -18);
    ctx.quadraticCurveTo(9, -20, 11, -12);
    ctx.quadraticCurveTo(4, -14, 1, -7);
    ctx.quadraticCurveTo(-3, -12, -10, -9);
    ctx.closePath();
    ctx.fill();

    // amber eyes
    ctx.fillStyle = "#7b431f";
    ctx.beginPath(); ctx.ellipse(-3.5, -6.5, 1.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5, -6.5, 1.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#efaa29";
    ctx.beginPath(); ctx.arc(-3.5, -7.1, .7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -7.1, .7, 0, Math.PI * 2); ctx.fill();

    // lollipop hair clip
    ctx.fillStyle = "#fff8f2";
    ctx.beginPath();
    ctx.arc(9.8, -16.2, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ef8da3";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(9.8, -16.2, 2.7, -.6, Math.PI * 1.45);
    ctx.stroke();

    // crossed gold pins
    ctx.strokeStyle = "#e0a42d";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(11.8, -12.8); ctx.lineTo(16, -8.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15.9, -13); ctx.lineTo(12, -8.6); ctx.stroke();

    // tiny blush
    ctx.fillStyle = "rgba(240,142,151,.30)";
    ctx.beginPath(); ctx.ellipse(-6.2, -3.6, 2.2, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.2, -3.6, 2.2, 1.1, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    ctx.fillStyle = "rgba(255,245,234,.92)";
    ctx.font = "800 11px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText("라먀니", player.x - 20, player.y - 33);
  }

  function draw() {
    drawFloor();
    drawWallsAndFurniture();
    drawNoise();
    drawMomVision();
    drawInteractables();
    drawMom();
    drawRamyani();

    if (freeze > 0) {
      ctx.fillStyle = `rgba(239, 102, 111, ${Math.min(.22, freeze * .12)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame(now) {
    const dt = Math.min(.035, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab","Space"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;

    if (e.repeat) return;
    if (e.code === "KeyE") interact();
    if (e.code === "Tab" && gameState === "playing") ui.journal.classList.toggle("hidden");
    if (e.code === "Escape" && gameState === "puzzle") {
      ui.puzzle.classList.add("hidden");
      gameState = "playing";
    }
  });

  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  window.addEventListener("blur", () => Object.keys(keys).forEach(k => delete keys[k]));

  ui.start.addEventListener("click", () => {
    audio.ensure();
    ui.title.classList.add("hidden");
    resetRun();
  });

  ui.restart.addEventListener("click", () => {
    audio.ensure();
    resetRun();
  });

  ui.puzzleSubmit.addEventListener("click", submitPuzzle);
  ui.puzzleClose.addEventListener("click", () => {
    ui.puzzle.classList.add("hidden");
    gameState = "playing";
  });

  renderJournal();
  updateMission();
  requestAnimationFrame(frame);
})();
