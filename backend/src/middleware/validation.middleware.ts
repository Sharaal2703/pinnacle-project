import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError, AppErrorDetails } from './error.middleware';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === 'ZodError' || Array.isArray(error?.issues)) {
        const issues = error.issues || error.errors || [];
        const details: AppErrorDetails[] = issues.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : undefined,
          issue: e.code,
          message: e.message
        }));
        next(new ValidationError(issues[0]?.message || 'Input validation failed', details));
        return;
      }
      next(error);
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === 'ZodError' || Array.isArray(error?.issues)) {
        const issues = error.issues || error.errors || [];
        const details: AppErrorDetails[] = issues.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : undefined,
          issue: e.code,
          message: e.message
        }));
        next(new ValidationError(issues[0]?.message || 'Invalid URL parameters', details));
        return;
      }
      next(error);
    }
  };
}
