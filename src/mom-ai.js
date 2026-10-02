(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabMomAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATES = Object.freeze({
    PATROL: "patrol",
    INVESTIGATE: "investigate",
    SEARCH: "search",
    CHASE: "chase",
    RETURN: "return"
  });

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function createBrain(alertness = 0) {
    return {
      state: STATES.PATROL,
      alertness: clamp(alertness, 0, 1),
      confidence: 0,
      lastSeen: null,
      lastHeard: null,
      searchPoints: [],
      searchIndex: 0,
      stateTimer: 0,
      patrolPause: 0,
      scanPhase: 0,
      sightings: 0
    };
  }

  function effectiveVisionRange(baseRange, player, alertness) {
    const movement = player.moving ? 1.06 : .96;
    const sneak = player.sneaking ? .86 : 1;
    const escalation = 1 + clamp(alertness, 0, 1) * .20;
    return baseRange * movement * sneak * escalation;
  }

  function effectiveFov(baseFov, alertness, state) {
    let stateFactor = 1;
    if (state === STATES.SEARCH) stateFactor = 1.18;
    if (state === STATES.CHASE) stateFactor = 1.08;
    return baseFov * stateFactor * (1 + clamp(alertness, 0, 1) * .08);
  }

  function detectionGain(distance, range, player, alertness, state) {
    const proximity = clamp(1 - distance / Math.max(1, range), 0, 1);
    let rate = .27 + proximity * .86;
    if (distance < 90) rate += .32;
    if (player.moving) rate *= 1.12;
    if (player.sneaking) rate *= .64;
    if (state === STATES.SEARCH) rate *= 1.14;
    if (state === STATES.CHASE) rate *= 1.35;
    rate *= 1 + clamp(alertness, 0, 1) * .28;
    return rate;
  }

  function suspicionDecay(alertness, state) {
    if (state === STATES.CHASE) return .05;
    if (state === STATES.SEARCH) return .10;
    return .20 - clamp(alertness, 0, 1) * .07;
  }

  function hearingRadius(baseRadius, hearingMultiplier, alertness, blocked) {
    const escalation = 1 + clamp(alertness, 0, 1) * .25;
    const occlusion = blocked ? .56 : 1;
    return baseRadius * (hearingMultiplier || 1) * escalation * occlusion;
  }

  function rememberSeen(brain, point) {
    brain.lastSeen = { x: point.x, y: point.y };
    brain.confidence = 1;
    brain.alertness = clamp(brain.alertness + .16, 0, 1);
    brain.sightings += 1;
    brain.state = STATES.CHASE;
    brain.stateTimer = 1.55 + brain.alertness * .9;
  }

  function rememberHeard(brain, point, strength = 1) {
    const s = clamp(strength, .1, 1.5);
    brain.lastHeard = { x: point.x, y: point.y };
    brain.confidence = Math.max(brain.confidence, .38 + .28 * s);
    brain.alertness = clamp(brain.alertness + .045 * s, 0, 1);
    if (brain.state !== STATES.CHASE) {
      brain.state = STATES.INVESTIGATE;
      brain.stateTimer = 2.3 + s * 1.7;
    }
  }

  function coolBrain(brain, dt) {
    const active = brain.state !== STATES.PATROL && brain.state !== STATES.RETURN;
    brain.alertness = clamp(brain.alertness - dt * (active ? .008 : .018), 0, 1);
    brain.confidence = clamp(brain.confidence - dt * (active ? .035 : .09), 0, 1);
    brain.scanPhase += dt;
  }

  function makeSearchPattern(origin, bounds, radius = 110) {
    if (!origin) return [];
    const offsets = [
      [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1],
      [.72, .72], [-.72, .72], [-.72, -.72], [.72, -.72]
    ];
    return offsets.map(([ox, oy], i) => {
      const scale = i === 0 ? 0 : radius * (i <= 4 ? 1 : .86);
      return {
        x: clamp(origin.x + ox * scale, bounds.x + 28, bounds.x + bounds.w - 28),
        y: clamp(origin.y + oy * scale, bounds.y + 28, bounds.y + bounds.h - 28)
      };
    });
  }

  function beginSearch(brain, origin, bounds, radius) {
    const center = origin || brain.lastSeen || brain.lastHeard;
    brain.searchPoints = makeSearchPattern(center, bounds, radius || 110 + brain.alertness * 55);
    brain.searchIndex = 0;
    brain.state = STATES.SEARCH;
    brain.stateTimer = 6.2 + brain.alertness * 4.2;
  }

  function predictTarget(player, velocity, bounds, lookAhead) {
    const t = clamp(lookAhead == null ? .38 : lookAhead, 0, .8);
    return {
      x: clamp(player.x + (velocity.x || 0) * t, bounds.x + 20, bounds.x + bounds.w - 20),
      y: clamp(player.y + (velocity.y || 0) * t, bounds.y + 20, bounds.y + bounds.h - 20)
    };
  }

  function nearestPatrolIndex(position, patrol) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < patrol.length; i += 1) {
      const dx = patrol[i].x - position.x;
      const dy = patrol[i].y - position.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function stateLabel(state) {
    switch (state) {
      case STATES.CHASE: return "엄마 · 발견!";
      case STATES.SEARCH: return "엄마 · 수색 중";
      case STATES.INVESTIGATE: return "엄마 · 소리 확인";
      case STATES.RETURN: return "엄마 · 돌아가는 중";
      default: return "엄마";
    }
  }

  return {
    STATES,
    createBrain,
    effectiveVisionRange,
    effectiveFov,
    detectionGain,
    suspicionDecay,
    hearingRadius,
    rememberSeen,
    rememberHeard,
    coolBrain,
    makeSearchPattern,
    beginSearch,
    predictTarget,
    nearestPatrolIndex,
    stateLabel
  };
});
