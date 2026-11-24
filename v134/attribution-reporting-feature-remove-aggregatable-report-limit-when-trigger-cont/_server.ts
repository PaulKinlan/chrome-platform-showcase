// Co-located server handler for v134/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont.

import { readBoundedText } from "../../lib/request-body.ts";
import { DEMO_BODY_LIMIT, jsonResponse } from "../../lib/feature-servers/http-helpers.ts";

const attributionKeyPiecePattern = /^0[xX][0-9a-fA-F]{1,32}$/;
const attributionHeaderSafeAsciiPattern = /^[\x20-\x7E]*$/;

function attributionCodePointLength(value: string): number {
  return Array.from(value).length;
}

function collectAttributionHeaderStringErrors(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (typeof value === "string") {
    if (!attributionHeaderSafeAsciiPattern.test(value)) {
      errors.push(`${path} must use printable ASCII because this demo emits it as an HTTP header.`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectAttributionHeaderStringErrors(item, `${path}[${index}]`, errors)
    );
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    collectAttributionHeaderStringErrors(item, `${path}.${key}`, errors);
  }
}

function validateAttributionTriggerRegistration(registration: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const triggerData = registration.aggregatable_trigger_data;

  if (!Array.isArray(triggerData) || triggerData.length === 0) {
    errors.push("registration.aggregatable_trigger_data must be a non-empty array.");
  } else {
    triggerData.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`registration.aggregatable_trigger_data[${index}] must be an object.`);
        return;
      }
      const entry = item as Record<string, unknown>;
      const keyPiece = entry.key_piece;
      if (
        typeof keyPiece !== "string" ||
        attributionCodePointLength(keyPiece) < 3 ||
        attributionCodePointLength(keyPiece) > 34 ||
        !attributionKeyPiecePattern.test(keyPiece)
      ) {
        errors.push(
          `registration.aggregatable_trigger_data[${index}].key_piece must be 0x/0X followed by 1-32 ASCII hex digits.`,
        );
      }
      if (
        !Array.isArray(entry.source_keys) ||
        entry.source_keys.some((key) => typeof key !== "string")
      ) {
        errors.push(
          `registration.aggregatable_trigger_data[${index}].source_keys must be an array of strings.`,
        );
      }
    });
  }

  if ("trigger_context_id" in registration) {
    const triggerContext = registration.trigger_context_id;
    if (triggerContext !== null && typeof triggerContext !== "string") {
      errors.push(
        "registration.trigger_context_id must be a string when present, or null to model absence.",
      );
    }
    if (typeof triggerContext === "string" && attributionCodePointLength(triggerContext) > 64) {
      errors.push("registration.trigger_context_id must be 64 code points or fewer.");
    }
  }

  collectAttributionHeaderStringErrors(registration, "registration", errors);
  return [...new Set(errors)];
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  const prefix =
    "/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont/trigger-context-id-builder";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  if (route !== "/register-trigger") return null;

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a trigger registration JSON body." }, { status: 405 });
  }

  const rawTrigger = await readBoundedText(req, DEMO_BODY_LIMIT);
  if (!rawTrigger.ok) return rawTrigger.response;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawTrigger.text) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Expected JSON request body." }, { status: 400 });
  }

  const registration = body.registration;
  if (!registration || typeof registration !== "object" || Array.isArray(registration)) {
    return jsonResponse({ error: "registration must be an object." }, { status: 400 });
  }

  const registrationRecord = registration as Record<string, unknown>;
  const validationErrors = validateAttributionTriggerRegistration(registrationRecord);
  if (validationErrors.length > 0) {
    return jsonResponse({
      error: "Invalid Attribution-Reporting-Register-Trigger registration.",
      validationErrors,
    }, { status: 400 });
  }

  const conversionCount = Math.max(1, Math.min(500, Number(body.conversionCount ?? 1) || 1));
  const triggerContext = registrationRecord.trigger_context_id;
  const hasTriggerContext = typeof triggerContext === "string" && triggerContext.length > 0;
  const legacyLimit = 20;
  const acceptedReports = hasTriggerContext
    ? conversionCount
    : Math.min(conversionCount, legacyLimit);
  const droppedReports = conversionCount - acceptedReports;
  const headerValue = JSON.stringify(registration);
  const headers = new Headers({
    "Attribution-Reporting-Register-Trigger": headerValue,
    "Attribution-Reporting-Eligible": "trigger",
  });

  return jsonResponse({
    registered: true,
    headerName: "Attribution-Reporting-Register-Trigger",
    headerValue,
    eligibleHeader: "Attribution-Reporting-Eligible: trigger",
    triggerContextIdPresent: hasTriggerContext,
    conversionCount,
    acceptedReports,
    droppedReports,
    legacyLimit,
    responsePreview:
      `HTTP/1.1 204 No Content\nAttribution-Reporting-Eligible: trigger\nAttribution-Reporting-Register-Trigger: ${headerValue}`,
  }, { status: 200, headers });
}
