const supabase = require('../dbConnection');

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

      const { data, error } = await supabase
        .from('health_news')
        .select(selectStatement)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Only fetch tags if include_details is true
      if (include_details === 'true') {
        const { data: tags, error: tagsError } = await supabase
          .from('news_tags')
          .select(`
            tags:tags(*)
          `)
          .eq('news_id', id);
        
        if (tagsError) throw tagsError;
        
        data.tags = tags.map(t => t.tags);
      }

      return res.status(200).json({ 
        success: true, 
        data
      });
    }

    // For non-ID queries, use the original filtering logic
    // Build the query
    let query = supabase
      .from('health_news');
    
    // Configure select statement based on include_details preference
    if (include_details === 'true') {
      query = query.select(`
        *,
        author:authors(*),
        source:sources(*),
        category:categories(*)
      `);
    } else {
      query = query.select(`
        id, 
        title, 
        summary, 
        published_at,
        image_url,
        author:authors(id, name),
        category:categories(id, name)
      `);
    }

    // Apply filters
    if (title) {
      query = query.ilike('title', `%${title}%`);
    }

    if (content) {
      query = query.ilike('content', `%${content}%`);
    }

    // Date range filtering
    if (start_date) {
      query = query.gte('published_at', start_date);
    }

    if (end_date) {
      query = query.lte('published_at', end_date);
    }

    // Relational filtering
    if (author_name) {
      // Get the author ID first
      const { data: authors, error: authorsError } = await supabase
        .from('authors')
        .select('id')
        .ilike('name', `%${author_name}%`);
      
      if (authorsError) throw authorsError;
      
      if (authors.length > 0) {
        const authorIds = authors.map(author => author.id);
        query = query.in('author_id', authorIds);
      } else {
        // No matching authors, return empty result
        return res.status(200).json({ success: true, data: [] });
      }
    }

    if (category_name) {
      // Get the category ID first
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', `%${category_name}%`);
      
      if (categoriesError) throw categoriesError;
      
      if (categories.length > 0) {
        const categoryIds = categories.map(category => category.id);
        query = query.in('category_id', categoryIds);
      } else {
        // No matching categories, return empty result
        return res.status(200).json({ success: true, data: [] });
      }
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    query = query.order(sort_by, { ascending: sort_order === 'asc' })
                .range(offset, offset + limit - 1);

    // Execute the query
    let { data, error } = await query;

    if (error) throw error;

    // Handle tag filtering separately since it's a many-to-many relationship
    if (tag_name) {
      // Get tag IDs matching the name
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id')
        .ilike('name', `%${tag_name}%`);
        
      if (tagsError) throw tagsError;
      
      if (tags.length > 0) {
        const tagIds = tags.map(tag => tag.id);
        
        // Get news IDs that have these tags
        const { data: newsWithTags, error: newsTagsError } = await supabase
          .from('news_tags')
          .select('news_id')
          .in('tag_id', tagIds);
          
        if (newsTagsError) throw newsTagsError;
        
        const newsIdsWithTags = newsWithTags.map(item => item.news_id);
        
        // Filter the results to only include news with matching tags
        data = data.filter(news => newsIdsWithTags.includes(news.id));
      } else {
        // No matching tags, return empty result
        return res.status(200).json({ success: true, data: [] });
      }
    }

    // Get tags for each news if include_details is true
    if (include_details === 'true') {
      for (let news of data) {
        const { data: tags, error: tagsError } = await supabase
          .from('news_tags')
          .select(`
            tags:tags(*)
          `)
          .eq('news_id', news.id);
        
        if (tagsError) throw tagsError;
        
        news.tags = tags.map(t => t.tags);
      }
    }

    // Get total count for pagination - FIX: Use proper Supabase count method
    const { count, error: countError } = await supabase
      .from('health_news')
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;

    const totalCount = count || 0;

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
    const { data, error } = await supabase
      .from('health_news')
      .select(`
        *,
        author:authors(*),
        source:sources(*),
        category:categories(*)
      `)
      .order('published_at', { ascending: false });

    if (error) throw error;

    // Get tags for each news
    for (let news of data) {
      const { data: tags, error: tagsError } = await supabase
        .from('news_tags')
        .select(`
          tags:tags(*)
        `)
        .eq('news_id', news.id);
      
      if (tagsError) throw tagsError;
      
      news.tags = tags.map(t => t.tags);
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
    
    const { data, error } = await supabase
      .from('health_news')
      .select(`
        *,
        author:authors(*),
        source:sources(*),
        category:categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Get tags for the news
    const { data: tags, error: tagsError } = await supabase
      .from('news_tags')
      .select(`
        tags:tags(*)
      `)
      .eq('news_id', id);
    
    if (tagsError) throw tagsError;
    
    data.tags = tags.map(t => t.tags);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get news by category
exports.getNewsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('health_news')
      .select(`
        *,
        author:authors(*),
        source:sources(*),
        category:categories(*)
      `)
      .eq('category_id', id)
      .order('published_at', { ascending: false });

    if (error) throw error;

    // Get tags for each news
    for (let news of data) {
      const { data: tags, error: tagsError } = await supabase
        .from('news_tags')
        .select(`
          tags:tags(*)
        `)
        .eq('news_id', news.id);
      
      if (tagsError) throw tagsError;
      
      news.tags = tags.map(t => t.tags);
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
    
    const { data, error } = await supabase
      .from('health_news')
      .select(`
        *,
        author:authors(*),
        source:sources(*),
        category:categories(*)
      `)
      .eq('author_id', id)
      .order('published_at', { ascending: false });

    if (error) throw error;

    // Get tags for each news
    for (let news of data) {
      const { data: tags, error: tagsError } = await supabase
        .from('news_tags')
        .select(`
          tags:tags(*)
        `)
        .eq('news_id', news.id);
      
      if (tagsError) throw tagsError;
      
      news.tags = tags.map(t => t.tags);
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
    
    // First find all news IDs with this tag
    const { data: newsIds, error: newsIdsError } = await supabase
      .from('news_tags')
      .select('news_id')
      .eq('tag_id', id);
    
    if (newsIdsError) throw newsIdsError;
    
    if (newsIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    
    // Get details for these news
    const { data, error } = await supabase
      .from('health_news')
      .select(`
        *,
        author:authors(*),
        source:sources(*),
        category:categories(*)
      `)
      .in('id', newsIds.map(item => item.news_id))
      .order('published_at', { ascending: false });

    if (error) throw error;

    // Get tags for each news
    for (let news of data) {
      const { data: tags, error: tagsError } = await supabase
        .from('news_tags')
        .select(`
          tags:tags(*)
        `)
        .eq('news_id', news.id);
      
      if (tagsError) throw tagsError;
      
      news.tags = tags.map(t => t.tags);
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
    // Start transaction
    const { data, error } = await supabase
      .from('health_news')
      .insert({
        title,
        summary,
        content,
        author_id,
        source_id,
        category_id,
        source_url,
        image_url,
        published_at: published_at || new Date()
      })
      .select()
      .single();

    if (error) throw error;

    // If there are tags, add tag associations
    if (tags && tags.length > 0) {
      const tagRelations = tags.map(tag_id => ({
        news_id: data.id,
        tag_id
      }));

      const { error: tagError } = await supabase
        .from('news_tags')
        .insert(tagRelations);

      if (tagError) throw tagError;
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
    // Update news
    const { data, error } = await supabase
      .from('health_news')
      .update({
        title,
        summary,
        content,
        author_id,
        source_id,
        category_id,
        source_url,
        image_url,
        published_at,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If tags are provided, delete old tag associations and add new ones
    if (tags) {
      // Delete old tag associations
      const { error: deleteError } = await supabase
        .from('news_tags')
        .delete()
        .eq('news_id', id);

      if (deleteError) throw deleteError;

      // Add new tag associations
      if (tags.length > 0) {
        const tagRelations = tags.map(tag_id => ({
          news_id: id,
          tag_id
        }));

        const { error: tagError } = await supabase
          .from('news_tags')
          .insert(tagRelations);

        if (tagError) throw tagError;
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
    // Due to foreign key constraints, deleting news will automatically delete related tag associations
    const { error } = await supabase
      .from('health_news')
      .delete()
      .eq('id', id);

    if (error) throw error;

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
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all authors
exports.getAllAuthors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name');

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new author
exports.createAuthor = async (req, res) => {
  const { name, bio } = req.body;

  try {
    const { data, error } = await supabase
      .from('authors')
      .insert({ name, bio })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new tag
exports.createTag = async (req, res) => {
  const { name } = req.body;

  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 