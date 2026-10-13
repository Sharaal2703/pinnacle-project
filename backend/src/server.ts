import { app } from './app';
import { config } from './config/env';
import { SeedService } from './services/seed.service';

app.listen(config.port, async () => {
  console.log(`===============================================`);
  console.log(` MindBridge Pre-Assessment Backend Server      `);
  console.log(` Listening on port: ${config.port}            `);
  console.log(` Environment: ${config.nodeEnv}               `);
  console.log(` OpenAPI Spec: http://localhost:${config.port}/openapi.json `);
  console.log(`===============================================`);

  try {
    await SeedService.seedAll();
  } catch (err) {
    console.warn('Startup seed warning:', err);
  }
});

