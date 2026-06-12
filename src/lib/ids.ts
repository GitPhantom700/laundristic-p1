import type { GarmentCategory } from './types';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns PREFIX-NN where NN = max existing count for that prefix + 1. */
export function generateCode(
  prefix: GarmentCategory,
  existingCodes: string[],
): string {
  const prefixCodes = existingCodes.filter((c) => c.startsWith(`${prefix}-`));
  const max = prefixCodes.reduce((acc, code) => {
    const n = parseInt(code.split('-')[1], 10);
    return isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}
