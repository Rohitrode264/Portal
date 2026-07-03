import { Router } from 'express';
import { classController } from '../controllers/class.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Accessible by Admin, Teachers and Assistants
router.get('/', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => classController.getClasses(req, res));
router.get('/:classId/students', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => classController.getClassStudents(req, res));

// Admin only
router.patch('/:classId/coordinator', requireRole(['ADMIN']), (req, res) => classController.assignCoordinator(req, res));

export default router;
