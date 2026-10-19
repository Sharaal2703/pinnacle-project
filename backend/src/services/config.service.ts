import { prisma } from '../utils/prisma';
import { AssessmentConfig } from '@prisma/client';
import { ConflictError, NotFoundError } from '../middleware/error.middleware';

export class ConfigService {
  private static DEFAULT_CONFIG = {
    version: '1.0.0',
    totalLimitSec: 1500, // 25 minutes
    selfReportLimitSec: 60,
    scenarioLimitSec: 90,
    gracePeriodSec: 2,
    minAnsweredCount: 15,
    nearTieMargin: 5.0,
    defaultQuestionWeight: 1.0,
    scoringFormulaVersion: '1.0.0',
    isActive: true
  };

  static async getActiveConfig(): Promise<AssessmentConfig> {
    const config = await prisma.assessmentConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (config) {
      return config;
    }

    // Initialize default config if none exists
    return prisma.assessmentConfig.create({
      data: this.DEFAULT_CONFIG
    });
  }

  static async getByVersion(version: string): Promise<AssessmentConfig> {
    const config = await prisma.assessmentConfig.findUnique({ where: { version } });
    if (!config) {
      throw new NotFoundError(`Assessment configuration ${version} was not found.`, 'CONFIG_NOT_FOUND');
    }
    return config;
  }

  static async updateConfig(
    version: string,
    updates: Partial<{
      totalLimitSec: number;
      selfReportLimitSec: number;
      scenarioLimitSec: number;
      gracePeriodSec: number;
      minAnsweredCount: number;
      nearTieMargin: number;
      defaultQuestionWeight: number;
      scoringFormulaVersion: string;
    }>
  ): Promise<AssessmentConfig> {
    const active = await this.getActiveConfig();
    if (version === active.version || await prisma.assessmentConfig.findUnique({ where: { version } })) {
      throw new ConflictError(`Assessment configuration version '${version}' already exists.`);
    }

    return prisma.$transaction(async (tx) => {
      await tx.assessmentConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      return tx.assessmentConfig.create({
        data: {
          version,
          totalLimitSec: updates.totalLimitSec ?? active.totalLimitSec,
          selfReportLimitSec: updates.selfReportLimitSec ?? active.selfReportLimitSec,
          scenarioLimitSec: updates.scenarioLimitSec ?? active.scenarioLimitSec,
          gracePeriodSec: updates.gracePeriodSec ?? active.gracePeriodSec,
          minAnsweredCount: updates.minAnsweredCount ?? active.minAnsweredCount,
          nearTieMargin: updates.nearTieMargin ?? Number(active.nearTieMargin),
          defaultQuestionWeight: updates.defaultQuestionWeight ?? Number(active.defaultQuestionWeight),
          scoringFormulaVersion: updates.scoringFormulaVersion ?? active.scoringFormulaVersion,
          isActive: true
        }
      });
    });
  }
}
