import { Router, type IRouter } from "express";
import healthRouter from "./health";
import memeRouter from "./meme/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/meme", memeRouter);

export default router;
