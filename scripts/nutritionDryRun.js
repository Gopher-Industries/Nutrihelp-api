#!/usr/bin/env node
/**
 * Read-only report: what would each empty ingredient row be filled with?
 *
 * The save path fills USDA nutrient values into rows of the SHARED ingredients
 * table whose nutrition is completely empty. That is a permanent write to data
 * every team reads, so this script shows the proposed match for every such row
 * first. It only ever SELECTs. Review the output before trusting the live fill.
 *
 *   node scripts/nutritionDryRun.js          deterministic matching only
 *   node scripts/nutritionDryRun.js --llm    also use the LLM tie-break and rewording
 *
 * Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and USDA_API_KEY in .env.
 * The public DEMO_KEY allows about 10 requests an hour, which is not enough.
 *
 * This script exists because its first run caught a real defect: "Water" was
 * matched to the vegetable "Water convolvulus" at high confidence.
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { lookupIngredient } = require('../services/nutritionSources');

const useLlm = process.argv.includes('--llm');
const WRITABLE = new Set(['high', 'llm']);

function cell(value, width) {
  return String(value ?? '')
    .slice(0, width)
    .padEnd(width);
}

async function main() {
  const generate = useLlm
    ? require('../services/recipeSources/mapperService').resolveProvider().generate
    : null;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('ingredients')
    .select('id,name')
    .is('calories', null)
    .order('id');
  if (error) throw new Error(error.message);

  const rows = [];
  for (const row of data) {
    const result = await lookupIngredient(row.name, { generate });
    rows.push({ ...row, result });
  }

  const header = [
    cell('id', 5),
    cell('ingredient', 24),
    cell('match', 6),
    cell('USDA record', 48),
    cell('kcal', 5),
    cell('prot', 6),
    cell('fat', 6),
    'carb',
  ];
  console.log(header.join(' '));
  for (const { id, name, result } of rows) {
    const n = result.nutrients || {};
    const match = result.status === 'found' ? result.confidence : result.status;
    console.log(
      [
        cell(id, 5),
        cell(name, 24),
        cell(match, 6),
        cell(result.description, 48),
        cell(n.calories, 5),
        cell(n.protein, 6),
        cell(n.fat, 6),
        n.carbohydrates ?? '',
      ].join(' ')
    );
  }

  const found = rows.filter(({ result }) => result.status === 'found');
  const writable = found.filter(({ result }) => WRITABLE.has(result.confidence)).length;
  console.log(
    `\n${rows.length} empty rows. Would be filled: ${writable}. Held back as a guess: ${
      found.length - writable
    }. No USDA record: ${rows.filter(({ result }) => result.status === 'not_found').length}. USDA unavailable: ${
      rows.filter(({ result }) => result.status === 'unavailable').length
    }.`
  );
  console.log('Nothing was written.');
}

main().catch((error) => {
  console.error('Dry run failed:', error.message);
  process.exit(1);
});
