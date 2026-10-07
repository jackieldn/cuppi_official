import { z } from 'zod';

export const SUPPORT_CATEGORIES = [
  'General Inquiry',
  'Bug Report',
  'Feature Request',
  'Account Issue',
  'Billing',
  'Other',
] as const;

export const SUPPORT_LIMITS = { name: 100, email: 254, message: 5000 } as const;

// Shared by the form (for friendly errors) and the server action (the real
// check; the browser can be bypassed).
export const supportFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(SUPPORT_LIMITS.name, `Name must be ${SUPPORT_LIMITS.name} characters or fewer.`),
  email: z.string().trim().email('Invalid email address.').max(SUPPORT_LIMITS.email, 'That email address is too long.'),
  category: z.enum(SUPPORT_CATEGORIES, { errorMap: () => ({ message: 'Please select a category.' }) }),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(SUPPORT_LIMITS.message, `Message must be ${SUPPORT_LIMITS.message} characters or fewer.`),
});

export type SupportFormValues = z.infer<typeof supportFormSchema>;
