const express = require('express');

const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controller/adminUserRoleController');

const router = express.Router();

router.get('/user-roles', authenticateToken, authorizeRoles('admin'), controller.listUserRoles);
router.patch('/user-roles/:userId', authenticateToken, authorizeRoles('admin'), controller.updateUserRole);

module.exports = router;
