-- DropIndex
DROP INDEX "XPTransaction_studentId_actionType_relatedEntityType_relatedEntityId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "XPTransaction_studentId_actionType_relatedEntityType_relatedEntityId_key" ON "XPTransaction"("studentId", "actionType", "relatedEntityType", "relatedEntityId");

