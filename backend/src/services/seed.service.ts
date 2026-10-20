import fs from 'fs';
import path from 'path';
import { PathwayCode, QuestionType, VarkType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ConfigService } from './config.service';

type QuestionnaireOption = {
  key: string;
  label: string;
  vark_type?: VarkType | null;
  pathway_contributions?: Array<{ pathway_code: PathwayCode; contribution: number }>;
};

type QuestionnaireItem = {
  key: string;
  type: QuestionType;
  prompt: string;
  weight?: number;
  time_limit_seconds?: number;
  pathway_code?: PathwayCode;
  source_id: string;
  selection_order?: number;
  options?: QuestionnaireOption[];
};

type QuestionnaireSource = {
  id: string;
  title: string;
  url: string | null;
  citation_note?: string | null;
};

type QuestionnaireFile = {
  questionnaire_id: string;
  language_code: string;
  version: string;
  grade_min: number;
  grade_max: number;
  session_time_limit_seconds: number;
  review?: {
    status?: string;
    reviewer_name?: string | null;
    notes?: string | null;
  };
  sources: QuestionnaireSource[];
  items: QuestionnaireItem[];
};

export class SeedService {
  /** Seed only static reference/config data and draft questionnaire content. */
  static async seedAll(): Promise<void> {
    await this.seedPathways();
    await ConfigService.getActiveConfig();

    const candidatePaths = [
      path.resolve(__dirname, '../../../docs/questionnaires/pre-assessment-v2-en.json'),
      path.resolve(__dirname, '../../docs/questionnaires/pre-assessment-v2-en.json'),
      path.resolve(__dirname, '../../../../docs/questionnaires/pre-assessment-v2-en.json'),
      path.resolve(process.cwd(), 'docs/questionnaires/pre-assessment-v2-en.json'),
      path.resolve(process.cwd(), '../docs/questionnaires/pre-assessment-v2-en.json')
    ];
    const questionnairePath = candidatePaths.find((candidate) => fs.existsSync(candidate));

    if (!questionnairePath) {
      console.warn('Pre-assessment v2 JSON was not found; no question content was imported.');
      return;
    }

    await this.loadQuestionnaireFile(questionnairePath);
  }

  static async seedPathways(): Promise<void> {
    const pathways: Array<{ code: PathwayCode; name: string }> = [
      { code: 'LING', name: 'Linguistic' },
      { code: 'LOGI', name: 'Logical-Mathematical' },
      { code: 'VIS', name: 'Visual' },
      { code: 'MUSI', name: 'Musical' },
      { code: 'BODY', name: 'Bodily-Kinesthetic' },
      { code: 'NAT', name: 'Naturalistic' },
      { code: 'INTER', name: 'Interpersonal' },
      { code: 'INTRA', name: 'Intrapersonal' }
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
   * Imports a questionnaire version and its content as DRAFT/inactive.
   * Existing question versions keep their wording, scoring data, and review state.
   */
  static async loadQuestionnaireFile(filePath: string): Promise<void> {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as QuestionnaireFile;
    this.validateQuestionnaire(data, filePath);

    const majorVersion = Number.parseInt(data.version.split('.')[0], 10);
    const pathwayRows = await prisma.pathway.findMany();
    const pathwayMap = new Map(pathwayRows.map((pathway) => [pathway.code, pathway]));
    const sourceIds = new Set(data.sources.map((source) => source.id));

    for (const item of data.items) {
      if (!sourceIds.has(item.source_id)) {
        throw new Error(`Unknown source ${item.source_id} in ${item.key}`);
      }
      if (item.pathway_code && !pathwayMap.has(item.pathway_code)) {
        throw new Error(`Unknown pathway ${item.pathway_code} in ${item.key}`);
      }
      for (const option of item.options ?? []) {
        for (const mapping of option.pathway_contributions ?? []) {
          if (mapping.contribution !== 1) {
            throw new Error(`Option ${item.key}/${option.key} must use a full contribution of 1 for each pathway.`);
          }
          if (!pathwayMap.has(mapping.pathway_code)) {
            throw new Error(`Unknown pathway ${mapping.pathway_code} in ${item.key}`);
          }
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const bank = await tx.questionnaireVersion.upsert({
        where: {
          questionnaireId_languageCode_version: {
            questionnaireId: data.questionnaire_id,
            languageCode: data.language_code,
            version: data.version
          }
        },
        update: {},
        create: {
          questionnaireId: data.questionnaire_id,
          languageCode: data.language_code,
          version: data.version,
          gradeMin: data.grade_min,
          gradeMax: data.grade_max,
          sessionTimeLimitSec: data.session_time_limit_seconds,
          reviewStatus: 'DRAFT',
          reviewerName: null,
          reviewNotes: data.review?.notes ?? null,
          reviewedAt: null,
          isActive: false
        }
      });

      for (const source of data.sources) {
        await tx.questionSource.upsert({
          where: { id: source.id },
          update: {
            title: source.title,
            url: source.url,
            citationNote: source.citation_note ?? null
          },
          create: {
            id: source.id,
            title: source.title,
            url: source.url,
            citationNote: source.citation_note ?? null
          }
        });
      }

      const questionOrderByType = new Map<QuestionType, number>([
        ['SELF_REPORT', 0],
        ['SCENARIO', 0]
      ]);

      for (const item of data.items) {
        const selectionOrder = item.selection_order ?? (questionOrderByType.get(item.type)! + 1);
        questionOrderByType.set(item.type, selectionOrder);

        const existing = await tx.questionVersion.findUnique({
          where: { key_version: { key: item.key, version: majorVersion } },
          select: {
            id: true,
            questionnaireVersionId: true,
            sourceId: true,
            selectionOrder: true
          }
        });

        if (existing) {
          if (existing.questionnaireVersionId && existing.questionnaireVersionId !== bank.id) {
            throw new Error(
              `Question ${item.key} version ${majorVersion} is already attached to a different questionnaire version.`
            );
          }

          // Attach bank provenance to an older matching row without rewriting its content.
          if (!existing.questionnaireVersionId || !existing.sourceId || existing.selectionOrder == null) {
            await tx.questionVersion.update({
              where: { id: existing.id },
              data: {
                questionnaireVersionId: existing.questionnaireVersionId ?? bank.id,
                sourceId: existing.sourceId ?? item.source_id,
                selectionOrder: existing.selectionOrder ?? selectionOrder
              }
            });
          }
          continue;
        }

        const options = (item.options ?? []).map((option, index) => ({
          optionKey: option.key,
          label: option.label,
          orderIndex: index,
          varkType: option.vark_type ?? null,
          pathwayMappings: {
            create: (option.pathway_contributions ?? []).map((mapping) => ({
              pathwayId: pathwayMap.get(mapping.pathway_code)!.id,
              contribution: mapping.contribution
            }))
          }
        }));

        await tx.questionVersion.create({
          data: {
            key: item.key,
            version: majorVersion,
            type: item.type,
            prompt: item.prompt,
            gradeMin: data.grade_min,
            gradeMax: data.grade_max,
            weight: item.weight ?? 1.0,
            timeLimitSec: item.time_limit_seconds ?? (item.type === 'SELF_REPORT' ? 45 : 75),
            reviewStatus: 'DRAFT',
            reviewerName: null,
            reviewNotes: data.review?.notes ?? null,
            reviewedAt: null,
            isActive: false,
            intelligenceMappings: item.pathway_code ? {
              create: [{ pathwayId: pathwayMap.get(item.pathway_code)!.id, contribution: 1.0 }]
            } : undefined,
            questionnaireVersionId: bank.id,
            sourceId: item.source_id,
            selectionOrder,
            options: { create: options }
          }
        });
      }
    }, { maxWait: 10000, timeout: 60000 });
  }

  private static validateQuestionnaire(data: QuestionnaireFile, filePath: string): void {
    if (!data.questionnaire_id || !data.language_code || !data.version) {
      throw new Error(`Questionnaire ID, language code, and version are required: ${filePath}`);
    }
    if (!Number.isInteger(data.grade_min) || !Number.isInteger(data.grade_max) || data.grade_min > data.grade_max) {
      throw new Error(`Questionnaire grade range is invalid: ${filePath}`);
    }
    if (!Number.isInteger(data.session_time_limit_seconds) || data.session_time_limit_seconds <= 0) {
      throw new Error(`Questionnaire session time limit must be a positive integer: ${filePath}`);
    }
    if (!Array.isArray(data.sources) || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error(`Questionnaire sources and non-empty items arrays are required: ${filePath}`);
    }
    if (!Number.isInteger(Number.parseInt(data.version.split('.')[0], 10))) {
      throw new Error(`Questionnaire version must start with a numeric major version: ${filePath}`);
    }

    const sourceIds = new Set<string>();
    for (const source of data.sources) {
      if (!source.id || !source.title || sourceIds.has(source.id)) {
        throw new Error(`Question source IDs must be present, unique, and have titles: ${filePath}`);
      }
      sourceIds.add(source.id);
    }

    const itemKeys = new Set<string>();
    for (const item of data.items) {
      if (!item.key || !item.prompt || itemKeys.has(item.key)) {
        throw new Error(`Question keys must be present and unique, and prompts are required: ${filePath}`);
      }
      itemKeys.add(item.key);

      if (!item.source_id || !Number.isInteger(item.time_limit_seconds) || item.time_limit_seconds! <= 0) {
        throw new Error(`Question ${item.key} needs a source and positive integer time limit.`);
      }
      if (item.type === 'SELF_REPORT' && !item.pathway_code) {
        throw new Error(`Self-report question ${item.key} must identify its pathway.`);
      }
      if (item.type === 'SCENARIO' && (!item.options || item.options.length === 0)) {
        throw new Error(`Scenario question ${item.key} must contain options.`);
      }
      for (const option of item.options ?? []) {
        if (!option.key || !option.label) {
          throw new Error(`Every option in ${item.key} must have a key and label.`);
        }
        if (item.type === 'SCENARIO' && !option.vark_type) {
          throw new Error(`Scenario option ${item.key}/${option.key} must include a VARK type.`);
        }
        if (item.type === 'SCENARIO' && (!option.pathway_contributions || option.pathway_contributions.length === 0)) {
          throw new Error(`Scenario option ${item.key}/${option.key} must include MI pathway contributions.`);
        }
      }
    }
  }
}
