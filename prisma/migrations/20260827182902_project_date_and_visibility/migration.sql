-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
