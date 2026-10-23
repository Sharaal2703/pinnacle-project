import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { RegisterRequestSchema, LoginRequestSchema } from '@pinnacle/shared';

const router = Router();

router.get('/registration-options', AuthController.registrationOptions);
router.post('/register', validateBody(RegisterRequestSchema), AuthController.register);
router.post('/login', validateBody(LoginRequestSchema), AuthController.login);
router.get('/me', authMiddleware, AuthController.me);

export default router;
