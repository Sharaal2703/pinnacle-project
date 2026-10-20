import { Router } from 'express';
import { z } from 'zod';
import { AssessmentAccessController } from '../controllers/assessment-access.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { validateParams } from '../middleware/validation.middleware';

const router = Router();
const studentIdParamSchema = z.object({ student_id: z.string().uuid() });

router.use(authMiddleware, requireRole('TEACHER'));
router.get('/students', AssessmentAccessController.listStudents);
router.post(
  '/students/:student_id/retake-access',
  validateParams(studentIdParamSchema),
  AssessmentAccessController.grantRetake
);
router.delete(
  '/students/:student_id/retake-access',
  validateParams(studentIdParamSchema),
  AssessmentAccessController.revokeRetake
);

export default router;
