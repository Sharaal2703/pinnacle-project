import { Router } from 'express';
import { AttemptController } from '../controllers/attempt.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { SubmitAnswerRequestSchema } from '@pinnacle/shared';
import { z } from 'zod';

const router = Router();
const attemptIdParamSchema = z.object({ attempt_id: z.string().uuid() });

router.post('/', authMiddleware, requireRole('STUDENT'), AttemptController.startOrResume);

router.get(
  '/:attempt_id/current',
  authMiddleware,
  requireRole('STUDENT'),
  validateParams(attemptIdParamSchema),
  AttemptController.getCurrentQuestion
);

router.post(
  '/:attempt_id/responses',
  authMiddleware,
  requireRole('STUDENT'),
  validateParams(attemptIdParamSchema),
  validateBody(SubmitAnswerRequestSchema),
  AttemptController.recordAnswer
);

router.post(
  '/:attempt_id/submit',
  authMiddleware,
  requireRole('STUDENT'),
  validateParams(attemptIdParamSchema),
  AttemptController.submitAttempt
);

export default router;
