import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import specialsRouter from "./specials";
import reviewsRouter from "./reviews";
import feedbackRouter from "./feedback";
import leadsRouter from "./leads";
import ordersRouter from "./orders";
import statsRouter from "./stats";
import adminAuthRouter from "./admin-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminAuthRouter);
router.use(menuRouter);
router.use(specialsRouter);
router.use(reviewsRouter);
router.use(feedbackRouter);
router.use(leadsRouter);
router.use(ordersRouter);
router.use(statsRouter);

export default router;
