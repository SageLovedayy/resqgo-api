import { body } from "express-validator";

const providerOnboardingValidation = [
  body("businessName")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Business name is required"),

  body("phoneNumber")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Phone number is required"),

  body("services")
    .isArray({ min: 1 })
    .withMessage("At least one service is required"),

  body("services.*")
    .isIn(["autoRepair", "towing", "fuelDelivery", "insurance"])
    .withMessage("Invalid service type"),

  body("charges")
    .optional()
    .isObject()
    .withMessage("Charges must be an object"),

  body("charges").custom((charges, { req }) => {
    const services = req.body.services ?? [];

    for (const service of services) {
      if (charges?.[service] === undefined || charges?.[service] === null) {
        throw new Error(`Charge is required for ${service}`);
      }
    }

    return true;
  }),

  body("charges.autoRepair")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Auto repair charge must be a positive number"),

  body("charges.towing")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Towing charge must be a positive number"),

  body("charges.fuelDelivery")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Fuel delivery charge must be a positive number"),

  body("charges.insurance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Insurance charge must be a positive number"),

  body("location.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must contain longitude and latitude"),

  body("location.coordinates.0")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),

  body("location.coordinates.1")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),

  body("locationName.city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("locationName.country")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Country is required"),
];

export default providerOnboardingValidation;
