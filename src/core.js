(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function circleOverlapsRect(c, radius, r) {
    const nx = clamp(c.x, r.x, r.x + r.w);
    const ny = clamp(c.y, r.y, r.y + r.h);
    const dx = c.x - nx;
    const dy = c.y - ny;
    return dx * dx + dy * dy < radius * radius;
  }

  function moveCircle(pos, dx, dy, radius, solids, bounds) {
    const next = { x: pos.x, y: pos.y };

    next.x = clamp(next.x + dx, bounds.x + radius, bounds.x + bounds.w - radius);
    for (const r of solids) {
      if (circleOverlapsRect(next, radius, r)) {
        if (dx > 0) next.x = r.x - radius;
        else if (dx < 0) next.x = r.x + r.w + radius;
      }
    }

    next.y = clamp(next.y + dy, bounds.y + radius, bounds.y + bounds.h - radius);
    for (const r of solids) {
      if (circleOverlapsRect(next, radius, r)) {
        if (dy > 0) next.y = r.y - radius;
        else if (dy < 0) next.y = r.y + r.h + radius;
      }
    }

    return next;
  }

  function orientation(a, b, c) {
    const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(v) < 1e-9) return 0;
    return v > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return (
      b.x <= Math.max(a.x, c.x) + 1e-9 &&
      b.x + 1e-9 >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) + 1e-9 &&
      b.y + 1e-9 >= Math.min(a.y, c.y)
    );
  }

  function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;
    return false;
  }

  function segmentHitsRect(a, b, r) {
    if (pointInRect(a, r) || pointInRect(b, r)) return true;
    const tl = { x: r.x, y: r.y };
    const tr = { x: r.x + r.w, y: r.y };
    const br = { x: r.x + r.w, y: r.y + r.h };
    const bl = { x: r.x, y: r.y + r.h };
    return (
      segmentsIntersect(a, b, tl, tr) ||
      segmentsIntersect(a, b, tr, br) ||
      segmentsIntersect(a, b, br, bl) ||
      segmentsIntersect(a, b, bl, tl)
    );
  }

  function hasLineOfSight(a, b, blockers) {
    return !blockers.some((r) => segmentHitsRect(a, b, r));
  }

  function inVisionCone(observer, target, range, fovRadians, blockers) {
    const d = dist(observer, target);
    if (d > range) return false;

    const targetAngle = Math.atan2(target.y - observer.y, target.x - observer.x);
    if (Math.abs(angleDiff(targetAngle, observer.angle)) > fovRadians / 2) return false;
    return hasLineOfSight(observer, target, blockers);
  }

  function nearestInteractable(player, objects, maxDistance) {
    let best = null;
    let bestDistance = maxDistance;
    for (const obj of objects) {
      if (obj.disabled) continue;
      const d = dist(player, obj);
      if (d <= bestDistance) {
        best = obj;
        bestDistance = d;
      }
    }
    return best;
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function rankRun({ caught, seconds }) {
    if (caught === 0 && seconds < 240) return { rank: "S", label: "게장 괴도" };
    if (caught <= 1 && seconds < 420) return { rank: "A", label: "새벽의 집게발" };
    if (caught <= 3) return { rank: "B", label: "무난한 절도(?)" };
    return { rank: "C", label: "엄마가 다 알고 있었음" };
  }

  return {
    clamp,
    dist,
    angleDiff,
    pointInRect,
    circleOverlapsRect,
    moveCircle,
    segmentsIntersect,
    segmentHitsRect,
    hasLineOfSight,
    inVisionCone,
    nearestInteractable,
    formatTime,
    rankRun
  };
});
