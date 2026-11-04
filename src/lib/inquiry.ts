/**
 * Browser transport for the contact-page inquiry form → Google Apps Script Web App
 * (integrations/google-apps-script/inquiry/Code.gs). Same rules as the verified POC
 * (docs/inquiry/GAS-POC-SETUP.md §5): cors fetch, URLSearchParams body, no custom
 * headers or cookies; only a readable JSON reply with our protocol and request ID counts.
 * An opaque, unreadable or mismatched reply means "result unknown", never success.
 */
export const INQUIRY_PROTOCOL = "bxr-inquiry-v1";

export const INQUIRY_FIELDS = [
  "name", "organization", "jobTitle", "country", "email", "phone", "topic", "interest", "message",
  "language", "sourcePage", "privacyConsent", "privacyVersion",
] as const;
export type InquiryField = (typeof INQUIRY_FIELDS)[number];
export type InquiryPayload = Record<InquiryField, string>;

export interface InquiryReply {
  ok: boolean;
  persisted: boolean;
  duplicate?: boolean;
  code?: string;
  field?: string;
}

/** Only a deployed Apps Script Web App (/exec) is accepted as an endpoint. */
export function endpointUrl(value: string): string {
  const url = new URL(value);
  if (url.origin !== "https://script.google.com" || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) || url.search || url.hash || url.username || url.password) {
    throw new Error("Inquiry endpoint must be an Apps Script https://script.google.com/macros/s/…/exec URL.");
  }
  return url.href;
}

export class UnknownResult extends Error {}

export async function sendInquiry(endpoint: string, requestId: string, payload: InquiryPayload, website = "", fetcher: typeof fetch = fetch): Promise<InquiryReply> {
  const body = new URLSearchParams({ protocol: INQUIRY_PROTOCOL, requestId, website });
  for (const key of INQUIRY_FIELDS) body.set(key, payload[key] ?? "");
  let response: Response;
  try {
    response = await fetcher(endpointUrl(endpoint), {
      method: "POST", mode: "cors", credentials: "omit", redirect: "follow", body,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new UnknownResult(String(error));
  }
  if (!response.ok || response.type === "opaque") throw new UnknownResult(`HTTP ${response.status}`);
  let value: Record<string, unknown>;
  try { value = await response.json(); } catch { throw new UnknownResult("unreadable reply"); }
  if (value.protocol !== INQUIRY_PROTOCOL || value.requestId !== requestId || typeof value.ok !== "boolean" || typeof value.persisted !== "boolean") {
    throw new UnknownResult("unexpected reply");
  }
  return value as unknown as InquiryReply;
}
