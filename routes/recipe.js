const express = require('express');
const router = express.Router();
const recipeController = require('../controller/recipeController.js');
const { authenticateToken } = require('../middleware/authenticateToken');
const { validateRecipe } = require('../validators/recipeValidator.js');
const validateRequest = require('../middleware/validateRequest.js');
const authorizeRoles = require('../middleware/authorizeRoles');

router.post('/createRecipe', authenticateToken, validateRecipe, validateRequest, recipeController.createAndSaveRecipe);

router.get('/admin/all', authenticateToken, authorizeRoles('admin'), recipeController.listAdminRecipes);
router.patch('/admin/:id/visibility', authenticateToken, authorizeRoles('admin'), recipeController.updateRecipeCommunityVisibility);
router.get('/community', recipeController.listCommunityRecipes);
router.post('/:id/share-community', authenticateToken, recipeController.shareRecipeToCommunity);
router.post('/:id/unshare-community', authenticateToken, recipeController.unshareRecipeFromCommunity);
router.post('/', authenticateToken, recipeController.getRecipes);
router.delete('/', authenticateToken, recipeController.deleteRecipe);

module.exports = router;
