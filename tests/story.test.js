const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Story = require("../src/story.js");

test("opening explains mission, controls, and daily item use", () => {
  const scenes = Story.opening();
  const text = scenes.map(s => s.text + " " + JSON.stringify(s.summary || [])).join(" ");
  assert.match(text, /10일/);
  assert.match(text, /WASD/);
  assert.match(text, /Shift/);
  assert.match(text, /포장끈/);
  assert.match(text, /담배/);
  assert.ok(scenes.some(s => s.portrait === "mom"));
  assert.equal(scenes.length, 6);
  assert.doesNotMatch(text, /민트초코|담뱃재|치약|언니/);
});

test("day five intro brings in sister", () => {
  const scenes = Story.dayIntro({
    day: 5,
    totalDays: 10,
    name: "우리 집",
    intro: "집으로 다시 왔다.",
    objective: "부엌 조사",
    clues: [{}, {}],
    sisterActive: true
  });
  assert.ok(scenes.some(s => s.speaker === "언니" && s.portrait === "sister"));
  assert.ok(scenes.some(s => /집순이 언니|엄마와 언니/.test(s.text)));
  assert.ok(scenes.at(-1).summary.some(([k]) => k === "아이템"));
});

test("caught scene uses the pursuer portrait and preserves progress", () => {
  const scenes = Story.caught("sister", 2);
  assert.equal(scenes[0].portrait, "sister");
  assert.match(scenes.at(-1).text, /시작점/);
  assert.ok(scenes.at(-1).summary.some(([k,v]) => k === "기록" && v === "유지"));
});

test("daily settlement includes clues, item, and catches", () => {
  const scenes = Story.daySummary({
    day: 4,
    location: "전통시장",
    dayCaught: 1,
    cluesFound: 2,
    clueTotal: 2,
    decoysFound: 1,
    itemPicked: true,
    itemName: "담배"
  });
  const rows = scenes.at(-1).summary;
  assert.ok(rows.some(([k]) => k === "핵심 단서"));
  assert.ok(rows.some(([k,v]) => k === "아이템" && /담배/.test(v)));
  assert.ok(rows.some(([k]) => k === "오늘 발각"));
});

test("portrait sources are real PNG paths, not data URIs", () => {
  for (const path of Object.values(Story.PORTRAITS)) {
    assert.match(path, /^\.\/assets\/vn\/.+\.png$/);
    assert.doesNotMatch(path, /^data:/);
  }
});

test("VN portraits are real PNG files, not embedded data strings", () => {
  for (const rel of Object.values(Story.PORTRAITS)) {
    assert.match(rel, /^\.\/assets\/vn\/.+\.png$/);
    assert.equal(rel.startsWith("data:"), false);
    const filePath = path.join(__dirname, "..", rel.replace(/^\.\//, ""));
    assert.equal(fs.existsSync(filePath), true, `missing portrait: ${rel}`);
    const signature = fs.readFileSync(filePath).subarray(0, 8).toString("hex");
    assert.equal(signature, "89504e470d0a1a0a", `not a PNG file: ${rel}`);
  }
});


test("runtime guidance omits fake-recipe examples and does not mention sister before she is active", () => {
  const gamePath = path.join(__dirname, "..", "src", "game.js");
  const gameSource = fs.readFileSync(gamePath, "utf8");

  assert.doesNotMatch(gameSource, /민트초코|담뱃재/);
  assert.match(gameSource, /stage\.sisterActive/);
  assert.match(gameSource, /엄마가 들은 위치를 확인한다/);
  assert.match(gameSource, /엄마와 언니가 각자 들은 위치를 확인한다/);
});


test("persistent gameplay HUD is placed outside the 16:9 playfield", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

  const top = html.indexOf('id="top-status-bar"');
  const playfield = html.indexOf('id="playfield"');
  const bottom = html.indexOf('id="bottom-status-bar"');
  const canvas = html.indexOf('id="game"');

  assert.ok(top >= 0 && playfield > top && canvas > playfield && bottom > canvas);
  assert.match(css, /#game-wrap\s*\{[\s\S]*grid-template-rows:/);
  assert.match(css, /#playfield\s*\{[\s\S]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /#controls\s*\{[\s\S]*position:\s*static/);
  assert.match(css, /#inventory\s*\{[\s\S]*position:\s*static/);
});
