import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";

import { AuthUser, PublicUser } from "@/common/types/auth-user";
import { Env } from "@/config/env.validation";
import { UserRecord } from "@/users/types/user-record";
import { UsersService } from "@/users/users.service";

import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.users.create({
      email,
      name: dto.name,
      passwordHash,
    });

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email.toLowerCase());

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.createAuthResponse(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const user = await this.users.findById(payload.sub);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const isRefreshTokenValid = this.compareRefreshToken(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.createAuthResponse(user);
  }

  async logout(user: AuthUser): Promise<{ message: string }> {
    await this.users.updateRefreshTokenHash(user.sub, null);

    return { message: "Logged out" };
  }

  private async createAuthResponse(user: UserRecord): Promise<AuthResponse> {
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        expiresIn: this.config.get("JWT_EXPIRES_IN", { infer: true }),
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get("JWT_REFRESH_SECRET", { infer: true }),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN", { infer: true }),
      },
    );
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await this.users.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      user: this.users.toPublicUser(user),
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<AuthUser> {
    try {
      return await this.jwt.verifyAsync<AuthUser>(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET", { infer: true }),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  private compareRefreshToken(
    refreshToken: string,
    refreshTokenHash: string,
  ): boolean {
    const incoming = Buffer.from(this.hashRefreshToken(refreshToken), "hex");
    const stored = Buffer.from(refreshTokenHash, "hex");

    return (
      incoming.length === stored.length && timingSafeEqual(incoming, stored)
    );
  }
}
