import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { setupApp } from "./app.bootstrap";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  const { apiPrefix, appName, port } = setupApp(app);

  await app.listen(port);
  logger.log(`${appName} is running on http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
