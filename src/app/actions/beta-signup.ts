'use server';

import { firestore } from '@/firebase/server';
import { BetaSignupInputSchema, SignupFormValues } from '@/lib/beta-signup-schema';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitBetaSignup(data: SignupFormValues, token: string) {
  console.log("Starting submitBetaSignup action...");
  
  // 1. Validate Input
  console.log("Validating input data...");
  const parseResult = BetaSignupInputSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("Input validation failed:", parseResult.error);
    return { success: false, message: "Invalid input data." };
  }

  const { email, interestedFeatures } = parseResult.data;
  const normalizedEmail = email.toLowerCase();
  console.log("Input validation successful for email:", normalizedEmail);

  if (!token) {
    console.error("Missing CAPTCHA token.");
    return { success: false, message: "Missing CAPTCHA token." };
  }

  // 2. Verify reCAPTCHA token
  console.log("Verifying reCAPTCHA token...");
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
    console.log("reCAPTCHA verification result:", captchaValidation);

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
  console.log("Initializing Firebase...");
  try {
    // Check for existing email
    const existingSignup = await firestore.collection("beta_signups")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existingSignup.empty) {
      console.log("Email already exists:", normalizedEmail);
      return {
        success: true,
        message: "Great news! You are already on the list. We will notify you as soon as the beta testing is open. 😊",
      };
    }

    console.log("Firebase initialized. Saving signup data to Firestore...");
    
    const signupData = {
      email: normalizedEmail,
      interestedFeatures,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await firestore.collection("beta_signups").add(signupData);
    console.log("Signup data saved successfully. Document ID:", docRef.id);

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
