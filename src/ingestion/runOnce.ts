import { runIngestion } from "./ingestService";
import { prisma } from "../db/prisma";

runIngestion()
  .then((result) => {
    console.log(`Ingesta OK: fetched=${result.fetched} upserted=${result.upserted} runId=${result.runId}`);
  })
  .catch((error) => {
    console.error("Ingesta fallida:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
