import { app } from './app';
import { config } from './config/env';

app.listen(config.port, () => {
  console.log(`===============================================`);
  console.log(` MindBridge Pre-Assessment Backend Server      `);
  console.log(` Listening on port: ${config.port}            `);
  console.log(` Environment: ${config.nodeEnv}               `);
  console.log(` OpenAPI Spec: http://localhost:${config.port}/openapi.json `);
  console.log(`===============================================`);
});
