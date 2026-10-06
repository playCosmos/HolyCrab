(() => {
  "use strict";

  const C = window.HolyCrabCore;
  const Campaign = window.HolyCrabStages;
  const AI = window.HolyCrabMomAI;
  const Story = window.HolyCrabStory;
  const Session = window.HolyCrabSession;
  if (!C || !Campaign || !AI || !Story || !Session) throw new Error("HolyCrab modules failed to load.");

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = 1440;
  const H = 810;
  const ITEM_CAPACITY = Object.freeze({ binding: 2, cigarette: 2 });
  const bounds = { x: 14, y: 14, w: W - 28, h: H - 28 };
  canvas.width = W;
  canvas.height = H;

  const ui = {
    startScreen: document.getElementById("start-screen"),
    startButton: document.getElementById("start-btn"),
    continueButton: document.getElementById("continue-btn"),
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
    momCard: document.getElementById("mom-suspicion-card"),
    momFill: document.getElementById("mom-suspicion-fill"),
    momState: document.getElementById("mom-state"),
    sisterCard: document.getElementById("sister-suspicion-card"),
    sisterFill: document.getElementById("sister-suspicion-fill"),
    sisterState: document.getElementById("sister-state"),
    inventoryBinding: document.getElementById("inventory-binding"),
    inventoryCigarette: document.getElementById("inventory-cigarette"),
    boostStatus: document.getElementById("boost-status"),
    dangerVignette: document.getElementById("danger-vignette"),
    eventBanner: document.getElementById("event-banner"),
    eventBannerKicker: document.getElementById("event-banner-kicker"),
    eventBannerText: document.getElementById("event-banner-text"),
    prompt: document.getElementById("prompt"),
    toast: document.getElementById("toast"),
    journal: document.getElementById("journal"),
    journalBody: document.getElementById("journal-body"),
    pause: document.getElementById("pause"),
    pauseReason: document.getElementById("pause-reason"),
    resume: document.getElementById("resume-btn"),
    pauseTitle: document.getElementById("pause-title-btn"),
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
    actionLock: 0,
    velocity: { x: 0, y: 0 }
  };

  let campaignSeedInput = Date.now();
  let campaign = Campaign.generateCampaign(campaignSeedInput);
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

  let gameState = "start";
  let pausedFromState = null;
  let runCompleted = false;
  let collected = Object.create(null);
  let pickedItems = Object.create(null);
  let usedDistractions = Object.create(null);
  let inventory = { binding: 0, cigarette: 0 };
  let boostTimer = 0;
  let coughTimer = 0;
  let coughPending = false;
  let hasRecipe = false;
  let caught = 0;
  let elapsed = 0;
  let freeze = 0;
  let toastTimer = 0;
  let eventBannerTimer = 0;
  let eventBannerPriority = 0;
  let previousChaseRoles = new Set();
  let warningLatched = false;
  let footstepTimer = 0;
  let hudUpdateTimer = 0;
  let autosaveTimer = 8;
  let noiseRings = [];
  let staticStageCanvas = null;
  let renderDirty = true;
  let stageCaughtStart = 0;
  let vnLines = [];
  let vnIndex = 0;
  let vnDone = null;
  let vnTone = "story";
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
    clue() { this.tone(620,.08,.022); this.tone(930,.16,.026,"triangle",.06); }
    item() { this.tone(440,.07,.02,"triangle"); this.tone(660,.11,.025,"triangle",.06); }
    alert() { this.tone(180,.12,.045,"square"); this.tone(145,.16,.035,"square",.12); }
    warning() { this.tone(285,.07,.025,"square"); this.tone(330,.09,.022,"square",.07); }
    chase() { this.tone(210,.09,.035,"sawtooth"); this.tone(255,.11,.032,"sawtooth",.08); }
    evade() { this.tone(330,.08,.018,"triangle"); this.tone(440,.12,.018,"triangle",.07); }
    finale() {
      this.tone(155,.16,.045,"square");
      this.tone(196,.18,.04,"square",.13);
      this.tone(247,.24,.034,"sawtooth",.26);
    }
    success() { this.tone(523,.12,.03); this.tone(659,.12,.03,"sine",.1); this.tone(784,.2,.03,"sine",.2); }
    stage() { this.tone(392,.10,.022); this.tone(523,.12,.026,"triangle",.08); }
    click() { this.tone(360,.05,.018,"triangle"); }
  }
  const audio = new AudioEngine();

  function makeSessionSnapshot() {
    return Session.makeSnapshot({
      seedInput: campaignSeedInput,
      stageIndex,
      collected,
      pickedItems,
      usedDistractions,
      inventory,
      hasRecipe,
      caught,
      elapsed,
      stageCaughtStart
    });
  }

  function readSavedSession() {
    try {
      return Session.decode(window.localStorage.getItem(Session.STORAGE_KEY), 10);
    } catch (_) {
      return null;
    }
  }

  function refreshContinueButton() {
    const saved = readSavedSession();
    ui.continueButton.classList.toggle("hidden", !saved);
    if (!saved) {
      try { window.localStorage.removeItem(Session.STORAGE_KEY); } catch (_) {}
    }
    return saved;
  }

  function saveSession() {
    if (runCompleted || gameState === "start" || gameState === "result") return false;
    const encoded = Session.encode(makeSessionSnapshot());
    if (!encoded) return false;
    try {
      window.localStorage.setItem(Session.STORAGE_KEY, encoded);
      ui.continueButton.classList.remove("hidden");
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearSavedSession() {
    try { window.localStorage.removeItem(Session.STORAGE_KEY); } catch (_) {}
    ui.continueButton.classList.add("hidden");
  }

  function pauseGame(reason = "게임이 일시정지되었습니다.") {
    if (gameState !== "playing") return false;
    pausedFromState = gameState;
    gameState = "paused";
    for (const key of Object.keys(keys)) delete keys[key];
    ui.pauseReason.textContent = reason;
    ui.pause.classList.remove("hidden");
    ui.journal.classList.add("hidden");
    saveSession();
    return true;
  }

  function resumeGame() {
    if (gameState !== "paused") return false;
    gameState = pausedFromState || "playing";
    pausedFromState = null;
    lastFrame = performance.now();
    ui.pause.classList.add("hidden");
    return true;
  }

  function returnToTitle() {
    if (gameState === "paused") saveSession();
    pausedFromState = null;
    gameState = "start";
    ui.pause.classList.add("hidden");
    ui.vnScene.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.startScreen.classList.remove("hidden");
    refreshContinueButton();
  }

  function resumeSavedCampaign() {
    const saved = readSavedSession();
    if (!saved) {
      refreshContinueButton();
      return false;
    }

    runCompleted = false;
    campaignSeedInput = saved.seedInput;
    campaign = Campaign.generateCampaign(campaignSeedInput);
    if (saved.stageIndex >= campaign.stages.length) {
      clearSavedSession();
      return false;
    }

    collected = Object.assign(Object.create(null), saved.collected);
    pickedItems = Object.assign(Object.create(null), saved.pickedItems);
    usedDistractions = Object.assign(Object.create(null), saved.usedDistractions || {});
    inventory = {
      binding: Math.min(ITEM_CAPACITY.binding, saved.inventory.binding || 0),
      cigarette: Math.min(ITEM_CAPACITY.cigarette, saved.inventory.cigarette || 0)
    };
    hasRecipe = saved.hasRecipe;
    caught = saved.caught;
    elapsed = saved.elapsed;
    ui.startScreen.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.vnScene.classList.add("hidden");
    ui.result.classList.add("hidden");

    loadStage(saved.stageIndex, false);
    if (saved.hasRecipe && stage.safe && stage.finalEscapeNoise) {
      player.x = stage.safe.x;
      player.y = stage.safe.y;
      player.actionLock = .55;
      emitNoise(stage.safe, stage.finalEscapeNoise, true, true);
      for (const watcher of watchers) {
        watcher.brain.alertness = Math.max(watcher.brain.alertness, .62);
      }
    } else if (stage.retrySpawn) {
      player.x = stage.retrySpawn.x;
      player.y = stage.retrySpawn.y;
    }
    stageCaughtStart = saved.stageCaughtStart;
    gameState = "playing";
    updateInventoryUI();
    renderJournal();
    updateMission();
    updateSuspicionUI();
    if (saved.hasRecipe && stage.finalEscapeNoise) {
      showEventBanner("최종 탈출", "원본 확보 상태 · 추적자 반응 재개", "escape", 2.1, 5);
    } else {
      showEventBanner(`DAY ${stage.day}`, `${stage.name} · 이어하기`, "day", 1.45, 2);
    }
    showToast(
      saved.hasRecipe && stage.finalEscapeNoise
        ? "원본 확보 직후부터 재개 · 소리를 들은 엄마와 언니가 다시 움직인다."
        : `DAY ${stage.day} 저장 지점에서 재개했다.`,
      2.0
    );
    saveSession();
    return true;
  }

  function renderVNLine() {
    const line = vnLines[vnIndex];
    if (!line) return;

    const portraitKey = line.portrait || "ramyani";
    ui.vnScene.dataset.speaker = line.speaker || "";
    ui.vnScene.dataset.tone = line.tone || vnTone;
    ui.vnCharacter.src = Story.PORTRAITS[portraitKey] || Story.PORTRAITS.ramyani;
    ui.vnCharacter.alt = line.speaker || "";
    ui.vnCharacter.dataset.side = line.side || (portraitKey === "ramyani" ? "right" : "left");
    ui.vnCharacter.classList.toggle("hidden", !line.portrait);
    ui.vnCharacter.classList.remove("vn-pop");
    void ui.vnCharacter.offsetWidth;
    ui.vnCharacter.classList.add("vn-pop");

    ui.vnChapter.textContent = line.kicker || `DAY ${stage ? stage.day : 1} / ${stage ? stage.totalDays : 10}`;
    ui.vnSpeaker.textContent = line.speaker || "";
    ui.vnText.textContent = line.text || "";
    ui.vnProgress.textContent = `${vnIndex + 1} / ${vnLines.length}`;

    if (Array.isArray(line.summary) && line.summary.length) {
      ui.vnMeta.innerHTML = line.summary
        .map(([key, value]) => `<span class="vn-summary-row"><b>${key}</b><span>${value}</span></span>`)
        .join("");
    } else {
      ui.vnMeta.textContent = "";
    }

    ui.vnNext.textContent = vnIndex === vnLines.length - 1 ? `${line.button || "계속"} ▶` : "다음 ▶";
  }

  function showVN(lines, onDone, options = {}) {
    vnLines = lines.filter(Boolean);
    vnIndex = 0;
    vnDone = typeof onDone === "function" ? onDone : null;
    vnTone = options.tone || "story";
    gameState = "vn";
    ui.journal.classList.add("hidden");
    ui.prompt.classList.remove("show");
    ui.vnScene.classList.remove("hidden");
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
      navPath: [],
      navIndex: 0,
      navTarget: null,
      navResolvedTarget: null,
      navExact: true,
      navTimer: 0,
      brain: AI.createBrain(inheritedAlert)
    };
  }

  function phasedPatrolIndex(watcher, phase = 0) {
    if (!watcher.patrol.length) return 0;
    const nearest = AI.nearestPatrolIndex(watcher, watcher.patrol);
    return (nearest + Math.max(0, Math.floor(phase || 0))) % watcher.patrol.length;
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
    const navigationValidation = C.validateStageNavigation(stage);
    if (!navigationValidation.ok) {
      throw new Error(`Invalid navigation ${stage.id}: ${navigationValidation.reason}`);
    }

    walls = stage.walls.map(x => ({ ...x }));
    furniture = stage.furniture.map(x => ({ ...x }));
    solids = walls.concat(furniture);
    blockers = solids;
    clueDefs = stage.clues.map(x => ({ ...x }));
    decoyDefs = (stage.decoys || []).map(x => ({ ...x }));
    itemDefs = (stage.items || []).map(x => ({ ...x, kind: "item" }));
    hideSpots = stage.hideSpots.map(x => ({ ...x, kind: "hide" }));
    distractions = stage.distractions.map(x => {
      const key = `${stage.id}:${x.id}`;
      return { ...x, kind: "distraction", used: !!usedDistractions[key], usageKey: key };
    });
    safe = stage.safe ? { ...stage.safe, id: "recipe-safe", kind: "safe" } : null;
    exitDoor = { ...stage.exit, id: "stage-exit", kind: "exit" };

    player.x = stage.spawn.x;
    player.y = stage.spawn.y;
    player.angle = 0;
    player.hidden = false;
    player.hideSpot = null;
    player.moving = false;
    player.sneaking = false;
    player.actionLock = 0;
    player.velocity.x = 0;
    player.velocity.y = 0;

    const momAlert = Math.min(.62, (stage.day - 1) * .055 + caught * .035);
    const mom = makeWatcher("mom", stage.momSpawn, stage.patrolMom, stage.ai, "#5b3f48", momAlert);
    mom.patrolIndex = phasedPatrolIndex(mom, stage.patrolPhase);
    watchers = [mom];

    if (stage.sisterActive) {
      const sisterAlert = Math.min(.68, .18 + (stage.day - 5) * .05 + caught * .025);
      const sister = makeWatcher("sister", stage.sisterSpawn, stage.patrolSister, stage.sisterAI, "#56506f", sisterAlert);
      sister.patrolIndex = phasedPatrolIndex(sister, stage.sisterPatrolPhase);
      watchers.push(sister);
    }

    freeze = 0;
    footstepTimer = 0;
    hudUpdateTimer = 0;
    boostTimer = 0;
    coughTimer = 0;
    coughPending = false;
    noiseRings = [];
    rebuildStaticStageLayer();
    renderDirty = true;
    resetPursuitFeedback();
    ui.journal.classList.add("hidden");
    renderJournal();
    updateMission();
    updateSuspicionUI();

    stageCaughtStart = caught;
    if (showIntro) {
      audio.stage();
      showVN(Story.dayIntro(stage), () => {
        gameState = "playing";
        autosaveTimer = 8;
        saveSession();
        showEventBanner(`DAY ${stage.day}`, `${stage.name} · ${stage.layoutName || "잠입 시작"}`, "day", 1.8, 2);
        showToast(`오늘의 아이템 1개가 맵 어딘가에 놓여 있다.`, 2.2);
      });
    } else {
      gameState = "playing";
    }
  }

  function beginFromStartScreen() {
    if (gameState !== "start") return;
    audio.ensure();
    ui.startScreen.classList.add("hidden");
    startCampaign();
  }

  function startCampaign() {
    clearSavedSession();
    pausedFromState = null;
    runCompleted = false;
    campaignSeedInput = Date.now();
    campaign = Campaign.generateCampaign(campaignSeedInput);
    collected = Object.create(null);
    pickedItems = Object.create(null);
    usedDistractions = Object.create(null);
    inventory = { binding: 0, cigarette: 0 };
    boostTimer = 0;
    coughTimer = 0;
    coughPending = false;
    hasRecipe = false;
    caught = 0;
    elapsed = 0;
    stageCaughtStart = 0;
    autosaveTimer = 8;
    ui.pause.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.result.classList.remove("mission-clear");
    loadStage(0, false);
    updateInventoryUI();

    showVN(Story.opening(), () => {
      audio.stage();
      showVN(Story.dayIntro(stage), () => {
        gameState = "playing";
        saveSession();
        showEventBanner("DAY 1", `${stage.name} · 첫 잠입 시작`, "day", 1.8, 2);
        showToast("첫 작전을 시작한다.", 2.2);
      });
    });
  }

  function completeDay() {
    if (stageIndex >= campaign.stages.length - 1) {
      finishRun();
      return;
    }

    const item = stage.items && stage.items[0];
    const data = {
      day: stage.day,
      location: stage.name,
      dayCaught: caught - stageCaughtStart,
      cluesFound: stageClueCount(),
      clueTotal: clueDefs.length,
      decoysFound: decoyDefs.filter(d => collected[d.id]).length,
      itemPicked: !!(item && pickedItems[item.id]),
      itemName: item ? item.title : "아이템"
    };

    showVN(Story.daySummary(data), () => {
      loadStage(stageIndex + 1, true);
    }, { tone: "summary" });
  }

  function showToast(text, seconds = 2.4) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    toastTimer = seconds;
  }

  function showEventBanner(kicker, text, kind = "neutral", seconds = 1.5, priority = 1) {
    if (eventBannerTimer > 0 && priority < eventBannerPriority) return false;
    ui.eventBannerKicker.textContent = kicker || "";
    ui.eventBannerText.textContent = text || "";
    ui.eventBanner.dataset.kind = kind;
    ui.eventBanner.classList.add("show");
    eventBannerTimer = seconds;
    eventBannerPriority = priority;
    return true;
  }

  function resetPursuitFeedback() {
    previousChaseRoles = new Set();
    warningLatched = false;
    if (ui.dangerVignette) {
      ui.dangerVignette.style.setProperty("--danger", "0");
      ui.dangerVignette.classList.remove("warning", "chase");
    }
    if (ui.momCard) ui.momCard.classList.remove("warning", "chasing");
    if (ui.sisterCard) ui.sisterCard.classList.remove("warning", "chasing");
  }

  function updatePursuitFeedback() {
    const current = new Set(
      watchers
        .filter(watcher => watcher.boundTimer <= 0 && watcher.brain.state === AI.STATES.CHASE)
        .map(watcher => watcher.role)
    );
    const entered = [...current].filter(role => !previousChaseRoles.has(role));
    const left = [...previousChaseRoles].filter(role => !current.has(role));

    if (entered.length) {
      const names = entered.map(role => role === "sister" ? "언니" : "엄마").join("·");
      audio.chase();
      showEventBanner("추적 시작", `${names}가 라먀니를 쫓기 시작했다`, "danger", 1.25, 3);
    } else if (left.length && current.size === 0) {
      audio.evade();
      showEventBanner("시야 이탈", "추적 시야에서 벗어났다 · 주변 수색은 계속된다", "safe", 1.2, 1);
    }

    previousChaseRoles = current;
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

  function emitNoise(pos, baseRadius, strong = false, splitWatchers = false) {
    noiseRings.push({ x: pos.x, y: pos.y, radius: 8, max: baseRadius, life: .8 });

    let primary = null;
    if (splitWatchers) {
      let best = Infinity;
      for (const watcher of watchers) {
        if (watcher.boundTimer > 0) continue;
        const d = C.dist(watcher, pos);
        if (d < best) {
          best = d;
          primary = watcher;
        }
      }
    }

    for (const watcher of watchers) {
      const strength = strong ? 1.18 : 1;
      const splitScale = splitWatchers && primary && watcher !== primary ? .62 : 1;
      watcherHears(watcher, pos, baseRadius * strength * splitScale);
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
      if (!pickedItems[item.id]) {
        const full = (inventory[item.type] || 0) >= (ITEM_CAPACITY[item.type] || 2);
        list.push({
          ...item,
          kind: "item",
          label: full ? `${item.title} · 소지 한도` : `${item.title} 줍기`
        });
      }
    }
    list.push(...hideSpots);
    for (const d of distractions) {
      if (!d.used) list.push(d);
    }
    if (safe && !hasRecipe) list.push(safe);
    list.push(exitDoor);
    return list;
  }

  function nearestUsableInteractable(maxDistance = 72) {
    const visible = getInteractables().filter(obj => C.hasLineOfSight(player, obj, walls));
    return C.nearestInteractable(player, visible, maxDistance);
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
    if (gameState !== "playing" || freeze > 0 || player.actionLock > 0) return;
    audio.click();

    if (player.hidden) {
      player.hidden = false;
      player.hideSpot = null;
      saveSession();
      showToast("숨는 곳에서 나왔다.", 1.1);
      return;
    }

    const obj = nearestUsableInteractable(72);
    if (!obj) return;

    if (obj.kind === "clue") {
      player.actionLock = .65;
      collected[obj.id] = true;
      renderJournal();
      audio.clue();
      saveSession();
      showEventBanner("핵심 단서", `${obj.title} · ${stageClueCount()}/${clueDefs.length}`, "clue", 1.45, 2);
      showToast(`핵심 기록 확보 · ${obj.text}`, 3.2);
      return;
    }

    if (obj.kind === "decoy") {
      player.actionLock = .65;
      collected[obj.id] = true;
      renderJournal();
      audio.pickup();
      saveSession();
      showEventBanner("혼선 기록", `${obj.title} · 진행과 무관`, "neutral", 1.15, 1);
      showToast(`쓸모없는 기록 · ${obj.text}`, 3.0);
      return;
    }

    if (obj.kind === "item") {
      const capacity = ITEM_CAPACITY[obj.type] || 2;
      if ((inventory[obj.type] || 0) >= capacity) {
        showToast(`${obj.title}은(는) ${capacity}개까지 들 수 있다. 하나를 사용한 뒤 다시 주울 수 있다.`, 1.8);
        return;
      }
      player.actionLock = .25;
      pickedItems[obj.id] = true;
      inventory[obj.type] = (inventory[obj.type] || 0) + 1;
      audio.item();
      showEventBanner("아이템 획득", `${obj.title} · ${inventory[obj.type]}/${capacity}`, "item", 1.35, 2);
      const detail = obj.type === "binding"
        ? (stage.sisterActive
          ? "1번 키로 가까운 엄마나 언니 한 명을 잠시 묶어둘 수 있다."
          : "1번 키로 가까운 엄마를 잠시 묶어둘 수 있다.")
        : "2번 키로 사용하면 잠시 빨라진다. 피울 때 기침 소리가 난다.";
      showToast(`${obj.title} 획득 · ${detail}`, 2.8);
      updateInventoryUI();
      saveSession();
      return;
    }

    if (obj.kind === "hide") {
      const seenBy = watchers.find(watcher => watcher.boundTimer <= 0 && watcherCanSeePlayer(watcher));
      if (seenBy) {
        showToast(`${seenBy.name}가 보고 있는 앞에서는 숨을 수 없다.`, 1.5);
        return;
      }
      player.hidden = true;
      player.hideSpot = obj.id;
      player.x = obj.x;
      player.y = obj.y;
      player.velocity.x = 0;
      player.velocity.y = 0;
      saveSession();
      showToast("숨었다. 마지막으로 본 위치를 수색해도 여기서는 바로 보이지 않는다.", 1.8);
      return;
    }

    if (obj.kind === "distraction") {
      player.actionLock = .35;
      obj.used = true;
      usedDistractions[obj.usageKey || `${stage.id}:${obj.id}`] = true;
      emitNoise(obj, obj.radius || 450, true, true);
      saveSession();
      showToast(
        stage.sisterActive
          ? "소리를 냈다. 가까운 추적자가 더 크게 반응한다. 같은 장치에는 오늘 다시 속지 않는다."
          : "소리를 냈다. 엄마가 확인하러 간다. 같은 장치에는 오늘 다시 속지 않는다.",
        1.8
      );
      return;
    }

    if (obj.kind === "safe") {
      if (!stageCluesComplete()) {
        showToast("오늘 모은 기록만으로는 아직 원본 위치를 확정할 수 없다.", 2);
      } else {
        player.actionLock = .8;
        hasRecipe = true;
        if (stage.finalEscapeNoise) {
          audio.finale();
          emitNoise(safe, stage.finalEscapeNoise, true, true);
          for (const watcher of watchers) {
            watcher.brain.alertness = C.clamp(watcher.brain.alertness + .12, 0, 1);
          }
          showEventBanner("원본 확보", "소리가 났다 · 현관까지 최종 탈출", "escape", 2.25, 5);
        } else {
          audio.success();
          showEventBanner("목표 확보", "원본 레시피를 손에 넣었다", "clue", 1.7, 3);
        }
        saveSession();
        showToast(
          stage.finalEscapeNoise
            ? "엄마와 언니가 반응했다. 숨지 말고 탈출 동선을 잡자."
            : "이제 현관까지 들키지 않고 빠져나가자.",
          3
        );
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
    const rank = C.rankCampaign({ caught, seconds: elapsed });
    runCompleted = true;
    clearSavedSession();
    ui.resultRank.textContent = `${rank.rank} · ${rank.label}`;
    ui.resultTime.textContent = C.formatTime(elapsed);
    ui.resultCaught.textContent = `${caught}회`;
    ui.resultTitle.textContent = "10일 작전 성공";
    ui.resultText.textContent = caught === 0
      ? "발각 없이 10일간의 추적을 끝내고 원본 레시피까지 확보했다."
      : "몇 번 들키긴 했지만 끝내 원본 레시피를 확보했다.";
    audio.success();

    showVN(Story.ending({
      rank: rank.rank,
      label: rank.label,
      time: C.formatTime(elapsed),
      caught,
      sisterSeen: campaign.stages.some(s => s.sisterActive)
    }), () => {
      gameState = "result";
      ui.result.classList.remove("hidden");
      ui.result.classList.remove("mission-clear");
      void ui.result.offsetWidth;
      ui.result.classList.add("mission-clear");
    }, { tone: "ending" });
  }

  function caughtBy(watcher) {
    caught += 1;
    freeze = 1.2;
    renderDirty = true;
    resetPursuitFeedback();
    player.hidden = false;
    player.hideSpot = null;
    const retrySpawn = stage.retrySpawn || stage.spawn;
    player.x = retrySpawn.x;
    player.y = retrySpawn.y;
    player.actionLock = 0;
    player.velocity.x = 0;
    player.velocity.y = 0;

    for (const w of watchers) {
      const spawn = w.role === "mom" ? stage.momSpawn : stage.sisterSpawn;
      w.x = spawn.x;
      w.y = spawn.y;
      w.angle = spawn.angle || 0;
      w.patrolIndex = phasedPatrolIndex(
        w,
        w.role === "mom" ? stage.patrolPhase : stage.sisterPatrolPhase
      );
      w.target = null;
      w.suspicion = 0;
      w.boundTimer = 0;
      clearWatcherNavigation(w);
      const extra = Math.min(.72, .16 + stage.day * .045 + caught * .035);
      w.brain = AI.createBrain(extra);
    }

    audio.alert();
    saveSession();
    showVN(Story.caught(watcher.role, caught), () => {
      freeze = 0;
      gameState = "playing";
      saveSession();
      showToast("작전 재개 · 이미 확보한 기록은 유지된다.", 1.8);
    }, { tone: "caught" });
  }

  function updatePlayer(dt) {
    if (player.hidden || player.actionLock > 0) {
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

  function clearWatcherNavigation(watcher) {
    watcher.navPath = [];
    watcher.navIndex = 0;
    watcher.navTarget = null;
    watcher.navResolvedTarget = null;
    watcher.navExact = true;
    watcher.navTimer = 0;
  }

  function moveWatcherToward(watcher, target, speed, dt) {
    if (!target) {
      clearWatcherNavigation(watcher);
      watcher.velocity.x = 0;
      watcher.velocity.y = 0;
      return true;
    }

    if (C.dist(watcher, target) < 10) {
      clearWatcherNavigation(watcher);
      watcher.velocity.x = 0;
      watcher.velocity.y = 0;
      return true;
    }

    watcher.navTimer = Math.max(0, (watcher.navTimer || 0) - dt);
    const targetMoved = !watcher.navTarget || C.dist(watcher.navTarget, target) > 34;
    const pathExhausted = !Array.isArray(watcher.navPath) || watcher.navIndex >= watcher.navPath.length;

    if (targetMoved || pathExhausted || watcher.navTimer <= 0) {
      const plan = C.planCirclePath(watcher, target, watcher.r, solids, bounds, 28);
      watcher.navPath = plan.points;
      watcher.navIndex = 0;
      watcher.navTarget = { x: target.x, y: target.y };
      watcher.navResolvedTarget = plan.target;
      watcher.navExact = plan.exact;
      watcher.navTimer = watcher.brain.state === AI.STATES.CHASE ? .18 : .62;

      if (!watcher.navPath.length) {
        watcher.velocity.x = 0;
        watcher.velocity.y = 0;
        return false;
      }
    }

    while (watcher.navIndex < watcher.navPath.length) {
      const waypoint = watcher.navPath[watcher.navIndex];
      if (C.dist(watcher, waypoint) > Math.max(10, speed * dt * 1.35)) break;
      watcher.navIndex += 1;
    }

    if (watcher.navIndex >= watcher.navPath.length) {
      const resolved = watcher.navResolvedTarget || target;
      const arrived = C.dist(watcher, resolved) < 14;
      if (arrived) {
        watcher.velocity.x = 0;
        watcher.velocity.y = 0;
        if (!watcher.navExact) clearWatcherNavigation(watcher);
      } else {
        watcher.navTimer = 0;
      }
      return arrived;
    }

    const waypoint = watcher.navPath[watcher.navIndex];
    const dx = waypoint.x - watcher.x;
    const dy = waypoint.y - watcher.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      watcher.navIndex += 1;
      return false;
    }

    watcher.angle = Math.atan2(dy, dx);
    const beforeX = watcher.x;
    const beforeY = watcher.y;
    const next = C.moveCircle(watcher, dx / d * speed * dt, dy / d * speed * dt, watcher.r, solids, bounds);
    watcher.x = next.x;
    watcher.y = next.y;
    watcher.velocity.x = (watcher.x - beforeX) / Math.max(dt, .001);
    watcher.velocity.y = (watcher.y - beforeY) / Math.max(dt, .001);

    if (Math.hypot(watcher.x - beforeX, watcher.y - beforeY) < .08) {
      watcher.navTimer = 0;
    }

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

    if (
      player.hidden &&
      player.hideSpot &&
      [AI.STATES.INVESTIGATE, AI.STATES.SEARCH, AI.STATES.CHASE].includes(brain.state) &&
      C.dist(watcher, player) < 54
    ) {
      caughtBy(watcher);
      return true;
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
      if (sees) brain.scanPhase += dt;
      else AI.coolBrain(brain, dt);
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
      if (!C.hasLineOfSight(player, watcher, solids)) continue;
      const d = C.dist(player, watcher);
      if (d <= best) {
        best = d;
        target = watcher;
      }
    }
    return target;
  }

  function useBindingItem() {
    if (gameState !== "playing" || freeze > 0 || player.actionLock > 0) return;
    if (player.hidden) {
      showToast("숨은 상태에서는 포장끈을 사용할 수 없다.", 1.2);
      return;
    }
    if (inventory.binding <= 0) {
      showToast("포장끈이 없다.", 1.1);
      return;
    }
    const watcher = nearestBindableWatcher();
    if (!watcher) {
      showToast(
        stage.sisterActive
          ? "묶으려면 엄마나 언니에게 조금 더 가까이 가야 한다."
          : "묶으려면 엄마에게 조금 더 가까이 가야 한다.",
        1.5
      );
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
    saveSession();
  }

  function useCigarette() {
    if (gameState !== "playing" || freeze > 0 || player.actionLock > 0) return;
    if (player.hidden) {
      showToast("숨은 상태에서는 담배를 사용할 수 없다.", 1.2);
      return;
    }
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
    saveSession();
  }

  function updateInventoryUI() {
    if (ui.inventoryBinding) ui.inventoryBinding.textContent = `포장끈 × ${inventory.binding}/${ITEM_CAPACITY.binding}`;
    if (ui.inventoryCigarette) ui.inventoryCigarette.textContent = `담배 × ${inventory.cigarette}/${ITEM_CAPACITY.cigarette}`;
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
  }

  function updateMission() {
    ui.missionLabel.textContent = `DAY ${stage.day} / ${stage.totalDays} · ${stage.name}`;
    if (!stageCluesComplete()) {
      ui.mission.textContent = `${stage.objective} · 핵심 단서 ${stageClueCount()}/${clueDefs.length}`;
      const pursuers = stage.sisterActive ? "엄마와 언니" : "엄마";
      ui.submission.textContent = `${stage.layoutName || "기본 배치"} · ${pursuers}를 피하며 오늘의 핵심 단서를 찾자.`;
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
    if (player.actionLock > 0) {
      text = "확인 중… 잠깐 움직일 수 없다";
    } else if (player.hidden) {
      const searcher = watchers
        .filter(watcher =>
          watcher.boundTimer <= 0 &&
          [AI.STATES.INVESTIGATE, AI.STATES.SEARCH, AI.STATES.CHASE].includes(watcher.brain.state)
        )
        .map(watcher => ({ watcher, distance: C.dist(watcher, player) }))
        .sort((a, b) => a.distance - b.distance)[0];
      text = searcher && searcher.distance < 110
        ? `⚠ ${searcher.watcher.name}가 숨은 곳을 수색 중 · E · 나오기`
        : "E · 숨는 곳에서 나오기";
    } else {
      text = interactionPrompt(nearestUsableInteractable(72));
    }
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

    const momChasing = !!(mom && mom.boundTimer <= 0 && mom.brain.state === AI.STATES.CHASE);
    const momWarning = !!(mom && mom.suspicion >= .55);
    ui.momCard.classList.toggle("warning", momWarning && !momChasing);
    ui.momCard.classList.toggle("chasing", momChasing);

    ui.sisterCard.classList.toggle("hidden", !sister);
    if (sister) {
      ui.sisterFill.style.width = `${Math.round(sister.suspicion * 100)}%`;
      ui.sisterState.textContent = sister.boundTimer > 0
        ? `묶임 ${sister.boundTimer.toFixed(1)}s`
        : AI.stateLabel(sister.brain.state).replace("엄마", "언니");
      const sisterChasing = sister.boundTimer <= 0 && sister.brain.state === AI.STATES.CHASE;
      ui.sisterCard.classList.toggle("warning", sister.suspicion >= .55 && !sisterChasing);
      ui.sisterCard.classList.toggle("chasing", sisterChasing);
    } else {
      ui.sisterCard.classList.remove("warning", "chasing");
    }

    const maxSuspicion = watchers.reduce((max, watcher) => Math.max(max, watcher.suspicion || 0), 0);
    const anyChase = watchers.some(watcher => watcher.boundTimer <= 0 && watcher.brain.state === AI.STATES.CHASE);
    const danger = C.clamp(Math.max(maxSuspicion, anyChase ? .58 : 0), 0, 1);

    if (maxSuspicion >= .72 && !warningLatched) {
      warningLatched = true;
      audio.warning();
      showEventBanner("발각 임박", "의심도가 높다 · 즉시 시야를 끊자", "danger", 1.0, 4);
    } else if (maxSuspicion <= .45) {
      warningLatched = false;
    }

    ui.dangerVignette.style.setProperty("--danger", danger.toFixed(3));
    ui.dangerVignette.classList.toggle("warning", danger >= .55 && !anyChase);
    ui.dangerVignette.classList.toggle("chase", anyChase);
  }

  function update(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.toast.classList.remove("show");
    }
    if (eventBannerTimer > 0) {
      eventBannerTimer -= dt;
      if (eventBannerTimer <= 0) {
        eventBannerPriority = 0;
        ui.eventBanner.classList.remove("show");
      }
    }
    if (gameState !== "playing") return;

    elapsed += dt;
    player.actionLock = Math.max(0, player.actionLock - dt);
    autosaveTimer -= dt;
    if (autosaveTimer <= 0) {
      autosaveTimer = 8;
      saveSession();
    }
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
    if (gameState === "playing") updatePursuitFeedback();
    updateNoise(dt);
    updateMission();
    updatePrompt();
    updateSuspicionUI();
  }

  function roundedRectOn(target, x, y, w, h, r, fill, stroke) {
    target.beginPath();
    target.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    if (fill) { target.fillStyle = fill; target.fill(); }
    if (stroke) { target.strokeStyle = stroke; target.stroke(); }
  }

  function roundedRect(x, y, w, h, r, fill, stroke) {
    roundedRectOn(ctx, x, y, w, h, r, fill, stroke);
  }

  function drawFloor(target = ctx) {
    target.fillStyle = stage.palette.bg;
    target.fillRect(0, 0, W, H);
    for (const zone of stage.zones) {
      roundedRectOn(target, zone.x, zone.y, zone.w, zone.h, 20, zone.tone);
      target.save();
      target.globalAlpha = .23;
      target.fillStyle = "#fff2dd";
      target.font = "700 24px Segoe UI, Malgun Gothic, sans-serif";
      target.fillText(zone.label, zone.x + 28, zone.y + 44);
      target.restore();
    }
    target.strokeStyle = stage.palette.grid;
    target.lineWidth = 1;
    for (let x = 20; x < W; x += 42) {
      target.beginPath(); target.moveTo(x, 20); target.lineTo(x, H - 20); target.stroke();
    }
  }

  function drawWallsAndFurniture(target = ctx) {
    target.lineWidth = 1.5;
    for (const w of walls) {
      roundedRectOn(
        target, w.x, w.y, w.w, w.h, 5,
        stage.palette.wall,
        stage.palette.wallEdge || "rgba(255,255,255,.12)"
      );
    }

    for (const p of (stage.passages || [])) {
      target.save();
      target.shadowColor = stage.palette.passageEdge || "rgba(255,226,189,.55)";
      target.shadowBlur = 7;
      target.lineWidth = 2;
      roundedRectOn(
        target, p.x, p.y, p.w, p.h, 4,
        stage.palette.passage || "rgba(255,226,189,.28)",
        stage.palette.passageEdge || "rgba(255,226,189,.55)"
      );
      target.restore();
    }

    for (const f of furniture) {
      let fill = f.color || "#554549";
      if (!f.color && f.kind === "bed") fill = "#715c69";
      if (!f.color && f.kind === "sofa") fill = "#5a4d62";
      if (!f.color && (f.kind === "table" || f.kind === "island")) fill = "#6e5749";
      if (!f.color && (f.kind === "counter" || f.kind === "pantry" || f.kind === "drawer")) fill = "#63483e";
      if (!f.color && f.kind === "fridge") fill = "#6a6a70";
      if (!f.color && f.kind === "tv") fill = "#25232b";
      roundedRectOn(target, f.x, f.y, f.w, f.h, 10, fill, "rgba(255,255,255,.08)");
      target.fillStyle = "rgba(255,245,234,.48)";
      target.font = "11px Segoe UI, Malgun Gothic, sans-serif";
      target.fillText(f.label, f.x + 8, f.y + 18);
    }
  }

  function rebuildStaticStageLayer() {
    staticStageCanvas = null;
    if (!document.createElement) return;
    const layer = document.createElement("canvas");
    if (!layer || typeof layer.getContext !== "function") return;
    layer.width = W;
    layer.height = H;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return;
    drawFloor(layerCtx);
    drawWallsAndFurniture(layerCtx);
    staticStageCanvas = layer;
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
      ctx.fillStyle = d.used ? "rgba(255,255,255,.10)" : "rgba(130,200,214,.62)";
      ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    if (safe && !hasRecipe) {
      ctx.fillStyle = stageCluesComplete() ? "#f0a96f" : "#6e5960";
      roundedRect(safe.x - 20, safe.y - 16, 40, 32, 6, ctx.fillStyle, "rgba(255,255,255,.15)");
      ctx.fillStyle = "#2a2020";
      ctx.font = "700 12px sans-serif";
      ctx.fillText("秘", safe.x - 7, safe.y + 5);
    }

    const exitReady = stageCluesComplete() && (!safe || hasRecipe);
    const exitColor = exitReady
      ? (stage.palette.exitReady || "#9fd68a")
      : (stage.palette.exitLocked || "rgba(244,210,158,.62)");
    const edgeDistances = {
      left: exitDoor.x,
      right: W - exitDoor.x,
      top: exitDoor.y,
      bottom: H - exitDoor.y
    };
    const nearestEdge = Object.entries(edgeDistances).sort((a, b) => a[1] - b[1])[0][0];
    const verticalExit = nearestEdge === "left" || nearestEdge === "right";

    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = exitColor;
    ctx.shadowBlur = exitReady ? 10 : 6;
    ctx.strokeStyle = exitColor;
    ctx.lineWidth = exitReady ? 6 : 5;
    ctx.beginPath();
    if (verticalExit) {
      ctx.moveTo(exitDoor.x, exitDoor.y - 38);
      ctx.lineTo(exitDoor.x, exitDoor.y + 38);
    } else {
      ctx.moveTo(exitDoor.x - 38, exitDoor.y);
      ctx.lineTo(exitDoor.x + 38, exitDoor.y);
    }
    ctx.stroke();
    ctx.restore();
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
    const polygon = C.visionPolygon(watcher, range, fov, blockers, 44);
    if (polygon.length < 3) return;

    const g = ctx.createRadialGradient(watcher.x, watcher.y, 10, watcher.x, watcher.y, range);
    const hot = watcher.suspicion > .42 || watcher.brain.state === AI.STATES.CHASE;
    g.addColorStop(0, hot ? "rgba(244,112,91,.23)" : watcher.role === "sister" ? "rgba(173,151,230,.15)" : "rgba(247,205,112,.16)");
    g.addColorStop(1, "rgba(247,205,112,0)");

    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i += 1) ctx.lineTo(polygon[i].x, polygon[i].y);
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
    if (gameState !== "start") draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", e => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab","Space","Escape"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === "Escape") {
      if (gameState === "playing") pauseGame();
      else if (gameState === "paused") resumeGame();
      return;
    }
    if (gameState === "start" && ["Space", "Enter"].includes(e.code)) {
      beginFromStartScreen();
      return;
    }
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

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameState === "playing") {
      pauseGame("창이 비활성화되어 자동으로 일시정지되었습니다.");
    }
  });

  window.addEventListener("beforeunload", () => {
    if (gameState !== "start" && gameState !== "result") saveSession();
  });

  ui.startButton.addEventListener("click", event => {
    event.stopPropagation();
    beginFromStartScreen();
  });

  ui.continueButton.addEventListener("click", event => {
    event.stopPropagation();
    audio.ensure();
    resumeSavedCampaign();
  });

  ui.resume.addEventListener("click", event => {
    event.stopPropagation();
    resumeGame();
  });

  ui.pauseTitle.addEventListener("click", event => {
    event.stopPropagation();
    returnToTitle();
  });

  ui.vnNext.addEventListener("click", event => {
    event.stopPropagation();
    nextVN();
  });

  ui.vnScene.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    nextVN();
  });

  ui.restart.addEventListener("click", () => {
    audio.ensure();
    ui.result.classList.add("hidden");
    startCampaign();
  });

  ui.vnScene.classList.add("hidden");
  ui.pause.classList.add("hidden");
  renderJournal();
  updateInventoryUI();
  refreshContinueButton();
  requestAnimationFrame(frame);

})();
