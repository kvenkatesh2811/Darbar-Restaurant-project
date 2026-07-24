import app from "./app";
import { logger } from "./lib/logger";
import initDbTables from "./lib/db-init";
import { startBirthdayReminderSchedule } from "./lib/birthday";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  await initDbTables();
  startBirthdayReminderSchedule();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

startServer();
