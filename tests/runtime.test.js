const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const Core = require("../src/core.js");
const AI = require("../src/mom-ai.js");
const Campaign = require("../src/stages.js");
const Story = require("../src/story.js");
const Session = require("../src/session.js");

class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
  }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    if (force === true) {
      this.values.add(name);
      return true;
    }
    if (force === false) {
      this.values.delete(name);
      return false;
    }
    if (this.values.has(name)) {
      this.values.delete(name);
      return false;
    }
    this.values.add(name);
    return true;
  }
}

class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() { this.state = "running"; }
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime() {} },
      connect(node) { return node; },
      start() {},
      stop() {}
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      },
      connect(node) { return node; }
    };
  }
}

function createFakeCanvasContext(counters) {
  const gradient = { addColorStop() {} };
  return {
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    fillRect() {},
    fillText() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    translate() {},
    rotate() {},
    ellipse() {},
    closePath() {},
    quadraticCurveTo() {},
    createRadialGradient() { return gradient; },
    drawImage() { counters.drawImage += 1; }
  };
}

function createStorage(backing) {
  return {
    getItem(key) { return backing.has(key) ? backing.get(key) : null; },
    setItem(key, value) { backing.set(key, String(value)); },
    removeItem(key) { backing.delete(key); }
  };
}

function createHarness(storageBacking = new Map()) {
  const elementListeners = new Map();
  const elements = new Map();
  const counters = { drawImage: 0, staticCanvasCreated: 0, rafRequests: 0 };
  let rafCallback = null;
  let rafId = 0;
  let currentNow = 1000;

  function makeElement(id) {
    const listeners = Object.create(null);
    elementListeners.set(id, listeners);
    const initiallyHidden = ["continue-btn", "pause", "result"].includes(id);
    const element = {
      id,
      tagName: id.endsWith("-btn") ? "BUTTON" : "DIV",
      classList: new FakeClassList(initiallyHidden ? ["hidden"] : []),
      dataset: Object.create(null),
      style: {
        setProperty(name, value) { this[name] = String(value); }
      },
      textContent: "",
      innerHTML: "",
      src: "",
      alt: "",
      offsetWidth: 0,
      addEventListener(type, handler) {
        (listeners[type] ||= []).push(handler);
      },
      closest(selector) {
        return selector === "button" && this.tagName === "BUTTON" ? this : null;
      }
    };
    if (id === "game") {
      const canvasContext = createFakeCanvasContext(counters);
      element.getContext = () => canvasContext;
    }
    return element;
  }

  const ids = [
    "game", "start-screen", "start-btn", "continue-btn",
    "vn-scene", "vn-character", "vn-chapter", "vn-speaker", "vn-progress",
    "vn-text", "vn-meta", "vn-next", "mission-label", "mission", "submission",
    "mom-suspicion-fill", "mom-state", "sister-suspicion-card",
    "sister-suspicion-fill", "sister-state", "inventory-binding",
    "inventory-cigarette", "boost-status", "danger-vignette",
    "event-banner", "event-banner-kicker", "event-banner-text",
    "prompt", "toast", "journal",
    "journal-body", "pause", "pause-reason", "resume-btn", "pause-title-btn",
    "result", "result-title", "result-text", "result-rank", "result-time",
    "result-caught", "restart-btn"
  ];
  for (const id of ids) elements.set(id, makeElement(id));

  const documentListeners = Object.create(null);
  const windowListeners = Object.create(null);
  const document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement(tagName) {
      if (String(tagName).toLowerCase() !== "canvas") return makeElement("generated-" + tagName);
      counters.staticCanvasCreated += 1;
      const staticContext = createFakeCanvasContext(counters);
      return {
        width: 0,
        height: 0,
        getContext() { return staticContext; }
      };
    },
    addEventListener(type, handler) {
      (documentListeners[type] ||= []).push(handler);
    }
  };

  const performance = { now: () => currentNow };
  const requestAnimationFrame = callback => {
    counters.rafRequests += 1;
    rafCallback = callback;
    rafId += 1;
    return rafId;
  };
  const localStorage = createStorage(storageBacking);
  const windowObject = {
    HolyCrabCore: Core,
    HolyCrabMomAI: AI,
    HolyCrabStages: Campaign,
    HolyCrabStory: Story,
    HolyCrabSession: Session,
    AudioContext: FakeAudioContext,
    webkitAudioContext: FakeAudioContext,
    localStorage,
    document,
    performance,
    requestAnimationFrame,
    __HOLYCRAB_TEST__: true,
    addEventListener(type, handler) {
      (windowListeners[type] ||= []).push(handler);
    }
  };

  const context = vm.createContext({
    window: windowObject,
    document,
    performance,
    requestAnimationFrame,
    console,
    Date,
    Math
  });
  windowObject.window = windowObject;

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "src", "game.js"), "utf8");
  vm.runInContext(gameSource, context, { filename: "src/game.js" });

  function dispatchElement(id, type = "click") {
    const target = elements.get(id);
    const event = {
      target,
      code: "",
      repeat: false,
      preventDefault() {},
      stopPropagation() {}
    };
    for (const handler of elementListeners.get(id)?.[type] || []) handler(event);
  }

  function dispatchWindow(type, event = {}) {
    const payload = {
      repeat: false,
      preventDefault() {},
      stopPropagation() {},
      ...event
    };
    for (const handler of windowListeners[type] || []) handler(payload);
  }

  function dispatchDocument(type) {
    for (const handler of documentListeners[type] || []) handler({ target: document });
  }

  function stepFrame(now = currentNow + 16.6667) {
    const callback = rafCallback;
    assert.ok(callback, "no animation frame is pending");
    rafCallback = null;
    currentNow = now;
    callback(now);
  }

  return {
    elements,
    document,
    storageBacking,
    counters,
    hooks: windowObject.__HolyCrabTestHooks,
    dispatchElement,
    dispatchWindow,
    dispatchDocument,
    stepFrame,
    hasPendingFrame: () => typeof rafCallback === "function"
  };
}

function advanceUntilNotVN(harness, maxClicks = 30) {
  for (let i = 0; i < maxClicks && harness.hooks.snapshot().gameState === "vn"; i += 1) {
    harness.dispatchElement("vn-next");
  }
  return harness.hooks.snapshot();
}

function interactAt(harness, point) {
  harness.hooks.clearActionLock();
  harness.hooks.teleportPlayer(point);
  harness.dispatchWindow("keydown", { code: "KeyE" });
}

function consumeDailyItem(harness, stage) {
  const item = stage.items[0];
  if (!item) return;
  harness.hooks.clearActionLock();

  if (item.type === "cigarette") {
    harness.dispatchWindow("keydown", { code: "Digit2" });
    assert.equal(harness.hooks.snapshot().inventory.cigarette, 0);
    return;
  }

  const solids = [...stage.walls, ...stage.furniture];
  const stageBounds = stage.bounds || { x: 14, y: 14, w: 1412, h: 782 };
  const approach = Core.findInteractionApproach(
    stage.spawn,
    stage.momSpawn,
    16,
    solids,
    solids,
    stageBounds,
    76,
    20
  );
  assert.ok(approach, `${stage.id}: no binding-item approach to mom`);
  harness.hooks.teleportPlayer(approach.point);
  harness.dispatchWindow("keydown", { code: "Digit1" });
  assert.equal(harness.hooks.snapshot().inventory.binding, 0);
}

test("actual game runtime reaches play, pauses, saves, and restores", () => {
  const storage = new Map();
  const first = createHarness(storage);

  assert.equal(first.elements.get("start-screen").classList.contains("hidden"), false);
  assert.equal(first.elements.get("continue-btn").classList.contains("hidden"), true);

  first.dispatchElement("start-btn");
  assert.equal(first.elements.get("start-screen").classList.contains("hidden"), true);
  assert.equal(first.elements.get("vn-scene").classList.contains("hidden"), false);

  for (let i = 0; i < 8; i += 1) first.dispatchElement("vn-next");
  assert.equal(first.elements.get("vn-scene").classList.contains("hidden"), true);
  assert.equal(storage.has(Session.STORAGE_KEY), true);
  assert.equal(first.elements.get("event-banner").classList.contains("show"), true);
  assert.match(first.elements.get("event-banner-kicker").textContent, /^DAY 1$/);
  assert.match(first.elements.get("event-banner-text").textContent, /첫 잠입 시작/);

  first.dispatchWindow("keydown", { code: "Escape" });
  assert.equal(first.elements.get("pause").classList.contains("hidden"), false);

  first.dispatchElement("resume-btn");
  assert.equal(first.elements.get("pause").classList.contains("hidden"), true);

  first.document.hidden = true;
  first.dispatchDocument("visibilitychange");
  assert.equal(first.elements.get("pause").classList.contains("hidden"), false);

  const second = createHarness(storage);
  assert.equal(second.elements.get("continue-btn").classList.contains("hidden"), false);

  second.dispatchElement("continue-btn");
  assert.equal(second.elements.get("start-screen").classList.contains("hidden"), true);
  assert.match(second.elements.get("mission-label").textContent, /^DAY 1 \/ 10/);

  second.dispatchWindow("keydown", { code: "Escape" });
  assert.equal(second.elements.get("pause").classList.contains("hidden"), false);
});


test("restored legacy hoards are clamped to the current carry capacity", () => {
  const storage = new Map();
  const raw = Session.encode({
    seedInput: "capacity-restore",
    stageIndex: 0,
    collected: {},
    pickedItems: {},
    usedDistractions: {},
    inventory: { binding: 9, cigarette: 7 },
    hasRecipe: false,
    caught: 0,
    elapsed: 12,
    stageCaughtStart: 0
  });
  storage.set(Session.STORAGE_KEY, raw);

  const harness = createHarness(storage);
  harness.dispatchElement("continue-btn");

  assert.equal(harness.elements.get("inventory-binding").textContent, "포장끈 × 2/2");
  assert.equal(harness.elements.get("inventory-cigarette").textContent, "담배 × 2/2");
});


test("final recipe save resumes inside the escape beat instead of a safe shortcut", () => {
  const storage = new Map();
  const raw = Session.encode({
    seedInput: "final-resume",
    stageIndex: 9,
    collected: {
      "final-ratio": true,
      "final-cool": true,
      "final-rest": true
    },
    pickedItems: {},
    usedDistractions: {},
    inventory: { binding: 1, cigarette: 1 },
    hasRecipe: true,
    caught: 0,
    elapsed: 600,
    stageCaughtStart: 0
  });
  storage.set(Session.STORAGE_KEY, raw);

  const harness = createHarness(storage);
  harness.dispatchElement("continue-btn");

  assert.match(harness.elements.get("toast").textContent, /원본 확보 직후부터 재개/);
  assert.match(harness.elements.get("mission").textContent, /현관으로 최종 탈출/);
  assert.equal(harness.elements.get("event-banner").dataset.kind, "escape");
  assert.match(harness.elements.get("event-banner-text").textContent, /추적자 반응 재개/);
});


test("frame loop sleeps outside active play and static stage rendering is cached", () => {
  const harness = createHarness(new Map());

  assert.equal(harness.hasPendingFrame(), false);
  assert.equal(harness.counters.staticCanvasCreated, 0);

  harness.dispatchElement("start-btn");
  assert.equal(harness.counters.staticCanvasCreated, 1);
  assert.equal(harness.hasPendingFrame(), true);

  harness.stepFrame(1016.7);
  assert.equal(harness.hasPendingFrame(), false);
  assert.ok(harness.counters.drawImage >= 1);

  for (let i = 0; i < 8; i += 1) harness.dispatchElement("vn-next");
  assert.equal(harness.hasPendingFrame(), true);

  harness.stepFrame(1033.4);
  assert.equal(harness.hasPendingFrame(), true);

  harness.dispatchWindow("keydown", { code: "Escape" });
  harness.stepFrame(1050.1);
  assert.equal(harness.hasPendingFrame(), false);

  harness.dispatchWindow("pageshow");
  assert.equal(harness.hasPendingFrame(), true);
  harness.stepFrame(1066.8);
  assert.equal(harness.hasPendingFrame(), false);

  harness.dispatchElement("resume-btn");
  assert.equal(harness.hasPendingFrame(), true);
  assert.equal(harness.counters.staticCanvasCreated, 1);
});


test("a fixed campaign can be completed through the real 10-day runtime with catches and restore", () => {
  const seedInput = "e2e-complete-campaign";
  const campaign = Campaign.generateCampaign(seedInput);
  const storage = new Map();
  storage.set(Session.STORAGE_KEY, Session.encode({
    seedInput,
    stageIndex: 0,
    collected: {},
    pickedItems: {},
    usedDistractions: {},
    inventory: { binding: 0, cigarette: 0 },
    hasRecipe: false,
    caught: 0,
    elapsed: 0,
    stageCaughtStart: 0
  }));

  let harness = createHarness(storage);
  harness.dispatchElement("continue-btn");
  assert.equal(harness.hooks.snapshot().gameState, "playing");
  assert.equal(harness.hooks.snapshot().stageIndex, 0);

  let expectedCaught = 0;

  for (let dayIndex = 0; dayIndex < campaign.stages.length; dayIndex += 1) {
    const stage = campaign.stages[dayIndex];
    assert.equal(harness.hooks.snapshot().stageIndex, dayIndex, `wrong stage before DAY ${dayIndex + 1}`);

    let playability = Core.validateStagePlayability(stage, 20);
    assert.equal(playability.ok, true, `${stage.id}: ${playability.reason || "not playable"}`);
    let approaches = playability.fromSpawn;

    const item = stage.items[0];
    assert.ok(item);
    interactAt(harness, approaches[item.id].point);
    let state = harness.hooks.snapshot();
    assert.equal(state.pickedItems[item.id], true, `${stage.id}: daily item was not picked`);

    if (dayIndex === 4) {
      const firstClue = stage.clues[0];
      interactAt(harness, approaches[firstClue.id].point);
      state = harness.hooks.snapshot();
      assert.equal(state.collected[firstClue.id], true);

      const inventoryBeforeReload = { ...state.inventory };
      const caughtBeforeReload = state.caught;

      harness = createHarness(storage);
      harness.dispatchElement("continue-btn");
      state = harness.hooks.snapshot();

      assert.equal(state.stageIndex, dayIndex);
      assert.equal(state.collected[firstClue.id], true);
      assert.equal(state.pickedItems[item.id], true);
      assert.equal(state.inventory.binding, inventoryBeforeReload.binding);
      assert.equal(state.inventory.cigarette, inventoryBeforeReload.cigarette);
      assert.equal(state.caught, caughtBeforeReload);

      playability = Core.validateStagePlayability(stage, 20);
      approaches = playability.fromRetry;
    }

    consumeDailyItem(harness, stage);

    for (let clueIndex = 0; clueIndex < stage.clues.length; clueIndex += 1) {
      const clue = stage.clues[clueIndex];
      if (harness.hooks.snapshot().collected[clue.id]) continue;

      interactAt(harness, approaches[clue.id].point);
      state = harness.hooks.snapshot();
      assert.equal(state.collected[clue.id], true, `${stage.id}: clue ${clue.id} was not collected`);

      if ((dayIndex === 1 || dayIndex === 6) && clueIndex === 0) {
        const retainedId = clue.id;
        expectedCaught += 1;
        harness.hooks.triggerCaught(dayIndex >= 6 ? "sister" : "mom");
        assert.equal(harness.hooks.snapshot().gameState, "vn");
        state = advanceUntilNotVN(harness);
        assert.equal(state.gameState, "playing");
        assert.equal(state.stageIndex, dayIndex);
        assert.equal(state.caught, expectedCaught);
        assert.equal(state.collected[retainedId], true, `${stage.id}: caught flow lost collected clue`);
        approaches = Core.validateStagePlayability(stage, 20).fromRetry;
      }
    }

    state = harness.hooks.snapshot();
    for (const clue of stage.clues) {
      assert.equal(state.collected[clue.id], true, `${stage.id}: missing clue before exit`);
    }

    if (stage.safe) {
      interactAt(harness, approaches.safe.point);
      state = harness.hooks.snapshot();
      assert.equal(state.hasRecipe, true, `${stage.id}: final recipe was not acquired`);
      harness.hooks.clearActionLock();
    }

    interactAt(harness, approaches.exit.point);
    state = harness.hooks.snapshot();

    if (dayIndex < campaign.stages.length - 1) {
      assert.equal(state.gameState, "vn", `${stage.id}: exit did not enter summary`);
      state = advanceUntilNotVN(harness);
      assert.equal(state.gameState, "playing", `${stage.id}: next day did not start`);
      assert.equal(state.stageIndex, dayIndex + 1, `${stage.id}: stage index did not advance`);
    } else {
      assert.equal(state.gameState, "vn", "final exit did not start ending");
      state = advanceUntilNotVN(harness);
      assert.equal(state.gameState, "result");
      assert.equal(state.runCompleted, true);
      assert.equal(state.stageIndex, 9);
      assert.equal(state.caught, expectedCaught);
      assert.equal(storage.has(Session.STORAGE_KEY), false);
      assert.equal(harness.elements.get("result").classList.contains("hidden"), false);
      assert.match(harness.elements.get("result-title").textContent, /10일 작전 성공/);
    }
  }
});
