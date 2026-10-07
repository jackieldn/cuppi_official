import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { defineString } from 'firebase-functions/params';

// Define the reCAPTCHA secret as a parameter.
// It will be loaded from the .env file during deployment.
const recaptchaSecret = defineString('RECAPTCHA_SECRET');

admin.initializeApp();
const db = admin.firestore();

export const submitBetaSignup = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  // CORS is handled automatically by { cors: true }
  
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const {email, interestedFeatures, gRecaptchaToken} = req.body;

  if (!email || !interestedFeatures || !gRecaptchaToken) {
    res.status(400).json({success: false, message: "Missing required fields."});
    return;
  }

  // 1. Verify reCAPTCHA token
  try {
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret.value()}&response=${gRecaptchaToken}`, {
      method: "POST",
    });
    const captchaValidation = await response.json() as { success: boolean; 'error-codes'?: string[] };

    if (!captchaValidation.success) {
      console.error("reCAPTCHA verification failed:", captchaValidation["error-codes"]);
      res.status(400).json({
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      });
      return;
    }
  } catch (e) {
    console.error("reCAPTCHA verification request failed:", e);
    res.status(500).json({
      success: false,
      message: "Could not verify reCAPTCHA. Please try again later.",
    });
    return;
  }

  // 2. Save signup data to Firestore
  try {
    const signupData = {
      email,
      interestedFeatures,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("beta_signups").add(signupData);

    res.status(200).json({
      success: true,
      message: "You're on the list! 🎉",
    });
  } catch (error) {
    console.error("Error saving signup to Firestore:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while saving your information. Please try again later.",
    });
  }
});
