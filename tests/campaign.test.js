const test = require("node:test");
const assert = require("node:assert/strict");
const Campaign = require("../src/stages.js");
const AI = require("../src/mom-ai.js");

test("campaign spans eight days and revisits all three locations", () => {
  const c = Campaign.generateCampaign("holycrab-test-seed");
  assert.equal(c.stages.length, 8);
  assert.equal(c.stages[0].locationKey, "home");
  assert.equal(c.stages.at(-1).locationKey, "home");
  assert.equal(c.stages.at(-1).id, "home-finale");

  const beforeFinal = c.stages.slice(0, -1).map(s => s.locationKey);
  assert.ok(beforeFinal.filter(x => x === "home").length >= 3);
  assert.ok(beforeFinal.filter(x => x === "market").length >= 2);
  assert.ok(beforeFinal.filter(x => x === "banchan").length >= 2);
});

test("middle route avoids immediate duplicate locations for the fixed seed", () => {
  const c = Campaign.generateCampaign("holycrab-test-seed");
  for (let i = 1; i < c.stages.length - 1; i += 1) {
    assert.notEqual(c.stages[i].locationKey, c.stages[i - 1].locationKey);
  }
});

test("sister joins from day five and remains for finale", () => {
  const c = Campaign.generateCampaign("sister-test");
  assert.equal(c.stages[3].sisterActive, false);
  assert.equal(c.stages[4].sisterActive, true);
  assert.equal(c.stages.at(-1).sisterActive, true);
});

test("every generated stage validates", () => {
  const c = Campaign.generateCampaign("validation-seed");
  for (const stage of c.stages) {
    assert.deepEqual(Campaign.validateStage(stage), { ok: true });
  }
});

test("AI remembers last seen position and enters chase", () => {
  const brain = AI.createBrain();
  AI.rememberSeen(brain, { x: 42, y: 19 });
  assert.equal(brain.state, AI.STATES.CHASE);
  assert.deepEqual(brain.lastSeen, { x: 42, y: 19 });
  assert.ok(brain.alertness > 0);
});

test("AI creates a bounded local search pattern", () => {
  const brain = AI.createBrain(.5);
  AI.beginSearch(brain, { x: 5, y: 5 }, { x: 0, y: 0, w: 100, h: 100 }, 60);
  assert.equal(brain.state, AI.STATES.SEARCH);
  assert.ok(brain.searchPoints.length >= 5);
  for (const p of brain.searchPoints) {
    assert.ok(p.x >= 28 && p.x <= 72);
    assert.ok(p.y >= 28 && p.y <= 72);
  }
});


test("campaign guarantees one home revisit in each middle half", () => {
  const seeds = ["home-a", "home-b", "home-c", "home-d", "home-e"];
  for (const seed of seeds) {
    const c = Campaign.generateCampaign(seed);
    const days2to4 = c.stages.slice(1, 4).map(s => s.locationKey);
    const days5to7 = c.stages.slice(4, 7).map(s => s.locationKey);
    assert.equal(days2to4.filter(x => x === "home").length, 1);
    assert.equal(days5to7.filter(x => x === "home").length, 1);
    assert.deepEqual(new Set(days2to4), new Set(["home", "market", "banchan"]));
    assert.deepEqual(new Set(days5to7), new Set(["home", "market", "banchan"]));
  }
});
