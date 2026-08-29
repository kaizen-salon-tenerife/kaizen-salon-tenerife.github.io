import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
} from "@/lib/staff-auth";
import { supabaseRawRequest, supabaseRequest } from "@/lib/supabase";

type Photo = { object_path: string; content_type: string };

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser(),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) return new Response(null, { status: 401 });
  const { id } = await context.params;
  const rows = await supabaseRequest<Photo[]>(
    `/rest/v1/treatment_photos?id=eq.${encodeURIComponent(id)}&select=object_path,content_type`,
    { accessToken },
  );
  const photo = rows[0];
  if (!photo) return new Response(null, { status: 404 });
  const response = await supabaseRawRequest(
    `/storage/v1/object/authenticated/treatment-photos/${photo.object_path.split("/").map(encodeURIComponent).join("/")}`,
    { accessToken },
  );
  if (!response.ok || !response.body) return new Response(null, { status: 404 });
  return new Response(response.body, {
    headers: {
      "Content-Type": photo.content_type,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
