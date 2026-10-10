import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local dir
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://mindbridge:local-development-only-change-me@localhost:5432/mindbridge?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'mindbridge-dev-secret-key-at-least-32-chars-long!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h'
};
