import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Env } from "@/config/env.validation";

type HealthResponse = {
  app: string;
  status: "ok";
  timestamp: string;
};

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  @Get()
  @ApiOkResponse({ description: "API health status" })
  check(): HealthResponse {
    return {
      app: this.config.get("APP_NAME", { infer: true }),
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
