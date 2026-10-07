'use server';

import * as Brevo from '@getbrevo/brevo';
import { supportFormSchema } from '@/lib/support-schema';

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

  // 3. Send email with Brevo
  const { name, email, category, message } = parsed.data;
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SUPPORT_EMAIL_FROM;
  const toEmail = process.env.SUPPORT_EMAIL_TO;

  if (!apiKey || !fromEmail || !toEmail) {
    console.error('Missing Brevo environment variables.');
    return { success: false, message: 'Server is not configured for sending emails.' };
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  // category is one of a fixed list (see support-schema.ts), so it is safe here.
  sendSmtpEmail.subject = `Cuppi Support Request: ${category}`;
  sendSmtpEmail.htmlContent = `
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
  `;
  sendSmtpEmail.sender = { name: 'Cuppi Support Form', email: fromEmail };
  sendSmtpEmail.to = [{ email: toEmail }];
  sendSmtpEmail.replyTo = { email: email, name: name };

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return { success: true, message: 'Your message has been sent successfully!' };
  } catch (error) {
    console.error('Brevo API Error:', error);
    return { success: false, message: 'Failed to send your message. Please try again later.' };
  }
}
