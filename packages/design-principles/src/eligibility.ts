function validElapsedDays(days: number): void {
  if (!Number.isSafeInteger(days) || days < 0)
    throw new Error("invalid elapsed days");
}

export function parcelReturnAllowed(
  elapsedDays: number,
  delivered: boolean,
): boolean {
  validElapsedDays(elapsedDays);
  if (typeof delivered !== "boolean") throw new Error("invalid delivery flag");
  return delivered && elapsedDays <= 30;
}

export function downloadRefundAllowed(
  elapsedDays: number,
  downloaded: boolean,
): boolean {
  validElapsedDays(elapsedDays);
  if (typeof downloaded !== "boolean") throw new Error("invalid download flag");
  return !downloaded && elapsedDays <= 14;
}
