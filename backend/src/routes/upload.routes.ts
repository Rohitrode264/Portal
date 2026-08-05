import { Router } from 'express';
import { getPresignedUrl, deleteImage } from '../controllers/upload.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Allow Teachers and Admins to upload and delete diagrams
router.post('/presign', authenticate, requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), getPresignedUrl);
router.delete('/diagram', authenticate, requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), deleteImage);

export default router;
