import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { Env } from "./config/env.validation";

function parseCorsOrigin(value: string): boolean | string[] {
  if (value === "*") {
    return true;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const appName = config.get("APP_NAME", { infer: true });
  const apiPrefix = config.get("API_PREFIX", { infer: true });
  const port = config.get("PORT", { infer: true });

  app.useLogger(logger);
  app.enableCors({
    origin: parseCorsOrigin(config.get("CORS_ORIGIN", { infer: true })),
    credentials: true,
  });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (config.get("SWAGGER_ENABLED", { infer: true })) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription("REST API documentation")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);
  logger.log(`${appName} is running on http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
