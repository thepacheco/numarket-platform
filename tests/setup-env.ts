process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://localhost:5432/numarket_platform_test";
process.env.ALLOW_DEV_SIGNIN = "1";
process.env.APP_DOMAIN = "localhost:3100";
process.env.OPS_HOSTS = "ops.localhost:3100";
