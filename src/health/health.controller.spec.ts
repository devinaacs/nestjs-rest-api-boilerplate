import { ConfigService } from "@nestjs/config";
import { describe, expect, it, jest } from "@jest/globals";

import { Env } from "@/config/env.validation";
import { PrismaService } from "@/prisma/prisma.service";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const makeController = () => {
    const config = {
      get: jest.fn().mockReturnValue("Devc NestJS REST API"),
    } as unknown as ConfigService<Env, true>;
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(1 as never),
    } as unknown as PrismaService;

    return new HealthController(config, prisma);
  };

  it("returns the API health status", () => {
    const controller = makeController();

    expect(controller.check()).toMatchObject({
      app: "Devc NestJS REST API",
      status: "ok",
    });
  });

  it("checks database readiness", async () => {
    const controller = makeController();

    await expect(controller.ready()).resolves.toMatchObject({
      status: "ok",
      checks: {
        database: "ok",
      },
    });
  });
});
