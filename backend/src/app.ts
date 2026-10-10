import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './routes';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve OpenAPI JSON
app.get('/openapi.json', (_req: Request, res: Response) => {
  const openApiPath = path.resolve(__dirname, '../../shared/openapi.json');
  res.sendFile(openApiPath);
});

// Mount official API v1 routes
app.use('/api/v1', apiRouter);

// 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint was not found.'
    }
  });
});

// Global error handler
app.use(errorHandler);
