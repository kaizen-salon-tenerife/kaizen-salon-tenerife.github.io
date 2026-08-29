export function normalizeClientName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

export function comparableClientName(value: string) {
  return normalizeClientName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function normalizeClientPhone(value: string) {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return `${prefix}${trimmed.replace(/\D/g, "")}`.slice(0, 16);
}
