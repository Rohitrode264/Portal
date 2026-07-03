import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login-init', authController.loginInit);
router.post('/login-verify', authController.loginVerify);
router.post('/forgot-password-init', authController.forgotPasswordInit);
router.post('/forgot-password-verify', authController.forgotPasswordVerify);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);

export default router;
