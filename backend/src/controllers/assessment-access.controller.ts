import { Request, Response, NextFunction } from 'express';
import { AssessmentAccessService } from '../services/assessment-access.service';
import { ForbiddenError } from '../middleware/error.middleware';

export class AssessmentAccessController {
  static async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ForbiddenError('Authentication required');
      res.status(200).json(await AssessmentAccessService.listManagedStudents(req.user.id, req.user.role));
    } catch (err) {
      next(err);
    }
  }

  static async studentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ForbiddenError('Authentication required');
      res.status(200).json(await AssessmentAccessService.getAssignedStudentReport(req.user.id, req.user.role, req.params.student_id));
    } catch (err) {
      next(err);
    }
  }

  static async grantRetake(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ForbiddenError('Authentication required');
      const grant = await AssessmentAccessService.grantRetake(req.user.id, req.user.role, req.params.student_id);
      res.status(200).json({
        message: 'One assessment retake has been authorized.',
        granted_at: grant.grantedAt.toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  static async revokeRetake(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ForbiddenError('Authentication required');
      await AssessmentAccessService.revokeRetake(req.user.id, req.user.role, req.params.student_id);
      res.status(200).json({ message: 'Unused assessment retake authorization revoked.' });
    } catch (err) {
      next(err);
    }
  }
}
