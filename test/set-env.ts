process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.SWAGGER_ENABLED = "false";
process.env.JWT_SECRET ??= "test-access-secret-with-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-with-at-least-32-chars";
