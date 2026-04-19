import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";

import { setupApp } from "@/app.bootstrap";
import { AppModule } from "@/app.module";
import { Role } from "@/common/constants/roles";
import { PrismaService } from "@/prisma/prisma.service";

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

describe("App e2e", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["e2e-user@example.com", "e2e-admin@example.com"],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["e2e-user@example.com", "e2e-admin@example.com"],
        },
      },
    });
    await app.close();
  });

  it("reports readiness with database connectivity", async () => {
    await request(httpServer)
      .get("/api/v1/health/ready")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          data: {
            status: "ok",
            checks: {
              database: "ok",
            },
          },
        });
      });
  });

  it("runs the auth lifecycle", async () => {
    const registerResponse = await request(httpServer)
      .post("/api/v1/auth/register")
      .send({
        email: "e2e-user@example.com",
        password: "strong-password",
        name: "E2E User",
      })
      .expect(201);
    const auth = (registerResponse.body as ApiResponse<AuthPayload>).data;

    expect(auth.accessToken).toEqual(expect.any(String));
    expect(auth.refreshToken).toEqual(expect.any(String));
    expect(auth.user.role).toBe(Role.USER);

    await request(httpServer)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as ApiResponse<AuthPayload["user"]>).data.email).toBe(
          "e2e-user@example.com",
        );
      });

    const refreshResponse = await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: auth.refreshToken })
      .expect(200);
    const rotatedAuth = (refreshResponse.body as ApiResponse<AuthPayload>).data;

    expect(rotatedAuth.accessToken).toEqual(expect.any(String));
    expect(rotatedAuth.refreshToken).toEqual(expect.any(String));

    await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: auth.refreshToken })
      .expect(401);

    await request(httpServer)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${rotatedAuth.accessToken}`)
      .expect(200);

    await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: rotatedAuth.refreshToken })
      .expect(401);
  });

  it("blocks admin endpoints for regular users", async () => {
    const response = await request(httpServer)
      .post("/api/v1/auth/register")
      .send({
        email: "e2e-admin@example.com",
        password: "strong-password",
        name: "Not Admin",
      })
      .expect(201);
    const auth = (response.body as ApiResponse<AuthPayload>).data;

    await request(httpServer)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(403);
  });
});
