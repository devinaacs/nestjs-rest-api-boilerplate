import { randomUUID } from "node:crypto";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import { ApiResponseInterceptor } from "@/common/interceptors/api-response.interceptor";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { Env } from "@/config/env.validation";

type RequestWithId = Request & {
  requestId?: string;
};

function parseCorsOrigin(value: string): boolean | string[] {
  if (value === "*") {
    return true;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function setupApp(app: INestApplication): {
  apiPrefix: string;
  appName: string;
  port: number;
} {
  const logger = app.get(Logger);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const appName = config.get("APP_NAME", { infer: true });
  const apiPrefix = config.get("API_PREFIX", { infer: true });
  const port = config.get("PORT", { infer: true });

  app.useLogger(logger);
  app.use(helmet());
  app.use((request: RequestWithId, response: Response, next: NextFunction) => {
    const requestId =
      request.header("x-request-id") ?? request.header("x-correlation-id");

    request.requestId = requestId ?? randomUUID();
    response.setHeader("x-request-id", request.requestId);
    next();
  });
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
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

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

  return { apiPrefix, appName, port };
}
