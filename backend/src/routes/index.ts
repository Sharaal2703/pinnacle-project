import { Router } from 'express';
import authRoutes from './auth.routes';
import attemptRoutes from './attempt.routes';
import studentRoutes from './student.routes';
import adminRoutes from './admin.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/assessment-attempts', attemptRoutes);
apiRouter.use('/students', studentRoutes);
apiRouter.use('/admin', adminRoutes);

export default apiRouter;
