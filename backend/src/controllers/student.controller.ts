import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { ForbiddenError } from '../middleware/error.middleware';

export class StudentController {
  static async getCurrentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.studentId) {
        throw new ForbiddenError('Only registered students can access their preference profile');
      }
      const profile = await ProfileService.getCurrentProfile(req.user.studentId);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async getProfileHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.studentId) {
        throw new ForbiddenError('Only registered students can access their profile history');
      }
      const history = await ProfileService.getProfileHistory(req.user.studentId);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }
}
