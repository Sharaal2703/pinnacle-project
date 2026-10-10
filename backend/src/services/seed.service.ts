import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { ConfigService } from './config.service';

export class SeedService {
  static async seedAll(): Promise<void> {
    console.log('Seeding pathways...');
    await this.seedPathways();

    console.log('Seeding assessment configuration...');
    await ConfigService.getActiveConfig();

    console.log('Seeding demo users...');
    await this.seedDemoUsers();

    console.log('Seeding questionnaire from docs/questionnaires/pre-assessment-v1-en.json...');
    const questionnairePath = path.resolve(
      __dirname,
      '../../../../docs/questionnaires/pre-assessment-v1-en.json'
    );
    if (fs.existsSync(questionnairePath)) {
      await this.loadQuestionnaireFile(questionnairePath);
    } else {
      console.warn(`Questionnaire file not found at ${questionnairePath}`);
    }

    console.log('Seeding completed successfully!');
  }

  static async seedPathways(): Promise<void> {
    const pathways = [
      { code: 'LING', name: 'Linguistic' },
      { code: 'LOGI', name: 'Logical-Mathematical' },
      { code: 'SPAT', name: 'Spatial/Visual' },
      { code: 'MUSI', name: 'Musical' },
      { code: 'BODY', name: 'Bodily-Kinesthetic' },
      { code: 'NATU', name: 'Naturalistic' }
    ];

    for (const p of pathways) {
      await prisma.pathway.upsert({
        where: { code: p.code as any },
        update: { name: p.name },
        create: { code: p.code as any, name: p.name }
      });
    }
  }

  static async seedDemoUsers(): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', salt);
    const studentPasswordHash = await bcrypt.hash('StudentPass123!', salt);

    // Seed Demo Admin
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: { role: 'ADMIN', isActive: true },
      create: {
        name: 'Administrator',
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true
      }
    });

    // Seed Demo Student
    const studentUser = await prisma.user.upsert({
      where: { username: 'student1' },
      update: { role: 'STUDENT', isActive: true },
      create: {
        name: 'Alex Student',
        username: 'student1',
        passwordHash: studentPasswordHash,
        role: 'STUDENT',
        isActive: true
      }
    });

    await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: { grade: 7 },
      create: {
        userId: studentUser.id,
        grade: 7
      }
    });
  }

  static async loadQuestionnaireFile(filePath: string): Promise<void> {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    if (data.review?.status !== 'APPROVED') {
      console.warn('Skipping unapproved questionnaire file:', filePath);
      return;
    }

    const pathways = await prisma.pathway.findMany();
    const pathwayMap = new Map(pathways.map((p) => [p.code, p]));

    for (const item of data.items) {
      let pathwayId: string | undefined = undefined;
      if (item.pathway_code) {
        pathwayId = pathwayMap.get(item.pathway_code)?.id;
      }

      const q = await prisma.questionVersion.upsert({
        where: {
          key_version: {
            key: item.key,
            version: 1
          }
        },
        update: {
          prompt: item.prompt,
          weight: item.weight ?? 1.0,
          timeLimitSec: item.time_limit_seconds ?? (item.type === 'SELF_REPORT' ? 60 : 90),
          reviewStatus: 'APPROVED',
          reviewerName: data.review.reviewer_name,
          reviewNotes: data.review.notes,
          reviewedAt: new Date(data.review.review_date || Date.now()),
          isActive: true,
          pathwayId
        },
        create: {
          key: item.key,
          version: 1,
          type: item.type,
          prompt: item.prompt,
          gradeMin: data.grade_min ?? 6,
          gradeMax: data.grade_max ?? 8,
          weight: item.weight ?? 1.0,
          timeLimitSec: item.time_limit_seconds ?? (item.type === 'SELF_REPORT' ? 60 : 90),
          reviewStatus: 'APPROVED',
          reviewerName: data.review.reviewer_name,
          reviewNotes: data.review.notes,
          reviewedAt: new Date(data.review.review_date || Date.now()),
          isActive: true,
          pathwayId
        }
      });

      if (item.options && item.options.length > 0) {
        for (let i = 0; i < item.options.length; i++) {
          const opt = item.options[i];
          const createdOpt = await prisma.questionOption.upsert({
            where: {
              questionVersionId_optionKey: {
                questionVersionId: q.id,
                optionKey: opt.key
              }
            },
            update: {
              label: opt.label,
              orderIndex: i
            },
            create: {
              questionVersionId: q.id,
              optionKey: opt.key,
              label: opt.label,
              orderIndex: i
            }
          });

          for (const mapping of opt.pathway_contributions || []) {
            const pw = pathwayMap.get(mapping.pathway_code);
            if (pw) {
              await prisma.questionOptionMapping.upsert({
                where: {
                  optionId_pathwayId: {
                    optionId: createdOpt.id,
                    pathwayId: pw.id
                  }
                },
                update: {
                  contribution: mapping.contribution
                },
                create: {
                  optionId: createdOpt.id,
                  pathwayId: pw.id,
                  contribution: mapping.contribution
                }
              });
            }
          }
        }
      }
    }
  }
}
