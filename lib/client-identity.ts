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

type ClientChoice = { id: string; name: string; phone?: string; email?: string };

export function clientChoiceLabel(client: ClientChoice, clients: ClientChoice[]) {
  if (clients.filter((item) => comparableClientName(item.name) === comparableClientName(client.name)).length < 2) return client.name;
  const contact = client.phone ? `tel. …${client.phone.slice(-4)}` : client.email || "Sin contacto";
  return `${client.name} · ${contact} · ficha ${client.id.slice(-6)}`;
}
