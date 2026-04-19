import { Controller, Get, NotFoundException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";

import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { AuthUser, PublicUser } from "@/common/types/auth-user";

import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: "All users. Admin only." })
  async findAll(): Promise<PublicUser[]> {
    const users = await this.users.findAll();

    return users.map((user) => this.users.toPublicUser(user));
  }

  @Get("me")
  @ApiOkResponse({ description: "Authenticated user profile" })
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    const foundUser = await this.users.findById(user.sub);

    if (!foundUser) {
      throw new NotFoundException("User not found");
    }

    return this.users.toPublicUser(foundUser);
  }
}
