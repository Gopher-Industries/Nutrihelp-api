const express = require('express');
const router = express.Router();
const recipeLibraryController = require('../controller/recipeLibraryController');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

// Public reads
router.get('/public', recipeLibraryController.listPublished);
router.get('/community', recipeLibraryController.listCommunity);

// Authenticated user reads/writes
router.get('/my', authenticateToken, recipeLibraryController.listMine);
router.get('/add-meal', authenticateToken, recipeLibraryController.listAddMeal);
router.post('/', authenticateToken, recipeLibraryController.createPrivate);

// Admin import/review endpoints
router.get(
  '/admin',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.listAdminRecipes
);

router.get(
  '/admin/pending-community',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.listPendingCommunity
);

router.post(
  '/admin/import-names',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.importNames
);

router.get(
  '/admin/import-template',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.downloadTemplate
);

router.post(
  '/admin/import-file',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.importUpload.single('file'),
  recipeLibraryController.importFile
);

router.post(
  '/admin/import-rows',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.importRows
);

router.get(
  '/admin/import-queue',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.listImportQueue
);

router.patch(
  '/admin/import-queue/:id',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.updateImportQueueRow
);

router.post(
  '/admin/import-queue/:id/trash',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.trashImportQueueRow
);

router.post(
  '/admin/import-queue/:id/recover',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.recoverImportQueueRow
);

router.delete(
  '/admin/import-queue/:id',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.hardDeleteImportQueueRow
);

router.post(
  '/admin/enrich-batch',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.enrichImportQueue
);

router.post(
  '/admin/import-queue/approve',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.approveImportQueueRows
);

router.post(
  '/admin/fetch-images',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.fetchImages
);

router.post(
  '/admin/:id/approve-community',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.approveCommunity
);

router.post(
  '/admin/:id/reject-community',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.rejectCommunity
);

router.post(
  '/admin/:id/publish-catalog',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.publishCatalog
);

router.post(
  '/admin/:id/unpublish-catalog',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.unpublishCatalog
);

router.post(
  '/admin/:id/recover',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.recoverRecipe
);

router.delete(
  '/admin/:id/permanent-delete',
  authenticateToken,
  authorizeRoles('admin'),
  recipeLibraryController.permanentlyDeleteRecipe
);

// Item detail and social actions
router.get('/:id', authenticateToken, recipeLibraryController.getById);
router.patch('/:id', authenticateToken, recipeLibraryController.updateOwn);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), recipeLibraryController.deleteRecipe);
router.post('/:id/share-community', authenticateToken, recipeLibraryController.shareToCommunity);
router.post('/:id/like', authenticateToken, recipeLibraryController.likeRecipe);
router.post('/:id/save', authenticateToken, recipeLibraryController.saveRecipe);
router.post('/:id/comments', authenticateToken, recipeLibraryController.addComment);
router.post('/:id/report', authenticateToken, recipeLibraryController.reportRecipe);

module.exports = router;
