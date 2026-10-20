import { prisma } from '../utils/prisma';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError
} from '../middleware/error.middleware';
import { ConfigService } from './config.service';
import { TimerService } from './timer.service';
import { AssessmentAccessService } from './assessment-access.service';
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
    // Check for existing IN_PROGRESS attempt
    const activeAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        studentId,
        status: 'IN_PROGRESS'
      },
      orderBy: { attemptNo: 'desc' }
    });

    if (activeAttempt) {
      const config = await ConfigService.getByVersion(activeAttempt.scoringConfigVersion);
      // Check if total assessment time has expired
      const isTotalTimedOut = TimerService.isAssessmentTimedOut(
        activeAttempt.startedAt,
        activeAttempt.totalTimeLimitSec,
        config.gracePeriodSec
      );

      if (!isTotalTimedOut) {
        const remainingSec = TimerService.getAssessmentRemainingSec(
          activeAttempt.startedAt,
          activeAttempt.totalTimeLimitSec
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
        // Persist unanswered items as timeouts and score the expired attempt before a retake.
        await this.submitAttempt(activeAttempt.id, studentId);
      }
    }

    // A scored attempt blocks another attempt unless a teacher/admin granted
    // a one-use retake authorization.
    const retakeGrantId = await AssessmentAccessService.getGrantForNewAttempt(studentId);

    const config = await ConfigService.getActiveConfig();
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { grade: true }
    });
    if (!student) throw new NotFoundError('Student record not found.');

    if (config.questionCount !== config.selfReportCount + config.scenarioCount) {
      throw new ValidationError('Assessment configuration question counts do not add up to the total question count.');
    }

    // Candidate questions must come from one versioned bank and be approved,
    // active, and appropriate for the student's grade.
    const banks = await prisma.questionnaireVersion.findMany({
      where: {
        gradeMin: { lte: student.grade },
        gradeMax: { gte: student.grade },
        questions: {
          some: { isActive: true, reviewStatus: 'APPROVED' }
        }
      },
      include: {
        questions: {
          where: {
            isActive: true,
            reviewStatus: 'APPROVED',
            gradeMin: { lte: student.grade },
            gradeMax: { gte: student.grade }
          },
          orderBy: [{ type: 'asc' }, { selectionOrder: 'asc' }, { key: 'asc' }],
          select: { id: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const questionnaireVersion = banks.find((bank) => {
      const selfReportCount = bank.questions.filter((question) => question.type === 'SELF_REPORT').length;
      const scenarioCount = bank.questions.filter((question) => question.type === 'SCENARIO').length;
      return selfReportCount >= config.selfReportCount && scenarioCount >= config.scenarioCount;
    });

    if (!questionnaireVersion) {
      throw new ValidationError(
        `No approved, active questionnaire version for grade ${student.grade} has at least ` +
        `${config.selfReportCount} self-report and ${config.scenarioCount} scenario questions.`
      );
    }

    const selfReportQuestionIds = questionnaireVersion.questions
      .filter((question) => question.type === 'SELF_REPORT')
      .slice(0, config.selfReportCount)
      .map((question) => question.id);
    const scenarioQuestionIds = questionnaireVersion.questions
      .filter((question) => question.type === 'SCENARIO')
      .slice(0, config.scenarioCount)
      .map((question) => question.id);
    const orderedQuestionIds = [...selfReportQuestionIds, ...scenarioQuestionIds];
    const startedAt = new Date();

    const newAttempt = await AssessmentAccessService.createAuthorizedAttempt(studentId, retakeGrantId, {
      questionOrder: orderedQuestionIds,
      startedAt,
      scoringConfigVersion: config.version,
      totalTimeLimitSec: config.totalLimitSec,
      expiresAt: new Date(startedAt.getTime() + config.totalLimitSec * 1000),
      questionnaireVersionId: questionnaireVersion.id
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

    const config = await ConfigService.getByVersion(attempt.scoringConfigVersion);
    if (TimerService.isAssessmentTimedOut(attempt.startedAt, attempt.totalTimeLimitSec, config.gracePeriodSec)) {
      throw new ConflictError('Assessment time has expired; submit to finalize the attempt.');
    }
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
      attempt.totalTimeLimitSec,
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
    const initialAttempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    if (!initialAttempt) throw new NotFoundError('Assessment attempt not found');
    if (initialAttempt.studentId !== studentId) throw new ForbiddenError('Unauthorized attempt access');

    const question = await prisma.questionVersion.findUnique({
      where: { id: data.question_id },
      include: { intelligenceMappings: true, options: { include: { pathwayMappings: true } } }
    });
    if (!question) throw new NotFoundError('Question not found');

    const config = await ConfigService.getByVersion(initialAttempt.scoringConfigVersion);
    const now = new Date();

    try {
      return await prisma.$transaction(async (tx) => {
        const attempt = await tx.assessmentAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt || attempt.studentId !== studentId) throw new ForbiddenError('Unauthorized attempt access');
        if (attempt.status !== 'IN_PROGRESS') throw new ConflictError(`Attempt is already ${attempt.status}.`);

        const questionIds = attempt.questionOrder as string[];
        const expectedQuestionId = questionIds[attempt.currentIndex - 1];
        if (data.question_id !== expectedQuestionId) {
          throw new ConflictError('The submitted question is stale or out of order.');
        }

        const responseRecord = await tx.assessmentResponse.findUnique({
          where: {
            attemptId_questionVersionId: {
              attemptId: attempt.id,
              questionVersionId: question.id
            }
          }
        });
        if (responseRecord?.answeredAt) {
          throw new ConflictError('An answer has already been saved for this question.');
        }

        const shownAt = responseRecord?.shownAt ?? now;
        const timeTakenMs = TimerService.calculateElapsedMs(shownAt, now);
        const effectiveTimedOut = TimerService.isQuestionTimedOut(
          shownAt, question.timeLimitSec, config.gracePeriodSec, now
        ) || TimerService.isAssessmentTimedOut(
          attempt.startedAt, attempt.totalTimeLimitSec, config.gracePeriodSec, now
        );

        let responseWeight = 0;
        let optionId: string | null = null;
        if (!effectiveTimedOut && question.type === 'SELF_REPORT') {
          const rating = data.answer.rating;
          if (rating === undefined || rating < 1 || rating > 5) {
            throw new ValidationError('Self-report question requires rating between 1 and 5.', [
              { field: 'answer.rating', issue: 'invalid_rating' }
            ]);
          }
          responseWeight = ScoringEngine.evaluateSelfReport(rating);
        } else if (!effectiveTimedOut && question.type === 'SCENARIO') {
          const selectedOptionId = data.answer.option_id;
          const selectedOption = question.options.find((option) => option.id === selectedOptionId);
          if (!selectedOption) {
            throw new ValidationError('Selected option_id does not belong to this question.', [
              { field: 'answer.option_id', issue: 'invalid_option' }
            ]);
          }
          optionId = selectedOption.id;
          responseWeight = 1.0;
        }

        const responseData = {
          optionId,
          answerJson: data.answer as any,
          answeredAt: now,
          timeTakenMs,
          timedOut: effectiveTimedOut,
          responseWeight
        };
        if (responseRecord) {
          const saved = await tx.assessmentResponse.updateMany({
            where: { id: responseRecord.id, answeredAt: null },
            data: responseData
          });
          if (saved.count !== 1) throw new ConflictError('An answer has already been saved for this question.');
        } else {
          await tx.assessmentResponse.create({
            data: {
              attemptId: attempt.id,
              questionVersionId: question.id,
              shownAt,
              ...responseData
            }
          });
        }

        const isLastQuestion = attempt.currentIndex >= questionIds.length;
        const nextIndex = isLastQuestion ? attempt.currentIndex : attempt.currentIndex + 1;
        const advanced = await tx.assessmentAttempt.updateMany({
          where: { id: attempt.id, status: 'IN_PROGRESS', currentIndex: attempt.currentIndex },
          data: { currentIndex: nextIndex }
        });
        if (advanced.count !== 1) throw new ConflictError('The attempt has advanced; reload the current question.');

        return {
          message: effectiveTimedOut ? 'Question response timed out.' : 'Response saved successfully.',
          next_index: nextIndex,
          is_completed: isLastQuestion,
          timed_out: effectiveTimedOut
        };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictError('An answer has already been saved for this question.');
      throw error;
    }
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

    if (attempt.status !== 'IN_PROGRESS') {
      throw new ConflictError(`Attempt is already ${attempt.status}.`);
    }
    const config = await ConfigService.getByVersion(attempt.scoringConfigVersion);
    const questionIds = attempt.questionOrder as string[];
    const now = new Date();

    const isAssessmentTimedOut = TimerService.isAssessmentTimedOut(
      attempt.startedAt,
      attempt.totalTimeLimitSec,
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
        intelligenceMappings: { include: { pathway: true } },
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
      pathwayCode: q.intelligenceMappings[0]?.pathway.code,
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
        timeTakenMs: r.timeTakenMs,
        rating: ans?.rating,
        optionId: r.optionId
      };
    });

    const scoringOutcome = ScoringEngine.scoreAttempt(
      questionScoringItems,
      answerResponseItems,
      config.minAnsweredCount
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
        tie: false,
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
      tie: profile.tie,
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
