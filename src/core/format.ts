import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const USDT_IDR_RATE = 16500;

export function formatIDR(valueUSDT: number) {
  const inIDR = valueUSDT * USDT_IDR_RATE;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(inIDR);
}

export function formatCurrency(value: number) {
  return formatIDR(value);
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}
