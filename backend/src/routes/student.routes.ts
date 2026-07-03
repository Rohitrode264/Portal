import { Router } from 'express';
import { studentController } from '../controllers/student.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/exams', requireRole(['STUDENT']), (req, res) => studentController.getMyExams(req, res));
router.get('/exams/:id/result', requireRole(['STUDENT']), (req, res) => studentController.getMyExamResult(req, res));

export default router;
