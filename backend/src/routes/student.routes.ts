import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get(
  '/me/preference-profile',
  authMiddleware,
  requireRole('STUDENT'),
  StudentController.getCurrentProfile
);

router.get(
  '/me/preference-profiles',
  authMiddleware,
  requireRole('STUDENT'),
  StudentController.getProfileHistory
);

export default router;
