import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { AuthModule } from "@/auth/auth.module";
import { Env, validateEnv } from "@/config/env.validation";
import { HealthModule } from "@/health/health.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { UsersModule } from "@/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get("LOG_LEVEL", { infer: true }),
          transport:
            config.get("NODE_ENV", { infer: true }) === "development"
              ? {
                  target: "pino-pretty",
                  options: {
                    colorize: true,
                    singleLine: true,
                  },
                }
              : undefined,
          redact: {
            paths: ["req.headers.authorization", "req.headers.cookie"],
            censor: "[Redacted]",
          },
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
