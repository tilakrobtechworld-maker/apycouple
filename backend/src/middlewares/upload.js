'use strict';

require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Check if Cloudinary is configured ───────────────────────────────────────
const cloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let uploadPhoto, uploadMedia, uploadCSV, upload3DModel;

if (cloudinaryConfigured) {
  // ── Cloudinary Storage (when env vars are set) ──────────────────────────────
  const cloudinary = require('../config/cloudinary');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const isVideo = file.mimetype.startsWith('video/');
      return {
        folder: 'savethedate/photos',
        resource_type: isVideo ? 'video' : 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'],
        transformation: isVideo
          ? []
          : [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto' }],
      };
    },
  });

  uploadPhoto = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single('photo');

  uploadMedia = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
  }).single('media');

  // 3D model files (.glb/.gltf) - Cloudinary treats these as opaque binary
  // ("raw"), not image/video, so they need their own storage config.
  const model3DStorage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder: 'savethedate/models',
      resource_type: 'raw',
      allowed_formats: ['glb', 'gltf'],
    }),
  });

  upload3DModel = multer({
    storage: model3DStorage,
    fileFilter: (req, file, cb) => {
      if (/\.(glb|gltf)$/i.test(file.originalname)) cb(null, true);
      else cb(new Error('Only .glb or .gltf 3D model files are allowed.'), false);
    },
    limits: { fileSize: 25 * 1024 * 1024 },
  }).single('model');

  console.log('✅ Upload: Using Cloudinary storage.');
} else {
  // ── Local Disk Storage (fallback when Cloudinary not configured) ─────────────
  console.warn('⚠️  Cloudinary not configured. Using local disk storage for uploads.');

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  const mediaFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image and video files are allowed.'), false);
  };

  uploadPhoto = multer({
    storage: diskStorage,
    fileFilter: mediaFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single('photo');

  uploadMedia = multer({
    storage: diskStorage,
    fileFilter: mediaFilter,
    limits: { fileSize: 100 * 1024 * 1024 },
  }).single('media');

  upload3DModel = multer({
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
      if (/\.(glb|gltf)$/i.test(file.originalname)) cb(null, true);
      else cb(new Error('Only .glb or .gltf 3D model files are allowed.'), false);
    },
    limits: { fileSize: 25 * 1024 * 1024 },
  }).single('model');
}

// ─── CSV Upload (always memory) ───────────────────────────────────────────────
uploadCSV = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV/Excel files are allowed.'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');

module.exports = { uploadPhoto, uploadMedia, uploadCSV, upload3DModel };
