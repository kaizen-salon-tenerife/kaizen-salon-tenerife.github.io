import { isPaymentMethod, isPaymentStatus, moneyToCents } from "@/lib/payment-values";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

type Payment = { id: string; paid_at: string | null };

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser(),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const { id } = await context.params;
  const rows = await supabaseRequest<Payment[]>(
    `/rest/v1/payments?id=eq.${encodeURIComponent(id)}&select=id,paid_at`,
    { accessToken },
  );
  const existing = rows[0];
  if (!existing) {
    return Response.json({ error: "No tienes acceso a ese cobro." }, { status: 404 });
  }
  const payload = (await request.json().catch(() => null)) as {
    amount?: string; discount?: string; method?: string; status?: string; notes?: string;
  } | null;
  const amountCents = moneyToCents(payload?.amount);
  const discountCents = moneyToCents(payload?.discount || "0");
  const method = payload?.method;
  const status = payload?.status;
  if (
    amountCents === null || discountCents === null ||
    !isPaymentMethod(method) || !isPaymentStatus(status)
  ) {
    return Response.json({ error: "Revisa los datos del cobro." }, { status: 400 });
  }
  await supabaseRequest(`/rest/v1/payments?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    accessToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount_cents: amountCents,
      discount_cents: discountCents,
      method,
      status,
      notes: payload?.notes?.trim().slice(0, 400) ?? "",
      paid_at: status === "paid" ? existing.paid_at ?? new Date().toISOString() : null,
    }),
  });
  return Response.json({ ok: true });
}
