/**
 * reasonBuilder.js
 *
 * Helpers that collapse the arrays of reasons, warnings, and safety
 * notes accumulated during scoring into the final stable shape that
 * the frontend consumes. Centralising the shape here means every
 * recommendation scorer stays simple (just push into arrays) and the
 * contract with consumers lives in one place.
 */

const DEFAULT_DISCLAIMER = 'Recommendations are informational and do not replace guidance from a healthcare professional.';

function dedupeBy(items, getKey) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function compactReasons(reasons) {
  return dedupeBy(reasons, (r) => `${r.tag}`).sort((a, b) => (b.weight || 0) - (a.weight || 0));
}

function compactWarnings(warnings) {
  const severityOrder = { high: 3, warn: 2, info: 1 };
  return dedupeBy(warnings, (w) => `${w.tag}`)
    .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
}

function compactSafetyNotes(notes) {
  return dedupeBy(notes, (n) => `${n.tag}`);
}

function buildSummary({ reasons, warnings, fallback }) {
  const top = compactReasons(reasons).slice(0, 3).map((r) => r.message);
  if (top.length) return top.join(' ');
  const warn = compactWarnings(warnings).slice(0, 1).map((w) => w.message);
  if (warn.length) return warn[0];
  return fallback || 'Recommended based on available nutrition data.';
}

function buildExplanation({ reasons = [], warnings = [], safetyNotes = [], fallback, disclaimer = DEFAULT_DISCLAIMER }) {
  return {
    summary: buildSummary({ reasons, warnings, fallback }),
    reasons: compactReasons(reasons),
    warnings: compactWarnings(warnings),
    safetyNotes: compactSafetyNotes(safetyNotes),
    disclaimer
  };
}

function decideSafetyLevel({ blocked, warnings = [], safetyNotes = [] }) {
  if (blocked) return 'blocked';
  if (safetyNotes.some((n) => n && n.severity === 'high')) return 'caution';
  if (warnings.some((w) => w && w.severity === 'high')) return 'caution';
  if (safetyNotes.length > 0) return 'caution';
  if (warnings.some((w) => w && w.severity === 'warn')) return 'caution';
  return 'safe';
}

module.exports = {
  DEFAULT_DISCLAIMER,
  buildExplanation,
  decideSafetyLevel,
  compactReasons,
  compactWarnings,
  compactSafetyNotes
};
