import { Router } from 'express';
import { LearningController } from '../controllers/learning.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/catalog', requireRole('STUDENT'), LearningController.catalog);
router.get('/resources/:resourceId/open', requireRole('STUDENT'), LearningController.openResource);
router.put('/concepts/:conceptId/progress', requireRole('STUDENT'), LearningController.updateProgress);

router.get('/teacher/review-queue', requireRole('TEACHER'), LearningController.reviewQueue);
router.get('/teacher/resources/:resourceId/open', requireRole('TEACHER'), LearningController.openResourceForTeacher);
router.post('/teacher/resources/:resourceId/review', requireRole('TEACHER'), LearningController.reviewResource);

router.get('/admin/curriculum', requireRole('ADMIN'), LearningController.adminCurriculum);
router.get('/admin/subjects', requireRole('ADMIN'), LearningController.adminSubjects);
router.post('/admin/curriculum/chapters', requireRole('ADMIN'), LearningController.createChapter);
router.post('/admin/curriculum/chapters/:chapterId/concepts', requireRole('ADMIN'), LearningController.createConcept);
router.get('/admin/resources', requireRole('ADMIN'), LearningController.adminResources);
router.post('/admin/resources', requireRole('ADMIN'), LearningController.createAdminResource);
router.post('/admin/resources/:resourceId/upload-intent', requireRole('ADMIN'), LearningController.createUploadIntent);
router.put('/admin/resources/:resourceId/file', requireRole('ADMIN'), LearningController.setUploadedFile);
router.post('/admin/resources/:resourceId/publish', requireRole('ADMIN'), LearningController.publish);

export default router;
