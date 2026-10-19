import fs from 'fs';
import path from 'path';
import { QuestionType, PathwayCode } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ConfigService } from './config.service';

type QuestionnaireItem = {
  key: string;
  type: QuestionType;
  prompt: string;
  weight?: number;
  time_limit_seconds?: number;
  pathway_code?: PathwayCode;
  options?: Array<{
    key: string;
    label: string;
    pathway_contributions?: Array<{ pathway_code: PathwayCode; contribution: number }>;
  }>;
};

type QuestionnaireFile = {
  version?: string;
  grade_min?: number;
  grade_max?: number;
  items: QuestionnaireItem[];
};

export class SeedService {
  /** Seed only static reference/config data and draft questionnaire content. */
  static async seedAll(): Promise<void> {
    await this.seedPathways();
    await ConfigService.getActiveConfig();

    const candidatePaths = [
      path.resolve(__dirname, '../../../docs/questionnaires/pre-assessment-v1-en.json'),
      path.resolve(__dirname, '../../docs/questionnaires/pre-assessment-v1-en.json'),
      path.resolve(__dirname, '../../../../docs/questionnaires/pre-assessment-v1-en.json'),
      path.resolve(process.cwd(), 'docs/questionnaires/pre-assessment-v1-en.json'),
      path.resolve(process.cwd(), '../docs/questionnaires/pre-assessment-v1-en.json')
    ];
    const questionnairePath = candidatePaths.find((candidate) => fs.existsSync(candidate));

    if (!questionnairePath) {
      console.warn('Questionnaire file not found; no question content was imported.');
      return;
    }

    await this.loadQuestionnaireFile(questionnairePath);
  }

  static async seedPathways(): Promise<void> {
    const pathways: Array<{ code: PathwayCode; name: string }> = [
      { code: 'LING', name: 'Linguistic' },
      { code: 'LOGI', name: 'Logical-Mathematical' },
      { code: 'SPAT', name: 'Spatial/Visual' },
      { code: 'MUSI', name: 'Musical' },
      { code: 'BODY', name: 'Bodily-Kinesthetic' },
      { code: 'NATU', name: 'Naturalistic' }
    ];

    for (const pathway of pathways) {
      await prisma.pathway.upsert({
        where: { code: pathway.code },
        update: { name: pathway.name },
        create: pathway
      });
    }
  }

  /**
   * Imports new items as DRAFT/inactive regardless of review fields in the JSON.
   * Existing versions are immutable and are left for the in-app review workflow.
   */
  static async loadQuestionnaireFile(filePath: string): Promise<void> {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as QuestionnaireFile;
    if (!Array.isArray(data.items)) {
      throw new Error(`Questionnaire file must contain an items array: ${filePath}`);
    }

    const pathways = await prisma.pathway.findMany();
    const pathwayMap = new Map(pathways.map((pathway) => [pathway.code, pathway]));
    const parsedVersion = Number.parseInt(data.version?.split('.')[0] ?? '1', 10);
    const version = Number.isInteger(parsedVersion) && parsedVersion > 0 ? parsedVersion : 1;

    for (const item of data.items) {
      const existing = await prisma.questionVersion.findUnique({
        where: { key_version: { key: item.key, version } }
      });
      if (existing) continue;

      const pathway = item.pathway_code ? pathwayMap.get(item.pathway_code) : undefined;
      if (item.pathway_code && !pathway) {
        throw new Error(`Unknown pathway ${item.pathway_code} in ${item.key}`);
      }

      await prisma.$transaction(async (tx) => {
        const question = await tx.questionVersion.create({
          data: {
            key: item.key,
            version,
            type: item.type,
            prompt: item.prompt,
            gradeMin: data.grade_min ?? 6,
            gradeMax: data.grade_max ?? 8,
            weight: item.weight ?? 1.0,
            timeLimitSec: item.time_limit_seconds ?? (item.type === 'SELF_REPORT' ? 60 : 90),
            reviewStatus: 'DRAFT',
            reviewerName: null,
            reviewNotes: null,
            reviewedAt: null,
            isActive: false,
            pathwayId: pathway?.id
          }
        });

        for (let index = 0; index < (item.options ?? []).length; index++) {
          const option = item.options![index];
          const createdOption = await tx.questionOption.create({
            data: {
              questionVersionId: question.id,
              optionKey: option.key,
              label: option.label,
              orderIndex: index
            }
          });

          for (const mapping of option.pathway_contributions ?? []) {
            const mappedPathway = pathwayMap.get(mapping.pathway_code);
            if (!mappedPathway) {
              throw new Error(`Unknown pathway ${mapping.pathway_code} in ${item.key}`);
            }
            await tx.questionOptionMapping.create({
              data: {
                optionId: createdOption.id,
                pathwayId: mappedPathway.id,
                contribution: mapping.contribution
              }
            });
          }
        }
      });
    }
  }
}
