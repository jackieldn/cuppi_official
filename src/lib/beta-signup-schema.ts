import { z } from 'zod';

export const BetaSignupInputSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).describe('The email address of the user signing up.'),
  interestedFeatures: z.array(z.string()).refine(value => value.length > 0, {
    message: "Please select at least one feature.",
  }).describe('A list of features the user is interested in.'),
});


export type SignupFormValues = z.infer<typeof BetaSignupInputSchema>;
