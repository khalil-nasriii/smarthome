import app from "./app";
import { logger } from "./lib/logger";
import { initMqttService } from "./services/mqtt";
import { initInfluxService } from "./services/influx";
import { initMlService } from "./services/ml";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

initInfluxService();
initMlService();
initMqttService();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
