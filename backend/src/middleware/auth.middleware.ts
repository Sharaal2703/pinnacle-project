import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError, ForbiddenError } from './error.middleware';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface AuthUserPayload {
  id: string;
  username: string;
  role: Role;
  studentId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      username: string;
      role: Role;
    };

    // Attach user and, if student, resolve studentId
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { student: true }
    });

    if (!user || !user.isActive) {
      next(new UnauthorizedError('User account is disabled or does not exist'));
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      studentId: user.student?.id
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Session token has expired. Please log in again.', 'TOKEN_EXPIRED'));
      return;
    }
    next(new UnauthorizedError('Invalid authorization token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`Forbidden: requires one of [${roles.join(', ')}] role`));
      return;
    }
    next();
  };
}
