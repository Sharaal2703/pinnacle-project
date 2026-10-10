import { prisma } from '../utils/prisma';
import { NotFoundError } from '../middleware/error.middleware';
import { AssessmentScoringOutcome } from './scoring.service';
import { PreferenceProfile, PreferenceProfileHistoryItem } from '@pinnacle/shared';

export class ProfileService {
  static async getCurrentProfile(studentId: string): Promise<PreferenceProfile> {
    const profile = await prisma.preferenceProfile.findFirst({
      where: {
        studentId,
        isCurrent: true
      },
      include: {
        dominantPathway: true,
        secondaryPathway: true,
        scores: {
          include: { pathway: true },
          orderBy: { rankNo: 'asc' }
        }
      }
    });

    if (!profile) {
      throw new NotFoundError(
        'No active learning preference profile found. Please complete the assessment.',
        'PROFILE_NOT_FOUND'
      );
    }

    return this.formatProfile(profile);
  }

  static async getProfileHistory(studentId: string): Promise<PreferenceProfileHistoryItem[]> {
    const profiles = await prisma.preferenceProfile.findMany({
      where: { studentId },
      include: {
        dominantPathway: true,
        secondaryPathway: true,
        scores: {
          include: { pathway: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return profiles.map((p) => {
      const domScore = p.scores.find((s) => s.pathwayId === p.dominantPathwayId);
      const secScore = p.scores.find((s) => s.pathwayId === p.secondaryPathwayId);
      return {
        id: p.id,
        student_id: p.studentId,
        attempt_id: p.attemptId,
        is_current: p.isCurrent,
        created_at: p.createdAt.toISOString(),
        scoring_version: p.scoringVersion,
        near_tie: p.nearTie,
        dominant: {
          id: p.dominantPathway.id,
          code: p.dominantPathway.code,
          name: p.dominantPathway.name,
          score_0_100: domScore?.normalizedScore ? Number(domScore.normalizedScore) : null
        },
        secondary: {
          id: p.secondaryPathway.id,
          code: p.secondaryPathway.code,
          name: p.secondaryPathway.name,
          score_0_100: secScore?.normalizedScore ? Number(secScore.normalizedScore) : null
        }
      };
    });
  }

  static async saveProfileTransaction(
    studentId: string,
    attemptId: string,
    outcome: AssessmentScoringOutcome,
    scoringVersion: string
  ): Promise<PreferenceProfile> {
    if (!outcome.dominant || !outcome.secondary) {
      throw new Error('Cannot save profile without valid dominant and secondary pathways.');
    }

    const pathways = await prisma.pathway.findMany();
    const pathwayMap = new Map(pathways.map((p) => [p.code, p]));

    const dominantPathway = pathwayMap.get(outcome.dominant.pathwayCode);
    const secondaryPathway = pathwayMap.get(outcome.secondary.pathwayCode);

    if (!dominantPathway || !secondaryPathway) {
      throw new Error('Dominant or secondary pathway not found in database.');
    }

    const profile = await prisma.$transaction(async (tx) => {
      // 1. Mark existing student profiles as not current
      await tx.preferenceProfile.updateMany({
        where: { studentId, isCurrent: true },
        data: { isCurrent: false }
      });

      // 2. Create new current profile
      const newProf = await tx.preferenceProfile.create({
        data: {
          studentId,
          attemptId,
          isCurrent: true,
          dominantPathwayId: dominantPathway.id,
          secondaryPathwayId: secondaryPathway.id,
          nearTie: outcome.nearTie,
          scoringVersion
        }
      });

      // 3. Create preference score rows
      for (const scoreItem of outcome.scores) {
        const pw = pathwayMap.get(scoreItem.pathwayCode);
        if (pw) {
          await tx.preferenceScore.create({
            data: {
              profileId: newProf.id,
              pathwayId: pw.id,
              rawScore: scoreItem.rawScore,
              maxScore: scoreItem.maxScore,
              normalizedScore: scoreItem.score0To100,
              rankNo: scoreItem.rank
            }
          });
        }
      }

      return newProf;
    });

    return this.getCurrentProfile(studentId);
  }

  private static formatProfile(p: any): PreferenceProfile {
    const domScore = p.scores.find((s: any) => s.pathwayId === p.dominantPathwayId);
    const secScore = p.scores.find((s: any) => s.pathwayId === p.secondaryPathwayId);

    return {
      id: p.id,
      student_id: p.studentId,
      attempt_id: p.attemptId,
      is_current: p.isCurrent,
      created_at: p.createdAt.toISOString(),
      scoring_version: p.scoringVersion,
      near_tie: p.nearTie,
      dominant: {
        id: p.dominantPathway.id,
        code: p.dominantPathway.code,
        name: p.dominantPathway.name,
        score_0_100: domScore?.normalizedScore != null ? Number(domScore.normalizedScore) : null
      },
      secondary: {
        id: p.secondaryPathway.id,
        code: p.secondaryPathway.code,
        name: p.secondaryPathway.name,
        score_0_100: secScore?.normalizedScore != null ? Number(secScore.normalizedScore) : null
      },
      scores: p.scores.map((s: any) => ({
        pathway_code: s.pathway.code,
        pathway_name: s.pathway.name,
        rawScore: Number(s.rawScore),
        maxScore: Number(s.maxScore),
        score_0_100: s.normalizedScore != null ? Number(s.normalizedScore) : null,
        available: s.normalizedScore != null,
        rank: s.rankNo
      }))
    };
  }
}
