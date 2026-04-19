import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Role } from "@/common/constants/roles";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { AuthUser, PublicUser } from "@/common/types/auth-user";

import { UsersService } from "./users.service";

type UsersReader = {
  findAllPublic: () => Promise<PublicUser[]>;
  findPublicById: (id: string) => Promise<PublicUser | null>;
};

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersReader) {}

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: "All users. Admin only." })
  async findAll(): Promise<PublicUser[]> {
    const users = await this.users.findAllPublic();

    return users;
  }

  @Get("me")
  @ApiOkResponse({ description: "Authenticated user profile" })
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    const foundUser = await this.users.findPublicById(user.sub);

    if (!foundUser) {
      throw new NotFoundException("User not found");
    }

    return foundUser;
  }
}
