export type ServiceDefinition = {
  id: string;
  category: string;
  name: string;
  durationMinutes: number;
  durationLabel: string;
  priceLabel: string;
  professionalKey: "sarai" | "yeroha" | "nurme";
  isActive: boolean;
  sortOrder: number;
};

export const DEFAULT_SERVICE_DEFINITIONS: ServiceDefinition[] = [
  { id: "manicure-semi-refuerzo", category: "Manicura y uñas", name: "Semipermanente con refuerzo", durationMinutes: 60, durationLabel: "1 h aprox.", priceLabel: "25–28 €", professionalKey: "nurme", isActive: true, sortOrder: 10 },
  { id: "manicure-tradicional", category: "Manicura y uñas", name: "Manicura tradicional", durationMinutes: 30, durationLabel: "30 min aprox.", priceLabel: "20 €", professionalKey: "nurme", isActive: true, sortOrder: 20 },
  { id: "manicure-softgel", category: "Manicura y uñas", name: "Softgel (S, M, L o XL)", durationMinutes: 120, durationLabel: "1 h 30 min–2 h", priceLabel: "Desde 25 €", professionalKey: "nurme", isActive: true, sortOrder: 30 },
  { id: "manicure-acrilico", category: "Manicura y uñas", name: "Acrílico (S, M, L o XL)", durationMinutes: 120, durationLabel: "2 h aprox.", priceLabel: "Desde 35 €", professionalKey: "nurme", isActive: true, sortOrder: 40 },
  { id: "manicure-relleno", category: "Manicura y uñas", name: "Relleno de Softgel o acrílico", durationMinutes: 90, durationLabel: "1 h 30 min aprox.", priceLabel: "Desde 30 €", professionalKey: "nurme", isActive: true, sortOrder: 50 },
  { id: "manicure-retiro", category: "Manicura y uñas", name: "Retiro del sistema", durationMinutes: 30, durationLabel: "30 min aprox.", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 60 },
  { id: "manicure-reparacion", category: "Manicura y uñas", name: "Reparación de uñas", durationMinutes: 15, durationLabel: "15 min aprox.", priceLabel: "2 € por uña", professionalKey: "nurme", isActive: true, sortOrder: 70 },
  { id: "manicure-decoracion", category: "Manicura y uñas", name: "Decoración con pedrería", durationMinutes: 15, durationLabel: "Según diseño", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 75 },
  { id: "pedicura-semi", category: "Pedicura", name: "Pedicura semipermanente", durationMinutes: 60, durationLabel: "1 h aprox.", priceLabel: "25 €", professionalKey: "nurme", isActive: true, sortOrder: 80 },
  { id: "pedicura-tradicional", category: "Pedicura", name: "Pedicura tradicional", durationMinutes: 60, durationLabel: "1 h aprox.", priceLabel: "20 €", professionalKey: "nurme", isActive: true, sortOrder: 90 },
  { id: "facial-higiene", category: "Faciales", name: "Higiene facial profunda", durationMinutes: 60, durationLabel: "1 h aprox.", priceLabel: "40 €", professionalKey: "nurme", isActive: true, sortOrder: 100 },
  { id: "facial-tratamiento", category: "Faciales", name: "Limpieza facial + tratamiento", durationMinutes: 60, durationLabel: "45 min–1 h", priceLabel: "50 €", professionalKey: "nurme", isActive: true, sortOrder: 105 },
  { id: "facial-dermapen", category: "Faciales", name: "Dermapen facial", durationMinutes: 45, durationLabel: "45 min aprox.", priceLabel: "40 €", professionalKey: "nurme", isActive: true, sortOrder: 110 },
  { id: "facial-dermapen-capilar", category: "Faciales", name: "Dermapen capilar", durationMinutes: 30, durationLabel: "30 min aprox.", priceLabel: "40 €", professionalKey: "nurme", isActive: true, sortOrder: 120 },
  { id: "facial-dermapen-ojeras-labios", category: "Faciales", name: "Dermapen de ojeras", durationMinutes: 30, durationLabel: "30 min aprox.", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 130 },
  { id: "facial-dermapen-labios", category: "Faciales", name: "Dermapen de labios", durationMinutes: 30, durationLabel: "30 min aprox.", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 135 },
  { id: "facial-radiofrecuencia", category: "Faciales", name: "Radiofrecuencia facial", durationMinutes: 45, durationLabel: "45 min aprox.", priceLabel: "40 €", professionalKey: "nurme", isActive: true, sortOrder: 140 },
  { id: "cejas-pinza", category: "Cejas y pestañas", name: "Depilación de cejas con pinza", durationMinutes: 20, durationLabel: "20 min aprox.", priceLabel: "5 €", professionalKey: "nurme", isActive: true, sortOrder: 145 },
  { id: "cejas-hilo", category: "Cejas y pestañas", name: "Depilación de cejas con hilo", durationMinutes: 15, durationLabel: "15 min aprox.", priceLabel: "10 €", professionalKey: "nurme", isActive: true, sortOrder: 150 },
  { id: "pestanas-clasicas", category: "Cejas y pestañas", name: "Extensiones clásicas", durationMinutes: 120, durationLabel: "2 h aprox.", priceLabel: "50 €", professionalKey: "nurme", isActive: true, sortOrder: 160 },
  { id: "pestanas-3d", category: "Cejas y pestañas", name: "Extensiones 3D", durationMinutes: 120, durationLabel: "2 h aprox.", priceLabel: "Desde 50 €", professionalKey: "nurme", isActive: true, sortOrder: 170 },
  { id: "pestanas-4d", category: "Cejas y pestañas", name: "Extensiones 4D o superior", durationMinutes: 120, durationLabel: "2 h aprox.", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 180 },
  { id: "pestanas-lifting-tinte", category: "Cejas y pestañas", name: "Lifting de pestañas con tinte", durationMinutes: 45, durationLabel: "45 min aprox.", priceLabel: "25 €", professionalKey: "nurme", isActive: true, sortOrder: 190 },
  { id: "cejas-laminacion", category: "Cejas y pestañas", name: "Laminación de cejas", durationMinutes: 45, durationLabel: "45 min aprox.", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 200 },
  { id: "cejas-henna", category: "Cejas y pestañas", name: "Henna de cejas", durationMinutes: 45, durationLabel: "45 min aprox.", priceLabel: "A consultar", professionalKey: "nurme", isActive: true, sortOrder: 210 },
  { id: "micro-cejas", category: "Micropigmentación", name: "Micropigmentación de cejas", durationMinutes: 120, durationLabel: "2 h aprox.", priceLabel: "A consultar", professionalKey: "sarai", isActive: true, sortOrder: 220 },
  { id: "micro-labios", category: "Micropigmentación", name: "Micropigmentación de labios", durationMinutes: 120, durationLabel: "2 h aprox.", priceLabel: "A consultar", professionalKey: "sarai", isActive: true, sortOrder: 230 },
  { id: "micro-estrias", category: "Micropigmentación", name: "Micropuntura de estrías", durationMinutes: 90, durationLabel: "Desde 1 h", priceLabel: "A consultar", professionalKey: "sarai", isActive: true, sortOrder: 240 },
  { id: "tatuaje-fine-line", category: "Tatuajes", name: "Tatuaje fine line", durationMinutes: 120, durationLabel: "Tiempo a consultar", priceLabel: "A consultar", professionalKey: "yeroha", isActive: true, sortOrder: 250 },
  { id: "tatuaje-personalizado", category: "Tatuajes", name: "Tatuaje personalizado", durationMinutes: 180, durationLabel: "Tiempo a consultar", priceLabel: "A consultar", professionalKey: "yeroha", isActive: true, sortOrder: 260 },
];

export function formatServiceDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}
