import { Router } from 'express';
import authRoutes from './auth.routes';
import attemptRoutes from './attempt.routes';
import studentRoutes from './student.routes';
import adminRoutes from './admin.routes';
import assessmentAccessRoutes from './assessment-access.routes';
import learningRoutes from './learning.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/assessment-attempts', attemptRoutes);
apiRouter.use('/students', studentRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/assessment-access', assessmentAccessRoutes);
apiRouter.use('/learning', learningRoutes);

export default apiRouter;
