import { Router } from "express";
import {
  getAllProviders,
  getNearbyProviders,
  onboardProvider,
} from "../../controllers/provider.controller.js";
import { auth } from "../../middleware/auth.js";
import providerOnboardingValidation from "../../middleware/validation/onboardingValidation.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = Router();

//api/v1/providers/nearby?lng=3.349149&lat=6.605874&radius=5000&service=autoRepair
router.get("/nearby", getNearbyProviders);
router.get("/all", getAllProviders);

router.post(
  "/onboarding",
  auth,
  providerOnboardingValidation,
  validateRequest,
  onboardProvider,
);

export default router;
