const test = require("node:test");
const assert = require("node:assert/strict");
const VN = require("../src/vn.js");

test("VN opening explains the mission and controls", () => {
  const lines = VN.opening();
  assert.ok(lines.length >= 6);
  assert.ok(lines.some(x => x.text.includes("10일")));
  assert.ok(lines.some(x => x.text.includes("WASD")));
  assert.ok(lines.some(x => x.text.includes("포장끈")));
  assert.ok(lines.some(x => x.portrait === "mom"));
});

test("day five introduces the sister", () => {
  const lines = VN.dayIntro({ day: 5, name: "우리 집", objective: "단서 찾기", sisterActive: true });
  assert.ok(lines.some(x => x.portrait === "sister"));
  assert.ok(lines.some(x => x.speaker === "언니"));
});

test("caught and summary scenes reuse the VN format", () => {
  const caught = VN.caught("sister", 2, 6);
  const summary = VN.daySummary({ day: 6 }, { clues: 2, decoys: 1, item: "cigarette", caught: 1, binding: 2, cigarette: 1 });
  assert.equal(caught[0].portrait, "sister");
  assert.ok(summary.some(x => x.text.includes("DAY 6 결산")));
  assert.ok(summary.some(x => x.text.includes("담배 획득")));
});

test("all portrait asset paths point to PNG files", () => {
  for (const path of Object.values(VN.ASSETS)) assert.match(path, /\.png$/);
});
