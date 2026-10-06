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
