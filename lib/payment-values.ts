export const paymentMethods = ["cash", "card", "bizum", "transfer"] as const;
export const paymentStatuses = ["paid", "pending"] as const;

export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export function moneyToCents(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, decimals = ""] = normalized.split(".");
  return Number(euros) * 100 + Number(decimals.padEnd(2, "0"));
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus);
}
