import { describe, it, expect } from 'vitest';
import { TimerService } from '../src/services/timer.service';

describe('TimerService', () => {
  it('correctly calculates remaining question seconds and floors at 0', () => {
    const shownAt = new Date('2026-10-10T12:00:00Z');
    const nowAfter10s = new Date('2026-10-10T12:00:10Z');
    const nowAfter70s = new Date('2026-10-10T12:01:10Z');

    expect(TimerService.getQuestionRemainingSec(shownAt, 60, nowAfter10s)).toBe(50);
    expect(TimerService.getQuestionRemainingSec(shownAt, 60, nowAfter70s)).toBe(0);
  });

  it('correctly calculates total assessment remaining seconds and floors at 0', () => {
    const startedAt = new Date('2026-10-10T12:00:00Z');
    const nowAfter5min = new Date('2026-10-10T12:05:00Z');
    const nowAfter30min = new Date('2026-10-10T12:30:00Z');

    expect(TimerService.getAssessmentRemainingSec(startedAt, 1500, nowAfter5min)).toBe(1200);
    expect(TimerService.getAssessmentRemainingSec(startedAt, 1500, nowAfter30min)).toBe(0);
  });

  it('enforces server grace period on question timeouts', () => {
    const shownAt = new Date('2026-10-10T12:00:00Z');
    const limit = 60;
    const grace = 2;

    const withinLimit = new Date('2026-10-10T12:00:59Z');
    const withinGrace = new Date('2026-10-10T12:01:01.500Z'); // 61.5s
    const pastGrace = new Date('2026-10-10T12:01:03Z'); // 63s

    expect(TimerService.isQuestionTimedOut(shownAt, limit, grace, withinLimit)).toBe(false);
    expect(TimerService.isQuestionTimedOut(shownAt, limit, grace, withinGrace)).toBe(false);
    expect(TimerService.isQuestionTimedOut(shownAt, limit, grace, pastGrace)).toBe(true);
  });

  it('enforces total assessment deadline with grace period', () => {
    const startedAt = new Date('2026-10-10T12:00:00Z');
    const limit = 1500; // 25 min
    const grace = 2;

    const onTime = new Date('2026-10-10T12:24:59Z');
    const timedOut = new Date('2026-10-10T12:25:03Z');

    expect(TimerService.isAssessmentTimedOut(startedAt, limit, grace, onTime)).toBe(false);
    expect(TimerService.isAssessmentTimedOut(startedAt, limit, grace, timedOut)).toBe(true);
  });
});
