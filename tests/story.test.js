const test = require("node:test");
const assert = require("node:assert/strict");
const Story = require("../src/story.js");

test("opening teaches the core controls and item keys", () => {
  const scenes = Story.opening();
  const text = scenes.map(x => x.text + JSON.stringify(x.summary || [])).join(" ");
  assert.match(text, /WASD/);
  assert.match(text, /Shift/);
  assert.match(text, /포장끈/);
  assert.match(text, /담배/);
});

test("day intro adds sister dialogue when sister is active", () => {
  const base = { day: 5, totalDays: 10, name: "전통시장", intro: "시장에 왔다.", objective: "단서 찾기", clues: [{}, {}], sisterActive: true };
  const scenes = Story.dayIntro(base);
  assert.ok(scenes.some(x => x.speaker === "언니" && x.portrait === "sister"));
  assert.ok(scenes.some(x => Array.isArray(x.summary)));
});

test("caught scene reuses the relevant pursuer portrait", () => {
  const mom = Story.caught("mom", 1);
  const sister = Story.caught("sister", 2);
  assert.equal(mom[0].portrait, "mom");
  assert.equal(sister[0].portrait, "sister");
  assert.match(sister.at(-1).text, /시작점/);
});

test("day summary carries the requested settlement fields", () => {
  const scenes = Story.daySummary({
    day: 3, location: "반찬가게", dayCaught: 1,
    cluesFound: 2, clueTotal: 2, decoysFound: 1,
    itemPicked: true, itemName: "포장끈"
  });
  const rows = scenes.at(-1).summary;
  assert.ok(rows.some(([k]) => k === "핵심 단서"));
  assert.ok(rows.some(([k]) => k === "아이템"));
  assert.ok(rows.some(([k]) => k === "오늘 발각"));
});
