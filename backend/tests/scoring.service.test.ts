import { describe, it, expect } from 'vitest';
import { ScoringEngine, QuestionScoringItem, AnswerResponseItem } from '../src/services/scoring.service';
import { PathwayCode } from '@prisma/client';

describe('ScoringEngine', () => {
  describe('evaluateSelfReport', () => {
    it('correctly maps 1..5 scale to 0..1 response weight', () => {
      expect(ScoringEngine.evaluateSelfReport(1)).toBe(0.0);
      expect(ScoringEngine.evaluateSelfReport(2)).toBe(0.25);
      expect(ScoringEngine.evaluateSelfReport(3)).toBe(0.5);
      expect(ScoringEngine.evaluateSelfReport(4)).toBe(0.75);
      expect(ScoringEngine.evaluateSelfReport(5)).toBe(1.0);
    });

    it('throws error when rating is out of 1..5 range', () => {
      expect(() => ScoringEngine.evaluateSelfReport(0)).toThrow();
      expect(() => ScoringEngine.evaluateSelfReport(6)).toThrow();
    });
  });

  describe('scoreAttempt - Threshold & Normalization', () => {
    // 6 self report + 12 scenario = 18 questions total
    const pathways: PathwayCode[] = ['LING', 'LOGI', 'SPAT', 'MUSI', 'BODY', 'NATU'];

    const mockQuestions: QuestionScoringItem[] = [
      ...pathways.map((pw, i) => ({
        questionId: `sr-${i + 1}`,
        type: 'SELF_REPORT' as const,
        weight: 1.0,
        pathwayCode: pw
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        questionId: `sc-${i + 1}`,
        type: 'SCENARIO' as const,
        weight: 1.0,
        options: [
          {
            id: `opt-${i + 1}-1`,
            contributions: [{ pathwayCode: 'SPAT' as PathwayCode, contribution: 1.0 }]
          },
          {
            id: `opt-${i + 1}-2`,
            contributions: [{ pathwayCode: 'MUSI' as PathwayCode, contribution: 1.0 }]
          },
          {
            id: `opt-${i + 1}-3`,
            contributions: [{ pathwayCode: 'LING' as PathwayCode, contribution: 1.0 }]
          },
          {
            id: `opt-${i + 1}-4`,
            contributions: [{ pathwayCode: 'LOGI' as PathwayCode, contribution: 1.0 }]
          }
        ]
      }))
    ];

    it('rejects issuing profile when fewer than 15 questions answered', () => {
      // 14 answered, 4 timed out
      const responses: AnswerResponseItem[] = [
        ...Array.from({ length: 14 }, (_, i) => ({
          questionId: mockQuestions[i].questionId,
          timedOut: false,
          rating: 4,
          optionId: `opt-${i - 5}-1`
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          questionId: mockQuestions[i + 14].questionId,
          timedOut: true
        }))
      ];

      const outcome = ScoringEngine.scoreAttempt(mockQuestions, responses, 15, 5.0);
      expect(outcome.canIssueProfile).toBe(false);
      expect(outcome.answeredCount).toBe(14);
      expect(outcome.timedOutCount).toBe(4);
      expect(outcome.dominant).toBeNull();
      expect(outcome.secondary).toBeNull();
    });

    it('successfully issues profile when 15 or more questions answered', () => {
      // 15 answered, 3 timed out
      const responses: AnswerResponseItem[] = [
        ...Array.from({ length: 15 }, (_, i) => ({
          questionId: mockQuestions[i].questionId,
          timedOut: false,
          rating: 5,
          optionId: `opt-${i - 5}-1`
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          questionId: mockQuestions[i + 15].questionId,
          timedOut: true
        }))
      ];

      const outcome = ScoringEngine.scoreAttempt(mockQuestions, responses, 15, 5.0);
      expect(outcome.canIssueProfile).toBe(true);
      expect(outcome.answeredCount).toBe(15);
      expect(outcome.dominant).not.toBeNull();
      expect(outcome.secondary).not.toBeNull();
    });

    it('detects near-tie when dominant and secondary scores are within 5 points', () => {
      // Create questions where LING and LOGI have very close scores
      const testQuestions: QuestionScoringItem[] = [
        { questionId: 'q1', type: 'SELF_REPORT', weight: 1.0, pathwayCode: 'LING' },
        { questionId: 'q2', type: 'SELF_REPORT', weight: 1.0, pathwayCode: 'LOGI' }
      ];

      const responses: AnswerResponseItem[] = [
        { questionId: 'q1', timedOut: false, rating: 5 }, // 100%
        { questionId: 'q2', timedOut: false, rating: 5 }  // 100%
      ];

      const outcome = ScoringEngine.scoreAttempt(testQuestions, responses, 2, 5.0);
      expect(outcome.nearTie).toBe(true);
      expect(outcome.dominant?.pathwayCode).toBe('LING'); // deterministic tie-break priority
      expect(outcome.secondary?.pathwayCode).toBe('LOGI');
    });

    it('resolves deterministic exact ties using PATHWAY_ORDER priority (LING > LOGI > SPAT > MUSI > BODY > NATU)', () => {
      const allTiedQuestions: QuestionScoringItem[] = pathways.map((pw) => ({
        questionId: `tie-${pw}`,
        type: 'SELF_REPORT',
        weight: 1.0,
        pathwayCode: pw
      }));

      // All give identical rating 4 (75% score)
      const tiedResponses: AnswerResponseItem[] = pathways.map((pw) => ({
        questionId: `tie-${pw}`,
        timedOut: false,
        rating: 4
      }));

      const outcome = ScoringEngine.scoreAttempt(allTiedQuestions, tiedResponses, 6, 5.0);
      expect(outcome.scores.map((s) => s.pathwayCode)).toEqual([
        'LING',
        'LOGI',
        'SPAT',
        'MUSI',
        'BODY',
        'NATU'
      ]);
    });

    it('safely handles zero denominator when pathway has no selectable items', () => {
      // Question bank with only LING
      const lingOnlyQuestions: QuestionScoringItem[] = [
        { questionId: 'q1', type: 'SELF_REPORT', weight: 1.0, pathwayCode: 'LING' }
      ];
      const responses: AnswerResponseItem[] = [
        { questionId: 'q1', timedOut: false, rating: 5 }
      ];

      const outcome = ScoringEngine.scoreAttempt(lingOnlyQuestions, responses, 1, 5.0);
      const logiScore = outcome.scores.find((s) => s.pathwayCode === 'LOGI');
      expect(logiScore?.available).toBe(false);
      expect(logiScore?.score0To100).toBeNull();
      expect(logiScore?.maxScore).toBe(0);
    });
  });
});
