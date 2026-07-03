import { Router } from 'express';
import { setupController } from '../controllers/setup.controller';

const router = Router();

router.post('/admin', setupController.createFirstAdmin);

export default router;
