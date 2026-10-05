const test = require("node:test");
const assert = require("node:assert/strict");
const Campaign = require("../src/stages.js");
const AI = require("../src/mom-ai.js");
const C = require("../src/core.js");

test("campaign spans ten days with exactly three home visits", () => {
  const c = Campaign.generateCampaign("holycrab-test-seed");
  assert.equal(c.stages.length, 10);
  assert.equal(c.stages[0].locationKey, "home");
  assert.equal(c.stages.at(-1).locationKey, "home");
  assert.equal(c.stages.at(-1).id, "home-finale");

  const locations = c.stages.map(s => s.locationKey);
  assert.equal(locations.filter(x => x === "home").length, 3);
  assert.equal(locations.filter(x => x === "market" || x === "banchan").length, 7);

  const market = locations.filter(x => x === "market").length;
  const banchan = locations.filter(x => x === "banchan").length;
  assert.ok((market === 4 && banchan === 3) || (market === 3 && banchan === 4));
});

test("middle route avoids immediate duplicate locations", () => {
  const seeds = ["route-a", "route-b", "route-c", "route-d", "route-e"];
  for (const seed of seeds) {
    const c = Campaign.generateCampaign(seed);
    for (let i = 1; i < c.stages.length; i += 1) {
      assert.notEqual(c.stages[i].locationKey, c.stages[i - 1].locationKey);
    }
  }
});

test("there is exactly one middle home revisit before the finale", () => {
  const seeds = ["home-a", "home-b", "home-c", "home-d", "home-e"];
  for (const seed of seeds) {
    const c = Campaign.generateCampaign(seed);
    const middle = c.stages.slice(1, -1);
    assert.equal(middle.filter(s => s.locationKey === "home").length, 1);
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

test("market and banchan repeated visits always use fresh clue ids", () => {
  const c = Campaign.generateCampaign("fresh-clues");
  const ids = new Set();
  for (const stage of c.stages) {
    for (const clue of stage.clues) {
      assert.equal(ids.has(clue.id), false, `duplicate clue id: ${clue.id}`);
      ids.add(clue.id);
    }
  }
});

test("each day mixes required clues with decoy or irrelevant records", () => {
  const c = Campaign.generateCampaign("decoy-evidence-seed");
  const ids = new Set();

  for (const stage of c.stages) {
    assert.ok(Array.isArray(stage.decoys));
    assert.ok(stage.decoys.length >= 2);
    assert.equal(stage.entries.length, stage.clues.length + stage.decoys.length);

    const required = new Set(stage.clues.map(x => x.id));
    for (const decoy of stage.decoys) {
      assert.equal(required.has(decoy.id), false);
      assert.equal(ids.has(decoy.id), false);
      ids.add(decoy.id);
      assert.ok(decoy.flavor || decoy.obviousFake);
    }
  }
});

test("fake recipes are obvious flavor-only distractions with no comparison metadata", () => {
  const c = Campaign.generateCampaign("obvious-fakes");
  const decoys = c.stages.flatMap(stage => stage.decoys);

  assert.equal(decoys.some(decoy => "resolvesWith" in decoy), false);
  assert.ok(decoys.some(decoy => decoy.obviousFake && /민트초코|담뱃재|치약|초콜릿|라면|마요네즈/.test(decoy.text)));

  for (const decoy of decoys) {
    assert.ok(decoy.flavor || decoy.obviousFake);
  }
});

test("later days increase misleading record density", () => {
  const c = Campaign.generateCampaign("decoy-density-seed");
  for (const stage of c.stages.slice(0, 4)) {
    assert.equal(stage.decoys.length, 2);
  }
  for (const stage of c.stages.slice(4)) {
    assert.equal(stage.decoys.length, 3);
  }
});

test("campaign places one collectible per day with a balanced non-repetitive item plan", () => {
  for (const seed of ["item-seed-a", "item-seed-b", "item-seed-c", "item-seed-d"]) {
    const c = Campaign.generateCampaign(seed);
    assert.equal(c.stages.length, 10);
    assert.equal(c.itemPlan.length, 10);

    const items = [];
    for (const stage of c.stages) {
      assert.equal(stage.items.length, 1);
      const item = stage.items[0];
      items.push(item);
      assert.ok(Number.isFinite(item.x));
      assert.ok(Number.isFinite(item.y));
      assert.ok(["binding", "cigarette"].includes(item.type));
    }

    assert.equal(items.filter(item => item.type === "binding").length, 5);
    assert.equal(items.filter(item => item.type === "cigarette").length, 5);
    assert.deepEqual(items.map(item => item.type), c.itemPlan);

    for (let i = 2; i < c.itemPlan.length; i += 1) {
      assert.equal(
        c.itemPlan[i] === c.itemPlan[i - 1] && c.itemPlan[i] === c.itemPlan[i - 2],
        false,
        `${seed}: item streak longer than two days`
      );
    }
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


test("interior passage markers are preserved for navigation readability", () => {
  const home = Campaign.LOCATIONS.home;
  const market = Campaign.LOCATIONS.market;
  const banchan = Campaign.LOCATIONS.banchan;

  assert.equal(home.passages.length, 2);
  assert.deepEqual(home.passages.map(p => [p.x, p.y, p.w, p.h]), [
    [430, 272, 18, 126],
    [960, 220, 18, 130]
  ]);
  assert.equal(market.passages.length, 0);
  assert.equal(banchan.passages.length, 1);
  assert.deepEqual(
    [banchan.passages[0].x, banchan.passages[0].y, banchan.passages[0].w, banchan.passages[0].h],
    [920, 314, 18, 116]
  );

  for (const location of [home, market, banchan]) {
    assert.ok(location.palette.wallEdge);
    assert.ok(location.palette.exitLocked);
    assert.ok(location.palette.exitReady);
  }
});


test("watcher spawns and patrol points stay clear of walls and furniture", () => {
  const overlaps = (point, radius, rect) => {
    const nx = Math.max(rect.x, Math.min(point.x, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(point.y, rect.y + rect.h));
    const dx = point.x - nx;
    const dy = point.y - ny;
    return dx * dx + dy * dy < radius * radius;
  };

  for (let i = 0; i < 80; i += 1) {
    const c = Campaign.generateCampaign(`watcher-clear-${i}`);
    for (const stage of c.stages) {
      const solids = [...(stage.walls || []), ...(stage.furniture || [])];

      assert.equal(solids.some(rect => overlaps(stage.momSpawn, 19, rect)), false, `${stage.id}: mom spawn blocked`);
      assert.equal(stage.patrolMom.some(point => solids.some(rect => overlaps(point, 19, rect))), false, `${stage.id}: mom patrol blocked`);

      if (stage.sisterActive) {
        assert.equal(solids.some(rect => overlaps(stage.sisterSpawn, 17, rect)), false, `${stage.id}: sister spawn blocked`);
        assert.equal(stage.patrolSister.some(point => solids.some(rect => overlaps(point, 17, rect))), false, `${stage.id}: sister patrol blocked`);
      }
    }
  }
});

test("home sister starts in open living-room floor instead of the pantry edge", () => {
  const home = Campaign.LOCATIONS.home;
  assert.deepEqual(
    { x: home.sisterSpawn.x, y: home.sisterSpawn.y },
    { x: 780, y: 700 }
  );

  const distanceToKitchenPassage = Math.hypot(
    home.sisterSpawn.x - (960 + 9),
    home.sisterSpawn.y - (220 + 65)
  );
  assert.ok(distanceToKitchenPassage > 180);
});


test("generated NPC routes remain connected around obstacles", () => {
  for (let i = 0; i < 40; i += 1) {
    const campaign = Campaign.generateCampaign("navigation-" + i);
    for (const stage of campaign.stages) {
      const result = C.validateStageNavigation(stage, 28);
      assert.equal(result.ok, true, stage.id + ": " + (result.reason || "route failed"));
    }
  }
});


test("continuous sight does not repeatedly spike watcher alertness", () => {
  const brain = AI.createBrain(.2);
  AI.rememberSeen(brain, { x: 10, y: 10 });
  const firstAlert = brain.alertness;
  const firstSightings = brain.sightings;
  AI.rememberSeen(brain, { x: 20, y: 10 });
  AI.rememberSeen(brain, { x: 30, y: 10 });
  assert.equal(brain.alertness, firstAlert);
  assert.equal(brain.sightings, firstSightings);
});


test("generated stage interaction points stay separated", () => {
  for (let i = 0; i < 40; i += 1) {
    const campaign = Campaign.generateCampaign("layout-" + i);
    for (const stage of campaign.stages) {
      const result = Campaign.validateStage(stage);
      assert.equal(result.ok, true, stage.id + ": " + (result.reason || "layout check failed"));
    }
  }
});


test("sister difficulty ramps from day five instead of entering near finale strength", () => {
  const c = Campaign.generateCampaign("sister-ramp");
  const day5 = c.stages[4];
  const day9 = c.stages[8];
  const finale = c.stages[9];

  assert.equal(day5.sisterActive, true);
  assert.ok(day5.sisterAI.patrolSpeed <= 84);
  assert.ok(day5.sisterAI.chaseSpeed <= 140);
  assert.ok(day5.sisterAI.visionRange <= 210);

  assert.ok(day9.sisterAI.patrolSpeed > day5.sisterAI.patrolSpeed);
  assert.ok(day9.sisterAI.chaseSpeed > day5.sisterAI.chaseSpeed);
  assert.ok(day9.sisterAI.visionRange > day5.sisterAI.visionRange);

  assert.ok(finale.sisterAI.chaseSpeed > day9.sisterAI.chaseSpeed);
});

test("repeat visits vary patrol phase without leaving the supported range", () => {
  const phases = new Set();
  for (let i = 0; i < 30; i += 1) {
    const c = Campaign.generateCampaign("phase-" + i);
    for (const stage of c.stages.slice(0, -1)) {
      assert.ok(stage.patrolPhase >= 0 && stage.patrolPhase <= 2);
      assert.ok(stage.sisterPatrolPhase >= 0 && stage.sisterPatrolPhase <= 2);
      phases.add(stage.patrolPhase);
      phases.add(stage.sisterPatrolPhase);
    }
  }
  assert.ok(phases.size >= 3);
});


test("retry spawns are valid and prevent the banchan exit teleport shortcut", () => {
  const banchan = Campaign.LOCATIONS.banchan;
  assert.ok(banchan.retrySpawn);

  const distanceToExit = Math.hypot(
    banchan.retrySpawn.x - banchan.exit.x,
    banchan.retrySpawn.y - banchan.exit.y
  );
  assert.ok(distanceToExit > 400);

  for (let i = 0; i < 30; i += 1) {
    const campaign = Campaign.generateCampaign("retry-" + i);
    for (const stage of campaign.stages) {
      assert.deepEqual(Campaign.validateStage(stage), { ok: true });
    }
  }
});


test("repeat visits materially change map layout and stealth resources", () => {
  for (let i = 0; i < 30; i += 1) {
    const campaign = Campaign.generateCampaign("layout-variation-" + i);
    for (const locationKey of ["home", "market", "banchan"]) {
      const visits = campaign.stages.filter(stage => stage.locationKey === locationKey);
      const layoutKeys = visits.map(stage => stage.layoutKey);
      assert.equal(
        new Set(layoutKeys).size,
        visits.length,
        `${locationKey}: repeated visit reused layout key`
      );

      const signatures = visits.map(stage => JSON.stringify({
        furniture: stage.furniture.map(item => [item.kind, item.label, item.x, item.y, item.w, item.h]),
        hides: stage.hideSpots.map(item => item.id),
        distractions: stage.distractions.map(item => item.id)
      }));
      assert.equal(
        new Set(signatures).size,
        visits.length,
        `${locationKey}: repeated visit reused the same physical/resource layout`
      );
    }
  }
});

test("visit-specific solid props keep NPC navigation valid", () => {
  for (let i = 0; i < 50; i += 1) {
    const campaign = Campaign.generateCampaign("variant-nav-" + i);
    for (const stage of campaign.stages) {
      assert.ok(stage.layoutKey);
      assert.ok(stage.layoutName);
      const navigation = C.validateStageNavigation(stage, 28);
      assert.equal(navigation.ok, true, `${stage.id} / ${stage.layoutKey}: ${navigation.reason || "blocked"}`);
    }
  }
});

test("finale uses its own lockdown layout with reduced safe resources", () => {
  const campaign = Campaign.generateCampaign("final-layout");
  const finale = campaign.stages.at(-1);

  assert.equal(finale.layoutKey, "home-finale-lockdown");
  assert.ok(finale.furniture.some(item => item.kind === "visit-prop"));
  assert.deepEqual(finale.hideSpots.map(item => item.id).sort(), ["home-island", "home-wardrobe"]);
  assert.deepEqual(finale.distractions.map(item => item.id).sort(), ["home-microwave", "home-tv"]);
});
