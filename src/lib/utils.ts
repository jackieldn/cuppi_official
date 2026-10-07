import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Constructs a URL for a resized image from a Firebase Storage URL.
 * Assumes the 'Resize Images' extension is installed and configured to create
 * images with a suffix (e.g., _600x600).
 * @param originalUrl The original URL of the image in Firebase Storage.
 * @param size The desired size string (e.g., "600x600").
 * @returns The new URL pointing to the resized image.
 */
export function getResizedImageUrl(originalUrl: string, size: string = "600x600"): string {
  // Resized images are not currently generated, so we return the original URL.
  return originalUrl;
}
