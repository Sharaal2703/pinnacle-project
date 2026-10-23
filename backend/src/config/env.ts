import dotenv from 'dotenv';
import path from 'path';

// Backend-local credentials are loaded first; these paths work in both src/config and dist/config layouts.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'mindbridge-dev-secret-key-at-least-32-chars-long!';

if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}
if (nodeEnv === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured in production.');
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://mindbridge:local-development-only-change-me@localhost:5432/mindbridge?schema=public',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  supabaseUrl: process.env.SUPABASE_URL?.replace(/\/$/, ''),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'mindbridge-learning'
};
