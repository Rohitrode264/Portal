import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// List assistants: Admin or Teacher
router.get('/', requireRole(['ADMIN', 'TEACHER']), (req, res) => assistantController.getAssistants(req, res));

// Modify assistants: Admin only
router.post('/', requireRole(['ADMIN']), (req, res) => assistantController.createAssistant(req, res));
router.patch('/:cpId', requireRole(['ADMIN']), (req, res) => assistantController.updateAssistant(req, res));
router.patch('/:cpId/toggle', requireRole(['ADMIN']), (req, res) => assistantController.toggleAssistantStatus(req, res));

export default router;
