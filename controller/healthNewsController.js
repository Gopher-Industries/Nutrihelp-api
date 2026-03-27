const healthNewsRepository = require('../repositories/healthNewsRepository');

// Get all health news with flexible filtering
exports.filterNews = async (req, res) => {
  try {
    const {
      id,
      title,
      content,
      author_name,
      category_name,
      tag_name,
      start_date,
      end_date,
      sort_by = 'published_at',
      sort_order = 'desc',
      limit = 20,
      page = 1,
      include_details = 'true' // Controls whether to include full relationship details
    } = req.query;

    // If ID is provided, use a simplified query for better performance
    if (id) {
      // Configure select statement based on include_details preference
      let selectStatement = '*';
      if (include_details === 'true') {
        selectStatement = `
          *,
          author:authors(*),
          source:sources(*),
          category:categories(*)
        `;
      } else {
        selectStatement = `
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

      const data = await healthNewsRepository.getNewsById(id, include_details === 'true');

      // Only fetch tags if include_details is true
      if (include_details === 'true') {
        data.tags = await healthNewsRepository.getTagsForNewsId(id);
      }

      return res.status(200).json({ 
        success: true, 
        data
      });
    }

    // For non-ID queries, use the original filtering logic
    // Build the query
    let authorIds = null;
    let categoryIds = null;

    // Relational filtering
    if (author_name) {
      authorIds = await healthNewsRepository.findAuthorIdsByName(author_name);
      if (authorIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    if (category_name) {
      categoryIds = await healthNewsRepository.findCategoryIdsByName(category_name);
      if (categoryIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    let data = await healthNewsRepository.getNewsList({
      includeDetails: include_details === 'true',
      title,
      content,
      startDate: start_date,
      endDate: end_date,
      sortBy: sort_by,
      sortOrder: sort_order,
      offset,
      limit: Number(limit),
      authorIds,
      categoryIds
    });

    // Handle tag filtering separately since it's a many-to-many relationship
    if (tag_name) {
      const tagIds = await healthNewsRepository.findTagIdsByName(tag_name);
      if (tagIds.length > 0) {
        const newsIdsWithTags = await healthNewsRepository.findNewsIdsByTagIds(tagIds);
        data = data.filter(news => newsIdsWithTags.includes(news.id));
      } else {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    // Get tags for each news if include_details is true
    if (include_details === 'true') {
      for (let news of data) {
        news.tags = await healthNewsRepository.getTagsForNewsId(news.id);
      }
    }

    // Get total count for pagination - FIX: Use proper Supabase count method
    const totalCount = await healthNewsRepository.countHealthNews();

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all health news
exports.getAllNews = async (req, res) => {
  try {
    const data = await healthNewsRepository.getAllNews(true);

    // Get tags for each news
    for (let news of data) {
      news.tags = await healthNewsRepository.getTagsForNewsId(news.id);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get specific health news by ID
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await healthNewsRepository.getNewsById(id, true);
    data.tags = await healthNewsRepository.getTagsForNewsId(id);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get news by category
exports.getNewsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await healthNewsRepository.getNewsByCategoryId(id);
    for (const news of data) {
      news.tags = await healthNewsRepository.getTagsForNewsId(news.id);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get news by author
exports.getNewsByAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await healthNewsRepository.getNewsByAuthorId(id);
    for (const news of data) {
      news.tags = await healthNewsRepository.getTagsForNewsId(news.id);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get news by tag
exports.getNewsByTag = async (req, res) => {
  try {
    const { id } = req.params;
    const newsIds = await healthNewsRepository.findNewsIdsByTagIds([id]);
    if (newsIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    const data = await healthNewsRepository.getNewsByIds(newsIds);
    for (const news of data) {
      news.tags = await healthNewsRepository.getTagsForNewsId(news.id);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new health news
exports.createNews = async (req, res) => {
  const { 
    title, 
    summary, 
    content, 
    author_id, 
    source_id, 
    category_id, 
    source_url, 
    image_url, 
    published_at,
    tags
  } = req.body;

  try {
    const data = await healthNewsRepository.createNews({
      title,
      summary,
      content,
      author_id: author_id || null,
      source_id: source_id || null,
      category_id: category_id || null,
      source_url: source_url || null,
      image_url: image_url || null,
      published_at: published_at || new Date().toISOString()
    });

    // If there are tags, add tag associations
    if (tags && tags.length > 0) {
      const tagRelations = tags.map(tag_id => ({
        news_id: data.id,
        tag_id
      }));
      await healthNewsRepository.createNewsTags(tagRelations);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update health news
exports.updateNews = async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    summary, 
    content, 
    author_id, 
    source_id, 
    category_id, 
    source_url, 
    image_url, 
    published_at,
    tags
  } = req.body;

  try {
    const data = await healthNewsRepository.updateNewsById(id, {
      title,
      summary,
      content,
      author_id,
      source_id,
      category_id,
      source_url,
      image_url,
      published_at,
      updated_at: new Date().toISOString()
    });

    // If tags are provided, delete old tag associations and add new ones
    if (tags) {
      await healthNewsRepository.deleteNewsTagsByNewsId(id);

      // Add new tag associations
      if (tags.length > 0) {
        const tagRelations = tags.map(tag_id => ({
          news_id: id,
          tag_id
        }));
        await healthNewsRepository.createNewsTags(tagRelations);
      }
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete health news
exports.deleteNews = async (req, res) => {
  const { id } = req.params;

  try {
    await healthNewsRepository.deleteNewsById(id);

    res.status(200).json({ 
      success: true, 
      message: 'Health news successfully deleted' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const data = await healthNewsRepository.getAllCategories();

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all authors
exports.getAllAuthors = async (req, res) => {
  try {
    const data = await healthNewsRepository.getAllAuthors();

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    const data = await healthNewsRepository.getAllTags();

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    const data = await healthNewsRepository.createCategory({ name, description });

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new author
exports.createAuthor = async (req, res) => {
  const { name, bio } = req.body;

  try {
    const data = await healthNewsRepository.createAuthor({ name, bio });

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new tag
exports.createTag = async (req, res) => {
  const { name } = req.body;

  try {
    const data = await healthNewsRepository.createTag({ name });

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 
