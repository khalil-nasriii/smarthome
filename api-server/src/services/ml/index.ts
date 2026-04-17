import { mlService } from "./mlService";

export function initMlService() {
  mlService.start();
}

export { mlService };

