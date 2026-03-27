const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

function buildSelectStatement(includeDetails) {
  if (includeDetails) {
    return `
      *,
      author:authors(*),
      source:sources(*),
      category:categories(*)
    `;
  }

  return `
    id, 
    title, 
    summary, 
    published_at, 
    updated_at,
    image_url,
    author:authors(id, name),
    category:categories(id, name)
  `;
}

async function getNewsById(id, includeDetails) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .select(buildSelectStatement(includeDetails))
      .eq('id', id)
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load news by id', error, { id });
  }
}

async function getNewsList({
  includeDetails,
  title,
  content,
  startDate,
  endDate,
  sortBy,
  sortOrder,
  offset,
  limit,
  authorIds,
  categoryIds
}) {
  try {
    let query = supabase
      .from('health_news')
      .select(buildSelectStatement(includeDetails));

    if (title) {
      query = query.ilike('title', `%${title}%`);
    }

    if (content) {
      query = query.ilike('content', `%${content}%`);
    }

    if (startDate) {
      query = query.gte('published_at', startDate);
    }

    if (endDate) {
      query = query.lte('published_at', endDate);
    }

    if (Array.isArray(authorIds) && authorIds.length > 0) {
      query = query.in('author_id', authorIds);
    }

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      query = query.in('category_id', categoryIds);
    }

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load filtered health news', error);
  }
}

async function findAuthorIdsByName(authorName) {
  try {
    const { data, error } = await supabase
      .from('authors')
      .select('id')
      .ilike('name', `%${authorName}%`);

    if (error) throw error;
    return (data || []).map((item) => item.id);
  } catch (error) {
    throw wrapRepositoryError('Failed to load author ids', error, { authorName });
  }
}

async function findCategoryIdsByName(categoryName) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', `%${categoryName}%`);

    if (error) throw error;
    return (data || []).map((item) => item.id);
  } catch (error) {
    throw wrapRepositoryError('Failed to load category ids', error, { categoryName });
  }
}

async function findTagIdsByName(tagName) {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', `%${tagName}%`);

    if (error) throw error;
    return (data || []).map((item) => item.id);
  } catch (error) {
    throw wrapRepositoryError('Failed to load tag ids', error, { tagName });
  }
}

async function findNewsIdsByTagIds(tagIds) {
  try {
    const { data, error } = await supabase
      .from('news_tags')
      .select('news_id')
      .in('tag_id', tagIds);

    if (error) throw error;
    return (data || []).map((item) => item.news_id);
  } catch (error) {
    throw wrapRepositoryError('Failed to load news ids by tag ids', error);
  }
}

async function getTagsForNewsId(newsId) {
  try {
    const { data, error } = await supabase
      .from('news_tags')
      .select(`
        tags:tags(*)
      `)
      .eq('news_id', newsId);

    if (error) throw error;
    return (data || []).map((item) => item.tags).filter(Boolean);
  } catch (error) {
    throw wrapRepositoryError('Failed to load tags for news', error, { newsId });
  }
}

async function countHealthNews() {
  try {
    const { count, error } = await supabase
      .from('health_news')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    throw wrapRepositoryError('Failed to count health news', error);
  }
}

async function getAllNews(includeDetails) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .select(buildSelectStatement(includeDetails))
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load all health news', error);
  }
}

async function getNewsByCategoryId(id) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .select(buildSelectStatement(true))
      .eq('category_id', id)
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load news by category id', error, { id });
  }
}

async function getNewsByAuthorId(id) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .select(buildSelectStatement(true))
      .eq('author_id', id)
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load news by author id', error, { id });
  }
}

async function getNewsByIds(ids) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .select(buildSelectStatement(true))
      .in('id', ids)
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load news by ids', error, { ids });
  }
}

async function createNews(payload) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create health news', error);
  }
}

async function updateNewsById(id, payload) {
  try {
    const { data, error } = await supabase
      .from('health_news')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to update health news', error, { id });
  }
}

async function deleteNewsById(id) {
  try {
    const { error } = await supabase
      .from('health_news')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete health news', error, { id });
  }
}

async function createNewsTags(relations) {
  try {
    const { error } = await supabase
      .from('news_tags')
      .insert(relations);

    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to create news tag relations', error);
  }
}

async function deleteNewsTagsByNewsId(newsId) {
  try {
    const { error } = await supabase
      .from('news_tags')
      .delete()
      .eq('news_id', newsId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete news tag relations', error, { newsId });
  }
}

async function getAllCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load categories', error);
  }
}

async function getAllAuthors() {
  try {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load authors', error);
  }
}

async function getAllTags() {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load tags', error);
  }
}

async function createCategory(payload) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create category', error);
  }
}

async function createAuthor(payload) {
  try {
    const { data, error } = await supabase
      .from('authors')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create author', error);
  }
}

async function createTag(payload) {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create tag', error);
  }
}

module.exports = {
  countHealthNews,
  createAuthor,
  createCategory,
  createNews,
  createNewsTags,
  createTag,
  deleteNewsById,
  deleteNewsTagsByNewsId,
  findAuthorIdsByName,
  findCategoryIdsByName,
  findNewsIdsByTagIds,
  findTagIdsByName,
  getAllAuthors,
  getAllCategories,
  getAllNews,
  getAllTags,
  getNewsByAuthorId,
  getNewsByCategoryId,
  getNewsById,
  getNewsByIds,
  getNewsList,
  getTagsForNewsId,
  updateNewsById
};
