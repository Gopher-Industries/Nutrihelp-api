/**
 * Fidelity guardrail for the LLM mapper.
 *
 * The mapper is only ever allowed to restructure source content. These checks
 * prove that claim in code: anything the model added that is not traceable to
 * the source recipe is a violation, and the caller discards the LLM output.
 */

const MIN_INSTRUCTION_TOKENS = 3;
const INSTRUCTION_OVERLAP_THRESHOLD = 0.6;

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ') : [];
}

function buildSourceIngredientText(sourceRecipe) {
  return normalizeText((sourceRecipe.ingredients || []).map((item) => item.name).join(' '));
}

function checkIngredients(draft, sourceRecipe, violations) {
  const sourceText = buildSourceIngredientText(sourceRecipe);

  for (const ingredient of draft.ingredients || []) {
    const name = normalizeText(ingredient?.name);
    if (!name) continue;
    if (!sourceText.includes(name)) {
      violations.push(`ingredient "${ingredient.name}" does not appear in the source recipe`);
    }
  }
}

function checkInstructions(draft, sourceRecipe, violations) {
  const sourceTokens = new Set(tokenize(sourceRecipe.instructions));

  for (const step of draft.instructions || []) {
    const stepTokens = tokenize(step);
    // Short connective steps ("Serve hot") carry too little signal to judge.
    if (stepTokens.length < MIN_INSTRUCTION_TOKENS) continue;

    const matched = stepTokens.filter((token) => sourceTokens.has(token)).length;
    const overlap = matched / stepTokens.length;

    if (overlap < INSTRUCTION_OVERLAP_THRESHOLD) {
      violations.push(
        `instruction step "${String(step).slice(0, 60)}" is not traceable to the source `
        + `(${Math.round(overlap * 100)}% word overlap)`
      );
    }
  }
}

function checkFidelity(draft, sourceRecipe) {
  const violations = [];
  checkIngredients(draft, sourceRecipe, violations);
  checkInstructions(draft, sourceRecipe, violations);
  return { ok: violations.length === 0, violations };
}

module.exports = {
  normalizeText,
  checkFidelity,
  INSTRUCTION_OVERLAP_THRESHOLD,
  MIN_INSTRUCTION_TOKENS,
};
