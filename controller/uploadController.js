const multer = require('multer');
const logger = require('../utils/logger');
const { spawn } = require('child_process');
const path = require('path');
const { supabaseService: supabase } = require('../services/supabaseClient');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
}).single('file');

function reencodeImage(buffer) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, '../controller/reencode.js')]);
    let out = [];
    child.stdout.on('data', (d) => out.push(d));
    child.on('close', (code) => {
      code === 0 ? resolve(Buffer.concat(out)) : reject(new Error('Reencode failed'));
    });
    child.stdin.write(buffer);
    child.stdin.end();
  });
}
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

    // User identity comes from the verified JWT middleware.
    // Never trust a user_id supplied by the client.
    const user_id = req.user.userId;

    const file = req.file;
    const filePath = `files/${user_id}/${file.originalname}`;

    try {
      let fileBuffer = file.buffer;

      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        fileBuffer = await reencodeImage(file.buffer);
      }
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, fileBuffer, {
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

      // Current upload_logs schema only contains:
      // id, created_at, user_id
      const { error: logError } = await supabase
        .from('upload_logs')
        .insert([
          {
            user_id
          }
        ]);

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
