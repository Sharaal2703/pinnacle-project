import { Request, Response, NextFunction } from 'express';
import { AttemptService } from '../services/attempt.service';
import { ForbiddenError } from '../middleware/error.middleware';

export class AttemptController {
  static async startOrResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.studentId) {
        throw new ForbiddenError('Only registered students can take the assessment');
      }
      const result = await AttemptService.startOrResumeAttempt(req.user.studentId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getCurrentQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.studentId) {
        throw new ForbiddenError('Only registered students can access assessment questions');
      }
      const attemptId = req.params.attempt_id;
      const result = await AttemptService.getCurrentQuestion(attemptId, req.user.studentId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async recordAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.studentId) {
        throw new ForbiddenError('Only registered students can submit answers');
      }
      const attemptId = req.params.attempt_id;
      const result = await AttemptService.recordAnswer(attemptId, req.user.studentId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async submitAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.studentId) {
        throw new ForbiddenError('Only registered students can submit assessment attempts');
      }
      const attemptId = req.params.attempt_id;
      const result = await AttemptService.submitAttempt(attemptId, req.user.studentId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
