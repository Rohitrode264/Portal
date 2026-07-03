import { Router } from 'express';
import { teacherController } from '../controllers/teacher.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All teacher routes require ADMIN role
router.use(authenticate);

// Staff lookup (used for assigning coordinators) - Accessible by Admins, Teachers, Assistants
router.get('/staff', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => teacherController.getStaff(req, res));

// Admin only routes for teachers
router.use(requireRole(['ADMIN']));

router.post('/', (req, res) => teacherController.createTeacher(req, res));
router.get('/', (req, res) => teacherController.getTeachers(req, res));
router.patch('/:cpId', (req, res) => teacherController.updateTeacher(req, res));
router.patch('/:cpId/toggle', (req, res) => teacherController.toggleTeacherStatus(req, res));

export default router;
