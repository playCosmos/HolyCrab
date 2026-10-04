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


  function pointClearForCircle(point, radius, solids, bounds) {
    if (
      point.x < bounds.x + radius ||
      point.x > bounds.x + bounds.w - radius ||
      point.y < bounds.y + radius ||
      point.y > bounds.y + bounds.h - radius
    ) return false;
    return !(solids || []).some(rect => circleOverlapsRect(point, radius, rect));
  }

  function expandedRect(rect, amount) {
    return {
      x: rect.x - amount,
      y: rect.y - amount,
      w: rect.w + amount * 2,
      h: rect.h + amount * 2
    };
  }

  function segmentClearForCircle(a, b, radius, solids, bounds) {
    if (!pointClearForCircle(a, radius, solids, bounds)) return false;
    if (!pointClearForCircle(b, radius, solids, bounds)) return false;
    return !(solids || []).some(rect => segmentHitsRect(a, b, expandedRect(rect, radius)));
  }

  function planCirclePath(start, target, radius, solids, bounds, cellSize = 28) {
    if (segmentClearForCircle(start, target, radius, solids, bounds)) {
      return { points: [{ x: target.x, y: target.y }], target: { x: target.x, y: target.y }, exact: true };
    }

    const minX = bounds.x + radius;
    const maxX = bounds.x + bounds.w - radius;
    const minY = bounds.y + radius;
    const maxY = bounds.y + bounds.h - radius;
    const step = Math.max(18, Number(cellSize) || 28);
    const cols = Math.max(2, Math.floor((maxX - minX) / step) + 1);
    const rows = Math.max(2, Math.floor((maxY - minY) / step) + 1);

    const key = (x, y) => y * cols + x;
    const pointFor = (x, y) => ({
      x: clamp(minX + x * step, minX, maxX),
      y: clamp(minY + y * step, minY, maxY)
    });
    const cellFor = point => ({
      x: clamp(Math.round((point.x - minX) / step), 0, cols - 1),
      y: clamp(Math.round((point.y - minY) / step), 0, rows - 1)
    });
    const freeCell = (x, y) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
      return pointClearForCircle(pointFor(x, y), radius, solids, bounds);
    };

    function nearestFreeCell(point, requireVisible) {
      const origin = cellFor(point);
      const maxRing = Math.max(cols, rows);
      let best = null;
      let bestDistance = Infinity;
      for (let ring = 0; ring <= maxRing; ring += 1) {
        for (let y = origin.y - ring; y <= origin.y + ring; y += 1) {
          for (let x = origin.x - ring; x <= origin.x + ring; x += 1) {
            if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== ring) continue;
            if (!freeCell(x, y)) continue;
            const p = pointFor(x, y);
            if (requireVisible && !segmentClearForCircle(point, p, radius, solids, bounds)) continue;
            const d = dist(point, p);
            if (d < bestDistance) {
              best = { x, y };
              bestDistance = d;
            }
          }
        }
        if (best) return best;
      }
      return null;
    }

    const startCell = nearestFreeCell(start, true);
    const goalCell = nearestFreeCell(target, false);
    if (!startCell || !goalCell) {
      return { points: [], target: { x: start.x, y: start.y }, exact: false };
    }

    const startKey = key(startCell.x, startCell.y);
    const goalKey = key(goalCell.x, goalCell.y);
    const open = [startKey];
    const openSet = new Set(open);
    const cameFrom = new Map();
    const gScore = new Map([[startKey, 0]]);
    const fScore = new Map([[startKey, dist(pointFor(startCell.x, startCell.y), pointFor(goalCell.x, goalCell.y))]]);
    const coords = new Map([[startKey, startCell]]);
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    let found = false;
    let guard = cols * rows * 4;
    while (open.length && guard-- > 0) {
      let bestIndex = 0;
      let currentKey = open[0];
      let currentF = fScore.get(currentKey) ?? Infinity;
      for (let i = 1; i < open.length; i += 1) {
        const candidateF = fScore.get(open[i]) ?? Infinity;
        if (candidateF < currentF) {
          currentF = candidateF;
          currentKey = open[i];
          bestIndex = i;
        }
      }
      open.splice(bestIndex, 1);
      openSet.delete(currentKey);
      if (currentKey === goalKey) {
        found = true;
        break;
      }

      const current = coords.get(currentKey);
      const currentPoint = pointFor(current.x, current.y);
      for (const [ox, oy] of directions) {
        const nx = current.x + ox;
        const ny = current.y + oy;
        if (!freeCell(nx, ny)) continue;

        if (ox !== 0 && oy !== 0) {
          if (!freeCell(current.x + ox, current.y) || !freeCell(current.x, current.y + oy)) continue;
        }

        const nextPoint = pointFor(nx, ny);
        if (!segmentClearForCircle(currentPoint, nextPoint, radius, solids, bounds)) continue;

        const nextKey = key(nx, ny);
        coords.set(nextKey, { x: nx, y: ny });
        const tentative = (gScore.get(currentKey) ?? Infinity) + dist(currentPoint, nextPoint);
        if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;

        cameFrom.set(nextKey, currentKey);
        gScore.set(nextKey, tentative);
        fScore.set(nextKey, tentative + dist(nextPoint, pointFor(goalCell.x, goalCell.y)));
        if (!openSet.has(nextKey)) {
          open.push(nextKey);
          openSet.add(nextKey);
        }
      }
    }

    if (!found) {
      return { points: [], target: { x: start.x, y: start.y }, exact: false };
    }

    const raw = [];
    let cursor = goalKey;
    while (cursor !== startKey) {
      const c = coords.get(cursor);
      if (!c) break;
      raw.push(pointFor(c.x, c.y));
      cursor = cameFrom.get(cursor);
      if (cursor == null) break;
    }
    raw.reverse();

    const goalPoint = pointFor(goalCell.x, goalCell.y);
    let resolvedTarget = goalPoint;
    let exact = false;
    if (pointClearForCircle(target, radius, solids, bounds) &&
        segmentClearForCircle(goalPoint, target, radius, solids, bounds)) {
      resolvedTarget = { x: target.x, y: target.y };
      exact = true;
    }

    const candidates = raw.slice();
    if (!candidates.length || dist(candidates.at(-1), resolvedTarget) > 1) candidates.push(resolvedTarget);

    const simplified = [];
    let anchorPoint = { x: start.x, y: start.y };
    let index = 0;
    while (index < candidates.length) {
      let furthest = -1;
      for (let j = candidates.length - 1; j >= index; j -= 1) {
        if (segmentClearForCircle(anchorPoint, candidates[j], radius, solids, bounds)) {
          furthest = j;
          break;
        }
      }
      if (furthest < 0) {
        return { points: [], target: { x: start.x, y: start.y }, exact: false };
      }
      simplified.push(candidates[furthest]);
      anchorPoint = candidates[furthest];
      index = furthest + 1;
    }

    return { points: simplified, target: resolvedTarget, exact };
  }

  function validateStageNavigation(stage, cellSize = 28) {
    const solids = [...(stage.walls || []), ...(stage.furniture || [])];
    const stageBounds = stage.bounds || { x: 14, y: 14, w: 1412, h: 782 };

    function validateRoute(role, spawn, patrol, radius) {
      if (!spawn || !Array.isArray(patrol) || patrol.length < 2) {
        return { ok: false, reason: `${role} navigation data missing` };
      }
      const points = [spawn, ...patrol, patrol[0]];
      for (let i = 0; i < points.length - 1; i += 1) {
        const plan = planCirclePath(points[i], points[i + 1], radius, solids, stageBounds, cellSize);
        if (!plan.points.length || !plan.exact) {
          return {
            ok: false,
            reason: `${role} route unreachable: ${i} -> ${i + 1}`,
            from: points[i],
            to: points[i + 1]
          };
        }
      }
      return { ok: true };
    }

    const mom = validateRoute("mom", stage.momSpawn, stage.patrolMom, 19);
    if (!mom.ok) return mom;
    if (stage.sisterActive) {
      const sister = validateRoute("sister", stage.sisterSpawn, stage.patrolSister, 17);
      if (!sister.ok) return sister;
    }
    return { ok: true };
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
    pointClearForCircle,
    segmentClearForCircle,
    planCirclePath,
    validateStageNavigation,
    segmentsIntersect,
    segmentHitsRect,
    hasLineOfSight,
    inVisionCone,
    nearestInteractable,
    formatTime,
    rankRun
  };
});
