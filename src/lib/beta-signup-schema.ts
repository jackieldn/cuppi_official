import { z } from 'zod';

// The labels the signup form stores. Anything else is rejected server-side.
export const BETA_FEATURES = [
  'Home Feed',
  'Pets Health',
  'Budgets',
  'Birthdays',
  'Receipts scanning',
  'Bin Day reminders',
] as const;

export const BetaSignupInputSchema = z.object({
  email: z.string().trim().max(254, { message: "That email address is too long." }).email({ message: "Please enter a valid email address." }).describe('The email address of the user signing up.'),
  interestedFeatures: z.array(z.enum(BETA_FEATURES)).min(1, {
    message: "Please select at least one feature.",
  }).max(BETA_FEATURES.length).describe('A list of features the user is interested in.'),
});


export type SignupFormValues = z.infer<typeof BetaSignupInputSchema>;
