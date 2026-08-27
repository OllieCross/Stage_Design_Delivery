-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'MVR';

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gdtfSpec" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "dirX" DOUBLE PRECISION NOT NULL,
    "dirY" DOUBLE PRECISION NOT NULL,
    "dirZ" DOUBLE PRECISION NOT NULL,
    "beamAngle" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "colorHex" TEXT NOT NULL DEFAULT '#ffffff',
    "intensity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "universe" INTEGER,
    "address" INTEGER,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
