import { Router } from 'express';
import { studentController } from '../controllers/student.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/search', requireRole(['ADMIN', 'TEACHER', 'COORDINATOR']), (req, res) => studentController.searchStudents(req, res));
router.get('/:id/profile', requireRole(['ADMIN', 'TEACHER', 'COORDINATOR']), (req, res) => studentController.getStudentProfile(req, res));

router.get('/exams', requireRole(['STUDENT']), (req, res) => studentController.getMyExams(req, res));
router.get('/exams/:id/result', requireRole(['STUDENT']), (req, res) => studentController.getMyExamResult(req, res));

export default router;
