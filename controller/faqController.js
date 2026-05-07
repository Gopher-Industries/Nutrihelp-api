/**
 * controller/faqController.js
 *
 * Serves FAQ data for the /health-faq page.
 *
 * Strategy:
 *   1. Try to read from a `faq` Supabase table (id, question, answer,
 *      category, sort_order, is_published).
 *   2. If the table is missing, empty, or the lookup errors, fall back to
 *      bundled seed data so the FAQ page is never blank.
 *
 * Response shape:
 *   { success: true,
 *     data: { items: [...], categories: [...], source: 'db' | 'seed' },
 *     meta: { count, generatedAt } }
 */

const supabase = require('../dbConnection.js');
const logger = require('../utils/logger');
const support = require('../utils/supportResponse');
const seedData = require('./supportData/faqSeed');

function shapeItem(row, fallbackId) {
  return {
    id: row.id || fallbackId,
    question: row.question,
    answer: row.answer,
    category: row.category || 'General',
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
  };
}

function buildPayload(items, source) {
  const sorted = [...items].sort((a, b) => {
    if (a.category === b.category) return a.sortOrder - b.sortOrder;
    return a.category.localeCompare(b.category);
  });
  const categories = Array.from(new Set(sorted.map((i) => i.category)));
  return {
    data: {
      items: sorted,
      categories,
      source,
    },
    meta: {
      count: sorted.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function loadFromDb() {
  if (!supabase || typeof supabase.from !== 'function') return null;

  const { data, error } = await supabase
    .from('faq')
    .select('id, question, answer, category, sort_order, is_published')
    .eq('is_published', true);

  if (error) {
    logger.warn('faqController: supabase lookup failed', { error: error.message });
    return null;
  }
  if (!data || data.length === 0) return null;

  return data.map((row, idx) => shapeItem(row, `db-${idx + 1}`));
}

async function getFaqs(req, res) {
  try {
    let items = await loadFromDb();
    let source = 'db';

    if (!items || items.length === 0) {
      items = seedData.map((row, idx) => shapeItem(row, `seed-${idx + 1}`));
      source = 'seed';
    }

    const optionalCategory = (req.query.category || '').trim().toLowerCase();
    if (optionalCategory) {
      items = items.filter((i) => i.category.toLowerCase() === optionalCategory);
    }

    const payload = buildPayload(items, source);
    return support.sendSuccess(res, payload.data, { meta: payload.meta });
  } catch (error) {
    logger.error('faqController: unexpected failure, returning seed', {
      error: error.message,
    });
    const items = seedData.map((row, idx) => shapeItem(row, `seed-${idx + 1}`));
    const payload = buildPayload(items, 'seed');
    return support.sendSuccess(res, payload.data, { meta: payload.meta });
  }
}

module.exports = { getFaqs };
