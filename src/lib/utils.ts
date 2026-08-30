import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  formatCurrency,
  getRoleFromPosition,
  ROLE_COLORS,
  ROLE_DRAW_STYLES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CURRENCY_LOCALES,
  getPositionLabel,
} from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export constants from types for convenience
export {
  formatCurrency,
  getRoleFromPosition,
  ROLE_COLORS,
  ROLE_DRAW_STYLES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CURRENCY_LOCALES,
  getPositionLabel,
};