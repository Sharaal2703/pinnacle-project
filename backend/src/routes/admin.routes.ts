import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import {
  CreateQuestionInputSchema,
  UpdateQuestionInputSchema,
  ReviewQuestionInputSchema,
  UpdateAssessmentConfigSchema
} from '@pinnacle/shared';
import { z } from 'zod';

const router = Router();
const questionIdParamSchema = z.object({ question_id: z.string().uuid() });

// All admin routes require ADMIN role
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/questions', AdminController.listQuestions);
router.post('/questions', validateBody(CreateQuestionInputSchema), AdminController.createQuestion);

router.put(
  '/questions/:question_id',
  validateParams(questionIdParamSchema),
  validateBody(UpdateQuestionInputSchema),
  AdminController.updateQuestion
);

router.post(
  '/questions/:question_id/review',
  validateParams(questionIdParamSchema),
  validateBody(ReviewQuestionInputSchema),
  AdminController.reviewQuestion
);

router.post(
  '/questions/:question_id/activate',
  validateParams(questionIdParamSchema),
  AdminController.activateQuestion
);

router.delete(
  '/questions/:question_id',
  validateParams(questionIdParamSchema),
  AdminController.deactivateQuestion
);

router.get('/assessment-config', AdminController.getConfig);
router.put(
  '/assessment-config',
  validateBody(UpdateAssessmentConfigSchema),
  AdminController.updateConfig
);

export default router;
