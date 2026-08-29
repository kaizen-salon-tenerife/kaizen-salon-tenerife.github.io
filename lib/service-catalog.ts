import { supabaseRequest } from "@/lib/supabase";

export type SupabaseService = {
  id: string;
  category: string;
  name: string;
  duration_minutes: number;
  duration_label: string;
  price_label: string;
  professional_key: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export function mapService(service: SupabaseService) {
  return {
    id: service.id,
    category: service.category,
    name: service.name,
    durationMinutes: service.duration_minutes,
    durationLabel: service.duration_label,
    priceLabel: service.price_label,
    professionalKey: service.professional_key,
    isActive: service.is_active,
    sortOrder: service.sort_order,
    createdAt: service.created_at ?? "",
    updatedAt: service.updated_at ?? "",
  };
}

// Conservado temporalmente mientras disponibilidad y reservas terminan de
// migrarse desde el almacenamiento anterior. El catálogo ya se sembró en
// Supabase mediante la migración inicial.
export async function ensureServiceCatalog() {}

export async function getServiceCatalog(accessToken?: string) {
  const rows = await supabaseRequest<SupabaseService[]>(
    "/rest/v1/services?select=*&order=sort_order.asc",
    { accessToken },
  );
  return rows.map(mapService);
}
