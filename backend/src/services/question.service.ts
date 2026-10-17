import { prisma } from '../utils/prisma';
import {
  CreateQuestionInput,
  UpdateQuestionInput,
  ReviewQuestionInput,
  QuestionVersion
} from '@pinnacle/shared';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';

export class QuestionService {
  static async listQuestions(): Promise<any[]> {
    const questions = await prisma.questionVersion.findMany({
      include: {
        pathway: true,
        options: {
          include: {
            pathwayMappings: {
              include: { pathway: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: [{ key: 'asc' }, { version: 'desc' }]
    });

    return questions.map((q) => this.formatQuestion(q));
  }

  static async getQuestionById(id: string): Promise<any> {
    const q = await prisma.questionVersion.findUnique({
      where: { id },
      include: {
        pathway: true,
        options: {
          include: {
            pathwayMappings: {
              include: { pathway: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!q) {
      throw new NotFoundError(`Question version with id ${id} not found.`);
    }

    return this.formatQuestion(q);
  }

  static async createQuestion(input: CreateQuestionInput): Promise<any> {
    let pathwayId: string | undefined = undefined;
    if (input.pathway_code) {
      const pw = await prisma.pathway.findUnique({ where: { code: input.pathway_code } });
      if (!pw) throw new ValidationError(`Invalid pathway code ${input.pathway_code}`);
      pathwayId = pw.id;
    }

    const question = await prisma.$transaction(async (tx) => {
      const q = await tx.questionVersion.create({
        data: {
          key: input.key,
          version: 1,
          type: input.type,
          prompt: input.prompt,
          gradeMin: input.grade_min,
          gradeMax: input.grade_max,
          weight: input.weight,
          timeLimitSec: input.time_limit_seconds ?? (input.type === 'SELF_REPORT' ? 60 : 90),
          reviewStatus: 'DRAFT',
          isActive: false,
          pathwayId
        }
      });

      if (input.options && input.options.length > 0) {
        for (let i = 0; i < input.options.length; i++) {
          const opt = input.options[i];
          const createdOpt = await tx.questionOption.create({
            data: {
              questionVersionId: q.id,
              optionKey: opt.option_key,
              label: opt.label,
              orderIndex: opt.order_index ?? i
            }
          });

          for (const mapping of opt.pathway_contributions || []) {
            const pw = await tx.pathway.findUnique({ where: { code: mapping.pathway_code } });
            if (pw) {
              await tx.questionOptionMapping.create({
                data: {
                  optionId: createdOpt.id,
                  pathwayId: pw.id,
                  contribution: mapping.contribution
                }
              });
            }
          }
        }
      }

      return q;
    });

    return this.getQuestionById(question.id);
  }

  static async updateQuestion(questionId: string, input: UpdateQuestionInput): Promise<any> {
    const existing = await prisma.questionVersion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          include: { pathwayMappings: { include: { pathway: true } } }
        }
      }
    });

    if (!existing) {
      throw new NotFoundError(`Question ${questionId} not found`);
    }

    // Get max version for this stable key
    const latestVersion = await prisma.questionVersion.findFirst({
      where: { key: existing.key },
      orderBy: { version: 'desc' }
    });

    const nextVersion = (latestVersion?.version ?? existing.version) + 1;

    let pathwayId = existing.pathwayId;
    if (input.pathway_code) {
      const pw = await prisma.pathway.findUnique({ where: { code: input.pathway_code } });
      if (!pw) throw new ValidationError(`Invalid pathway code ${input.pathway_code}`);
      pathwayId = pw.id;
    }

    const newQuestion = await prisma.$transaction(async (tx) => {
      const q = await tx.questionVersion.create({
        data: {
          key: existing.key,
          version: nextVersion,
          type: existing.type,
          prompt: input.prompt ?? existing.prompt,
          gradeMin: input.grade_min ?? existing.gradeMin,
          gradeMax: input.grade_max ?? existing.gradeMax,
          weight: input.weight ?? existing.weight,
          timeLimitSec: input.time_limit_seconds ?? existing.timeLimitSec,
          reviewStatus: 'DRAFT', // New versions reset to DRAFT until reviewed
          isActive: false,
          pathwayId
        }
      });

      const optionsToUse = input.options && input.options.length > 0
        ? input.options
        : existing.options.map((opt) => ({
            option_key: opt.optionKey,
            label: opt.label,
            order_index: opt.orderIndex,
            pathway_contributions: opt.pathwayMappings.map((m) => ({
              pathway_code: m.pathway.code,
              contribution: Number(m.contribution)
            }))
          }));

      for (let i = 0; i < optionsToUse.length; i++) {
        const opt = optionsToUse[i];
        const createdOpt = await tx.questionOption.create({
          data: {
            questionVersionId: q.id,
            optionKey: opt.option_key,
            label: opt.label,
            orderIndex: opt.order_index ?? i
          }
        });

        for (const mapping of opt.pathway_contributions || []) {
          const pw = await tx.pathway.findUnique({ where: { code: mapping.pathway_code as any } });
          if (pw) {
            await tx.questionOptionMapping.create({
              data: {
                optionId: createdOpt.id,
                pathwayId: pw.id,
                contribution: mapping.contribution
              }
            });
          }
        }
      }

      return q;
    });

    return this.getQuestionById(newQuestion.id);
  }

  static async recordReview(questionId: string, input: ReviewQuestionInput): Promise<any> {
    const question = await prisma.questionVersion.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundError(`Question ${questionId} not found`);

    await prisma.questionVersion.update({
      where: { id: questionId },
      data: {
        reviewStatus: input.review_status,
        reviewerName: input.reviewer_name,
        reviewNotes: input.review_notes,
        reviewedAt: new Date()
      }
    });

    return this.getQuestionById(questionId);
  }

  static async activateQuestion(questionId: string): Promise<any> {
    const question = await prisma.questionVersion.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundError(`Question ${questionId} not found`);

    if (question.reviewStatus !== 'APPROVED') {
      throw new ValidationError(
        'Cannot activate question version before teacher review is recorded as APPROVED.'
      );
    }

    await prisma.questionVersion.update({
      where: { id: questionId },
      data: { isActive: true }
    });

    return this.getQuestionById(questionId);
  }

  static async deactivateQuestion(questionId: string): Promise<void> {
    const question = await prisma.questionVersion.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundError(`Question ${questionId} not found`);

    await prisma.questionVersion.update({
      where: { id: questionId },
      data: { isActive: false }
    });
  }

  static async getActiveApprovedQuestionBank(): Promise<any[]> {
    return prisma.questionVersion.findMany({
      where: {
        isActive: true,
        reviewStatus: 'APPROVED'
      },
      include: {
        pathway: true,
        options: {
          include: {
            pathwayMappings: {
              include: { pathway: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: [{ type: 'asc' }, { key: 'asc' }]
    });
  }

  private static formatQuestion(q: any): any {
    return {
      id: q.id,
      key: q.key,
      version: q.version,
      type: q.type,
      prompt: q.prompt,
      grade_min: q.gradeMin,
      grade_max: q.gradeMax,
      weight: Number(q.weight),
      time_limit_seconds: q.timeLimitSec,
      review_status: q.reviewStatus,
      reviewer_name: q.reviewerName,
      review_notes: q.reviewNotes,
      reviewed_at: q.reviewedAt ? q.reviewedAt.toISOString() : null,
      is_active: q.isActive,
      pathway_code: q.pathway?.code ?? null,
      options: (q.options || []).map((opt: any) => ({
        id: opt.id,
        option_key: opt.optionKey,
        label: opt.label,
        order_index: opt.orderIndex,
        pathway_contributions: (opt.pathwayMappings || []).map((m: any) => ({
          pathway_code: m.pathway.code,
          contribution: Number(m.contribution)
        }))
      }))
    };
  }
}
