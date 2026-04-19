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
import { UsersService } from "@/users/users.service";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type AuthResponse = {
  accessToken: string;
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

    return this.createAuthResponse({
      sub: user.id,
      email: user.email,
    });
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

    return this.createAuthResponse({
      sub: user.id,
      email: user.email,
    });
  }

  private async createAuthResponse(authUser: AuthUser): Promise<AuthResponse> {
    const user = await this.users.findById(authUser.sub);

    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }

    const accessToken = await this.jwt.signAsync(authUser, {
      expiresIn: this.config.get("JWT_EXPIRES_IN", { infer: true }),
    });

    return {
      accessToken,
      user: this.users.toPublicUser(user),
    };
  }
}
