import { prisma } from '../utils/prisma';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError
} from '../middleware/error.middleware';
import { ConfigService } from './config.service';
import { TimerService } from './timer.service';
import { ScoringEngine, QuestionScoringItem, AnswerResponseItem } from './scoring.service';
import { ProfileService } from './profile.service';
import {
  StartAttemptResponse,
  SafeQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  SubmitAttemptResponse
} from '@pinnacle/shared';
import { PathwayCode } from '@prisma/client';

export class AttemptService {
  /**
   * Starts a new attempt or resumes an existing active in-progress attempt.
   */
  static async startOrResumeAttempt(studentId: string): Promise<StartAttemptResponse> {
    const config = await ConfigService.getActiveConfig();

    // Check for existing IN_PROGRESS attempt
    const activeAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        studentId,
        status: 'IN_PROGRESS'
      },
      orderBy: { attemptNo: 'desc' }
    });

    if (activeAttempt) {
      // Check if total assessment time has expired
      const isTotalTimedOut = TimerService.isAssessmentTimedOut(
        activeAttempt.startedAt,
        config.totalLimitSec,
        config.gracePeriodSec
      );

      if (!isTotalTimedOut) {
        const remainingSec = TimerService.getAssessmentRemainingSec(
          activeAttempt.startedAt,
          config.totalLimitSec
        );
        const questionIds = activeAttempt.questionOrder as string[];

        return {
          attempt_id: activeAttempt.id,
          attempt_no: activeAttempt.attemptNo,
          status: 'IN_PROGRESS',
          current_index: activeAttempt.currentIndex,
          total_questions: questionIds.length,
          started_at: activeAttempt.startedAt.toISOString(),
          assessment_remaining_seconds: remainingSec
        };
      } else {
        // Finalize expired attempt as INCOMPLETE and let student start a new one
        await prisma.assessmentAttempt.update({
          where: { id: activeAttempt.id },
          data: { status: 'INCOMPLETE', submittedAt: new Date() }
        });
      }
    }

    // Fetch approved active questions to construct the attempt's fixed order
    const selfReportQuestions = await prisma.questionVersion.findMany({
      where: { isActive: true, reviewStatus: 'APPROVED', type: 'SELF_REPORT' },
      orderBy: { key: 'asc' }
    });

    const scenarioQuestions = await prisma.questionVersion.findMany({
      where: { isActive: true, reviewStatus: 'APPROVED', type: 'SCENARIO' },
      orderBy: { key: 'asc' }
    });

    if (selfReportQuestions.length < 6 || scenarioQuestions.length < 12) {
      throw new ValidationError(
        'Assessment bank is not fully configured with 6 self-report and 12 scenario approved questions.'
      );
    }

    const orderedQuestionIds = [
      ...selfReportQuestions.slice(0, 6).map((q) => q.id),
      ...scenarioQuestions.slice(0, 12).map((q) => q.id)
    ];

    // Find next attempt number
    const latestAttempt = await prisma.assessmentAttempt.findFirst({
      where: { studentId },
      orderBy: { attemptNo: 'desc' }
    });

    const nextAttemptNo = (latestAttempt?.attemptNo ?? 0) + 1;

    const newAttempt = await prisma.assessmentAttempt.create({
      data: {
        studentId,
        attemptNo: nextAttemptNo,
        status: 'IN_PROGRESS',
        questionOrder: orderedQuestionIds,
        currentIndex: 1,
        startedAt: new Date(),
        scoringConfigVersion: config.version
      }
    });

    return {
      attempt_id: newAttempt.id,
      attempt_no: newAttempt.attemptNo,
      status: 'IN_PROGRESS',
      current_index: newAttempt.currentIndex,
      total_questions: orderedQuestionIds.length,
      started_at: newAttempt.startedAt.toISOString(),
      assessment_remaining_seconds: config.totalLimitSec
    };
  }

  /**
   * Retrieves the current safe question for the attempt.
   */
  static async getCurrentQuestion(attemptId: string, studentId: string): Promise<SafeQuestionResponse> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      throw new NotFoundError(`Assessment attempt ${attemptId} not found`);
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenError('You are not authorized to access this assessment attempt.');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new ValidationError(`Assessment attempt is already ${attempt.status}`);
    }

    const config = await ConfigService.getActiveConfig();
    const questionIds = attempt.questionOrder as string[];
    const index = attempt.currentIndex;

    if (index > questionIds.length) {
      throw new ValidationError('All questions have already been served. Ready to submit.');
    }

    const questionId = questionIds[index - 1];

    const question = await prisma.questionVersion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!question) {
      throw new NotFoundError(`Question ${questionId} not found in bank`);
    }

    // Check or initialize AssessmentResponse record to fix server shownAt timestamp
    let responseRecord = await prisma.assessmentResponse.findUnique({
      where: {
        attemptId_questionVersionId: {
          attemptId: attempt.id,
          questionVersionId: question.id
        }
      }
    });

    const now = new Date();
    if (!responseRecord) {
      responseRecord = await prisma.assessmentResponse.create({
        data: {
          attemptId: attempt.id,
          questionVersionId: question.id,
          shownAt: now,
          answerJson: {}
        }
      });
    }

    const questionRemainingSec = TimerService.getQuestionRemainingSec(
      responseRecord.shownAt,
      question.timeLimitSec,
      now
    );

    const assessmentRemainingSec = TimerService.getAssessmentRemainingSec(
      attempt.startedAt,
      config.totalLimitSec,
      now
    );

    return {
      attempt_id: attempt.id,
      question_id: question.id,
      index,
      total: questionIds.length,
      type: question.type as any,
      prompt: question.prompt,
      rating_scale: question.type === 'SELF_REPORT' ? [1, 2, 3, 4, 5] : undefined,
      options: question.options.map((opt) => ({
        id: opt.id,
        label: opt.label
      })),
      time_limit_seconds: question.timeLimitSec,
      question_remaining_seconds: questionRemainingSec,
      assessment_remaining_seconds: assessmentRemainingSec
    };
  }

  /**
   * Records student response for the current question.
   */
  static async recordAnswer(
    attemptId: string,
    studentId: string,
    data: SubmitAnswerRequest
  ): Promise<SubmitAnswerResponse> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    if (attempt.studentId !== studentId) throw new ForbiddenError('Unauthorized attempt access');
    if (attempt.status !== 'IN_PROGRESS') throw new ValidationError(`Attempt is already ${attempt.status}`);

    const questionIds = attempt.questionOrder as string[];
    const expectedQuestionId = questionIds[attempt.currentIndex - 1];

    if (data.question_id !== expectedQuestionId) {
      throw new ValidationError(
        `Answer submitted for question ${data.question_id}, but current question is ${expectedQuestionId}`,
        [{ field: 'question_id', issue: 'out_of_order' }]
      );
    }

    const question = await prisma.questionVersion.findUnique({
      where: { id: data.question_id },
      include: {
        pathway: true,
        options: {
          include: { pathwayMappings: true }
        }
      }
    });

    if (!question) throw new NotFoundError('Question not found');

    const config = await ConfigService.getActiveConfig();
    const now = new Date();

    let responseRecord = await prisma.assessmentResponse.findUnique({
      where: {
        attemptId_questionVersionId: {
          attemptId: attempt.id,
          questionVersionId: question.id
        }
      }
    });

    if (responseRecord && responseRecord.answeredAt) {
      throw new ConflictError('An answer has already been saved for this question.');
    }

    const shownAt = responseRecord?.shownAt ?? now;
    const timeTakenMs = TimerService.calculateElapsedMs(shownAt, now);

    const isQuestionTimedOut = TimerService.isQuestionTimedOut(
      shownAt,
      question.timeLimitSec,
      config.gracePeriodSec,
      now
    );

    const isAssessmentTimedOut = TimerService.isAssessmentTimedOut(
      attempt.startedAt,
      config.totalLimitSec,
      config.gracePeriodSec,
      now
    );

    const effectiveTimedOut = isQuestionTimedOut || isAssessmentTimedOut;

    let responseWeight = 0;
    let optionId: string | null = null;

    if (!effectiveTimedOut) {
      if (question.type === 'SELF_REPORT') {
        const rating = data.answer.rating;
        if (rating === undefined || rating < 1 || rating > 5) {
          throw new ValidationError('Self-report question requires rating between 1 and 5.', [
            { field: 'answer.rating', issue: 'invalid_rating' }
          ]);
        }
        responseWeight = ScoringEngine.evaluateSelfReport(rating);
      } else if (question.type === 'SCENARIO') {
        const selectedOptId = data.answer.option_id;
        if (!selectedOptId) {
          throw new ValidationError('Scenario question requires selected option_id.', [
            { field: 'answer.option_id', issue: 'missing_option' }
          ]);
        }
        const opt = question.options.find((o) => o.id === selectedOptId);
        if (!opt) {
          throw new ValidationError('Selected option_id does not belong to this question.', [
            { field: 'answer.option_id', issue: 'invalid_option' }
          ]);
        }
        optionId = opt.id;
        // The weight contribution is preserved; default 1.0 for mapped option
        responseWeight = 1.0;
      }
    }

    // Upsert response record
    await prisma.assessmentResponse.upsert({
      where: {
        attemptId_questionVersionId: {
          attemptId: attempt.id,
          questionVersionId: question.id
        }
      },
      update: {
        optionId,
        answerJson: data.answer as any,
        answeredAt: now,
        timeTakenMs,
        timedOut: effectiveTimedOut,
        responseWeight
      },
      create: {
        attemptId: attempt.id,
        questionVersionId: question.id,
        shownAt,
        optionId,
        answerJson: data.answer as any,
        answeredAt: now,
        timeTakenMs,
        timedOut: effectiveTimedOut,
        responseWeight
      }
    });

    const isLastQuestion = attempt.currentIndex >= questionIds.length;
    const nextIndex = isLastQuestion ? attempt.currentIndex : attempt.currentIndex + 1;

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { currentIndex: nextIndex }
    });

    return {
      message: effectiveTimedOut ? 'Question response timed out.' : 'Response saved successfully.',
      next_index: nextIndex,
      is_completed: isLastQuestion,
      timed_out: effectiveTimedOut
    };
  }

  /**
   * Finalizes and scores the attempt.
   */
  static async submitAttempt(attemptId: string, studentId: string): Promise<SubmitAttemptResponse> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: true
      }
    });

    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    if (attempt.studentId !== studentId) throw new ForbiddenError('Unauthorized attempt access');

    const config = await ConfigService.getActiveConfig();
    const questionIds = attempt.questionOrder as string[];
    const now = new Date();

    const isAssessmentTimedOut = TimerService.isAssessmentTimedOut(
      attempt.startedAt,
      config.totalLimitSec,
      config.gracePeriodSec,
      now
    );

    // If assessment is timed out, auto-timeout any remaining unanswered questions
    if (isAssessmentTimedOut) {
      const answeredQuestionIds = new Set(
        attempt.responses.filter((r) => r.answeredAt != null).map((r) => r.questionVersionId)
      );

      for (const qId of questionIds) {
        if (!answeredQuestionIds.has(qId)) {
          await prisma.assessmentResponse.upsert({
            where: {
              attemptId_questionVersionId: {
                attemptId: attempt.id,
                questionVersionId: qId
              }
            },
            update: {
              timedOut: true,
              answeredAt: now,
              responseWeight: 0.0
            },
            create: {
              attemptId: attempt.id,
              questionVersionId: qId,
              shownAt: now,
              timedOut: true,
              answeredAt: now,
              answerJson: {},
              responseWeight: 0.0
            }
          });
        }
      }
    } else {
      // Validate that all questions have been answered or timed out
      const answeredCount = attempt.responses.filter((r) => r.answeredAt != null).length;
      if (answeredCount < questionIds.length) {
        throw new ValidationError(
          `Cannot submit attempt: only ${answeredCount} of ${questionIds.length} questions have been answered.`,
          [{ field: 'responses', issue: 'unanswered_questions' }]
        );
      }
    }

    // Refresh responses after auto-timeout
    const allResponses = await prisma.assessmentResponse.findMany({
      where: { attemptId: attempt.id }
    });

    // Fetch all questions for scoring
    const questions = await prisma.questionVersion.findMany({
      where: { id: { in: questionIds } },
      include: {
        pathway: true,
        options: {
          include: {
            pathwayMappings: {
              include: { pathway: true }
            }
          }
        }
      }
    });

    const questionScoringItems: QuestionScoringItem[] = questions.map((q) => ({
      questionId: q.id,
      type: q.type,
      weight: Number(q.weight),
      pathwayCode: q.pathway?.code,
      options: q.options.map((opt) => ({
        id: opt.id,
        contributions: opt.pathwayMappings.map((m) => ({
          pathwayCode: m.pathway.code,
          contribution: Number(m.contribution)
        }))
      }))
    }));

    const answerResponseItems: AnswerResponseItem[] = allResponses.map((r) => {
      const ans = r.answerJson as any;
      return {
        questionId: r.questionVersionId,
        timedOut: r.timedOut,
        rating: ans?.rating,
        optionId: r.optionId
      };
    });

    const scoringOutcome = ScoringEngine.scoreAttempt(
      questionScoringItems,
      answerResponseItems,
      config.minAnsweredCount,
      Number(config.nearTieMargin)
    );

    if (!scoringOutcome.canIssueProfile) {
      // Minimum answered threshold not reached
      await prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'INCOMPLETE',
          submittedAt: now
        }
      });

      return {
        attempt_id: attempt.id,
        status: 'INCOMPLETE',
        message: `Fewer than ${config.minAnsweredCount} questions were answered. A learning preference profile cannot be issued. Please retake the assessment.`,
        primary: null,
        secondary: null,
        near_tie: false,
        scoring_version: config.version,
        answered_count: scoringOutcome.answeredCount,
        timed_out_count: scoringOutcome.timedOutCount,
        scores: scoringOutcome.scores.map((s) => ({
          pathway_code: s.pathwayCode,
          pathway_name: s.pathwayName,
          raw_score: s.rawScore,
          max_score: s.maxScore,
          score_0_100: s.score0To100,
          available: s.available,
          rank: s.rank
        }))
      };
    }

    // Save profile and mark attempt SCORED
    const profile = await ProfileService.saveProfileTransaction(
      studentId,
      attempt.id,
      scoringOutcome,
      config.version
    );

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SCORED',
        submittedAt: now
      }
    });

    return {
      attempt_id: attempt.id,
      status: 'SCORED',
      message: 'Assessment completed and preference profile generated successfully.',
      primary: profile.dominant,
      secondary: profile.secondary,
      near_tie: profile.near_tie,
      scoring_version: profile.scoring_version,
      answered_count: scoringOutcome.answeredCount,
      timed_out_count: scoringOutcome.timedOutCount,
      scores: scoringOutcome.scores.map((s) => ({
        pathway_code: s.pathwayCode,
        pathway_name: s.pathwayName,
        raw_score: s.rawScore,
        max_score: s.maxScore,
        score_0_100: s.score0To100,
        available: s.available,
        rank: s.rank
      }))
    };
  }
}
