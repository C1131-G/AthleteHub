CREATE TABLE "ArcherySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "formatSnapshot" TEXT NOT NULL,
    "equipmentSetupId" TEXT,
    "plannedArrows" INTEGER,
    "actualArrows" INTEGER,
    "technicalFocus" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ArcheryEnd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "arrowCount" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    CONSTRAINT "ArcheryEnd_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ArcherySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ArcheryEnd_sessionId_sequence_key" ON "ArcheryEnd"("sessionId", "sequence");
CREATE INDEX "ArcherySession_athleteId_date_idx" ON "ArcherySession"("athleteId", "date");
