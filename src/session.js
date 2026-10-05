(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = 1;
  const STORAGE_KEY = "holycrab.session.v1";

  const nonNegativeNumber = value => Number.isFinite(value) && value >= 0;
  const nonNegativeInt = value => Number.isInteger(value) && value >= 0;

  function normalizeFlags(value) {
    const out = Object.create(null);
    if (!value || typeof value !== "object" || Array.isArray(value)) return out;
    for (const [key, flag] of Object.entries(value)) {
      if (flag === true && typeof key === "string" && key.length <= 160) out[key] = true;
    }
    return out;
  }

  function normalizeInventory(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      binding: nonNegativeInt(source.binding) ? source.binding : 0,
      cigarette: nonNegativeInt(source.cigarette) ? source.cigarette : 0
    };
  }

  function makeSnapshot(input) {
    const source = input && typeof input === "object" ? input : {};
    const seedInput = typeof source.seedInput === "string" || Number.isFinite(source.seedInput)
      ? source.seedInput
      : null;
    if (seedInput == null) return null;
    if (!nonNegativeInt(source.stageIndex)) return null;
    if (!nonNegativeInt(source.caught)) return null;
    if (!nonNegativeNumber(source.elapsed)) return null;

    const stageCaughtStart = nonNegativeInt(source.stageCaughtStart)
      ? Math.min(source.stageCaughtStart, source.caught)
      : source.caught;

    return {
      version: VERSION,
      savedAt: nonNegativeNumber(source.savedAt) ? source.savedAt : Date.now(),
      seedInput,
      stageIndex: source.stageIndex,
      collected: normalizeFlags(source.collected),
      pickedItems: normalizeFlags(source.pickedItems),
      inventory: normalizeInventory(source.inventory),
      hasRecipe: source.hasRecipe === true,
      caught: source.caught,
      elapsed: source.elapsed,
      stageCaughtStart
    };
  }

  function validateSnapshot(value, campaignLength = 10) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (value.version !== VERSION) return false;
    if (!(typeof value.seedInput === "string" || Number.isFinite(value.seedInput))) return false;
    if (!nonNegativeInt(value.stageIndex) || value.stageIndex >= campaignLength) return false;
    if (!nonNegativeInt(value.caught)) return false;
    if (!nonNegativeNumber(value.elapsed)) return false;
    if (!nonNegativeInt(value.stageCaughtStart) || value.stageCaughtStart > value.caught) return false;
    if (typeof value.hasRecipe !== "boolean") return false;
    if (!value.inventory || !nonNegativeInt(value.inventory.binding) || !nonNegativeInt(value.inventory.cigarette)) return false;
    if (!value.collected || typeof value.collected !== "object" || Array.isArray(value.collected)) return false;
    if (!value.pickedItems || typeof value.pickedItems !== "object" || Array.isArray(value.pickedItems)) return false;
    return true;
  }

  function encode(snapshot) {
    const normalized = makeSnapshot(snapshot);
    return normalized ? JSON.stringify(normalized) : null;
  }

  function decode(raw, campaignLength = 10) {
    if (typeof raw !== "string" || !raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!validateSnapshot(parsed, campaignLength)) return null;
      return makeSnapshot(parsed);
    } catch (_) {
      return null;
    }
  }

  return {
    VERSION,
    STORAGE_KEY,
    makeSnapshot,
    validateSnapshot,
    encode,
    decode
  };
});
