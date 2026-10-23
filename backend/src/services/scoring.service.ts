import { PathwayCode, QuestionType } from '@prisma/client';

export const PATHWAY_ORDER: PathwayCode[] = ['LING', 'LOGI', 'VIS', 'MUSI', 'BODY', 'NAT', 'INTER', 'INTRA'];

export interface QuestionScoringItem {
  questionId: string;
  type: QuestionType;
  weight: number;
  pathwayCode?: PathwayCode | null; // For self-report
  options?: Array<{
    id: string;
    contributions: Array<{ pathwayCode: PathwayCode; contribution: number }>;
  }>;
}

export interface AnswerResponseItem {
  questionId: string;
  timedOut: boolean;
  timeTakenMs?: number | null;
  rating?: number | null; // 1..5 for self-report
  optionId?: string | null; // for scenario
}

export interface PathwayScoreResult {
  pathwayCode: PathwayCode;
  pathwayName: string;
  rawScore: number;
  maxScore: number;
  score0To100: number | null;
  available: boolean;
  rank: number;
}

export interface AssessmentScoringOutcome {
  canIssueProfile: boolean;
  answeredCount: number;
  timedOutCount: number;
  totalQuestions: number;
  scores: PathwayScoreResult[];
  dominant: PathwayScoreResult | null;
  secondary: PathwayScoreResult | null;
  tie: boolean;
}

export class ScoringEngine {
  private static PATHWAY_NAMES: Record<PathwayCode, string> = {
    LING: 'Linguistic',
    LOGI: 'Logical-Mathematical',
    VIS: 'Visual',
    MUSI: 'Musical',
    BODY: 'Bodily-Kinesthetic',
    NAT: 'Naturalistic',
    INTER: 'Interpersonal',
    INTRA: 'Intrapersonal'
  };

  /**
   * Evaluates self-report answer weight: (rating - 1) / 4
   */
  static evaluateSelfReport(rating: number): number {
    if (rating < 1 || rating > 5) {
      throw new Error(`Rating must be between 1 and 5, received ${rating}`);
    }
    return (rating - 1) / 4.0;
  }

  /**
   * Evaluates entire assessment attempt.
   */
  static scoreAttempt(
    questions: QuestionScoringItem[],
    responses: AnswerResponseItem[],
    minAnsweredThreshold = 15
  ): AssessmentScoringOutcome {
    const responseMap = new Map<string, AnswerResponseItem>();
    for (const r of responses) {
      responseMap.set(r.questionId, r);
    }

    let answeredCount = 0;
    let timedOutCount = 0;

    // Track raw scores and max scores per pathway
    const rawScores: Record<PathwayCode, number> = {
      LING: 0,
      LOGI: 0,
      VIS: 0,
      MUSI: 0,
      BODY: 0,
      NAT: 0,
      INTER: 0,
      INTRA: 0
    };

    const maxScores: Record<PathwayCode, number> = {
      LING: 0,
      LOGI: 0,
      VIS: 0,
      MUSI: 0,
      BODY: 0,
      NAT: 0,
      INTER: 0,
      INTRA: 0
    };
    const responseTimeTotal: Partial<Record<PathwayCode, number>> = {};
    const responseTimeCount: Partial<Record<PathwayCode, number>> = {};

    const recordResponseTime = (pathwayCode: PathwayCode, timeTakenMs: number | null | undefined) => {
      if (timeTakenMs == null || !Number.isFinite(timeTakenMs) || timeTakenMs < 0) return;
      responseTimeTotal[pathwayCode] = (responseTimeTotal[pathwayCode] ?? 0) + timeTakenMs;
      responseTimeCount[pathwayCode] = (responseTimeCount[pathwayCode] ?? 0) + 1;
    };

    for (const q of questions) {
      const resp = responseMap.get(q.questionId);
      const isTimedOut = !resp || resp.timedOut;

      if (!isTimedOut) {
        answeredCount++;
      } else {
        timedOutCount++;
      }

      if (q.type === 'SELF_REPORT') {
        const pw = q.pathwayCode;
        if (pw) {
          // Max possible weight is full question weight
          maxScores[pw] += q.weight;

          if (!isTimedOut && resp && resp.rating != null) {
            const rw = this.evaluateSelfReport(resp.rating);
            rawScores[pw] += q.weight * rw;
            recordResponseTime(pw, resp.timeTakenMs);
          }
        }
      } else if (q.type === 'SCENARIO') {
        // In scenario questions, find which pathways are selectable
        const pathwayMaxSet = new Set<PathwayCode>();
        for (const opt of q.options || []) {
          for (const c of opt.contributions) {
            pathwayMaxSet.add(c.pathwayCode);
          }
        }

        // Add max possible weight for each pathway offered in this question
        for (const pw of pathwayMaxSet) {
          maxScores[pw] += q.weight;
        }

        // Calculate student's chosen option contribution
        if (!isTimedOut && resp && resp.optionId) {
          const chosenOpt = q.options?.find((o) => o.id === resp.optionId);
          if (chosenOpt) {
            for (const pw of new Set(chosenOpt.contributions.map((mapping) => mapping.pathwayCode))) {
              rawScores[pw] += q.weight;
              recordResponseTime(pw, resp.timeTakenMs);
            }
          }
        }
      }
    }

    const canIssueProfile = answeredCount >= minAnsweredThreshold;

    // Calculate normalized scores (0-100)
    const scoreList: Array<{
      pathwayCode: PathwayCode;
      rawScore: number;
      maxScore: number;
      score0To100: number | null;
      available: boolean;
    }> = PATHWAY_ORDER.map((code) => {
      const raw = Number(rawScores[code].toFixed(3));
      const max = Number(maxScores[code].toFixed(3));
      let norm: number | null = null;
      let available = false;

      if (max > 0) {
        norm = Number(((raw / max) * 100).toFixed(2));
        available = true;
      }

      return {
        pathwayCode: code,
        rawScore: raw,
        maxScore: max,
        score0To100: norm,
        available
      };
    });

    const averageResponseTime = (pathwayCode: PathwayCode): number | null => {
      const count = responseTimeCount[pathwayCode] ?? 0;
      return count > 0 ? (responseTimeTotal[pathwayCode] ?? 0) / count : null;
    };

    // Rank by normalized score, then use the lower average response time for equal scores.
    const sorted = [...scoreList].sort((a, b) => {
      if (a.score0To100 !== b.score0To100) {
        return (b.score0To100 ?? -1) - (a.score0To100 ?? -1);
      }
      if (a.score0To100 !== null) {
        const timeA = averageResponseTime(a.pathwayCode);
        const timeB = averageResponseTime(b.pathwayCode);
        if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
      }
      return PATHWAY_ORDER.indexOf(a.pathwayCode) - PATHWAY_ORDER.indexOf(b.pathwayCode);
    });

    const rankedScores: PathwayScoreResult[] = sorted.map((item, idx) => ({
      pathwayCode: item.pathwayCode,
      pathwayName: this.PATHWAY_NAMES[item.pathwayCode],
      rawScore: item.rawScore,
      maxScore: item.maxScore,
      score0To100: item.score0To100,
      available: item.available,
      rank: idx + 1
    }));

    const tie = rankedScores.length >= 2 &&
      rankedScores[0].score0To100 !== null &&
      rankedScores[0].score0To100 === rankedScores[1].score0To100;

    return {
      canIssueProfile,
      answeredCount,
      timedOutCount,
      totalQuestions: questions.length,
      scores: rankedScores,
      dominant: canIssueProfile ? rankedScores[0] : null,
      secondary: canIssueProfile ? rankedScores[1] : null,
      tie: canIssueProfile ? tie : false
    };
  }
}
