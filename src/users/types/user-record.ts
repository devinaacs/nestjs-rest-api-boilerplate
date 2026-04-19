import { Role } from "@/common/constants/roles";

export type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: Role;
  refreshTokenHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  email: string;
  name?: string;
  passwordHash: string;
  role?: Role;
  refreshTokenHash?: string | null;
};
