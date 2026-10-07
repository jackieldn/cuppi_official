/**
 * @fileOverview This file defines the Zod schemas and TypeScript types
 * for the `unlockProjectFlow`. This file does not contain any server-side
 * logic and is safe to import in client components.
 */
import { z } from 'zod';

// Define the Project type to match the structure in Firestore
export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  imageUrl: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  featured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  client: z.string().optional(),
  timeframe: z.string().optional(),
  software: z.array(z.string()).optional(),
  overview: z.string().optional(),
  deliveryYear: z.string().optional(),
  deliveryMonth: z.string().optional(),
  privacy: z.object({
    isPasswordProtected: z.boolean(),
    password: z.string().optional(),
  }).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Define the input schema for the flow
export const UnlockProjectInputSchema = z.object({
  projectId: z.string().describe('The ID of the project to unlock.'),
  passwordAttempt: z.string().describe('The password attempt from the user.'),
});
export type UnlockProjectInput = z.infer<typeof UnlockProjectInputSchema>;

// Define the output schema for the flow
export const UnlockProjectOutputSchema = z.object({
  galleryImages: z.array(z.string()),
  videoUrl: z.string(),
});
export type UnlockProjectOutput = z.infer<typeof UnlockProjectOutputSchema>;
