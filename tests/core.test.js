const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");

test("clamp constrains values", () => {
  assert.equal(C.clamp(5, 0, 10), 5);
  assert.equal(C.clamp(-2, 0, 10), 0);
  assert.equal(C.clamp(12, 0, 10), 10);
});

test("line of sight is blocked by a wall", () => {
  const wall = { x: 40, y: 0, w: 20, h: 100 };
  assert.equal(C.hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [wall]), false);
  assert.equal(C.hasLineOfSight({ x: 0, y: 120 }, { x: 100, y: 120 }, [wall]), true);
});

test("vision cone respects range, angle, and blockers", () => {
  const observer = { x: 0, y: 0, angle: 0 };
  assert.equal(C.inVisionCone(observer, { x: 80, y: 0 }, 100, Math.PI / 2, []), true);
  assert.equal(C.inVisionCone(observer, { x: -80, y: 0 }, 100, Math.PI / 2, []), false);
  assert.equal(C.inVisionCone(observer, { x: 120, y: 0 }, 100, Math.PI / 2, []), false);
});

test("circle movement stops at furniture", () => {
  const p = { x: 20, y: 50 };
  const wall = { x: 50, y: 0, w: 20, h: 100 };
  const moved = C.moveCircle(p, 50, 0, 10, [wall], { x: 0, y: 0, w: 200, h: 200 });
  assert.equal(moved.x, 40);
  assert.equal(moved.y, 50);
});

test("nearest interactable picks the closest enabled object", () => {
  const p = { x: 0, y: 0 };
  const objects = [
    { id: "far", x: 20, y: 0 },
    { id: "disabled", x: 2, y: 0, disabled: true },
    { id: "near", x: 5, y: 0 }
  ];
  assert.equal(C.nearestInteractable(p, objects, 30).id, "near");
});

test("run rank rewards clean fast play", () => {
  assert.equal(C.rankRun({ caught: 0, seconds: 180 }).rank, "S");
  assert.equal(C.rankRun({ caught: 1, seconds: 300 }).rank, "A");
  assert.equal(C.rankRun({ caught: 3, seconds: 700 }).rank, "B");
  assert.equal(C.rankRun({ caught: 5, seconds: 900 }).rank, "C");
});


test("path planner routes a watcher around blocking furniture", () => {
  const bounds = { x: 0, y: 0, w: 300, h: 220 };
  const solids = [{ x: 120, y: 40, w: 60, h: 140 }];
  const start = { x: 60, y: 110 };
  const target = { x: 240, y: 110 };
  const plan = C.planCirclePath(start, target, 16, solids, bounds, 24);

  assert.equal(plan.exact, true);
  assert.ok(plan.points.length >= 2);
  let cursor = start;
  for (const waypoint of plan.points) {
    assert.equal(C.segmentClearForCircle(cursor, waypoint, 16, solids, bounds), true);
    cursor = waypoint;
  }
  assert.ok(C.dist(cursor, target) < 1);
});
