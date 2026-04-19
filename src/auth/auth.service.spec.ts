import { createHash } from "node:crypto";

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it, jest } from "@jest/globals";

import { Role } from "@/common/constants/roles";
import { AuthUser, PublicUser } from "@/common/types/auth-user";
import { Env } from "@/config/env.validation";
import { UsersService } from "@/users/users.service";

import { AuthService } from "./auth.service";

type MockFn = ReturnType<typeof jest.fn>;

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
  create: MockFn;
  findByEmail: MockFn;
  findById: MockFn;
  updateRefreshTokenHash: MockFn;
  toPublicUser: MockFn;
};

type MockJwtService = {
  signAsync: MockFn;
  verifyAsync: MockFn;
};

type TestDependencies = {
  service: AuthService;
  users: MockUsersService;
  jwt: MockJwtService;
};

type TestAuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

type RefreshableAuthService = {
  refresh: (dto: { refreshToken: string }) => Promise<TestAuthResponse>;
};

type LogoutAuthService = {
  logout: (user: AuthUser) => Promise<{ message: string }>;
};

function mockResolvedValue(mock: MockFn, value: unknown): MockFn {
  return mock.mockResolvedValue(value as never);
}

function mockResolvedValueOnce(mock: MockFn, value: unknown): MockFn {
  return mock.mockResolvedValueOnce(value as never);
}

async function refreshToken(
  service: RefreshableAuthService,
): Promise<TestAuthResponse> {
  return await service.refresh({ refreshToken: "refresh-token" });
}

async function logout(
  service: LogoutAuthService,
  authUser = user,
): Promise<{ message: string }> {
  return await service.logout({
    sub: authUser.id,
    email: authUser.email,
    role: authUser.role,
  });
}

describe("AuthService", () => {
  const makeService = (): TestDependencies => {
    const users = {
      create: mockResolvedValue(jest.fn(), user),
      findByEmail: jest.fn(),
      findById: mockResolvedValue(jest.fn(), user),
      updateRefreshTokenHash: mockResolvedValue(jest.fn(), user),
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
      signAsync: mockResolvedValueOnce(
        mockResolvedValueOnce(jest.fn(), "signed.access.token"),
        "signed.refresh.token",
      ),
      verifyAsync: mockResolvedValue(jest.fn(), {
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
    mockResolvedValue(users.findById, {
      ...user,
      refreshTokenHash: createHash("sha256")
        .update("refresh-token")
        .digest("hex"),
    });

    const response = await refreshToken(service);

    expect(response).toMatchObject({
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

    const response = await logout(service);

    expect(response).toEqual({ message: "Logged out" });

    expect(users.updateRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
  });
});
