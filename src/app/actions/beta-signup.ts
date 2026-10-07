'use server';

import { firestore } from '@/firebase/server';
import { BetaSignupInputSchema, SignupFormValues } from '@/lib/beta-signup-schema';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitBetaSignup(data: SignupFormValues, token: string) {
  
  // 1. Validate Input
  const parseResult = BetaSignupInputSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("Beta signup: input validation failed.");
    return { success: false, message: "Invalid input data." };
  }

  const { email, interestedFeatures } = parseResult.data;
  const normalizedEmail = email.toLowerCase();

  if (!token) {
    console.error("Missing CAPTCHA token.");
    return { success: false, message: "Missing CAPTCHA token." };
  }

  // 2. Verify reCAPTCHA token
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not set.");
    return { success: false, message: "Server configuration error." };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
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
      message: "Could not verify reCAPTCHA. Please try again later.",
    };
  }

  // 3. Save signup data to Firestore
  try {
    // Check for existing email
    const existingSignup = await firestore.collection("beta_signups")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existingSignup.empty) {
      // Same answer as a new signup, so the form cannot be used to check
      // whether someone's address is on the list.
      return {
        success: true,
        message: "You're on the list! 🎉",
      };
    }

    
    const signupData = {
      email: normalizedEmail,
      interestedFeatures,
      createdAt: FieldValue.serverTimestamp(),
    };

    await firestore.collection("beta_signups").add(signupData);

    return {
      success: true,
      message: "You're on the list! 🎉",
    };
  } catch (error: any) {
    console.error("Error saving signup to Firestore:", error);
    if (error.code) {
        console.error("Error code:", error.code);
    }
    if (error.message) {
        console.error("Error message:", error.message);
    }
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Error: ${error.message || 'Unknown error'}`
      : "An unexpected error occurred while saving your information. Please try again later.";

    return {
      success: false,
      message: errorMessage,
    };
  }
}
