import { describe, expect, it } from "@jest/globals";

import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  it("coerces and defaults environment values", () => {
    const env = validateEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:15432/devc_api",
      JWT_SECRET: "a-secret-value-with-at-least-32-chars",
      JWT_REFRESH_SECRET: "a-refresh-secret-with-at-least-32-chars",
      PORT: "4000",
    });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PREFIX).toBe("api/v1");
  });

  it("rejects weak JWT secrets", () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: "postgresql://postgres:postgres@localhost:15432/devc_api",
        JWT_SECRET: "too-short",
        JWT_REFRESH_SECRET: "a-refresh-secret-with-at-least-32-chars",
      }),
    ).toThrow("JWT_SECRET");
  });
});
