import { Role } from "@prisma/client";

export type AuthUser = {
  sub: string;
  email: string;
  role: Role;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};
