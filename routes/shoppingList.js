const express = require('express');
const router = express.Router();
const controller = require('../controller/shoppingController');
const validate = require('../middleware/validate');
const { shoppingItem } = require('../validators/utilitySchemas');

// GET all items for a user
router.get('/:user_id', controller.getUserList);

// POST new item
router.post('/', validate(shoppingItem, 'body'), controller.addItem);

// DELETE item
router.delete('/:id', controller.removeItem);

module.exports = router;
