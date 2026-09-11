-- HDRIs move from a per-version File to one shared global pair: this
-- reverses the previous migration's File changes and adds HdriAsset.

-- AlterTable
ALTER TABLE "File" DROP COLUMN "hdriVariant";

-- Shrink FileType: drop the now-unused HDRI value (Postgres has no DROP
-- VALUE for enums, so the type is recreated and the column re-cast).
ALTER TYPE "FileType" RENAME TO "FileType_old";
CREATE TYPE "FileType" AS ENUM ('PDF', 'IMAGE', 'MODEL', 'CSV', 'MVR', 'OTHER');
ALTER TABLE "File" ALTER COLUMN "type" TYPE "FileType" USING ("type"::text::"FileType");
DROP TYPE "FileType_old";

-- CreateTable
CREATE TABLE "HdriAsset" (
    "variant" "HdriVariant" NOT NULL,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HdriAsset_pkey" PRIMARY KEY ("variant")
);
