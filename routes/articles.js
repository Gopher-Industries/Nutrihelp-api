const express = require('express');
const router = express.Router();
const { contentAndSupport } = require('../controller');

const { articles } = contentAndSupport;

router.get('/', articles.searchHealthArticles);

module.exports = router;
