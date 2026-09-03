CREATE TABLE IF NOT EXISTS "BackendProbe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "OwnerAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL CONSTRAINT "OwnerAccount_email_key" UNIQUE,
  "passwordHash" BLOB NOT NULL,
  "passwordSalt" BLOB NOT NULL,
  "recoveryHash" BLOB NOT NULL,
  "recoverySalt" BLOB NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" DATETIME,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
