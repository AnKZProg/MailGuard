/**
 * Everything the end-to-end server runs with. The database lives under e2e/.data
 * and is rebuilt from scratch before every run — never the real data/ folder.
 */
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_DATABASE_URL = "file:./e2e/.data/e2e.db";

export const E2E_SERVER_ENV = {
  DATABASE_URL: E2E_DATABASE_URL,
  APP_URL: E2E_BASE_URL,
  // Test-only key: the seeded tokens are deliberately not decryptable with it, so no provider is ever called.
  MAILGUARD_ENCRYPTION_KEY: "ZTJlLW9ubHkta2V5LW5vdC1hLXNlY3JldC0zMmJ5dGU=",
  MAILGUARD_DISABLE_AUTO_SYNC: "1",
};
