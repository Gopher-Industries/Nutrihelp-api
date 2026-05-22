const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nutritionLookup = require('./nutritionLookupService');

const DATA_PATH = path.join(__dirname, '..', 'data', 'meal_logs.json');

function ensureFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '[]', 'utf8');
}

function loadEntries() {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function normalizeUserId(userId) {
  const val = String(userId || 'anonymous').trim();
  return val || 'anonymous';
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d.toISOString().split('T')[0];
}

function createEntry(payload) {
  const entryDate = normalizeDate(payload.date);
  const userId = normalizeUserId(payload.user_id);
  const nutrition = nutritionLookup.lookup(payload.label);

  const estimatedCalories = payload.estimated_calories != null
    ? payload.estimated_calories
    : nutrition.estimated_calories;

  const servingDescription = payload.serving_description || nutrition.serving_description;

  const entry = {
    id: uuidv4(),
    user_id: userId,
    date: entryDate,
    meal_type: payload.meal_type || 'Snacks',
    label: payload.label,
    confidence: payload.confidence != null ? payload.confidence : 0,
    estimated_calories: estimatedCalories,
    serving_description: servingDescription,
    recommendation: payload.recommendation || null,
    is_unclear: payload.is_unclear || false,
    quality_issues: Array.isArray(payload.quality_issues) ? payload.quality_issues : [],
    source: payload.source || 'scan',
    created_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };

  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  return entry;
}

function deleteEntry(entryId, userId) {
  const normalizedUser = normalizeUserId(userId);
  const entries = loadEntries();
  const next = entries.filter((e) => !(e.id === entryId && e.user_id === normalizedUser));
  const deleted = next.length < entries.length;
  if (deleted) saveEntries(next);
  return deleted;
}

function listEntries({ targetDate, userId } = {}) {
  const normalizedUser = normalizeUserId(userId);
  const normalizedDate = targetDate ? normalizeDate(targetDate) : null;
  const entries = loadEntries()
    .filter((e) => e.user_id === normalizedUser && (normalizedDate === null || e.date === normalizedDate))
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.created_at !== b.created_at) return b.created_at.localeCompare(a.created_at);
      return b.id.localeCompare(a.id);
    });
  return entries;
}

function getDailySummary({ targetDate, userId } = {}) {
  const normalizedUser = normalizeUserId(userId);
  const normalizedDate = normalizeDate(targetDate);
  const meals = listEntries({ targetDate: normalizedDate, userId: normalizedUser });

  const totalCalories = meals.reduce((sum, m) => sum + (parseInt(m.estimated_calories) || 0), 0);
  const unclearCount = meals.filter((m) => m.is_unclear).length;
  const mealTypeBreakdown = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };
  for (const m of meals) {
    mealTypeBreakdown[m.meal_type] = (mealTypeBreakdown[m.meal_type] || 0) + 1;
  }

  return {
    user_id: normalizedUser,
    date: normalizedDate,
    total_calories: totalCalories,
    entry_count: meals.length,
    unclear_count: unclearCount,
    meal_type_breakdown: mealTypeBreakdown,
    meals,
  };
}

function buildChatContext({ targetDate, userId } = {}) {
  const summary = getDailySummary({ targetDate, userId });
  if (!summary.meals.length) {
    return {
      user_id: summary.user_id,
      date: summary.date,
      has_data: false,
      summary: 'No meals have been logged for that day.',
      prompt_context: '',
    };
  }

  const mealLines = summary.meals.slice(0, 8).map((m) => {
    const calText = m.estimated_calories != null ? `${m.estimated_calories} kcal` : 'calories unavailable';
    return `- ${m.meal_type}: ${m.label} (${calText}, confidence ${Number(m.confidence).toFixed(2)})`;
  });

  const summaryText = `On ${summary.date}, the user logged ${summary.entry_count} meals totaling about ${summary.total_calories} kcal.`;
  const promptContext = `Use the following logged meals as recent dietary context. Treat calorie values as rough estimates, not exact nutrition facts.\nMeal date: ${summary.date}\n${mealLines.join('\n')}`;

  return {
    user_id: summary.user_id,
    date: summary.date,
    has_data: true,
    summary: summaryText,
    prompt_context: promptContext,
  };
}

function buildPlanContext({ userId, dateTo, days = 7 } = {}) {
  const normalizedUser = normalizeUserId(userId);
  const safeDays = Math.max(1, parseInt(days) || 7);
  const endDate = new Date(normalizeDate(dateTo));

  const dailySummaries = [];
  const foodCounter = {};
  let totalCalories = 0;
  let loggedDays = 0;

  for (let offset = 0; offset < safeDays; offset++) {
    const current = new Date(endDate);
    current.setDate(endDate.getDate() - (safeDays - 1 - offset));
    const dateStr = current.toISOString().split('T')[0];
    const summary = getDailySummary({ targetDate: dateStr, userId: normalizedUser });
    dailySummaries.push(summary);
    if (summary.entry_count > 0) {
      loggedDays++;
      totalCalories += summary.total_calories;
      for (const m of summary.meals) {
        foodCounter[m.label] = (foodCounter[m.label] || 0) + 1;
      }
    }
  }

  const average = loggedDays > 0 ? totalCalories / loggedDays : 0;
  const topFoods = Object.entries(foodCounter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (safeDays - 1));

  return {
    user_id: normalizedUser,
    date_from: startDate.toISOString().split('T')[0],
    date_to: endDate.toISOString().split('T')[0],
    days: safeDays,
    average_daily_calories: Math.round(average * 10) / 10,
    top_foods: topFoods,
    summary: `Over the last ${safeDays} day(s), the user logged meals on ${loggedDays} day(s) with an average of ${average.toFixed(1)} kcal on logged days.`,
    daily_summaries: dailySummaries,
  };
}

module.exports = { createEntry, deleteEntry, listEntries, getDailySummary, buildChatContext, buildPlanContext };
