import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui-style class merger. Used by every component variant.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
