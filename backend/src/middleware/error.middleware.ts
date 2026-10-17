import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppErrorDetails {
  field?: string;
  issue: string;
  message?: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: AppErrorDetails[];

  constructor(statusCode: number, code: string, message: string, details?: AppErrorDetails[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: AppErrorDetails[], code = 'VALIDATION_ERROR') {
    super(400, code, message, details);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  if (err instanceof ZodError || (err as any)?.name === 'ZodError' || Array.isArray((err as any)?.issues)) {
    const issues = (err as any).issues || (err as any).errors || [];
    const details: AppErrorDetails[] = issues.map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : undefined,
      issue: e.code,
      message: e.message
    }));
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message || 'Input validation failed',
        details
      }
    });
    return;
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.'
    }
  });
}
