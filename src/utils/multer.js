import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: './public/images',
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const upload = multer({
  storage,
  // limits: { fileSize: 2000000 },
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(null, true);
    }
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb('Error: Images Only!');
  },
});

export default upload;
