import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UnauthorizedError } from '../middleware/error.middleware';

export class AuthController {
  static async registrationOptions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await AuthService.getRegistrationOptions());
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.registerStudent(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }
      const user = await AuthService.getCurrentUser(req.user.id);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }
}
