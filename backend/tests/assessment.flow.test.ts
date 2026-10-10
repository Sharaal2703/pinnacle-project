import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';
import { config } from '../src/config/env';

vi.mock('../src/utils/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn()
      },
      student: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn()
      },
      pathway: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn()
      },
      assessmentConfig: {
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn()
      },
      questionVersion: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn()
      },
      questionOption: {
        create: vi.fn(),
        upsert: vi.fn()
      },
      questionOptionMapping: {
        create: vi.fn(),
        upsert: vi.fn()
      },
      assessmentAttempt: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      assessmentResponse: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn()
      },
      preferenceProfile: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn()
      },
      preferenceScore: {
        create: vi.fn()
      },
      $transaction: vi.fn((callback) => callback(prisma))
    }
  };
});

describe('Assessment Flow Endpoints', () => {
  const studentUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Student',
    username: 'alex_test',
    role: 'STUDENT',
    isActive: true,
    student: {
      id: '22222222-2222-2222-2222-222222222222',
      grade: 7
    }
  };

  const adminUser = {
    id: '99999999-9999-9999-9999-999999999999',
    name: 'Admin User',
    username: 'admin_test',
    role: 'ADMIN',
    isActive: true
  };

  const studentToken = jwt.sign(
    { id: studentUser.id, username: studentUser.username, role: studentUser.role },
    config.jwtSecret
  );

  const adminToken = jwt.sign(
    { id: adminUser.id, username: adminUser.username, role: adminUser.role },
    config.jwtSecret
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth Endpoints', () => {
    it('returns user profile on GET /api/v1/auth/me for student', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(studentUser);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(studentUser.id);
      expect(res.body.username).toBe(studentUser.username);
      expect(res.body.role).toBe('STUDENT');
      expect(res.body.grade).toBe(7);
    });
  });

  describe('Student Preference Profile Endpoints', () => {
    it('returns current profile when one exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(studentUser);
      (prisma.preferenceProfile.findFirst as any).mockResolvedValue({
        id: 'prof-1',
        studentId: studentUser.student.id,
        attemptId: 'att-1',
        isCurrent: true,
        dominantPathwayId: 'pw-spat',
        secondaryPathwayId: 'pw-musi',
        nearTie: false,
        scoringVersion: '1.0.0',
        createdAt: new Date('2026-10-10T12:00:00Z'),
        dominantPathway: { id: 'pw-spat', code: 'SPAT', name: 'Spatial/Visual' },
        secondaryPathway: { id: 'pw-musi', code: 'MUSI', name: 'Musical' },
        scores: [
          {
            pathwayId: 'pw-spat',
            pathway: { code: 'SPAT', name: 'Spatial/Visual' },
            rawScore: 4.0,
            maxScore: 4.0,
            normalizedScore: 100.0,
            rankNo: 1
          },
          {
            pathwayId: 'pw-musi',
            pathway: { code: 'MUSI', name: 'Musical' },
            rawScore: 3.5,
            maxScore: 4.0,
            normalizedScore: 87.5,
            rankNo: 2
          }
        ]
      });

      const res = await request(app)
        .get('/api/v1/students/me/preference-profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.dominant.code).toBe('SPAT');
      expect(res.body.secondary.code).toBe('MUSI');
      expect(res.body.near_tie).toBe(false);
      expect(res.body.scores.length).toBe(2);
    });

    it('returns 404 PROFILE_NOT_FOUND when student has no profile yet', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(studentUser);
      (prisma.preferenceProfile.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/students/me/preference-profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  describe('Admin Endpoints', () => {
    it('allows admin to fetch assessment configuration', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(adminUser);
      (prisma.assessmentConfig.findFirst as any).mockResolvedValue({
        id: 'cfg-1',
        version: '1.0.0',
        totalLimitSec: 1500,
        selfReportLimitSec: 60,
        scenarioLimitSec: 90,
        gracePeriodSec: 2,
        minAnsweredCount: 15,
        nearTieMargin: 5.0,
        defaultQuestionWeight: 1.0,
        scoringFormulaVersion: '1.0.0',
        isActive: true,
        createdAt: new Date('2026-10-10T12:00:00Z')
      });

      const res = await request(app)
        .get('/api/v1/admin/assessment-config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.total_limit_seconds).toBe(1500);
      expect(res.body.min_answered_count).toBe(15);
      expect(res.body.near_tie_margin).toBe(5);
    });

    it('forbids students from accessing admin config endpoint', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(studentUser);

      const res = await request(app)
        .get('/api/v1/admin/assessment-config')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
