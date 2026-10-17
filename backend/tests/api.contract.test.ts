import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('API Contract & Error Verification', () => {
  it('returns healthy status on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.timestamp).toBeDefined();
  });

  it('serves openapi.json with OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('MindBridge Pre-Assessment API');
  });

  it('formats 404 errors according to the shared contract', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBeDefined();
  });

  it('rejects registration with invalid student grade (<6 or >8) with contract error format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Student',
        username: 'student_bad_grade',
        password: 'password123',
        grade: 5 // invalid grade, must be 6..8
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
    const gradeError = res.body.error.details.find((d: any) => d.field === 'grade');
    expect(gradeError).toBeDefined();
  });

  it('rejects registration with short password (<6 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Student',
        username: 'student_short_pw',
        password: '123',
        grade: 7
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const pwError = res.body.error.details.find((d: any) => d.field === 'password');
    expect(pwError).toBeDefined();
  });

  it('returns 401 when accessing protected student/admin routes without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
