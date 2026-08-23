import { Router } from 'express';
import { liveExamController } from '../controllers/liveExam.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// --- Teacher Routes ---
router.post('/attendance', requireRole(['TEACHER', 'ADMIN', 'ASSISTANT']), (req, res) => liveExamController.markAttendance(req, res));
router.get('/:id/status', requireRole(['TEACHER', 'ADMIN', 'ASSISTANT']), (req, res) => liveExamController.getLiveStatus(req, res));
router.post('/:id/release-all', requireRole(['TEACHER', 'ADMIN', 'ASSISTANT']), (req, res) => liveExamController.releaseAllPresent(req, res));
router.post('/:id/resume/:studentId', requireRole(['TEACHER', 'ADMIN', 'ASSISTANT']), (req, res) => liveExamController.resumeExam(req, res));
router.post('/:id/end-exam', requireRole(['ADMIN']), (req, res) => liveExamController.endExam(req, res));

// --- Student Routes ---
router.post('/:id/start', requireRole(['STUDENT']), (req, res) => liveExamController.startExam(req, res));
router.post('/:id/heartbeat', requireRole(['STUDENT']), (req, res) => liveExamController.heartbeat(req, res));
router.post('/:id/answer', requireRole(['STUDENT']), (req, res) => liveExamController.saveAnswer(req, res));
router.post('/:id/tab-switch', requireRole(['STUDENT']), (req, res) => liveExamController.reportTabSwitch(req, res));
router.post('/:id/submit', requireRole(['STUDENT']), (req, res) => liveExamController.submitExam(req, res));

export default router;
