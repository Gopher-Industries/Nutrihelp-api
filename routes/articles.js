const express = require('express');
const router = express.Router();
const { searchHealthArticles } = require('../controller/healthArticleController');

router.get('/', searchHealthArticles);

module.exports = router;
