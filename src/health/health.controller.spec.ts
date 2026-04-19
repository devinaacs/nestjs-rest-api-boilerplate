import { ConfigService } from "@nestjs/config";
import { describe, expect, it, jest } from "@jest/globals";

import { Env } from "@/config/env.validation";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns the API health status", () => {
    const config = {
      get: jest.fn().mockReturnValue("Devc NestJS REST API"),
    } as unknown as ConfigService<Env, true>;
    const controller = new HealthController(config);

    expect(controller.check()).toMatchObject({
      app: "Devc NestJS REST API",
      status: "ok",
    });
  });
});
