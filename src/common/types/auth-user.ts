export type AuthUser = {
  sub: string;
  email: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};
