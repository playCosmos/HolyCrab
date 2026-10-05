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

  function makeElement(id) {
    const listeners = Object.create(null);
    elementListeners.set(id, listeners);
    const initiallyHidden = ["continue-btn", "pause", "result"].includes(id);
    const element = {
      id,
      tagName: id.endsWith("-btn") ? "BUTTON" : "DIV",
      classList: new FakeClassList(initiallyHidden ? ["hidden"] : []),
      dataset: Object.create(null),
      style: Object.create(null),
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
      element.getContext = () => ({});
    }
    return element;
  }

  const ids = [
    "game", "start-screen", "start-btn", "continue-btn",
    "vn-scene", "vn-character", "vn-chapter", "vn-speaker", "vn-progress",
    "vn-text", "vn-meta", "vn-next", "mission-label", "mission", "submission",
    "mom-suspicion-fill", "mom-state", "sister-suspicion-card",
    "sister-suspicion-fill", "sister-state", "inventory-binding",
    "inventory-cigarette", "boost-status", "prompt", "toast", "journal",
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
    addEventListener(type, handler) {
      (documentListeners[type] ||= []).push(handler);
    }
  };

  const performance = { now: () => 1000 };
  const requestAnimationFrame = () => 1;
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

  return {
    elements,
    document,
    storageBacking,
    dispatchElement,
    dispatchWindow,
    dispatchDocument
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
