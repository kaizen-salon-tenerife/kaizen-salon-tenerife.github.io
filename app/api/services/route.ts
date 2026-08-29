import {
  mapService,
  type SupabaseService,
} from "@/lib/service-catalog";
import { supabaseRequest } from "@/lib/supabase";

export async function GET() {
  const rows = await supabaseRequest<SupabaseService[]>(
    "/rest/v1/services?is_active=eq.true&select=*&order=sort_order.asc",
  );
  return Response.json({ services: rows.map(mapService) });
}
