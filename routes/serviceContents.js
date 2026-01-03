const express = require('express');
const router = express.Router();
const { getServiceContents,createService,updateService,getServiceContentsPage,deleteService } = require('../controller/serviceContentController');

router.get('/', getServiceContents);
router.get('/page', getServiceContentsPage);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);


module.exports = router;
