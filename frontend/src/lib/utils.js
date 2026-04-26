/**
 * Utility: cn() — Merge Tailwind classes conditionally (shadcn pattern).
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
