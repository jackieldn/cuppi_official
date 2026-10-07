// Sends one transactional email through Brevo's REST API.
// https://developers.brevo.com/reference/sendtransacemail
//
// This replaces the @getbrevo/brevo SDK, which pulled in the abandoned
// `request` library (critical advisories) for what is a single HTTP call.

export type BrevoAddress = { email: string; name?: string };

export type BrevoEmail = {
  sender: BrevoAddress;
  to: BrevoAddress[];
  replyTo?: BrevoAddress;
  subject: string;
  htmlContent: string;
};

export class BrevoError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'BrevoError';
  }
}

export async function sendBrevoEmail(
  apiKey: string,
  email: BrevoEmail,
  // Overridable so tests can point at a local fake instead of the real API.
  { baseUrl = 'https://api.brevo.com', timeoutMs = 10_000 }: { baseUrl?: string; timeoutMs?: number } = {},
): Promise<void> {
  const response = await fetch(`${baseUrl}/v3/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(email),
    // Don't leave a visitor waiting on a hung connection.
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (response.ok) return; // 201 Created, body is { messageId }

  // Errors look like { code, message }. Never include the API key or the
  // email body in what we throw.
  let code: string | undefined;
  let message = response.statusText;
  try {
    const body = (await response.json()) as { code?: string; message?: string };
    code = body.code;
    if (body.message) message = body.message;
  } catch {
    // Non-JSON error body; keep the status text.
  }
  throw new BrevoError(response.status, code, `Brevo responded ${response.status}: ${message}`);
}
