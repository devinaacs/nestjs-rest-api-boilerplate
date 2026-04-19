import { Injectable } from "@nestjs/common";

import { PublicUser } from "@/common/types/auth-user";
import { PrismaService } from "@/prisma/prisma.service";

import { CreateUserInput, UserRecord } from "./types/user-record";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserInput): Promise<UserRecord> {
    return this.prisma.user.create({ data }) as Promise<UserRecord>;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
    }) as Promise<UserRecord | null>;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
    }) as Promise<UserRecord | null>;
  }

  async findAll(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }) as Promise<UserRecord[]>;
  }

  async findAllPublic(): Promise<PublicUser[]> {
    const users = await this.findAll();

    return users.map((user) => this.toPublicUser(user));
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await this.findById(id);

    return user ? this.toPublicUser(user) : null;
  }

  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    }) as Promise<UserRecord>;
  }

  toPublicUser(user: UserRecord): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
