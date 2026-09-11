-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'HDRI';

-- CreateEnum
CREATE TYPE "HdriVariant" AS ENUM ('DAY', 'NIGHT');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "hdriVariant" "HdriVariant";
