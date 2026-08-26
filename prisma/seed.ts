/* Seeds a demo project with one version and a sample CSV in MinIO. */
import "dotenv/config";
import { db } from "../src/lib/db";
import { putObject } from "../src/lib/s3";

async function main() {
  const csv = Buffer.from(
    "Fixture,Type,Universe,Address\nSpot 1,Moving Head,1,1\nSpot 2,Moving Head,1,17\nWash 1,LED Wash,1,33\n",
  );
  const s3Key = "demo/rave-fusion/v1/patch.csv";
  await putObject(s3Key, csv, "text/csv");

  const project = await db.project.upsert({
    where: { slug: "rave-fusion" },
    update: {},
    create: {
      slug: "rave-fusion",
      name: "Rave Fusion",
      versions: {
        create: {
          label: "v1",
          files: {
            create: {
              type: "CSV",
              name: "patch.csv",
              s3Key,
              size: csv.length,
              contentType: "text/csv",
            },
          },
        },
      },
    },
  });

  console.log(`Seeded project ${project.slug} (${project.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
