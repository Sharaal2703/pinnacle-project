CREATE TABLE "assessment_retake_grants" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "assessment_retake_grants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessment_retake_grants_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assessment_retake_grants_grantedById_fkey"
        FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "assessment_retake_grants_studentId_consumedAt_revokedAt_idx"
    ON "assessment_retake_grants"("studentId", "consumedAt", "revokedAt");
