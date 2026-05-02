import { Router } from "express";
import { getNearbyProviders } from "../../controllers/provider.controller.js";

const router = Router();

//api/v1/providers/nearby?lng=3.349149&lat=6.605874&radius=5000&service=autoRepair
router.get("/nearby", getNearbyProviders);

export default router;
