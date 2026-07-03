import { Router } from 'express';
import { examController } from '../controllers/exam.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// 1. Get all exams & single exam
router.get('/', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.getExams(req, res));
router.get('/:id', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.getExam(req, res));

// 2. Create Exam (Admin or Coordinator)
router.post('/', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.createExam(req, res));
router.patch('/:id', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.updateExam(req, res));

// 3. Question Management (Teachers & Assistants)
router.post('/:id/sections/:subject/questions', requireRole(['TEACHER', 'ASSISTANT']), (req, res) => examController.addQuestion(req, res));
router.patch('/:id/sections/:subject/questions/:qId', requireRole(['TEACHER', 'ASSISTANT']), (req, res) => examController.updateQuestion(req, res));
router.delete('/:id/sections/:subject/questions/:qId', requireRole(['TEACHER', 'ASSISTANT']), (req, res) => examController.removeQuestion(req, res));

// 4. Section Approval (Assigned Teacher only - verified in controller)
router.patch('/:id/sections/:subject/approve', requireRole(['TEACHER', 'ASSISTANT']), (req, res) => examController.approveSection(req, res));

// 5. Exam Lifecycle (Admin or Coordinator)
router.patch('/:id/lock', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.lockExam(req, res));
router.patch('/:id/publish', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.publishExam(req, res));
router.delete('/:id', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.deleteExam(req, res));
router.patch('/:id/archive', requireRole(['ADMIN']), (req, res) => examController.archiveExam(req, res));

// 6. Results & Publishing (Admin, Teacher, Assistant)
router.get('/:id/results', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.getExamResults(req, res));
router.post('/:id/publish-result', requireRole(['ADMIN', 'TEACHER', 'ASSISTANT']), (req, res) => examController.publishResult(req, res));

export default router;
