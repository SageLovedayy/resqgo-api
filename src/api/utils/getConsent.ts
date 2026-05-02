import { IConsentRecord } from "../models/ConsentRecord.js";

export function hasActivePublicListingConsent(consents: IConsentRecord[]) {
  return consents.some(
    (c) => c.consentType === "PUBLIC_LISTING" && c.revokedAt === null,
  );
}
