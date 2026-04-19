import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { Env } from "@/config/env.validation";
import { UsersService } from "@/users/users.service";

import { AuthService } from "./auth.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const user = {
  id: "user_1",
  email: "devc@example.com",
  name: "Devc",
  passwordHash: "$2b$12$qgYI/pMlk7fVW6cq5aD2QuKdU.KbViIm8dEPBwQ5x243UyS0aMYlC",
  createdAt: now,
  updatedAt: now,
};

type MockUsersService = {
  create: jest.Mock;
  findByEmail: jest.Mock;
  findById: jest.Mock;
  toPublicUser: jest.Mock;
};

type MockJwtService = {
  signAsync: jest.Mock;
};

describe("AuthService", () => {
  const makeService = () => {
    const users = {
      create: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(user),
      toPublicUser: jest.fn().mockReturnValue({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }),
    } satisfies MockUsersService;
    const jwt = {
      signAsync: jest.fn().mockResolvedValue("signed.jwt.token"),
    } satisfies MockJwtService;
    const config = {
      get: jest.fn().mockReturnValue("1d"),
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
      accessToken: "signed.jwt.token",
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
      {
        sub: user.id,
        email: user.email,
      },
      {
        expiresIn: "1d",
      },
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
});
