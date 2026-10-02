(() => {
  "use strict";

  const C = window.HolyCrabCore;
  const Campaign = window.HolyCrabStages;
  const AI = window.HolyCrabMomAI;
  if (!C || !Campaign || !AI) throw new Error("HolyCrab modules failed to load.");

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = 1440;
  const H = 810;
  const bounds = { x: 14, y: 14, w: W - 28, h: H - 28 };
  canvas.width = W;
  canvas.height = H;

  const ui = {
    vnScene: document.getElementById("vn-scene"),
    vnCharacter: document.getElementById("vn-character"),
    vnChapter: document.getElementById("vn-chapter"),
    vnSpeaker: document.getElementById("vn-speaker"),
    vnProgress: document.getElementById("vn-progress"),
    vnText: document.getElementById("vn-text"),
    vnMeta: document.getElementById("vn-meta"),
    vnNext: document.getElementById("vn-next"),
    missionLabel: document.getElementById("mission-label"),
    mission: document.getElementById("mission"),
    submission: document.getElementById("submission"),
    momFill: document.getElementById("mom-suspicion-fill"),
    momState: document.getElementById("mom-state"),
    sisterCard: document.getElementById("sister-suspicion-card"),
    sisterFill: document.getElementById("sister-suspicion-fill"),
    sisterState: document.getElementById("sister-state"),
    inventoryBinding: document.getElementById("inventory-binding"),
    inventoryCigarette: document.getElementById("inventory-cigarette"),
    boostStatus: document.getElementById("boost-status"),
    prompt: document.getElementById("prompt"),
    toast: document.getElementById("toast"),
    journal: document.getElementById("journal"),
    journalBody: document.getElementById("journal-body"),
    result: document.getElementById("result"),
    resultTitle: document.getElementById("result-title"),
    resultText: document.getElementById("result-text"),
    resultRank: document.getElementById("result-rank"),
    resultTime: document.getElementById("result-time"),
    resultCaught: document.getElementById("result-caught"),
    restart: document.getElementById("restart-btn")
  };

  const keys = Object.create(null);

  const player = {
    x: 0, y: 0, r: 16, angle: 0,
    hidden: false, hideSpot: null, moving: false, sneaking: false,
    velocity: { x: 0, y: 0 }
  };

  let campaign = Campaign.generateCampaign(Date.now());
  let stageIndex = 0;
  let stage = campaign.stages[0];
  let walls = [];
  let furniture = [];
  let solids = [];
  let blockers = [];
  let clueDefs = [];
  let decoyDefs = [];
  let itemDefs = [];
  let hideSpots = [];
  let distractions = [];
  let safe = null;
  let exitDoor = null;
  let watchers = [];

  let gameState = "vn";
  let collected = Object.create(null);
  let pickedItems = Object.create(null);
  let inventory = { binding: 0, cigarette: 0 };
  let boostTimer = 0;
  let coughTimer = 0;
  let coughPending = false;
  let hasRecipe = false;
  let caught = 0;
  let elapsed = 0;
  let freeze = 0;
  let toastTimer = 0;
  let footstepTimer = 0;
  let noiseRings = [];
  let stageCaughtStart = 0;
  let vnLines = [];
  let vnIndex = 0;
  let vnDone = null;
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
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + duration);
        o.connect(g).connect(this.ctx.destination);
        o.start(t);
        o.stop(t + duration + .02);
      } catch (_) {}
    }
    pickup() { this.tone(560,.09,.025); this.tone(820,.13,.028,"sine",.07); }
    alert() { this.tone(180,.12,.045,"square"); this.tone(145,.16,.035,"square",.12); }
    success() { this.tone(523,.12,.03); this.tone(659,.12,.03,"sine",.1); this.tone(784,.2,.03,"sine",.2); }
    stage() { this.tone(392,.10,.022); this.tone(523,.12,.026,"triangle",.08); }
    click() { this.tone(360,.05,.018,"triangle"); }
  }
  const audio = new AudioEngine();

  const VN_CHARACTERS = {
    ramyani: { name: "라먀니", src: "./assets/vn/ramyani.png", side: "right" },
    mom: { name: "엄마", src: "./assets/vn/mom.png", side: "left" },
    sister: { name: "언니", src: "./assets/vn/sister.png", side: "left" }
  };

  function renderVNLine() {
    const line = vnLines[vnIndex];
    if (!line) return;

    const character = VN_CHARACTERS[line.character || "ramyani"] || VN_CHARACTERS.ramyani;
    ui.vnScene.dataset.speaker = line.speaker || character.name;
    ui.vnScene.dataset.tone = line.tone || "story";
    ui.vnCharacter.src = character.src;
    ui.vnCharacter.alt = character.name;
    ui.vnCharacter.dataset.side = line.side || character.side;
    ui.vnCharacter.classList.remove("vn-pop");
    void ui.vnCharacter.offsetWidth;
    ui.vnCharacter.classList.add("vn-pop");

    ui.vnChapter.textContent = line.chapter || `DAY ${stage ? stage.day : 1} / ${stage ? stage.totalDays : 10}`;
    ui.vnSpeaker.textContent = line.speaker || character.name;
    ui.vnText.textContent = line.text || "";
    ui.vnMeta.textContent = line.meta || "";
    ui.vnProgress.textContent = `${vnIndex + 1} / ${vnLines.length}`;
    ui.vnNext.textContent = vnIndex === vnLines.length - 1 ? (line.endLabel || "계속 ▶") : "다음 ▶";
  }

  function showVN(lines, onDone, options = {}) {
    vnLines = lines.filter(Boolean);
    vnIndex = 0;
    vnDone = typeof onDone === "function" ? onDone : null;
    gameState = "vn";
    ui.journal.classList.add("hidden");
    ui.vnScene.classList.remove("hidden");
    if (options.tone) ui.vnScene.dataset.tone = options.tone;
    renderVNLine();
  }

  function nextVN() {
    if (gameState !== "vn") return;
    audio.ensure();
    audio.click();

    if (vnIndex < vnLines.length - 1) {
      vnIndex += 1;
      renderVNLine();
      return;
    }

    ui.vnScene.classList.add("hidden");
    const done = vnDone;
    vnDone = null;
    vnLines = [];
    vnIndex = 0;
    if (done) done();
  }

  function campaignIntroLines() {
    return [
      {
        character: "ramyani",
        chapter: "작전 개시",
        text: "좋아. 이번 목표는 엄마가 절대 안 알려주는 간장게장 레시피를 직접 모으는 거야.",
        meta: "10일 동안 집은 3번, 시장과 반찬가게는 합쳐 7번 방문한다."
      },
      {
        character: "ramyani",
        chapter: "기본 이동",
        text: "WASD나 방향키로 움직이고, Shift를 누르면 천천히 살금살금 걸을 수 있어.",
        meta: "빨리 움직일수록 발소리가 커지고 엄마와 언니가 소리를 확인하러 온다."
      },
      {
        character: "ramyani",
        chapter: "조사",
        text: "수상한 곳에서는 E. 메모를 조사하고, 아이템을 줍고, 숨을 곳에 들어가는 것도 E야.",
        meta: "Tab으로 지금까지 모은 기록을 확인한다. 황당한 가짜 레시피는 진행 조건이 아니다."
      },
      {
        character: "ramyani",
        chapter: "아이템",
        text: "매일 맵 어딘가에 아이템이 딱 하나 있어. 포장끈은 1번, 담배는 2번 키로 사용해.",
        meta: "포장끈은 가까운 추적자를 8초 묶고, 담배는 7초간 +45% 속도 대신 기침 소음을 낸다."
      },
      {
        character: "mom",
        chapter: "엄마",
        text: "라먀니야. 요즘 부엌을 왜 그렇게 자주 들여다보니?",
        meta: "엄마는 시야와 소리를 기억하고, 놓친 자리 주변까지 수색한다."
      },
      {
        character: "ramyani",
        chapter: "작전 개시",
        text: "아무것도 아니야! …좋아, 들켜도 모은 기록은 남지만 발각 횟수는 쌓여. 최대한 조용히 가자.",
        meta: "Day 5부터는 언니까지 별도의 시야·청각·수색 AI로 합류한다.",
        endLabel: "DAY 1로 ▶"
      }
    ];
  }

  function dayIntroLines() {
    const item = stage.items && stage.items[0];
    const itemName = item ? item.title : "아이템";
    const lines = [
      {
        character: "ramyani",
        chapter: `DAY ${stage.day} / ${stage.totalDays} · ${stage.name}`,
        text: stage.intro,
        meta: `오늘 목표: ${stage.objective}`
      },
      {
        character: "ramyani",
        chapter: `DAY ${stage.day} 준비`,
        text: `오늘도 핵심 단서를 찾고 빠져나오자. 그리고 ${itemName} 1개가 이 맵 어딘가에 놓여 있어.`,
        meta: "가짜 레시피와 생활 메모는 조사할 수 있지만 진행에는 필요 없다."
      }
    ];

    if (stage.day === 5 && stage.sisterActive) {
      lines.push({
        character: "sister",
        chapter: "새로운 감시자",
        text: "요즘 너 계속 어디 돌아다니는 거야? 엄마도 이상하다고 하던데.",
        meta: "오늘부터 언니가 합류한다. 엄마와 독립적으로 보고, 듣고, 추적한다."
      });
      lines.push({
        character: "ramyani",
        chapter: "DAY 5 경고",
        text: "언니까지? 한 명 피했다고 안심하면 바로 다른 쪽에 걸리겠네.",
        meta: "두 추적자의 시야와 순찰 경로는 서로 다르다."
      });
    } else if (stage.sisterActive) {
      lines.push({
        character: "ramyani",
        chapter: `DAY ${stage.day} 경고`,
        text: "오늘도 엄마와 언니 둘 다 있어. 유인할 때 다른 한 명의 위치도 꼭 확인해야 해.",
        meta: "포장끈은 가장 가까운 한 명만 묶는다."
      });
    }

    lines[lines.length - 1].endLabel = "오늘 시작 ▶";
    return lines;
  }

  function caughtLines(watcher) {
    const momLines = [
      "라먀니, 지금 거기서 뭐 하는 거니?",
      "또 부엌 뒤지고 있었지?",
      "그 손에 든 메모부터 내려놔 볼래?"
    ];
    const sisterLines = [
      "야. 너 또 몰래 돌아다니고 있었지?",
      "잡았다. 이번엔 어디까지 뒤졌어?",
      "진짜 수상하다니까. 뭐 숨기고 있어?"
    ];
    const pool = watcher.role === "mom" ? momLines : sisterLines;
    const line = pool[Math.floor(Math.random() * pool.length)];

    return [
      {
        character: watcher.role,
        chapter: `DAY ${stage.day} · 발각`,
        tone: "caught",
        text: line,
        meta: `누적 발각 ${caught}회 · 오늘 시작점으로 돌아간다.`
      },
      {
        character: "ramyani",
        chapter: "작전 재개",
        tone: "caught",
        text: "으악… 그래도 이미 모은 기록은 안 잃었어. 이번엔 동선을 더 잘 보자.",
        meta: "발각될수록 이후 추적자의 초기 경계도가 조금씩 올라간다.",
        endLabel: "다시 움직이기 ▶"
      }
    ];
  }

  function daySummaryLines() {
    const item = stage.items && stage.items[0];
    const itemPicked = !!(item && pickedItems[item.id]);
    const decoysFound = decoyDefs.filter(d => collected[d.id]).length;
    const todayCaught = caught - stageCaughtStart;

    return [
      {
        character: "ramyani",
        chapter: `DAY ${stage.day} 결산`,
        tone: "summary",
        text: `오늘 핵심 단서 ${stageClueCount()}/${clueDefs.length} 확보. 발각은 ${todayCaught}번.`,
        meta: `쓸모없는 메모 ${decoysFound}개 조사 · 오늘 아이템 ${itemPicked ? "획득" : "놓침"}`
      },
      {
        character: "ramyani",
        chapter: `DAY ${stage.day} 종료`,
        tone: "summary",
        text: itemPicked
          ? "좋아. 단서도 챙겼고 아이템도 확보했어. 남은 건 다음 날로 가져가자."
          : "단서는 챙겼지만 오늘 아이템은 두고 왔네. 이미 지나간 날의 아이템은 다시 생기지 않아.",
        meta: `현재 소지품 · 포장끈 ${inventory.binding}개 / 담배 ${inventory.cigarette}개`,
        endLabel: "다음 날 ▶"
      }
    ];
  }

  function makeWatcher(role, spawn, patrol, config, color, inheritedAlert) {
    return {
      role,
      name: role === "mom" ? "엄마" : "언니",
      x: spawn.x,
      y: spawn.y,
      r: role === "mom" ? 19 : 17,
      angle: spawn.angle || 0,
      velocity: { x: 0, y: 0 },
      patrol: patrol.map(p => ({ ...p })),
      patrolIndex: 0,
      target: null,
      config: { ...config },
      color,
      suspicion: 0,
      boundTimer: 0,
      brain: AI.createBrain(inheritedAlert)
    };
  }

  function rankCampaign() {
    if (caught === 0 && elapsed < 1200) return { rank: "S", label: "게장 대도" };
    if (caught <= 2 && elapsed < 1650) return { rank: "A", label: "시장 골목의 집게발" };
    if (caught <= 5) return { rank: "B", label: "끈질긴 레시피 추적자" };
    return { rank: "C", label: "엄마가 처음부터 다 알고 있었음" };
  }

  function stageClueCount() {
    return clueDefs.reduce((n, c) => n + (collected[c.id] ? 1 : 0), 0);
  }

  function stageCluesComplete() {
    return stageClueCount() >= clueDefs.length;
  }

  function campaignClueCount() {
    return Object.keys(collected).length;
  }


  function loadStage(index, showIntro = true) {
    stageIndex = index;
    stage = campaign.stages[stageIndex];
    const validation = Campaign.validateStage(stage);
    if (!validation.ok) throw new Error(`Invalid stage ${stage.id}: ${validation.reason}`);

    walls = stage.walls.map(x => ({ ...x }));
    furniture = stage.furniture.map(x => ({ ...x }));
    solids = walls.concat(furniture);
    blockers = solids;
    clueDefs = stage.clues.map(x => ({ ...x }));
    decoyDefs = (stage.decoys || []).map(x => ({ ...x }));
    itemDefs = (stage.items || []).map(x => ({ ...x, kind: "item" }));
    hideSpots = stage.hideSpots.map(x => ({ ...x, kind: "hide" }));
    distractions = stage.distractions.map(x => ({ ...x, kind: "distraction", cooldown: 0 }));
    safe = stage.safe ? { ...stage.safe, id: "recipe-safe", kind: "safe" } : null;
    exitDoor = { ...stage.exit, id: "stage-exit", kind: "exit" };

    player.x = stage.spawn.x;
    player.y = stage.spawn.y;
    player.angle = 0;
    player.hidden = false;
    player.hideSpot = null;
    player.moving = false;
    player.sneaking = false;
    player.velocity.x = 0;
    player.velocity.y = 0;

    const momAlert = Math.min(.62, (stage.day - 1) * .055 + caught * .035);
    const mom = makeWatcher("mom", stage.momSpawn, stage.patrolMom, stage.ai, "#5b3f48", momAlert);
    mom.patrolIndex = AI.nearestPatrolIndex(mom, mom.patrol);
    watchers = [mom];

    if (stage.sisterActive) {
      const sisterAlert = Math.min(.68, .18 + (stage.day - 5) * .05 + caught * .025);
      const sister = makeWatcher("sister", stage.sisterSpawn, stage.patrolSister, stage.sisterAI, "#56506f", sisterAlert);
      sister.patrolIndex = AI.nearestPatrolIndex(sister, sister.patrol);
      watchers.push(sister);
    }

    freeze = 0;
    footstepTimer = 0;
    boostTimer = 0;
    coughTimer = 0;
    coughPending = false;
    noiseRings = [];
    ui.journal.classList.add("hidden");
    renderJournal();
    updateMission();
    updateSuspicionUI();

    stageCaughtStart = caught;
    if (showIntro) {
      audio.stage();
      showVN(dayIntroLines(), () => {
        gameState = "playing";
        showToast(`DAY ${stage.day} · 오늘의 아이템 1개가 맵 어딘가에 놓여 있다.`, 2.2);
      });
    } else {
      gameState = "playing";
    }
  }

  function startCampaign() {
    campaign = Campaign.generateCampaign(Date.now());
    collected = Object.create(null);
    pickedItems = Object.create(null);
    inventory = { binding: 0, cigarette: 0 };
    boostTimer = 0;
    coughTimer = 0;
    coughPending = false;
    hasRecipe = false;
    caught = 0;
    elapsed = 0;
    ui.result.classList.add("hidden");
    loadStage(0, false);
    updateInventoryUI();

    showVN(campaignIntroLines(), () => {
      audio.stage();
      showVN(dayIntroLines(), () => {
        gameState = "playing";
        showToast("DAY 1 · 첫 작전을 시작한다.", 2.2);
      });
    });
  }

  function advanceStage() {
    if (stageIndex >= campaign.stages.length - 1) {
      finishRun();
      return;
    }
    loadStage(stageIndex + 1, true);
  }

  function completeDay() {
    if (stageIndex >= campaign.stages.length - 1) {
      finishRun();
      return;
    }

    showVN(daySummaryLines(), () => {
      loadStage(stageIndex + 1, true);
    }, { tone: "summary" });
  }

  function showToast(text, seconds = 2.4) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    toastTimer = seconds;
  }

  function watcherHears(watcher, pos, baseRadius) {
    const blocked = !C.hasLineOfSight(watcher, pos, blockers);
    const heardRadius = AI.hearingRadius(baseRadius, watcher.config.hearing, watcher.brain.alertness, blocked);
    const d = C.dist(watcher, pos);
    if (d > heardRadius) return false;
    const strength = C.clamp(1 - d / Math.max(1, heardRadius), .12, 1.35);
    AI.rememberHeard(watcher.brain, pos, strength);
    watcher.target = { x: pos.x, y: pos.y };
    return true;
  }

  function emitNoise(pos, baseRadius, strong = false) {
    noiseRings.push({ x: pos.x, y: pos.y, radius: 8, max: baseRadius, life: .8 });
    for (const watcher of watchers) {
      watcherHears(watcher, pos, baseRadius * (strong ? 1.18 : 1));
    }
  }

  function renderJournal() {
    const groups = [];
    for (const s of campaign.stages) {
      const entries = (s.entries || [...s.clues, ...(s.decoys || [])]).filter(c => collected[c.id]);
      if (entries.length) groups.push({ stage: s, entries });
    }

    if (!groups.length) {
      ui.journalBody.innerHTML = '<div class="clue"><strong>아직 기록이 없다.</strong><span>중요한 단서 외에 황당한 가짜 레시피와 생활 메모도 돌아다닌다.</span></div>';
      return;
    }

    ui.journalBody.innerHTML = groups.map(group => {
      const rows = group.entries.map(entry =>
        `<div class="clue"><strong>${entry.title}</strong><span>${entry.text}</span></div>`
      ).join("");
      return `<div class="clue-stage">DAY ${group.stage.day} · ${group.stage.name}</div>${rows}`;
    }).join("");
  }

  function getInteractables() {
    const list = [];
    for (const c of clueDefs) {
      if (!collected[c.id]) list.push({ ...c, kind: "clue", label: `${c.title} 살펴보기` });
    }
    for (const d of decoyDefs) {
      if (!collected[d.id]) list.push({ ...d, kind: "decoy", label: `${d.title} 살펴보기` });
    }
    for (const item of itemDefs) {
      if (!pickedItems[item.id]) list.push({ ...item, kind: "item", label: `${item.title} 줍기` });
    }
    list.push(...hideSpots);
    for (const d of distractions) {
      if (d.cooldown <= 0) list.push(d);
    }
    if (safe && !hasRecipe) list.push(safe);
    list.push(exitDoor);
    return list;
  }

  function interactionPrompt(obj) {
    if (!obj) return "";
    if (obj.kind === "safe" && !stageCluesComplete()) {
      return "E · 원본 위치는 찾았지만 결정적인 근거가 아직 부족하다";
    }
    if (obj.kind === "exit") {
      if (!stageCluesComplete()) return "E · 아직 오늘의 결정적인 근거가 부족하다";
      if (stageIndex === campaign.stages.length - 1 && !hasRecipe) return "E · 원본 레시피부터 챙겨야 한다";
    }
    return `E · ${obj.label}`;
  }

  function interact() {
    if (gameState !== "playing" || freeze > 0) return;
    audio.click();

    if (player.hidden) {
      player.hidden = false;
      player.hideSpot = null;
      showToast("숨는 곳에서 나왔다.", 1.1);
      return;
    }

    const obj = C.nearestInteractable(player, getInteractables(), 72);
    if (!obj) return;

    if (obj.kind === "clue") {
      collected[obj.id] = true;
      renderJournal();
      audio.pickup();
      showToast(`핵심 기록 확보 · ${obj.title}: ${obj.text}`, 3.2);
      return;
    }

    if (obj.kind === "decoy") {
      collected[obj.id] = true;
      renderJournal();
      audio.pickup();
      showToast(`쓸모없는 기록 · ${obj.title}: ${obj.text}`, 3.0);
      return;
    }

    if (obj.kind === "item") {
      pickedItems[obj.id] = true;
      inventory[obj.type] = (inventory[obj.type] || 0) + 1;
      audio.pickup();
      const detail = obj.type === "binding"
        ? "1번 키로 가까운 엄마/언니 한 명을 잠시 묶어둘 수 있다."
        : "2번 키로 사용하면 잠시 빨라진다. 피울 때 기침 소리가 난다.";
      showToast(`${obj.title} 획득 · ${detail}`, 2.8);
      updateInventoryUI();
      return;
    }

    if (obj.kind === "hide") {
      player.hidden = true;
      player.hideSpot = obj.id;
      player.x = obj.x;
      player.y = obj.y;
      player.velocity.x = 0;
      player.velocity.y = 0;
      showToast("숨었다. 마지막으로 본 위치를 수색해도 여기서는 바로 보이지 않는다.", 1.8);
      return;
    }

    if (obj.kind === "distraction") {
      obj.cooldown = 12;
      emitNoise(obj, obj.radius || 450, true);
      showToast("소리를 냈다. 엄마와 언니는 각각 들은 위치를 확인한다.", 1.8);
      return;
    }

    if (obj.kind === "safe") {
      if (!stageCluesComplete()) {
        showToast("오늘 모은 기록만으로는 아직 원본 위치를 확정할 수 없다.", 2);
      } else {
        hasRecipe = true;
        audio.success();
        showToast("원본 레시피를 손에 넣었다. 이제 현관까지 들키지 않고 빠져나가자.", 3);
      }
      return;
    }

    if (obj.kind === "exit") {
      if (!stageCluesComplete()) {
        showToast("오늘 확인해야 할 단서가 아직 남았다.", 1.6);
        return;
      }
      if (stageIndex === campaign.stages.length - 1) {
        if (!hasRecipe) {
          showToast("원본 레시피를 챙겨야 작전이 끝난다.", 1.6);
          return;
        }
        finishRun();
      } else {
        completeDay();
      }
    }
  }

  function finishRun() {
    const rank = rankCampaign();
    ui.resultRank.textContent = `${rank.rank} · ${rank.label}`;
    ui.resultTime.textContent = C.formatTime(elapsed);
    ui.resultCaught.textContent = `${caught}회`;
    ui.resultTitle.textContent = "10일 작전 성공";
    ui.resultText.textContent = caught === 0
      ? "발각 없이 10일간의 추적을 끝내고 원본 레시피까지 확보했다."
      : "몇 번 들키긴 했지만 끝내 원본 레시피를 확보했다.";
    audio.success();

    const ending = [
      {
        character: "ramyani",
        chapter: "DAY 10 · 최종 결산",
        tone: "ending",
        text: `드디어 원본까지 챙겼다…! 10일 동안 모은 기록은 ${campaignClueCount()}개, 발각은 ${caught}번.`,
        meta: `최종 등급 ${rank.rank} · ${rank.label}`
      },
      {
        character: "mom",
        chapter: "엔딩",
        tone: "ending",
        text: caught === 0
          ? "여기까지 몰래 따라올 줄은 몰랐네. 다음엔 그냥 물어봐도 되는데."
          : "그렇게 몇 번이나 걸리고도 끝까지 찾아냈니? 훔쳐봤으면 설거지는 네가 해.",
        meta: "엄마는 화난 것 같으면서도 조금 웃고 있다."
      },
      {
        character: stage.sisterActive ? "sister" : "ramyani",
        chapter: "엔딩",
        tone: "ending",
        text: stage.sisterActive
          ? "진짜 결국 가져갔네. 난 모르는 일로 할 테니까 내 푸딩은 건드리지 마."
          : "작전 완료. 이제 직접 만들어 보는 일만 남았어.",
        meta: stage.sisterActive ? "언니는 귀찮다는 표정으로 방으로 돌아간다." : "",
        endLabel: "결과 보기 ▶"
      }
    ];

    showVN(ending, () => {
      gameState = "result";
      ui.result.classList.remove("hidden");
    }, { tone: "ending" });
  }

  function caughtBy(watcher) {
    caught += 1;
    freeze = 1.2;
    player.hidden = false;
    player.hideSpot = null;
    player.x = stage.spawn.x;
    player.y = stage.spawn.y;
    player.velocity.x = 0;
    player.velocity.y = 0;

    for (const w of watchers) {
      const spawn = w.role === "mom" ? stage.momSpawn : stage.sisterSpawn;
      w.x = spawn.x;
      w.y = spawn.y;
      w.angle = spawn.angle || 0;
      w.patrolIndex = AI.nearestPatrolIndex(w, w.patrol);
      w.target = null;
      w.suspicion = 0;
      w.boundTimer = 0;
      const extra = Math.min(.72, .16 + stage.day * .045 + caught * .035);
      w.brain = AI.createBrain(extra);
    }

    audio.alert();
    showVN(caughtLines(watcher), () => {
      freeze = 0;
      gameState = "playing";
      showToast("작전 재개 · 이미 확보한 기록은 유지된다.", 1.8);
    }, { tone: "caught" });
  }

  function updatePlayer(dt) {
    if (player.hidden) {
      player.moving = false;
      player.velocity.x = 0;
      player.velocity.y = 0;
      return;
    }

    let dx = 0;
    let dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;

    const len = Math.hypot(dx, dy);
    player.moving = len > 0;
    player.sneaking = !!(keys.ShiftLeft || keys.ShiftRight);

    if (!player.moving) {
      player.velocity.x = 0;
      player.velocity.y = 0;
      footstepTimer = Math.min(footstepTimer, .08);
      return;
    }

    dx /= len;
    dy /= len;
    const baseSpeed = player.sneaking ? 92 : 178;
    const speed = baseSpeed * (boostTimer > 0 ? 1.45 : 1);
    player.angle = Math.atan2(dy, dx);

    const before = { x: player.x, y: player.y };
    const next = C.moveCircle(player, dx * speed * dt, dy * speed * dt, player.r, solids, bounds);
    player.x = next.x;
    player.y = next.y;
    player.velocity.x = (player.x - before.x) / Math.max(dt, .001);
    player.velocity.y = (player.y - before.y) / Math.max(dt, .001);

    footstepTimer -= dt;
    if (footstepTimer <= 0) {
      emitNoise(player, player.sneaking ? 34 : 145, false);
      footstepTimer = player.sneaking ? .74 : .45;
    }
  }

  function moveWatcherToward(watcher, target, speed, dt) {
    if (!target) return true;
    const dx = target.x - watcher.x;
    const dy = target.y - watcher.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) {
      watcher.velocity.x = 0;
      watcher.velocity.y = 0;
      return true;
    }

    watcher.angle = Math.atan2(dy, dx);
    const beforeX = watcher.x;
    const beforeY = watcher.y;
    let next = C.moveCircle(watcher, dx / d * speed * dt, dy / d * speed * dt, watcher.r, solids, bounds);

    if (Math.hypot(next.x - watcher.x, next.y - watcher.y) < .15) {
      const sideA = C.moveCircle(watcher, -dy / d * speed * dt, dx / d * speed * dt, watcher.r, solids, bounds);
      const sideB = C.moveCircle(watcher, dy / d * speed * dt, -dx / d * speed * dt, watcher.r, solids, bounds);
      const da = Math.hypot(target.x - sideA.x, target.y - sideA.y);
      const db = Math.hypot(target.x - sideB.x, target.y - sideB.y);
      next = da <= db ? sideA : sideB;
    }

    watcher.x = next.x;
    watcher.y = next.y;
    watcher.velocity.x = (watcher.x - beforeX) / Math.max(dt, .001);
    watcher.velocity.y = (watcher.y - beforeY) / Math.max(dt, .001);
    return false;
  }

  function watcherCanSeePlayer(watcher) {
    if (player.hidden) return false;
    const range = AI.effectiveVisionRange(watcher.config.visionRange, player, watcher.brain.alertness);
    const fov = AI.effectiveFov(watcher.config.fov, watcher.brain.alertness, watcher.brain.state);
    return C.inVisionCone(watcher, player, range, fov, blockers);
  }

  function updateWatcher(watcher, dt) {
    const brain = watcher.brain;

    if (watcher.boundTimer > 0) {
      watcher.boundTimer = Math.max(0, watcher.boundTimer - dt);
      watcher.velocity.x = 0;
      watcher.velocity.y = 0;
      watcher.suspicion = Math.max(0, watcher.suspicion - dt * .18);
      if (watcher.boundTimer === 0) {
        brain.alertness = C.clamp(brain.alertness + .22, 0, 1);
        AI.beginSearch(brain, { x: watcher.x, y: watcher.y }, bounds, watcher.role === "sister" ? 150 : 130);
        watcher.target = brain.searchPoints[0] || { x: watcher.x, y: watcher.y };
      }
      return false;
    }

    const sees = watcherCanSeePlayer(watcher);

    if (sees) {
      AI.rememberSeen(brain, player);
      watcher.target = AI.predictTarget(player, player.velocity, bounds, watcher.role === "sister" ? .48 : .36);
      const range = AI.effectiveVisionRange(watcher.config.visionRange, player, brain.alertness);
      watcher.suspicion += dt * AI.detectionGain(C.dist(watcher, player), range, player, brain.alertness, brain.state);
    } else {
      watcher.suspicion -= dt * AI.suspicionDecay(brain.alertness, brain.state);
    }
    watcher.suspicion = C.clamp(watcher.suspicion, 0, 1);

    if (!player.hidden && C.dist(watcher, player) < watcher.r + player.r + 2) {
      caughtBy(watcher);
      return true;
    }
    if (watcher.suspicion >= 1) {
      caughtBy(watcher);
      return true;
    }

    if (brain.state === AI.STATES.CHASE) {
      if (sees) {
        watcher.target = AI.predictTarget(player, player.velocity, bounds, watcher.role === "sister" ? .48 : .36);
        brain.stateTimer = 1.4 + brain.alertness;
      } else {
        brain.stateTimer -= dt;
        if (brain.stateTimer <= 0) {
          AI.beginSearch(brain, brain.lastSeen, bounds, watcher.role === "sister" ? 135 : 115);
          watcher.target = brain.searchPoints[0] || brain.lastSeen;
        }
      }
      moveWatcherToward(watcher, watcher.target, watcher.config.chaseSpeed, dt);
      AI.coolBrain(brain, dt);
      return false;
    }

    if (brain.state === AI.STATES.INVESTIGATE) {
      const arrived = moveWatcherToward(watcher, watcher.target || brain.lastHeard, watcher.config.investigateSpeed, dt);
      brain.stateTimer -= dt;
      if (arrived || brain.stateTimer <= 0) {
        AI.beginSearch(brain, brain.lastHeard, bounds, watcher.role === "sister" ? 125 : 105);
        watcher.target = brain.searchPoints[0] || brain.lastHeard;
      }
      AI.coolBrain(brain, dt);
      return false;
    }

    if (brain.state === AI.STATES.SEARCH) {
      brain.stateTimer -= dt;
      const target = brain.searchPoints[brain.searchIndex];
      if (!target || brain.stateTimer <= 0) {
        brain.state = AI.STATES.RETURN;
        watcher.patrolIndex = AI.nearestPatrolIndex(watcher, watcher.patrol);
        watcher.target = watcher.patrol[watcher.patrolIndex];
      } else {
        const arrived = moveWatcherToward(watcher, target, watcher.config.investigateSpeed * .92, dt);
        if (arrived) {
          brain.searchIndex += 1;
          watcher.target = brain.searchPoints[brain.searchIndex] || null;
          watcher.angle += (watcher.role === "sister" ? -1 : 1) * .8;
        }
      }
      AI.coolBrain(brain, dt);
      return false;
    }

    if (brain.state === AI.STATES.RETURN) {
      const target = watcher.patrol[watcher.patrolIndex];
      if (moveWatcherToward(watcher, target, watcher.config.patrolSpeed, dt)) {
        brain.state = AI.STATES.PATROL;
        brain.patrolPause = target.pause || .35;
      }
      AI.coolBrain(brain, dt);
      return false;
    }

    const target = watcher.patrol[watcher.patrolIndex];
    if (brain.patrolPause > 0) {
      brain.patrolPause -= dt;
      watcher.angle += (target.look || .45) * dt;
    } else if (moveWatcherToward(watcher, target, watcher.config.patrolSpeed, dt)) {
      brain.patrolPause = target.pause || .35;
      watcher.patrolIndex = (watcher.patrolIndex + 1) % watcher.patrol.length;
    }
    AI.coolBrain(brain, dt);
    return false;
  }

  function nearestBindableWatcher() {
    let target = null;
    let best = 76;
    for (const watcher of watchers) {
      if (watcher.boundTimer > 0) continue;
      const d = C.dist(player, watcher);
      if (d <= best) {
        best = d;
        target = watcher;
      }
    }
    return target;
  }

  function useBindingItem() {
    if (gameState !== "playing" || freeze > 0) return;
    if (inventory.binding <= 0) {
      showToast("포장끈이 없다.", 1.1);
      return;
    }
    const watcher = nearestBindableWatcher();
    if (!watcher) {
      showToast("묶으려면 엄마나 언니에게 조금 더 가까이 가야 한다.", 1.5);
      return;
    }

    inventory.binding -= 1;
    watcher.boundTimer = 8;
    watcher.suspicion = 0;
    watcher.velocity.x = 0;
    watcher.velocity.y = 0;
    watcher.brain.alertness = C.clamp(watcher.brain.alertness + .08, 0, 1);
    audio.click();
    showToast(`${watcher.name}를 포장끈으로 묶어뒀다. 약 8초 동안 움직이지 못한다.`, 2.2);
    updateInventoryUI();
  }

  function useCigarette() {
    if (gameState !== "playing" || freeze > 0) return;
    if (inventory.cigarette <= 0) {
      showToast("담배가 없다.", 1.1);
      return;
    }
    if (boostTimer > 0) {
      showToast("이미 속도 부스트가 적용 중이다.", 1.1);
      return;
    }

    inventory.cigarette -= 1;
    boostTimer = 7;
    coughTimer = 3.2;
    coughPending = true;
    emitNoise(player, 125, true);
    audio.click();
    showToast("담배 사용 · 7초 동안 이동 속도 +45%. 기침 소리에 주의.", 2.4);
    updateInventoryUI();
  }

  function updateInventoryUI() {
    if (ui.inventoryBinding) ui.inventoryBinding.textContent = `포장끈 × ${inventory.binding}`;
    if (ui.inventoryCigarette) ui.inventoryCigarette.textContent = `담배 × ${inventory.cigarette}`;
    if (ui.boostStatus) {
      ui.boostStatus.textContent = boostTimer > 0 ? `속도 +45% · ${boostTimer.toFixed(1)}s` : "";
      ui.boostStatus.classList.toggle("hidden", boostTimer <= 0);
    }
  }

  function updateItemEffects(dt) {
    if (boostTimer > 0) boostTimer = Math.max(0, boostTimer - dt);
    if (coughPending) {
      coughTimer -= dt;
      if (coughTimer <= 0) {
        coughPending = false;
        emitNoise(player, 105, false);
        showToast("콜록! 담배 때문에 소리가 났다.", 1.2);
      }
    }
    updateInventoryUI();
  }

  function updateNoise(dt) {
    noiseRings = noiseRings.filter(r => {
      r.life -= dt;
      r.radius += (r.max - r.radius) * Math.min(1, dt * 5);
      return r.life > 0;
    });
    for (const d of distractions) d.cooldown = Math.max(0, d.cooldown - dt);
  }

  function updateMission() {
    ui.missionLabel.textContent = `DAY ${stage.day} / ${stage.totalDays} · ${stage.name}`;
    if (!stageCluesComplete()) {
      ui.mission.textContent = `${stage.objective} · 핵심 단서 ${stageClueCount()}/${clueDefs.length}`;
      ui.submission.textContent = stage.sisterActive
        ? "엄마와 언니를 피하며 핵심 기록을 찾자. 황당한 가짜 레시피와 생활 메모는 진행에 필요 없다."
        : "핵심 기록만 진행에 필요하다. 민트초코나 담뱃재 같은 괴식 메모는 그냥 방해물이다.";
    } else if (safe && !hasRecipe) {
      ui.mission.textContent = "원본 레시피 위치로 이동";
      ui.submission.textContent = "오늘 단서를 모두 찾았다. 부엌 안쪽 원본을 챙기자.";
    } else {
      ui.mission.textContent = stageIndex === campaign.stages.length - 1 ? "현관으로 최종 탈출" : "오늘의 단서 확보 — 출구로";
      ui.submission.textContent = `누적 기록 ${campaignClueCount()}개 · 발각 ${caught}회`;
    }
  }

  function updatePrompt() {
    if (gameState !== "playing") {
      ui.prompt.classList.remove("show");
      return;
    }
    let text = "";
    if (player.hidden) text = "E · 숨는 곳에서 나오기";
    else text = interactionPrompt(C.nearestInteractable(player, getInteractables(), 72));
    if (text) {
      ui.prompt.textContent = text;
      ui.prompt.classList.add("show");
    } else {
      ui.prompt.classList.remove("show");
    }
  }

  function updateSuspicionUI() {
    const mom = watchers.find(w => w.role === "mom");
    const sister = watchers.find(w => w.role === "sister");
    ui.momFill.style.width = `${Math.round((mom ? mom.suspicion : 0) * 100)}%`;
    ui.momState.textContent = mom
      ? (mom.boundTimer > 0 ? `묶임 ${mom.boundTimer.toFixed(1)}s` : AI.stateLabel(mom.brain.state))
      : "엄마";
    ui.sisterCard.classList.toggle("hidden", !sister);
    if (sister) {
      ui.sisterFill.style.width = `${Math.round(sister.suspicion * 100)}%`;
      ui.sisterState.textContent = sister.boundTimer > 0
        ? `묶임 ${sister.boundTimer.toFixed(1)}s`
        : AI.stateLabel(sister.brain.state).replace("엄마", "언니");
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
      updateSuspicionUI();
      return;
    }

    updateItemEffects(dt);
    updatePlayer(dt);
    for (const watcher of watchers) {
      if (updateWatcher(watcher, dt)) break;
    }
    updateNoise(dt);
    updateMission();
    updatePrompt();
    updateSuspicionUI();
  }

  function roundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawFloor() {
    ctx.fillStyle = stage.palette.bg;
    ctx.fillRect(0, 0, W, H);
    for (const zone of stage.zones) {
      roundedRect(zone.x, zone.y, zone.w, zone.h, 20, zone.tone);
      ctx.save();
      ctx.globalAlpha = .23;
      ctx.fillStyle = "#fff2dd";
      ctx.font = "700 24px Segoe UI, Malgun Gothic, sans-serif";
      ctx.fillText(zone.label, zone.x + 28, zone.y + 44);
      ctx.restore();
    }
    ctx.strokeStyle = stage.palette.grid;
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 42) {
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); ctx.stroke();
    }
  }

  function drawWallsAndFurniture() {
    for (const w of walls) roundedRect(w.x, w.y, w.w, w.h, 5, stage.palette.wall);
    for (const f of furniture) {
      let fill = f.color || "#554549";
      if (!f.color && f.kind === "bed") fill = "#715c69";
      if (!f.color && f.kind === "sofa") fill = "#5a4d62";
      if (!f.color && (f.kind === "table" || f.kind === "island")) fill = "#6e5749";
      if (!f.color && (f.kind === "counter" || f.kind === "pantry" || f.kind === "drawer")) fill = "#63483e";
      if (!f.color && f.kind === "fridge") fill = "#6a6a70";
      if (!f.color && f.kind === "tv") fill = "#25232b";
      roundedRect(f.x, f.y, f.w, f.h, 10, fill, "rgba(255,255,255,.08)");
      ctx.fillStyle = "rgba(255,245,234,.48)";
      ctx.font = "11px Segoe UI, Malgun Gothic, sans-serif";
      ctx.fillText(f.label, f.x + 8, f.y + 18);
    }
  }

  function drawInteractables() {
    const pulse = .5 + .5 * Math.sin(performance.now() / 280);
    for (const c of [...clueDefs, ...decoyDefs]) {
      if (collected[c.id]) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `rgba(246,183,96,${.55 + pulse * .4})`;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }

    for (const item of itemDefs) {
      if (pickedItems[item.id]) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      if (item.type === "binding") {
        ctx.strokeStyle = "#9bd5da";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-4, 0, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(6, 0, 6, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = "#f5eee6";
        ctx.fillRect(-8, -3, 13, 6);
        ctx.fillStyle = "#d37d63";
        ctx.fillRect(5, -3, 4, 6);
      }
      ctx.restore();
    }

    for (const h of hideSpots) {
      ctx.strokeStyle = "rgba(151,184,205,.34)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 24, 0, Math.PI * 2); ctx.stroke();
    }

    for (const d of distractions) {
      ctx.fillStyle = d.cooldown > 0 ? "rgba(255,255,255,.13)" : "rgba(130,200,214,.62)";
      ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    if (safe && !hasRecipe) {
      ctx.fillStyle = stageCluesComplete() ? "#f0a96f" : "#6e5960";
      roundedRect(safe.x - 20, safe.y - 16, 40, 32, 6, ctx.fillStyle, "rgba(255,255,255,.15)");
      ctx.fillStyle = "#2a2020";
      ctx.font = "700 12px sans-serif";
      ctx.fillText("秘", safe.x - 7, safe.y + 5);
    }

    ctx.strokeStyle = stageCluesComplete() && (!safe || hasRecipe) ? "#9fd68a" : "rgba(255,255,255,.17)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(exitDoor.x - 38, exitDoor.y);
    ctx.lineTo(exitDoor.x + 38, exitDoor.y);
    ctx.stroke();
  }

  function drawNoise() {
    for (const r of noiseRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / .8) * .28;
      ctx.strokeStyle = "#b7dce2";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawWatcherVision(watcher) {
    const range = AI.effectiveVisionRange(watcher.config.visionRange, player, watcher.brain.alertness);
    const fov = AI.effectiveFov(watcher.config.fov, watcher.brain.alertness, watcher.brain.state);
    ctx.save();
    ctx.translate(watcher.x, watcher.y);
    ctx.rotate(watcher.angle);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, range);
    const hot = watcher.suspicion > .42 || watcher.brain.state === AI.STATES.CHASE;
    g.addColorStop(0, hot ? "rgba(244,112,91,.23)" : watcher.role === "sister" ? "rgba(173,151,230,.15)" : "rgba(247,205,112,.16)");
    g.addColorStop(1, "rgba(247,205,112,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, -fov / 2, fov / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWatcher(watcher) {
    ctx.save();
    ctx.translate(watcher.x, watcher.y);
    ctx.rotate(watcher.angle + Math.PI / 2);
    ctx.fillStyle = watcher.color;
    ctx.beginPath();
    ctx.ellipse(0, 8, 15, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = watcher.role === "mom" ? "#5b3f48" : "#6a6086";
    ctx.beginPath();
    ctx.arc(0, -8, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8bbae";
    ctx.beginPath();
    ctx.arc(0, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    if (watcher.role === "sister") {
      ctx.strokeStyle = "#d7c7ee";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.stroke();
    }
    if (watcher.boundTimer > 0) {
      ctx.strokeStyle = "#d9c07a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 7, 19, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-15, 1); ctx.lineTo(15, 13);
      ctx.moveTo(15, 1); ctx.lineTo(-15, 13);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = watcher.role === "mom" ? "rgba(255,245,234,.72)" : "rgba(222,211,246,.82)";
    ctx.font = "700 11px Segoe UI, Malgun Gothic, sans-serif";
    const label = watcher.boundTimer > 0
      ? `${watcher.name} · 묶임`
      : watcher.role === "mom"
        ? AI.stateLabel(watcher.brain.state)
        : AI.stateLabel(watcher.brain.state).replace("엄마", "언니");
    ctx.fillText(label, watcher.x - 28, watcher.y - 30);
  }

  function drawRamyani() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = player.hidden ? .28 : 1;
    ctx.rotate(player.angle + Math.PI / 2);

    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(0, 19, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#4a3530";
    roundedRect(-10, 13, 7, 13, 3, ctx.fillStyle);
    roundedRect(3, 13, 7, 13, 3, ctx.fillStyle);

    ctx.fillStyle = "#342d32";
    ctx.beginPath();
    ctx.moveTo(-13, 5); ctx.lineTo(13, 5); ctx.lineTo(10, 18); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#f1e8df";
    ctx.beginPath(); ctx.ellipse(0, 5, 14.5, 17, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#fffaf5";
    roundedRect(-7, -1, 14, 13, 5, ctx.fillStyle);

    ctx.fillStyle = "#ef9c68";
    ctx.beginPath(); ctx.arc(0, -8, 16.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe2d2";
    ctx.beginPath(); ctx.arc(0, -7, 10.7, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f4ad77";
    ctx.beginPath();
    ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-5, -22, 2, -18);
    ctx.quadraticCurveTo(9, -20, 11, -12); ctx.quadraticCurveTo(4, -14, 1, -7);
    ctx.quadraticCurveTo(-3, -12, -10, -9); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#7b431f";
    ctx.beginPath(); ctx.ellipse(-3.5, -6.5, 1.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5, -6.5, 1.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#fff8f2";
    ctx.beginPath(); ctx.arc(9.8, -16.2, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ef8da3";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(9.8, -16.2, 2.7, -.6, Math.PI * 1.45); ctx.stroke();

    ctx.strokeStyle = "#e0a42d";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(11.8, -12.8); ctx.lineTo(16, -8.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15.9, -13); ctx.lineTo(12, -8.6); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(255,245,234,.92)";
    ctx.font = "800 11px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText("라먀니", player.x - 20, player.y - 33);
  }

  function draw() {
    drawFloor();
    drawWallsAndFurniture();
    drawNoise();
    for (const watcher of watchers) drawWatcherVision(watcher);
    drawInteractables();
    for (const watcher of watchers) drawWatcher(watcher);
    drawRamyani();

    if (freeze > 0) {
      ctx.fillStyle = `rgba(239,102,111,${Math.min(.22, freeze * .12)})`;
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

  window.addEventListener("keydown", e => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab","Space"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (gameState === "vn" && ["Space", "Enter", "KeyE"].includes(e.code)) {
      nextVN();
      return;
    }
    if (e.code === "KeyE") interact();
    if (e.code === "Digit1") useBindingItem();
    if (e.code === "Digit2") useCigarette();
    if (e.code === "Tab" && gameState === "playing") ui.journal.classList.toggle("hidden");
  });

  window.addEventListener("keyup", e => { keys[e.code] = false; });
  window.addEventListener("blur", () => Object.keys(keys).forEach(k => delete keys[k]));

  ui.vnNext.addEventListener("click", () => {
    nextVN();
  });

  ui.restart.addEventListener("click", () => {
    audio.ensure();
    ui.result.classList.add("hidden");
    startCampaign();
  });

  startCampaign();
  renderJournal();
  updateMission();
  updateInventoryUI();
  requestAnimationFrame(frame);

})();
