const recipeLibraryService = require('../services/recipeLibraryService');
const multer = require('multer');
const XLSX = require('xlsx');

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function sendSuccess(res, data, meta = {}) {
  const { statusCode, count, message, ...extraMeta } = meta || {};
  return res.status(statusCode || 200).json({
    success: true,
    data,
    ...('count' in meta ? { count } : {}),
    ...(message ? { message } : {}),
    ...extraMeta,
  });
}

function sendError(res, error, fallbackCode = 'RECIPE_LIBRARY_ERROR') {
  const statusCode = error?.statusCode || error?.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: error?.message || 'Internal server error',
    code: error?.code || fallbackCode,
  });
}

function getFilters(req) {
  return {
    scope: req.query.scope,
    search: req.query.search,
    meal_type: req.query.meal_type,
    cuisine_id: req.query.cuisine_id,
    cooking_method_id: req.query.cooking_method_id,
    limit: req.query.limit,
    offset: req.query.offset,
    status: req.query.status,
  };
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toCsvRows(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];
  const splitCsvLine = (line) =>
    line
      .split(',')
      .map((part) => part.trim().replace(/^"(.*)"$/, '$1'));

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const parts = splitCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = parts[idx] ?? '';
    });
    return row;
  });
}

function parseImportFile(file) {
  if (!file?.buffer?.length) {
    const error = new Error('File is empty');
    error.statusCode = 400;
    throw error;
  }

  const originalName = String(file.originalname || '').toLowerCase();
  if (originalName.endsWith('.csv') || file.mimetype.includes('csv') || file.mimetype.includes('text/plain')) {
    return toCsvRows(file.buffer.toString('utf8'));
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const error = new Error('Excel file does not contain any sheet');
    error.statusCode = 400;
    throw error;
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  return rawRows.map((row) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = value;
    });
    return normalized;
  });
}

async function listPublished(req, res) {
  try {
    const result = await recipeLibraryService.listPublishedRecipes(getFilters(req));
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_LIST_FAILED');
  }
}

async function listCommunity(req, res) {
  try {
    const result = await recipeLibraryService.listPublishedRecipes({
      ...getFilters(req),
      scope: 'community',
    });
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_COMMUNITY_LIST_FAILED');
  }
}

async function listMine(req, res) {
  try {
    const result = await recipeLibraryService.listMyRecipes(req.user.userId, getFilters(req));
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_MY_LIST_FAILED');
  }
}

async function listAddMeal(req, res) {
  try {
    const result = await recipeLibraryService.listAddMealRecipes(req.user.userId, getFilters(req));
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_ADD_MEAL_LIST_FAILED');
  }
}

async function getById(req, res) {
  try {
    const recipe = await recipeLibraryService.getRecipeById(req.params.id);
    if (!recipeLibraryService.canUserReadRecipe(recipe, req.user)) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found or not accessible',
        code: 'RECIPE_NOT_FOUND',
      });
    }
    return sendSuccess(res, recipe);
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_GET_FAILED');
  }
}

async function createPrivate(req, res) {
  try {
    const recipe = await recipeLibraryService.createPrivateRecipe(req.body, req.user.userId);
    return sendSuccess(res, recipe, {
      statusCode: 201,
      message: 'Private recipe created successfully',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_CREATE_FAILED');
  }
}

async function updateOwn(req, res) {
  try {
    const recipe = await recipeLibraryService.updateRecipe(req.params.id, req.body, req.user);
    return sendSuccess(res, recipe, { message: 'Recipe updated successfully' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_UPDATE_FAILED');
  }
}

async function deleteRecipe(req, res) {
  try {
    const result = await recipeLibraryService.deleteRecipe(req.params.id, req.user);
    return sendSuccess(res, result, { message: 'Recipe moved to Trash' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_DELETE_FAILED');
  }
}

async function recoverRecipe(req, res) {
  try {
    const recipe = await recipeLibraryService.recoverRecipe(req.params.id, req.user);
    return sendSuccess(res, recipe, { message: 'Recipe recovered from Trash' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_RECOVER_FAILED');
  }
}

async function permanentlyDeleteRecipe(req, res) {
  try {
    const result = await recipeLibraryService.permanentlyDeleteRecipe(req.params.id, req.user);
    return sendSuccess(res, result, { message: 'Recipe permanently deleted' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_PERMANENT_DELETE_FAILED');
  }
}

async function shareToCommunity(req, res) {
  try {
    const recipe = await recipeLibraryService.submitRecipeToCommunity(req.params.id, req.user);
    return sendSuccess(res, recipe, { message: 'Recipe submitted for community review' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_SHARE_FAILED');
  }
}

async function listPendingCommunity(req, res) {
  try {
    const result = await recipeLibraryService.listPendingCommunityRecipes(getFilters(req));
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_PENDING_LIST_FAILED');
  }
}

async function listAdminRecipes(req, res) {
  try {
    const result = await recipeLibraryService.listAdminRecipes(getFilters(req));
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_ADMIN_LIST_FAILED');
  }
}

async function approveCommunity(req, res) {
  try {
    const recipe = await recipeLibraryService.approveCommunityRecipe(req.params.id, req.user.userId);
    return sendSuccess(res, recipe, { message: 'Community recipe approved' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_APPROVE_FAILED');
  }
}

async function rejectCommunity(req, res) {
  try {
    const recipe = await recipeLibraryService.rejectCommunityRecipe(
      req.params.id,
      req.user.userId,
      req.body.reason
    );
    return sendSuccess(res, recipe, { message: 'Community recipe rejected' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_REJECT_FAILED');
  }
}

async function publishCatalog(req, res) {
  try {
    const recipe = await recipeLibraryService.publishCatalogRecipe(req.params.id, req.user.userId);
    return sendSuccess(res, recipe, { message: 'Recipe published to public catalog' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_PUBLISH_FAILED');
  }
}

async function unpublishCatalog(req, res) {
  try {
    const recipe = await recipeLibraryService.unpublishCatalogRecipe(req.params.id, req.user.userId);
    return sendSuccess(res, recipe, { message: 'Recipe unpublished from public catalog' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_UNPUBLISH_FAILED');
  }
}

async function fetchImages(req, res) {
  try {
    const rows = await recipeLibraryService.fetchMissingRecipeImages(req.body || {}, req.user.userId);
    return sendSuccess(res, rows, {
      count: rows.length,
      message: 'Recipe image fetch completed',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMAGE_FETCH_FAILED');
  }
}

async function importNames(req, res) {
  try {
    const rows = await recipeLibraryService.importDishNames(req.body, req.user.userId);
    return sendSuccess(res, rows, {
      statusCode: 201,
      count: rows.length,
      message: 'Dish names imported to enrichment queue',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_FAILED');
  }
}

async function importFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Import file is required',
        code: 'IMPORT_FILE_REQUIRED',
      });
    }

    const rows = parseImportFile(req.file);
    const imported = await recipeLibraryService.importDishRows(rows, req.user.userId);
    return sendSuccess(res, imported, {
      statusCode: 201,
      count: imported.length,
      message: 'Dish file imported to recipe library queue',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_FILE_FAILED');
  }
}

async function importRows(req, res) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const imported = await recipeLibraryService.importDishRows(rows, req.user.userId);
    return sendSuccess(res, imported, {
      statusCode: 201,
      count: imported.length,
      message: 'Dish rows imported to recipe library queue',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_ROWS_FAILED');
  }
}

function downloadTemplate(_req, res) {
  const columns = [
    'dish_name',
    'meal_type',
    'cuisine_hint',
    'cooking_method_hint',
    'admin_notes',
    'recipe_name',
    'description',
    'difficulty',
    'spice_level',
    'prep_time_minutes',
    'cook_time_minutes',
    'servings',
    'serving_size',
    'ingredients_json',
    'instructions_json',
    'equipment_csv',
    'tips_csv',
    'dietary_tags_csv',
    'health_tags_csv',
    'allergens_csv',
    'avoid_for_conditions_csv',
    'suitable_goals_csv',
    'calories',
    'protein',
    'fat',
    'carbohydrates',
    'fiber',
    'sugar',
    'sodium',
    'image_url',
  ];

  const rows = [
    {
      dish_name: 'Chicken Curry',
      meal_type: 'dinner',
      cuisine_hint: 'Indian',
      cooking_method_hint: 'simmered',
      admin_notes: 'High protein version preferred',
      recipe_name: 'Chicken Curry Bowl',
      description: 'Balanced home-style curry with vegetables.',
      difficulty: 'easy',
      spice_level: 'mild',
      prep_time_minutes: 15,
      cook_time_minutes: 30,
      servings: 2,
      serving_size: '1 bowl',
      ingredients_json:
        '[{"name":"chicken thigh","quantity":300,"unit":"g"},{"name":"onion","quantity":1,"unit":"piece"},{"name":"curry powder","quantity":1,"unit":"tbsp"}]',
      instructions_json:
        '["Slice onion and chicken.","Saute onion until translucent.","Add chicken and brown lightly.","Add curry powder and stir.","Add water and simmer until cooked.","Serve hot."]',
      equipment_csv: 'pan,knife,spatula',
      tips_csv: 'Use low sodium stock,Add spinach at the end',
      dietary_tags_csv: 'high-protein,balanced',
      health_tags_csv: 'muscle-gain',
      allergens_csv: '',
      avoid_for_conditions_csv: '',
      suitable_goals_csv: 'maintenance',
      calories: 520,
      protein: 32,
      fat: 18,
      carbohydrates: 45,
      fiber: 6,
      sugar: 8,
      sodium: 640,
      image_url: '',
    },
    {
      dish_name: 'Beef Pho',
      meal_type: 'lunch',
      cuisine_hint: 'Vietnamese',
      cooking_method_hint: 'boiled',
      admin_notes: 'Lower sodium target',
      recipe_name: 'Lean Beef Pho',
      description: 'Comfort noodle soup with lean beef slices.',
      difficulty: 'medium',
      spice_level: 'none',
      prep_time_minutes: 20,
      cook_time_minutes: 60,
      servings: 2,
      serving_size: '1 large bowl',
      ingredients_json:
        '[{"name":"rice noodles","quantity":180,"unit":"g"},{"name":"lean beef","quantity":220,"unit":"g"},{"name":"beef broth","quantity":900,"unit":"ml"}]',
      instructions_json:
        '["Prepare broth and aromatics.","Cook noodles according to package.","Slice beef thinly.","Assemble noodles and beef in bowl.","Pour hot broth to cook beef.","Top with herbs and serve."]',
      equipment_csv: 'pot,strainer,knife',
      tips_csv: 'Skim broth surface for cleaner taste',
      dietary_tags_csv: 'high-protein',
      health_tags_csv: 'balanced',
      allergens_csv: '',
      avoid_for_conditions_csv: 'hypertension',
      suitable_goals_csv: 'maintenance',
      calories: 480,
      protein: 30,
      fat: 12,
      carbohydrates: 58,
      fiber: 3,
      sugar: 5,
      sodium: 720,
      image_url: '',
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'dish_import');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const filename = `recipe_library_import_template_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(200).send(buffer);
}

async function listImportQueue(req, res) {
  try {
    const result = await recipeLibraryService.listImportQueue(getFilters(req));
    return sendSuccess(res, result.items, { count: result.count });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_QUEUE_FAILED');
  }
}

async function enrichImportQueue(req, res) {
  try {
    const result = await recipeLibraryService.enrichImportQueueBatch(req.body, req.user.userId);
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    return sendSuccess(res, rows, {
      count: rows.length,
      message: 'Recipe library import queue enrichment completed',
      pausedByQuota: Boolean(result?.pausedByQuota),
      pauseReason: result?.pauseReason || null,
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_ENRICH_FAILED');
  }
}

async function approveImportQueueRows(req, res) {
  try {
    const rows = await recipeLibraryService.approveImportQueueRows(req.body || {}, req.user.userId);
    return sendSuccess(res, rows, {
      count: rows.length,
      message: 'Import queue approve completed',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_QUEUE_APPROVE_FAILED');
  }
}

async function updateImportQueueRow(req, res) {
  try {
    const row = await recipeLibraryService.updateImportQueueRow(req.params.id, req.body || {});
    return sendSuccess(res, row, { message: 'Import queue row updated' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_QUEUE_UPDATE_FAILED');
  }
}

async function trashImportQueueRow(req, res) {
  try {
    const row = await recipeLibraryService.moveImportQueueRowToTrash(req.params.id, req.body?.reason || '');
    return sendSuccess(res, row, { message: 'Import queue row moved to trash' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_QUEUE_TRASH_FAILED');
  }
}

async function recoverImportQueueRow(req, res) {
  try {
    const row = await recipeLibraryService.recoverImportQueueRow(req.params.id);
    return sendSuccess(res, row, { message: 'Import queue row recovered' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_QUEUE_RECOVER_FAILED');
  }
}

async function hardDeleteImportQueueRow(req, res) {
  try {
    const result = await recipeLibraryService.hardDeleteImportQueueRow(req.params.id);
    return sendSuccess(res, result, { message: 'Import queue row permanently deleted' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_IMPORT_QUEUE_HARD_DELETE_FAILED');
  }
}

async function likeRecipe(req, res) {
  try {
    const recipe = await recipeLibraryService.likeRecipe(req.params.id, req.user);
    return sendSuccess(res, recipe, { message: 'Recipe liked' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_LIKE_FAILED');
  }
}

async function saveRecipe(req, res) {
  try {
    const recipe = await recipeLibraryService.saveRecipe(req.params.id, req.user);
    return sendSuccess(res, recipe, { message: 'Recipe saved' });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_SAVE_FAILED');
  }
}

async function addComment(req, res) {
  try {
    const comment = await recipeLibraryService.addComment(req.params.id, req.body.body, req.user);
    return sendSuccess(res, comment, {
      statusCode: 201,
      message: 'Comment added',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_COMMENT_FAILED');
  }
}

async function reportRecipe(req, res) {
  try {
    const report = await recipeLibraryService.reportRecipe(req.params.id, req.body, req.user);
    return sendSuccess(res, report, {
      statusCode: 201,
      message: 'Recipe reported',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_LIBRARY_REPORT_FAILED');
  }
}

module.exports = {
  addComment,
  approveCommunity,
  createPrivate,
  enrichImportQueue,
  getById,
  importNames,
  importUpload,
  importFile,
  importRows,
  downloadTemplate,
  likeRecipe,
  listAddMeal,
  listAdminRecipes,
  listCommunity,
  listImportQueue,
  approveImportQueueRows,
  updateImportQueueRow,
  trashImportQueueRow,
  recoverImportQueueRow,
  hardDeleteImportQueueRow,
  listMine,
  listPendingCommunity,
  listPublished,
  fetchImages,
  publishCatalog,
  unpublishCatalog,
  rejectCommunity,
  reportRecipe,
  saveRecipe,
  shareToCommunity,
  deleteRecipe,
  recoverRecipe,
  permanentlyDeleteRecipe,
  updateOwn,
};
