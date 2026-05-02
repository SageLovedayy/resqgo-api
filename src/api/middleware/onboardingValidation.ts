import { body } from "express-validator";

const onboardingValidation = [
  body("bio").isString().notEmpty().withMessage("Bio is required"),
  body("headline").isString().notEmpty().withMessage("Bio is required"),
  body("country").isString().notEmpty().withMessage("Country is required"),
  body("city").isString().notEmpty().withMessage("City is required"),

  // Optional arrays, but if present must be arrays of strings
  body("languages")
    .optional()
    .isArray()
    .withMessage("Languages must be an array")
    .bail()
    .custom((arr) => arr.every((l: any) => typeof l === "string"))
    .withMessage("Each language must be a string"),

  body("specialties")
    .optional()
    .isArray()
    .withMessage("Specialties must be an array")
    .bail()
    .custom((arr) => arr.every((s: any) => typeof s === "string"))
    .withMessage("Each specialty must be a string"),

  body("subSpecialties")
    .optional()
    .isArray()
    .withMessage("Sub-specialties must be an array")
    .bail()
    .custom((arr) => arr.every((s: any) => typeof s === "string"))
    .withMessage("Each sub-specialty must be a string"),

  body("keywords")
    .optional()
    .isArray()
    .withMessage("Keywords must be an array")
    .bail()
    .custom((arr) => arr.every((k: any) => typeof k === "string"))
    .withMessage("Each keyword must be a string"),

  // Consents must be a non-empty array
  body("consents")
    .isArray({ min: 1 })
    .withMessage("Consents are required")
    .bail()
    .custom((arr) =>
      arr.every(
        (c: any) =>
          typeof c.consentType === "string" &&
          typeof c.consentVersion === "string" &&
          typeof c.consentTextSnapshot === "string" &&
          (c.scopes === undefined ||
            (Array.isArray(c.scopes) &&
              c.scopes.every(
                (s: any) =>
                  typeof s.scopeKey === "string" &&
                  typeof s.granted === "boolean",
              ))),
      ),
    )
    .withMessage(
      "Each consent must have consentType, consentVersion, consentTextSnapshot, and optional scopes with scopeKey and granted",
    ),
];

export default onboardingValidation;
