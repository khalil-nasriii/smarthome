import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import { requireAuth } from "../middleware/requireAuth";
import meRouter from "./me";
import devicesRouter from "./devices";
import dataRouter from "./data";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";
import rulesRouter from "./rules";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// Protect everything after this point by default.
router.use(requireAuth);

router.use(meRouter);
router.use(devicesRouter);
router.use(dataRouter);
router.use(settingsRouter);
router.use(notificationsRouter);
router.use(rulesRouter);

export default router;
