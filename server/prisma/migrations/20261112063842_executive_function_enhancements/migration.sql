/*
  Warnings:

  - You are about to drop the column `convertedToAssignmentId` on the `BrainDumpEntry` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `BrainDumpEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "XPTransaction" ADD COLUMN "actionType" TEXT;
ALTER TABLE "XPTransaction" ADD COLUMN "relatedEntityId" TEXT;
ALTER TABLE "XPTransaction" ADD COLUMN "relatedEntityType" TEXT;

-- CreateTable
CREATE TABLE "RecommendationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "recommendedEntityType" TEXT NOT NULL,
    "recommendedEntityId" TEXT,
    "recommendationReason" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'normal',
    "accepted" BOOLEAN,
    "completed" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BrainDumpEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unsorted',
    "convertedItemType" TEXT,
    "convertedItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrainDumpEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BrainDumpEntry" ("createdAt", "id", "studentId", "text") SELECT "createdAt", "id", "studentId", "text" FROM "BrainDumpEntry";
DROP TABLE "BrainDumpEntry";
ALTER TABLE "new_BrainDumpEntry" RENAME TO "BrainDumpEntry";
CREATE INDEX "BrainDumpEntry_studentId_idx" ON "BrainDumpEntry"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecommendationHistory_studentId_idx" ON "RecommendationHistory"("studentId");

-- CreateIndex
CREATE INDEX "XPTransaction_studentId_actionType_relatedEntityType_relatedEntityId_idx" ON "XPTransaction"("studentId", "actionType", "relatedEntityType", "relatedEntityId");
