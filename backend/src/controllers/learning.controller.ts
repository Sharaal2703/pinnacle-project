import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LearningResourceFormat, LearningResourceStatus, ConceptProgressStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { config } from '../config/env';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../middleware/error.middleware';

const resourceInput = z.object({
  conceptId: z.string().uuid(),
  pathwayCode: z.enum(['VIS', 'LING', 'LOGI']),
  format: z.nativeEnum(LearningResourceFormat),
  title: z.string().trim().min(1).max(200),
  sourceReference: z.string().trim().max(2000).optional()
});
const reviewInput = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_REVISION']),
  reviewNotes: z.string().trim().max(2000).optional()
});
const uploadInput = z.object({
  storageBucket: z.string().trim().min(1).max(100),
  storagePath: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(100),
  fileSizeBytes: z.number().int().positive().max(200 * 1024 * 1024),
  durationSeconds: z.number().int().positive().optional()
});
const uploadIntentInput = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  fileSizeBytes: z.number().int().positive(),
  durationSeconds: z.number().int().positive().optional()
});
const progressInput = z.object({
  status: z.nativeEnum(ConceptProgressStatus),
  progressPercent: z.number().int().min(0).max(100),
  resourceId: z.string().uuid().optional()
});

export class LearningController {
  static async adminSubjects(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await prisma.subject.findMany({ select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } })); }
    catch (err) { next(err); }
  }

  static async adminCurriculum(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const grade = req.query.grade === undefined ? undefined : z.coerce.number().int().min(6).max(8).parse(req.query.grade);
      const chapters = await prisma.curriculumChapter.findMany({
        where: grade === undefined ? {} : { grade },
        include: { subject: { select: { id: true, name: true, code: true } }, concepts: { where: { isActive: true }, select: { id: true, conceptKey: true, title: true }, orderBy: { orderIndex: 'asc' } }, _count: { select: { concepts: true } } },
        orderBy: [
          { grade: 'asc' },
          { subject: { name: 'asc' } },
          { term: { sort: 'asc', nulls: 'last' } },
          { orderIndex: 'asc' }
        ]
      });
      res.status(200).json(chapters);
    } catch (err) { next(err); }
  }

  static async createChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = z.object({ subjectId: z.string().uuid(), grade: z.number().int().min(6).max(8), term: z.number().int().min(1).max(3), title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(), curriculumReference: z.string().max(1000).optional(), orderIndex: z.number().int().min(0) }).parse(req.body);
      const chapter = await prisma.curriculumChapter.create({ data: input });
      res.status(201).json(chapter);
    } catch (err) { next(err); }
  }

  static async createConcept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapterId = z.string().uuid().parse(req.params.chapterId);
      const input = z.object({ conceptKey: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(), learningObjective: z.string().max(2000).optional(), curriculumReference: z.string().max(1000).optional(), orderIndex: z.number().int().min(0) }).parse(req.body);
      const chapter = await prisma.curriculumChapter.findUnique({ where: { id: chapterId } });
      if (!chapter || chapter.grade < 6 || chapter.grade > 8) throw new NotFoundError('Grade 6–8 chapter not found');
      const concept = await prisma.curriculumConcept.create({ data: { ...input, chapterId } });
      res.status(201).json(concept);
    } catch (err) { next(err); }
  }

  static async adminResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status === undefined ? undefined : z.nativeEnum(LearningResourceStatus).parse(req.query.status);
      const resources = await prisma.learningResource.findMany({
        where: status ? { status } : {},
        include: { concept: { include: { chapter: { include: { subject: { select: { id: true, name: true } } } } } }, pathway: { select: { code: true, name: true } }, createdBy: { select: { id: true, name: true, role: true } }, reviewedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(resources.map(resource => ({ ...resource, fileSizeBytes: resource.fileSizeBytes === null ? null : Number(resource.fileSizeBytes) })));
    } catch (err) { next(err); }
  }

  static async createAdminResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) throw new ForbiddenError();
      const input = resourceInput.parse(req.body);
      const concept = await prisma.curriculumConcept.findUnique({ where: { id: input.conceptId }, include: { chapter: true } });
      if (!concept || !concept.isActive || !concept.chapter.isActive || concept.chapter.grade < 6 || concept.chapter.grade > 8) throw new NotFoundError('Active Grade 6–8 concept not found');
      const pathway = await prisma.pathway.findUnique({ where: { code: input.pathwayCode } });
      if (!pathway) throw new ValidationError('Pathway is not configured');
      const resource = await prisma.learningResource.create({
        data: { resourceKey: `lr-${crypto.randomUUID()}`, conceptId: concept.id, pathwayId: pathway.id, format: input.format, title: input.title, sourceReference: input.sourceReference, createdById: userId, status: 'DRAFT' },
        include: { concept: { include: { chapter: { include: { subject: { select: { id: true, name: true } } } } } }, pathway: { select: { code: true, name: true } } }
      });
      res.status(201).json({ ...resource, fileSizeBytes: null });
    } catch (err) { next(err); }
  }

  static async createUploadIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.resourceId);
      const input = uploadIntentInput.parse(req.body);
      const resource = await prisma.learningResource.findUnique({ where: { id }, include: { concept: { include: { chapter: { include: { subject: true } } } } } });
      if (!resource || resource.status !== 'DRAFT') throw new ConflictError('Only admin-created draft resources can be uploaded');
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new ConflictError('Media storage is not configured yet', 'STORAGE_NOT_CONFIGURED');
      const maxBytes = resource.format === 'VIDEO' ? 200 * 1024 * 1024 : resource.format === 'IMAGE' ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
      if (input.fileSizeBytes > maxBytes) throw new ValidationError(`Maximum ${resource.format.toLowerCase()} size is ${Math.floor(maxBytes / (1024 * 1024))} MB`);
      const mimeAllowed = resource.format === 'VIDEO'
        ? input.mimeType.startsWith('video/')
        : resource.format === 'IMAGE'
          ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(input.mimeType.toLowerCase())
          : input.mimeType.toLowerCase() === 'application/pdf';
      if (!mimeAllowed) throw new ValidationError(`File MIME type does not match or is not allowed for ${resource.format}`);
      const safeName = input.fileName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-120);
      const storagePath = `grade-${resource.concept.chapter.grade}/${resource.concept.chapter.subject.code}/${resource.resourceKey}/v${resource.version}/${crypto.randomUUID()}-${safeName}`;
      const bucket = config.supabaseStorageBucket;
      const storageBase = `${config.supabaseUrl}/storage/v1`;
      const objectPath = storagePath.split('/').map(encodeURIComponent).join('/');
      const signedResponse = await fetch(`${storageBase}/object/upload/sign/${encodeURIComponent(bucket)}/${objectPath}`, {
        method: 'POST', headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({})
      });
      if (!signedResponse.ok) throw new ConflictError('Could not prepare a secure Storage upload', 'STORAGE_SIGNING_FAILED');
      const signed = await signedResponse.json() as { url?: string; token?: string };
      if (!signed.url || !signed.token) throw new ConflictError('Storage did not return upload credentials', 'STORAGE_SIGNING_FAILED');
      const uploadUrl = new URL(signed.url.startsWith('http') ? signed.url : `${storageBase}${signed.url}`, config.supabaseUrl);
      uploadUrl.searchParams.set('token', signed.token);
      res.status(200).json({ uploadUrl: uploadUrl.toString(), storageBucket: bucket, storagePath, mimeType: input.mimeType, fileSizeBytes: input.fileSizeBytes, durationSeconds: input.durationSeconds ?? null, expiresIn: 7200 });
    } catch (err) { next(err); }
  }

  static async catalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) throw new ForbiddenError('Only students can view learning resources');
      const student = await prisma.student.findUnique({ where: { id: studentId }, select: { grade: true } });
      if (!student) throw new NotFoundError('Student profile not found');
      const profile = await prisma.preferenceProfile.findFirst({
        where: { studentId, isCurrent: true },
        include: { dominantPathway: true, secondaryPathway: true }
      });
      // Learning content is matched to the dominant pathway only. The secondary
      // pathway remains part of the assessment profile but is not a catalog filter.
      const pathwayIds = profile ? [profile.dominantPathwayId] : [];
      const subjects = await prisma.subject.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true, code: true, name: true,
          chapters: {
            where: { grade: student.grade, isActive: true },
            orderBy: [{ term: { sort: 'asc', nulls: 'last' } }, { orderIndex: 'asc' }],
            select: {
              id: true, title: true, term: true, description: true, curriculumReference: true, orderIndex: true,
              concepts: {
                where: { isActive: true }, orderBy: { orderIndex: 'asc' },
                select: {
                  id: true, conceptKey: true, title: true, description: true, learningObjective: true,
                  curriculumReference: true, orderIndex: true,
                  resources: {
                    where: { status: 'PUBLISHED', isActive: true, languageCode: 'en', pathwayId: { in: pathwayIds } },
                    select: { id: true, title: true, format: true, pathway: { select: { code: true, name: true } }, durationSeconds: true }
                  },
                  progress: { where: { studentId }, select: { status: true, progressPercent: true, completedAt: true } }
                }
              }
            }
          }
        }
      });
      res.status(200).json({
        grade: student.grade,
        preferredPathways: profile ? [profile.dominantPathway.name] : [],
        profileRequired: !profile,
        subjects
      });
    } catch (err) { next(err); }
  }

  static async reviewQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) throw new ForbiddenError('Teacher profile not found');
      const assignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId: teacher.id }, include: { schoolClass: { select: { grade: true } } }
      });
      // Prisma's `OR: []` does not express a useful filter consistently across
      // query engine versions. A teacher without assignments has no review scope.
      if (assignments.length === 0) {
        res.status(200).json([]);
        return;
      }
      const resources = await prisma.learningResource.findMany({
        where: {
          status: 'PENDING_REVIEW',
          OR: assignments.map(a => ({ concept: { chapter: { subjectId: a.subjectId, grade: a.schoolClass.grade } } }))
        },
        include: { concept: { include: { chapter: { include: { subject: true } } } }, pathway: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'asc' }
      });
      res.status(200).json(resources.map(resource => ({
        ...resource,
        fileSizeBytes: resource.fileSizeBytes === null ? null : Number(resource.fileSizeBytes)
      })));
    } catch (err) { next(err); }
  }

  static async openResourceForTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.resourceId);
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) throw new ForbiddenError('Teacher profile not found');
      const resource = await prisma.learningResource.findFirst({ where: { id, status: 'PENDING_REVIEW' }, include: { concept: { include: { chapter: true } } } });
      if (!resource || !resource.storageBucket || !resource.storagePath) throw new NotFoundError('Pending review media not found');
      const assignment = await prisma.teacherClassAssignment.findFirst({ where: { teacherId: teacher.id, subjectId: resource.concept.chapter.subjectId, schoolClass: { grade: resource.concept.chapter.grade } } });
      if (!assignment) throw new ForbiddenError('You are not assigned to this subject and grade');
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new ConflictError('Media storage is not configured yet', 'STORAGE_NOT_CONFIGURED');
      const objectPath = resource.storagePath.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(resource.storageBucket)}/${objectPath}`, {
        method: 'POST', headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 900 })
      });
      if (!response.ok) throw new ConflictError('Could not create secure review link', 'STORAGE_SIGNING_FAILED');
      const signed = await response.json() as { signedURL?: string; signedUrl?: string };
      const signedURL = signed.signedURL || signed.signedUrl;
      if (!signedURL) throw new ConflictError('Storage did not return a signed review link', 'STORAGE_SIGNING_FAILED');
      res.status(200).json({ url: signedURL.startsWith('http') ? signedURL : `${config.supabaseUrl}/storage/v1${signedURL}`, expiresIn: 900 });
    } catch (err) { next(err); }
  }

  static async reviewResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.resourceId);
      const input = reviewInput.parse(req.body);
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) throw new ForbiddenError('Teacher profile not found');
      const resource = await prisma.learningResource.findUnique({ where: { id }, include: { concept: { include: { chapter: true } } } });
      if (!resource || resource.status !== 'PENDING_REVIEW') throw new NotFoundError('Pending resource not found');
      const assignment = await prisma.teacherClassAssignment.findFirst({
        where: { teacherId: teacher.id, subjectId: resource.concept.chapter.subjectId, schoolClass: { grade: resource.concept.chapter.grade } }
      });
      if (!assignment) throw new ForbiddenError('You are not assigned to this subject and grade');
      const updated = await prisma.learningResource.update({ where: { id }, data: {
        status: input.decision as LearningResourceStatus,
        reviewedById: req.user!.id,
        reviewNotes: input.reviewNotes,
        reviewedAt: new Date()
      } });
      res.status(200).json({ ...updated, fileSizeBytes: updated.fileSizeBytes === null ? null : Number(updated.fileSizeBytes) });
    } catch (err) { next(err); }
  }

  static async setUploadedFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.resourceId);
      const input = uploadInput.parse(req.body);
      const resource = await prisma.learningResource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'DRAFT') throw new ConflictError('Only draft resources can be finalized for teacher review');
      const maxBytes = resource.format === 'VIDEO' ? 200 * 1024 * 1024 : resource.format === 'IMAGE' ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
      if (input.fileSizeBytes > maxBytes) throw new ValidationError(`Maximum ${resource.format.toLowerCase()} size is ${Math.floor(maxBytes / (1024 * 1024))} MB`);
      if (input.storageBucket !== config.supabaseStorageBucket) throw new ValidationError('File must be stored in the configured private learning bucket');
      const mimeAllowed = resource.format === 'VIDEO'
        ? input.mimeType.startsWith('video/')
        : resource.format === 'IMAGE'
          ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(input.mimeType.toLowerCase())
          : input.mimeType.toLowerCase() === 'application/pdf';
      if (!mimeAllowed) throw new ValidationError(`File MIME type does not match or is not allowed for ${resource.format}`);
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new ConflictError('Media storage is not configured yet', 'STORAGE_NOT_CONFIGURED');
      const objectPath = input.storagePath.split('/').map(encodeURIComponent).join('/');
      const verification = await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(input.storageBucket)}/${objectPath}`, {
        method: 'POST', headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 })
      });
      if (!verification.ok) throw new ConflictError('Uploaded Storage object could not be verified', 'STORAGE_OBJECT_MISSING');
      const updated = await prisma.learningResource.update({ where: { id }, data: {
        ...input, uploadedById: req.user!.id, status: 'PENDING_REVIEW'
      } });
      res.status(200).json({ ...updated, fileSizeBytes: updated.fileSizeBytes === null ? null : Number(updated.fileSizeBytes) });
    } catch (err) { next(err); }
  }

  static async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.resourceId);
      const resource = await prisma.learningResource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'APPROVED') throw new ConflictError('Only teacher-approved resources can be published');
      if (!resource.storageBucket || !resource.storagePath || !resource.mimeType || !resource.fileSizeBytes) throw new ConflictError('Upload the approved file before publishing');
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new ConflictError('Media storage is not configured yet', 'STORAGE_NOT_CONFIGURED');
      const objectPath = resource.storagePath.split('/').map(encodeURIComponent).join('/');
      const verification = await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(resource.storageBucket)}/${objectPath}`, {
        method: 'POST', headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 })
      });
      if (!verification.ok) throw new ConflictError('The uploaded Storage object could not be verified', 'STORAGE_OBJECT_MISSING');
      const updated = await prisma.learningResource.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      res.status(200).json({ ...updated, fileSizeBytes: updated.fileSizeBytes === null ? null : Number(updated.fileSizeBytes) });
    } catch (err) { next(err); }
  }

  static async updateProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) throw new ForbiddenError('Only students can save learning progress');
      const conceptId = z.string().uuid().parse(req.params.conceptId);
      const input = progressInput.parse(req.body);
      const concept = await prisma.curriculumConcept.findFirst({ where: { id: conceptId, isActive: true, chapter: { grade: (await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { grade: true } })).grade } } });
      if (!concept) throw new NotFoundError('Concept not found for your grade');
      let resourceId: string | null = null;
      if (input.resourceId) {
        const resource = await prisma.learningResource.findFirst({ where: { id: input.resourceId, conceptId, status: 'PUBLISHED', isActive: true } });
        if (!resource) throw new NotFoundError('Published concept resource not found');
        resourceId = resource.id;
      }
      const now = new Date();
      const updated = await prisma.conceptProgress.upsert({
        where: { studentId_conceptId: { studentId, conceptId } },
        create: { studentId, conceptId, status: input.status, progressPercent: input.progressPercent, lastResourceId: resourceId, startedAt: now, completedAt: input.status === 'COMPLETED' ? now : null },
        update: { status: input.status, progressPercent: input.progressPercent, ...(resourceId ? { lastResourceId: resourceId } : {}), completedAt: input.status === 'COMPLETED' ? now : null }
      });
      res.status(200).json(updated);
    } catch (err) { next(err); }
  }

  static async openResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) throw new ForbiddenError('Only students can access learning media');
      const id = z.string().uuid().parse(req.params.resourceId);
      const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { grade: true } });
      const profile = await prisma.preferenceProfile.findFirst({ where: { studentId, isCurrent: true }, select: { dominantPathwayId: true } });
      if (!profile) throw new ConflictError('Complete the pre-assessment before accessing recommended learning resources', 'PROFILE_REQUIRED');
      const resource = await prisma.learningResource.findFirst({ where: {
        id, status: 'PUBLISHED', isActive: true, languageCode: 'en', pathwayId: profile.dominantPathwayId,
        concept: { isActive: true, chapter: { isActive: true, grade: student.grade } }
      } });
      if (!resource || !resource.storageBucket || !resource.storagePath) throw new NotFoundError('Published media not found');
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new ConflictError('Media storage is not configured yet', 'STORAGE_NOT_CONFIGURED');
      const response = await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(resource.storageBucket)}/${resource.storagePath.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 3600 })
      });
      if (!response.ok) throw new ConflictError('Could not create secure media link', 'STORAGE_SIGNING_FAILED');
      const signed = await response.json() as { signedURL?: string; signedUrl?: string };
      const signedURL = signed.signedURL || signed.signedUrl;
      if (!signedURL) throw new ConflictError('Storage did not return a signed media link', 'STORAGE_SIGNING_FAILED');
      res.status(200).json({ url: signedURL.startsWith('http') ? signedURL : `${config.supabaseUrl}/storage/v1${signedURL}`, expiresIn: 3600 });
    } catch (err) { next(err); }
  }
}
