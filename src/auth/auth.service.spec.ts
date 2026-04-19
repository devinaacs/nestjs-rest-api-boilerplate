import { createHash } from "node:crypto";

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";

import { Env } from "@/config/env.validation";
import { UsersService } from "@/users/users.service";

import { AuthService } from "./auth.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const user = {
  id: "user_1",
  email: "devc@example.com",
  name: "Devc",
  passwordHash: "$2b$12$qgYI/pMlk7fVW6cq5aD2QuKdU.KbViIm8dEPBwQ5x243UyS0aMYlC",
  role: Role.USER,
  refreshTokenHash:
    "$2b$12$qgYI/pMlk7fVW6cq5aD2QuKdU.KbViIm8dEPBwQ5x243UyS0aMYlC",
  createdAt: now,
  updatedAt: now,
};

type MockUsersService = {
  create: jest.Mock;
  findByEmail: jest.Mock;
  findById: jest.Mock;
  updateRefreshTokenHash: jest.Mock;
  toPublicUser: jest.Mock;
};

type MockJwtService = {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
};

describe("AuthService", () => {
  const makeService = () => {
    const users = {
      create: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(user),
      updateRefreshTokenHash: jest.fn().mockResolvedValue(user),
      toPublicUser: jest.fn().mockReturnValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }),
    } satisfies MockUsersService;
    const jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce("signed.access.token")
        .mockResolvedValueOnce("signed.refresh.token"),
      verifyAsync: jest.fn().mockResolvedValue({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    } satisfies MockJwtService;
    const config = {
      get: jest.fn((key: keyof Env) => {
        const values: Partial<Env> = {
          JWT_EXPIRES_IN: "1d",
          JWT_REFRESH_EXPIRES_IN: "7d",
          JWT_REFRESH_SECRET: "refresh-secret-with-at-least-32-chars",
        };

        return values[key];
      }),
    } as unknown as ConfigService<Env, true>;

    return {
      service: new AuthService(
        users as unknown as UsersService,
        jwt as unknown as JwtService,
        config,
      ),
      users,
      jwt,
    };
  };

  it("registers a new user and returns an access token", async () => {
    const { service, users, jwt } = makeService();
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.register({
        email: "Devc@Example.com",
        password: "strong-password",
        name: "Devc",
      }),
    ).resolves.toMatchObject({
      accessToken: "signed.access.token",
      refreshToken: "signed.refresh.token",
      user: {
        email: "devc@example.com",
      },
    });

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "devc@example.com",
      }),
    );
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: user.id,
        email: user.email,
        role: user.role,
        jti: expect.any(String) as unknown,
      }),
      {
        expiresIn: "1d",
      },
    );
    expect(users.updateRefreshTokenHash).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
    );
  });

  it("rejects duplicate registration emails", async () => {
    const { service, users } = makeService();
    users.findByEmail.mockResolvedValue(user);

    await expect(
      service.register({
        email: "Devc@Example.com",
        password: "strong-password",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(users.findByEmail).toHaveBeenCalledWith("devc@example.com");
  });

  it("rejects invalid login credentials", async () => {
    const { service, users } = makeService();
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: "devc@example.com",
        password: "strong-password",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rotates refresh tokens", async () => {
    const { service, users, jwt } = makeService();
    users.findById.mockResolvedValue({
      ...user,
      refreshTokenHash: createHash("sha256")
        .update("refresh-token")
        .digest("hex"),
    });

    await expect(
      service.refresh({ refreshToken: "refresh-token" }),
    ).resolves.toMatchObject({
      accessToken: "signed.access.token",
      refreshToken: "signed.refresh.token",
    });

    expect(jwt.verifyAsync).toHaveBeenCalledWith("refresh-token", {
      secret: "refresh-secret-with-at-least-32-chars",
    });
    expect(users.updateRefreshTokenHash).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
    );
  });

  it("clears refresh tokens on logout", async () => {
    const { service, users } = makeService();

    await expect(
      service.logout({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    ).resolves.toEqual({ message: "Logged out" });

    expect(users.updateRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
  });
});
