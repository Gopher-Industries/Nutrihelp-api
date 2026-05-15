const { supabaseService } = require('./supabaseClient');

const REVIEW_TABLE = 'recipe_reviews';
const SOURCE_TYPES = new Set(['recipe_library', 'community']);

function normalizeSourceType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'library' || normalized === 'catalog') return 'recipe_library';
  if (normalized === 'recipe_library' || normalized === 'community') return normalized;
  return '';
}

function normalizeRecipeId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeRating(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanComment(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isMissingReviewTableError(error) {
  return error?.code === '42P01' || String(error?.message || '').includes(REVIEW_TABLE);
}

function createMissingTableError(error) {
  const wrapped = new Error(
    'Recipe reviews table is not installed. Run database/2026-05-10_recipe_reviews.sql in Supabase SQL editor.'
  );
  wrapped.statusCode = 503;
  wrapped.code = 'RECIPE_REVIEWS_TABLE_MISSING';
  wrapped.cause = error;
  return wrapped;
}

async function assertReviewableRecipe(sourceType, recipeId) {
  if (sourceType === 'recipe_library') {
    let query = supabaseService
      .from('recipe_library')
      .select('id, visibility, is_published, data_status, trashed_at')
      .eq('id', recipeId)
      .eq('visibility', 'public')
      .eq('is_published', true)
      .in('data_status', ['reviewed', 'published']);

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== '42703') throw error;

    if (error?.code === '42703') {
      const fallback = await supabaseService
        .from('recipe_library')
        .select('id, visibility, is_published, data_status')
        .eq('id', recipeId)
        .eq('visibility', 'public')
        .eq('is_published', true)
        .in('data_status', ['reviewed', 'published'])
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      if (fallback.data) return fallback.data;
    }

    if (data && !data.trashed_at) return data;
  }

  if (sourceType === 'community') {
    const { data, error } = await supabaseService
      .from('recipes')
      .select('id, visibility, is_published')
      .eq('id', recipeId)
      .eq('visibility', 'community')
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const error = new Error('Recipe is not reviewable or not public.');
  error.statusCode = 404;
  error.code = 'RECIPE_NOT_REVIEWABLE';
  throw error;
}

function validateSourceAndRecipe(sourceTypeRaw, recipeIdRaw) {
  const sourceType = normalizeSourceType(sourceTypeRaw);
  const recipeId = normalizeRecipeId(recipeIdRaw);
  if (!SOURCE_TYPES.has(sourceType) || !recipeId) {
    const error = new Error('Valid source_type and recipe_id are required.');
    error.statusCode = 400;
    error.code = 'INVALID_REVIEW_TARGET';
    throw error;
  }
  return { sourceType, recipeId };
}

function getUserDisplayName(user = {}, fallbackUserId = '') {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.name
    || String(user.email || '').split('@')[0]
    || `User ${fallbackUserId}`;
}

function getImageUrl(fileName) {
  const normalized = String(fileName || '').trim();
  if (!normalized) return '';
  const { data } = supabaseService.storage.from('images').getPublicUrl(normalized);
  return data?.publicUrl || '';
}

async function decorateReviews(rows = []) {
  const reviews = Array.isArray(rows) ? rows : [];
  const userIds = [...new Set(reviews.map((row) => Number(row.user_id)).filter(Boolean))];

  const { data: users, error: usersError } = userIds.length
    ? await supabaseService
        .from('users')
        .select('user_id,name,first_name,last_name,email,image_id')
        .in('user_id', userIds)
    : { data: [], error: null };

  if (usersError) throw usersError;

  const imageIds = [...new Set((users || []).map((user) => Number(user.image_id)).filter(Boolean))];
  const { data: images, error: imagesError } = imageIds.length
    ? await supabaseService.from('images').select('id,file_name').in('id', imageIds)
    : { data: [], error: null };

  if (imagesError) throw imagesError;

  const usersById = new Map((users || []).map((user) => [Number(user.user_id), user]));
  const imagesById = new Map((images || []).map((image) => [Number(image.id), image]));

  return reviews.map((review) => {
    const user = usersById.get(Number(review.user_id)) || {};
    const image = imagesById.get(Number(user.image_id));
    return {
      id: review.id,
      sourceType: review.source_type,
      recipeId: review.recipe_id,
      userId: review.user_id,
      rating: Number(review.rating) || 0,
      comment: review.comment,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      userName: getUserDisplayName(user, review.user_id),
      userAvatar: getImageUrl(image?.file_name),
    };
  });
}

function summarizeRows(rows = []) {
  const visible = (Array.isArray(rows) ? rows : []).filter((row) => !row.is_hidden);
  if (!visible.length) {
    return { averageRating: null, reviewCount: 0 };
  }
  const total = visible.reduce((sum, row) => sum + (Number(row.rating) || 0), 0);
  return {
    averageRating: Number((total / visible.length).toFixed(1)),
    reviewCount: visible.length,
  };
}

function buildRatingBreakdown(rows = []) {
  return [5, 4, 3, 2, 1].reduce((acc, rating) => {
    acc[rating] = rows.filter((row) => Number(row.rating) === rating).length;
    return acc;
  }, {});
}

function formatRecipeTitle(row = {}) {
  return row.display_name || row.recipe_name || row.dish_name || row.name || 'Untitled Recipe';
}

function getRecipeImage(row = {}) {
  return row.image_url || row.image || row.photo_url || '';
}

function mapRecipeForFeed(row = {}, sourceType = '') {
  const totalMinutes =
    Number(row.total_time_minutes) ||
    Number(row.preparation_time) ||
    ((Number(row.prep_time_minutes) || 0) + (Number(row.cook_time_minutes) || 0)) ||
    0;

  return {
    id: row.id,
    sourceType,
    title: formatRecipeTitle(row),
    description: row.description || row.summary || row.admin_notes || '',
    imageUrl: getRecipeImage(row),
    mealType: row.meal_type || 'other',
    cuisine: row.cuisine_name_snapshot || row.cuisine_name || row.cuisine || 'Global',
    prepTime: Number.isFinite(totalMinutes) && totalMinutes > 0 ? Math.round(totalMinutes) : null,
    calories: numberOrNull(row.calories),
    visibility: row.visibility || '',
    authorUserId: row.owner_user_id || row.author_user_id || row.user_id || null,
  };
}

async function getRecipesBySourceForFeed(rows = []) {
  const idsBySource = rows.reduce(
    (acc, row) => {
      const sourceType = normalizeSourceType(row.source_type);
      const recipeId = normalizeRecipeId(row.recipe_id);
      if (sourceType && recipeId) acc[sourceType].add(recipeId);
      return acc;
    },
    { recipe_library: new Set(), community: new Set() }
  );

  const recipeMap = new Map();

  if (idsBySource.recipe_library.size) {
    const { data, error } = await supabaseService
      .from('recipe_library')
      .select('*')
      .in('id', [...idsBySource.recipe_library]);
    if (error) throw error;
    (data || []).forEach((row) => {
      recipeMap.set(`recipe_library:${row.id}`, mapRecipeForFeed(row, 'recipe_library'));
    });
  }

  if (idsBySource.community.size) {
    const { data, error } = await supabaseService
      .from('recipes')
      .select('*')
      .in('id', [...idsBySource.community]);
    if (error) throw error;
    (data || []).forEach((row) => {
      recipeMap.set(`community:${row.id}`, mapRecipeForFeed(row, 'community'));
    });
  }

  return recipeMap;
}

async function getReviews(sourceTypeRaw, recipeIdRaw) {
  const { sourceType, recipeId } = validateSourceAndRecipe(sourceTypeRaw, recipeIdRaw);
  await assertReviewableRecipe(sourceType, recipeId);

  const { data, error } = await supabaseService
    .from(REVIEW_TABLE)
    .select('*')
    .eq('source_type', sourceType)
    .eq('recipe_id', recipeId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingReviewTableError(error)) throw createMissingTableError(error);
    throw error;
  }

  const reviews = await decorateReviews(data || []);
  return {
    items: reviews,
    summary: summarizeRows(data || []),
  };
}

async function listReviewFeed(filters = {}) {
  const sort = String(filters.sort || 'newest').toLowerCase() === 'oldest' ? 'oldest' : 'newest';
  const rating = normalizeRating(filters.rating);
  const sourceType = normalizeSourceType(filters.source_type || filters.sourceType);
  const limit = Math.min(Math.max(Number(filters.limit) || 120, 1), 300);

  let query = supabaseService
    .from(REVIEW_TABLE)
    .select('*')
    .eq('is_hidden', false);

  if (rating) query = query.eq('rating', rating);
  if (sourceType) query = query.eq('source_type', sourceType);

  const { data, error } = await query
    .order('created_at', { ascending: sort === 'oldest' })
    .limit(limit);

  if (error) {
    if (isMissingReviewTableError(error)) throw createMissingTableError(error);
    throw error;
  }

  const summaryQuery = await supabaseService
    .from(REVIEW_TABLE)
    .select('source_type,recipe_id,rating,is_hidden')
    .eq('is_hidden', false);

  if (summaryQuery.error) {
    if (isMissingReviewTableError(summaryQuery.error)) throw createMissingTableError(summaryQuery.error);
    throw summaryQuery.error;
  }

  const decoratedReviews = await decorateReviews(data || []);
  const recipeMap = await getRecipesBySourceForFeed(data || []);

  const items = decoratedReviews
    .map((review) => ({
      ...review,
      recipe: recipeMap.get(`${review.sourceType}:${review.recipeId}`) || {
        id: review.recipeId,
        sourceType: review.sourceType,
        title: 'Recipe not found',
        description: '',
        imageUrl: '',
        mealType: 'other',
        cuisine: 'Global',
        prepTime: null,
        calories: null,
        visibility: '',
        authorUserId: null,
      },
    }))
    .filter((review) => review.recipe.title !== 'Recipe not found');

  const allRows = summaryQuery.data || [];
  return {
    items,
    summary: {
      averageRating: summarizeRows(allRows).averageRating,
      reviewCount: allRows.length,
      reviewedRecipeCount: new Set(allRows.map((row) => `${row.source_type}:${row.recipe_id}`)).size,
      ratingBreakdown: buildRatingBreakdown(allRows),
    },
    filters: { sort, rating: rating || 'all', sourceType: sourceType || 'all', limit },
  };
}

async function submitReview(input, user) {
  const { sourceType, recipeId } = validateSourceAndRecipe(input.source_type || input.sourceType, input.recipe_id || input.recipeId);
  const rating = normalizeRating(input.rating);
  const comment = cleanComment(input.comment || input.body);

  if (!rating) {
    const error = new Error('Rating must be an integer from 1 to 5.');
    error.statusCode = 400;
    error.code = 'INVALID_RATING';
    throw error;
  }

  if (comment.length < 2 || comment.length > 1200) {
    const error = new Error('Comment must be between 2 and 1200 characters.');
    error.statusCode = 400;
    error.code = 'INVALID_COMMENT';
    throw error;
  }

  await assertReviewableRecipe(sourceType, recipeId);

  const { data, error } = await supabaseService
    .from(REVIEW_TABLE)
    .upsert(
      {
        source_type: sourceType,
        recipe_id: recipeId,
        user_id: Number(user.userId),
        rating,
        comment,
        is_hidden: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_type,recipe_id,user_id' }
    )
    .select('*')
    .single();

  if (error) {
    if (isMissingReviewTableError(error)) throw createMissingTableError(error);
    throw error;
  }

  const reviews = await getReviews(sourceType, recipeId);
  return {
    item: (await decorateReviews([data]))[0],
    summary: reviews.summary,
  };
}

async function getReviewSummaries(items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => {
      try {
        return validateSourceAndRecipe(item.source_type || item.sourceType, item.recipe_id || item.recipeId);
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);

  const uniqueKeys = [...new Map(normalizedItems.map((item) => [`${item.sourceType}:${item.recipeId}`, item])).values()];
  if (!uniqueKeys.length) return {};

  const sourceTypes = [...new Set(uniqueKeys.map((item) => item.sourceType))];
  const recipeIds = [...new Set(uniqueKeys.map((item) => item.recipeId))];

  const { data, error } = await supabaseService
    .from(REVIEW_TABLE)
    .select('source_type,recipe_id,rating,is_hidden')
    .in('source_type', sourceTypes)
    .in('recipe_id', recipeIds)
    .eq('is_hidden', false);

  if (error) {
    if (isMissingReviewTableError(error)) throw createMissingTableError(error);
    throw error;
  }

  return uniqueKeys.reduce((acc, item) => {
    const rows = (data || []).filter(
      (row) => row.source_type === item.sourceType && Number(row.recipe_id) === Number(item.recipeId)
    );
    acc[`${item.sourceType}:${item.recipeId}`] = summarizeRows(rows);
    return acc;
  }, {});
}

async function hideReviewByAdmin(reviewIdRaw, adminUser = {}) {
  const reviewId = normalizeRecipeId(reviewIdRaw);
  if (!reviewId) {
    const error = new Error('Valid review id is required.');
    error.statusCode = 400;
    error.code = 'INVALID_REVIEW_ID';
    throw error;
  }

  const { data: existing, error: existingError } = await supabaseService
    .from(REVIEW_TABLE)
    .select('id,is_hidden')
    .eq('id', reviewId)
    .maybeSingle();

  if (existingError) {
    if (isMissingReviewTableError(existingError)) throw createMissingTableError(existingError);
    throw existingError;
  }

  if (!existing) {
    const error = new Error('Review not found.');
    error.statusCode = 404;
    error.code = 'REVIEW_NOT_FOUND';
    throw error;
  }

  if (existing.is_hidden) {
    return { id: reviewId, is_hidden: true, alreadyHidden: true };
  }

  const { data, error } = await supabaseService
    .from(REVIEW_TABLE)
    .update({
      is_hidden: true,
    })
    .eq('id', reviewId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingReviewTableError(error)) throw createMissingTableError(error);
    throw error;
  }

  return {
    id: reviewId,
    is_hidden: true,
    hiddenByUserId: Number(adminUser?.userId) || null,
    hiddenAt: data?.updated_at || new Date().toISOString(),
    alreadyHidden: false,
  };
}

module.exports = {
  getReviews,
  submitReview,
  getReviewSummaries,
  listReviewFeed,
  hideReviewByAdmin,
};
