const express = require('express');
const router = express.Router();
const healthNewsController = require('../controller/healthNewsController');

// Specific routes FIRST to avoid shadowing
router.get('/categories', healthNewsController.getCategories);
router.get('/trending', healthNewsController.getTrendingNews);

// Parameterized route for /:id
router.get('/:id', healthNewsController.getNewsById);

// Standard list/search route
router.get('/', healthNewsController.getAllNews);

// Create / Update / Delete endpoints (used by tests)
router.post('/', healthNewsController.createItem);
router.put('/', healthNewsController.updateNews);
router.delete('/', healthNewsController.deleteNews);

module.exports = router;
