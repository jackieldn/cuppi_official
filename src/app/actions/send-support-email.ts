'use server';

import { sendBrevoEmail } from '@/lib/brevo';
import { supportFormSchema } from '@/lib/support-schema';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { consumeRateLimits, requesterSubject } from '@/lib/rate-limit-server';

const RATE_LIMITED_MESSAGE = 'You have sent several messages recently. Please wait a while before sending another.';

// Everything the visitor typed goes into an HTML email, so it must be escaped:
// otherwise they could inject links, images or markup into your inbox.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendSupportEmail(formData: unknown, token: string) {
  // 1. Validate form data
  const parsed = supportFormSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  // 2. Verify reCAPTCHA token
  if (!token) {
    return { success: false, message: "Missing CAPTCHA token." };
  }
  
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not set.");
    return { success: false, message: "Server configuration error regarding security." };
  }

  // 2b. Limit how often one visitor can send. Counted before the CAPTCHA is checked, so
  // a script cannot hammer the check either. If the counters cannot be reached, refuse:
  // an unprotected form is worse than a briefly unavailable one.
  try {
    const visitor = await requesterSubject();
    if (!(await consumeRateLimits([{ scope: 'support-ip', subject: visitor, limit: RATE_LIMITS.support.ip }]))) {
      return { success: false, message: RATE_LIMITED_MESSAGE };
    }
  } catch (e) {
    console.error('Support form rate limit check failed:', e);
    return { success: false, message: 'Failed to send your message. Please try again later.' };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });

    const captchaValidation = await response.json() as { success: boolean; 'error-codes'?: string[] };

    if (!captchaValidation.success) {
      console.error("reCAPTCHA verification failed:", captchaValidation["error-codes"]);
      return {
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      };
    }
  } catch (e) {
    console.error("reCAPTCHA verification request failed:", e);
    return {
      success: false,
      message: "Could not verify CAPTCHA. Please try again later.",
    };
  }

  // 3. Cap the whole site's volume. Counted only after the CAPTCHA passes, so a bot that
  // fails it cannot use up the allowance and lock real people out. This protects the inbox
  // and the email quota from a flood that arrives from many addresses at once.
  try {
    if (!(await consumeRateLimits([{ scope: 'support-site', subject: 'all', limit: RATE_LIMITS.support.site }]))) {
      return { success: false, message: 'We are getting a lot of messages right now. Please try again later.' };
    }
  } catch (e) {
    console.error('Support form rate limit check failed:', e);
    return { success: false, message: 'Failed to send your message. Please try again later.' };
  }

  // 4. Send email with Brevo
  const { name, email, category, message } = parsed.data;
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SUPPORT_EMAIL_FROM;
  const toEmail = process.env.SUPPORT_EMAIL_TO;

  if (!apiKey || !fromEmail || !toEmail) {
    console.error('Missing Brevo environment variables.');
    return { success: false, message: 'Server is not configured for sending emails.' };
  }

  try {
    await sendBrevoEmail(apiKey, {
      sender: { name: 'Cuppi Support Form', email: fromEmail },
      to: [{ email: toEmail }],
      replyTo: { email, name },
      // category is one of a fixed list (see support-schema.ts), so it is safe here.
      subject: `Cuppi Support Request: ${category}`,
      htmlContent: `
    <html>
      <body>
        <h2>New Support Request from Cuppi App</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Category:</strong> ${escapeHtml(category)}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      </body>
    </html>
  `,
    });

    return { success: true, message: 'Your message has been sent successfully!' };
  } catch (error) {
    console.error('Brevo API Error:', error);
    return { success: false, message: 'Failed to send your message. Please try again later.' };
  }
}
