const multer = require('multer');
const uploadRepository = require('../repositories/uploadRepository');

const storage = multer.memoryStorage();  
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
}).single('file');


exports.uploadFile = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { user_id } = req.body;
    const file = req.file;
    const uploadTime = new Date().toISOString();
    const filePath = `files/${user_id}/${file.originalname}`;

    try {
    
      await uploadRepository.uploadFileToStorage({
        bucket: 'uploads',
        filePath,
        buffer: file.buffer,
        contentType: file.mimetype,
        cacheControl: '3600'
      });

      const fileUrl = await uploadRepository.getPublicUrl('uploads', filePath);

      await uploadRepository.createUploadLog({
        userId: user_id,
        fileName: file.originalname,
        fileUrl,
        uploadTime
      });

      return res.status(201).json({ message: 'File uploaded successfully', fileUrl: fileUrl });
    } catch (error) {
      console.error('❌ File upload failed:', error);
      return res.status(500).json({ error: 'File upload failed' });
    }
  });
};
