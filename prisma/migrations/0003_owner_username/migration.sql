ALTER TABLE "OwnerAccount" RENAME COLUMN "email" TO "username";

DELETE FROM "OwnerAccount" WHERE "username" LIKE '%@%';
