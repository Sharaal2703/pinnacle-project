import { prisma } from '../utils/prisma';
import { AssessmentConfig } from '@prisma/client';

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
    // Deactivate previous active configurations
    await prisma.assessmentConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    const active = await this.getActiveConfig();

    return prisma.assessmentConfig.create({
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
  }
}
