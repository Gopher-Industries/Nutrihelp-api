const express = require('express');
const router = express.Router();
const healthNewsController = require('../controller/healthNewsController');

/**
 * @api {get} /api/health-news Health News API
 * @apiName HealthNewsAPI
 * @apiGroup Health News
 * @apiDescription Comprehensive API for health news management with flexible filtering
 * 
 * @apiParam {String} [action] Action to perform (optional - the API will auto-detect based on parameters):
 *   - "filter" (default): Filter health news articles using flexible criteria
 *   - "getById": Get specific health news by ID (specify id parameter)
 *   - "getByCategory": Get news by category (specify categoryId parameter)
 *   - "getByAuthor": Get news by author (specify authorId parameter)
 *   - "getByTag": Get news by tag (specify tagId parameter)
 *   - "getAllCategories": Get all categories
 *   - "getAllAuthors": Get all authors
 *   - "getAllTags": Get all tags
 * 
 * @apiParam {String} [id] Health news ID
 * @apiParam {String} [categoryId] Category ID
 * @apiParam {String} [authorId] Author ID
 * @apiParam {String} [tagId] Tag ID
 * 
 * @apiParam {String} [title] Filter news by title (partial match)
 * @apiParam {String} [content] Filter news by content (partial match)
 * @apiParam {String} [author_name] Filter news by author name (partial match)
 * @apiParam {String} [category_name] Filter news by category name (partial match)
 * @apiParam {String} [tag_name] Filter news by tag name (partial match)
 * @apiParam {String} [start_date] Filter news published on or after this date (ISO format)
 * @apiParam {String} [end_date] Filter news published on or before this date (ISO format)
 * @apiParam {String} [sort_by="published_at"] Field to sort by
 * @apiParam {String} [sort_order="desc"] Sort order ("asc" or "desc")
 * @apiParam {Number} [limit=20] Number of records to return
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {String} [include_details="true"] Whether to include full relationship details ("true" or "false")
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {Array/Object} response.data Requested data
 * @apiSuccess {Object} [response.pagination] Pagination information
 */
router.get('/', async (req, res) => {
  // Auto-detect the appropriate action based on provided parameters
  let action = req.query.action || 'filter';
  
  // If no explicit action is provided, determine based on parameters
  if (!req.query.action) {
    if (req.query.id) {
      action = 'getById';
    } else if (req.query.categoryId) {
      action = 'getByCategory';
    } else if (req.query.authorId) {
      action = 'getByAuthor';
    } else if (req.query.tagId) {
      action = 'getByTag';
    } else if (req.query.type === 'categories') {
      action = 'getAllCategories';
    } else if (req.query.type === 'authors') {
      action = 'getAllAuthors';
    } else if (req.query.type === 'tags') {
      action = 'getAllTags';
    }
  }
  
  try {
    switch (action) {
      case 'filter':
        return await healthNewsController.filterNews(req, res);
      
      case 'getAll':
        return await healthNewsController.getAllNews(req, res);
      
      case 'getById':
        if (!req.query.id) {
          return res.status(400).json({ 
            success: false, 
            message: 'Missing required parameter: id' 
          });
        }
        req.params.id = req.query.id;
        return await healthNewsController.getNewsById(req, res);
      
      case 'getByCategory':
        if (!req.query.categoryId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Missing required parameter: categoryId' 
          });
        }
        req.params.id = req.query.categoryId;
        return await healthNewsController.getNewsByCategory(req, res);
      
      case 'getByAuthor':
        if (!req.query.authorId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Missing required parameter: authorId' 
          });
        }
        req.params.id = req.query.authorId;
        return await healthNewsController.getNewsByAuthor(req, res);
      
      case 'getByTag':
        if (!req.query.tagId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Missing required parameter: tagId' 
          });
        }
        req.params.id = req.query.tagId;
        return await healthNewsController.getNewsByTag(req, res);
      
      case 'getAllCategories':
        return await healthNewsController.getAllCategories(req, res);
      
      case 'getAllAuthors':
        return await healthNewsController.getAllAuthors(req, res);
      
      case 'getAllTags':
        return await healthNewsController.getAllTags(req, res);
      
      default:
        return res.status(400).json({ 
          success: false, 
          message: `Unknown action: ${action}` 
        });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @api {post} /api/health-news Health News API
 * @apiName HealthNewsCreateAPI
 * @apiGroup Health News
 * @apiDescription Create health news articles and related entities
 * 
 * @apiParam {String} [action] Action to perform (optional - will auto-detect):
 *   - "createNews" (default): Create a new health news article
 *   - "createCategory": Create a category (only requires name and description fields)
 *   - "createAuthor": Create an author (only requires name and bio fields)
 *   - "createTag": Create a tag (only requires name field)
 * 
 * @apiParam {Object} body Request body with data based on the action
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {Object} response.data Created entity data
 */
router.post('/', async (req, res) => {
  // Auto-detect the operation based on the body fields
  let action = req.query.action || 'createNews';
  
  // If no explicit action is provided, determine based on body fields
  if (!req.query.action) {
    const body = req.body;
    if (body.name && !body.content) {
      if (body.bio) {
        action = 'createAuthor';
      } else if (body.description) {
        action = 'createCategory';
      } else {
        action = 'createTag';
      }
    }
  }
  
  try {
    switch (action) {
      case 'createNews':
        return await healthNewsController.createNews(req, res);
      
      case 'createCategory':
        return await healthNewsController.createCategory(req, res);
      
      case 'createAuthor':
        return await healthNewsController.createAuthor(req, res);
      
      case 'createTag':
        return await healthNewsController.createTag(req, res);
      
      default:
        return res.status(400).json({ 
          success: false, 
          message: `Unknown action: ${action}` 
        });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @api {put} /api/health-news Health News API
 * @apiName HealthNewsUpdateAPI
 * @apiGroup Health News
 * @apiDescription Update health news articles
 * 
 * @apiParam {String} id The ID of the news article to update
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {Object} response.data Updated news data
 */
router.put('/', async (req, res) => {
  if (!req.query.id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required parameter: id' 
    });
  }
  
  req.params.id = req.query.id;
  return await healthNewsController.updateNews(req, res);
});

/**
 * @api {delete} /api/health-news Health News API
 * @apiName HealthNewsDeleteAPI
 * @apiGroup Health News
 * @apiDescription Delete health news articles
 * 
 * @apiParam {String} id The ID of the news article to delete
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {String} response.message Success message
 */
router.delete('/', async (req, res) => {
  if (!req.query.id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required parameter: id' 
    });
  }
  
  req.params.id = req.query.id;
  return await healthNewsController.deleteNews(req, res);
});

module.exports = router; 