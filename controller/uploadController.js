const multer = require('multer');
const logger = require('../utils/logger');
const { supabaseService: supabase } = require('../services/supabaseClient');
const crypto = require('crypto');
const path = require('path');
const { fileTypeFromBuffer } = require('file-type');

// Single source of truth for allowed file types — used by both
// the initial mimetype check (fileFilter) and the real content check (uploadFile)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
}).single('file');

exports.uploadFile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const user_id = req.user.userId;
    const file = req.file;

  
    const detectedType = await fileTypeFromBuffer(file.buffer);

    if (!detectedType || !ALLOWED_TYPES.includes(detectedType.mime)) {
      return res.status(400).json({
        success: false,
        error: 'File content does not match an allowed file type (jpeg, png, or pdf).'
      });
    }

    if (detectedType.mime !== file.mimetype) {
      return res.status(400).json({
        success: false,
        error: 'Declared file type does not match actual file content.'
      });
    }

    // --- Task 4: sanitize filename before it touches storage ---
    const safeName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const filePath = `files/${user_id}/${safeName}${ext}`;
    console.log('--- Upload Debug ---');
    console.log('Original filename:', file.originalname);
    console.log('Generated safeName:', safeName);
    console.log('Extension:', ext);
    console.log('Final filePath:', filePath);
    console.log('--------------------');

    try {
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData, error: urlError } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      if (urlError || !urlData) {
        throw urlError || new Error('Failed to generate file URL');
      }

      const fileUrl = urlData.publicUrl;

      const { error: logError } = await supabase
        .from('upload_logs')
        .insert([{ user_id }]);

      if (logError) {
        throw logError;
      }

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        fileUrl
      });

    } catch (error) {
      logger.error('File upload failed', {
        error: error.message,
        userId: req.user?.userId
      });

      return res.status(500).json({
        success: false,
        error: 'File upload failed'
      });
    }
  });
};