const test = require("node:test");
const assert = require("node:assert/strict");
const Session = require("../src/session.js");

test("session snapshot round-trips campaign progress", () => {
  const raw = Session.encode({
    seedInput: 123456,
    stageIndex: 4,
    collected: { a: true, b: false, c: true },
    pickedItems: { item1: true },
    usedDistractions: { "day-4-market:market-bell": true },
    inventory: { binding: 2, cigarette: 1 },
    hasRecipe: false,
    caught: 3,
    elapsed: 742.5,
    stageCaughtStart: 2,
    savedAt: 1000
  });

  const restored = Session.decode(raw, 10);
  assert.ok(restored);
  assert.equal(restored.seedInput, 123456);
  assert.equal(restored.stageIndex, 4);
  assert.deepEqual({ ...restored.collected }, { a: true, c: true });
  assert.deepEqual({ ...restored.pickedItems }, { item1: true });
  assert.deepEqual({ ...restored.usedDistractions }, { "day-4-market:market-bell": true });
  assert.deepEqual(restored.inventory, { binding: 2, cigarette: 1 });
  assert.equal(restored.caught, 3);
  assert.equal(restored.stageCaughtStart, 2);
  assert.equal(restored.elapsed, 742.5);
});

test("session decoder rejects malformed or incompatible saves", () => {
  assert.equal(Session.decode("not-json", 10), null);
  assert.equal(Session.decode(JSON.stringify({ version: 999 }), 10), null);

  const invalidStage = Session.encode({
    seedInput: "seed",
    stageIndex: 10,
    collected: {},
    pickedItems: {},
    inventory: { binding: 0, cigarette: 0 },
    hasRecipe: false,
    caught: 0,
    elapsed: 0,
    stageCaughtStart: 0
  });
  assert.equal(Session.decode(invalidStage, 10), null);
});

test("session normalization discards invalid flag and inventory values", () => {
  const snapshot = Session.makeSnapshot({
    seedInput: "seed",
    stageIndex: 1,
    collected: { good: true, ignored: false, nope: "true" },
    pickedItems: null,
    usedDistractions: { used: true, ignored: false },
    inventory: { binding: -2, cigarette: 3 },
    hasRecipe: 1,
    caught: 2,
    elapsed: 10,
    stageCaughtStart: 99
  });

  assert.deepEqual({ ...snapshot.collected }, { good: true });
  assert.deepEqual({ ...snapshot.pickedItems }, {});
  assert.deepEqual({ ...snapshot.usedDistractions }, { used: true });
  assert.deepEqual(snapshot.inventory, { binding: 0, cigarette: 3 });
  assert.equal(snapshot.hasRecipe, false);
  assert.equal(snapshot.stageCaughtStart, 2);
});


test("older v1 saves without diversion state remain compatible", () => {
  const legacy = JSON.stringify({
    version: 1,
    savedAt: 1234,
    seedInput: "legacy-save",
    stageIndex: 2,
    collected: { clue: true },
    pickedItems: { item: true },
    inventory: { binding: 1, cigarette: 2 },
    hasRecipe: false,
    caught: 1,
    elapsed: 245,
    stageCaughtStart: 1
  });

  const restored = Session.decode(legacy, 10);
  assert.ok(restored);
  assert.deepEqual({ ...restored.usedDistractions }, {});
  assert.equal(restored.stageIndex, 2);
  assert.deepEqual(restored.inventory, { binding: 1, cigarette: 2 });
});
