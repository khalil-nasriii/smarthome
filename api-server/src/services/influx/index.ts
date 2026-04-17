import { influxService } from "./influxService";

export function initInfluxService() {
  influxService.start();
}

export { influxService };

