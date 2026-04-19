import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { AuthUser } from "@/common/types/auth-user";

type RequestWithUser = {
  user: AuthUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);
