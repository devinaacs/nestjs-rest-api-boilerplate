import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Env } from "@/config/env.validation";
import { PrismaService } from "@/prisma/prisma.service";

type HealthResponse = {
  app: string;
  status: "ok";
  timestamp: string;
  uptime: number;
};

type ReadinessResponse = HealthResponse & {
  checks: {
    database: "ok";
  };
};

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "API health status" })
  check(): HealthResponse {
    return this.live();
  }

  @Get("live")
  @ApiOkResponse({ description: "API liveness status" })
  live(): HealthResponse {
    return {
      app: this.config.get("APP_NAME", { infer: true }),
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get("ready")
  @ApiOkResponse({ description: "API readiness status" })
  async ready(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        ...this.live(),
        checks: {
          database: "ok",
        },
      };
    } catch {
      throw new ServiceUnavailableException("Database is not ready");
    }
  }
}
