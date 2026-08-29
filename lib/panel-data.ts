import { getServiceCatalog } from "@/lib/service-catalog";
import type { StaffUser } from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "professional";
  professional_key: string;
  is_active: boolean;
  must_change_password: boolean;
};
type ClientDbRow = {
  id: string; name: string; phone: string; email: string; notes: string;
  primary_professional_key: string; is_test: boolean; is_blocked: boolean;
  block_reason: string; blocked_at: string | null;
};
type AppointmentDbRow = {
  id: string; client_id: string; booking_request_id: string | null;
  professional_key: string; service_name: string; starts_at: string; ends_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  status_reason: string; completed_at: string | null; notes: string;
  hold_expires_at: string | null;
};
type BookingRow = { id: string; waitlist: boolean };
type TreatmentRow = { id: string; appointment_id: string };
type PaymentDbRow = {
  id: string; appointment_id: string; client_id: string; professional_key: string;
  amount_cents: number; discount_cents: number;
  method: "cash" | "card" | "bizum" | "transfer";
  status: "paid" | "pending"; notes: string; paid_at: string | null; created_at: string;
};
type BlockDbRow = {
  id: string; professional_key: string | null; title: string;
  starts_at: string; ends_at: string; is_all_day: boolean;
};
type NotificationDbRow = {
  id: string; appointment_id: string; kind: "confirmation" | "reminder" | "waitlist";
  slot_key: string; status: "opened" | "sent"; opened_at: string; sent_at: string | null;
};

export async function getPanelData(user: StaffUser, accessToken: string) {
  const request = <T,>(path: string) => supabaseRequest<T>(path, { accessToken });
  const [profiles, clients, appointments, bookings, treatments, payments, blocks, notifications, services] =
    await Promise.all([
      request<ProfileRow[]>("/rest/v1/staff_profiles?select=*&order=display_name.asc"),
      request<ClientDbRow[]>("/rest/v1/clients?select=*&order=name.asc"),
      request<AppointmentDbRow[]>("/rest/v1/appointments?select=*&order=starts_at.asc"),
      request<BookingRow[]>("/rest/v1/booking_requests?select=id,waitlist"),
      request<TreatmentRow[]>("/rest/v1/treatment_records?select=id,appointment_id"),
      request<PaymentDbRow[]>("/rest/v1/payments?select=*&order=created_at.asc"),
      request<BlockDbRow[]>("/rest/v1/schedule_blocks?select=*&order=starts_at.asc"),
      request<NotificationDbRow[]>("/rest/v1/whatsapp_notifications?select=*&order=created_at.asc"),
      getServiceCatalog(accessToken),
    ]);

  const profileNames = new Map(profiles.map((profile) => [profile.professional_key, profile.display_name]));
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const appointmentMap = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
  const treatmentMap = new Map(treatments.map((record) => [record.appointment_id, record.id]));
  const paymentMap = new Map(payments.map((payment) => [payment.appointment_id, payment.id]));

  return {
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      notes: client.notes,
      isTest: client.is_test,
      isBlocked: client.is_blocked,
      blockReason: client.block_reason,
      blockedAt: client.blocked_at,
      professionalId: client.primary_professional_key,
      professionalName: profileNames.get(client.primary_professional_key) ?? client.primary_professional_key,
    })),
    appointments: appointments.map((appointment) => {
      const client = clientMap.get(appointment.client_id);
      const booking = appointment.booking_request_id
        ? bookingMap.get(appointment.booking_request_id)
        : null;
      return {
        id: appointment.id,
        client: client?.name ?? "Clienta",
        clientId: appointment.client_id,
        clientPhone: client?.phone ?? "",
        clientEmail: client?.email ?? "",
        service: appointment.service_name,
        professionalId: appointment.professional_key,
        professional: profileNames.get(appointment.professional_key) ?? appointment.professional_key,
        bookingRequestId: appointment.booking_request_id,
        waitlist: booking?.waitlist ?? null,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
        statusReason: appointment.status_reason,
        completedAt: appointment.completed_at,
        notes: appointment.notes,
        holdExpiresAt: appointment.hold_expires_at,
        treatmentRecordId: treatmentMap.get(appointment.id) ?? null,
        paymentId: paymentMap.get(appointment.id) ?? null,
      };
    }),
    blocks: blocks
      .filter((block) => user.role === "owner" || block.professional_key === null || block.professional_key === user.id)
      .map((block) => ({
        id: block.id,
        professionalId: block.professional_key,
        professional: block.professional_key
          ? profileNames.get(block.professional_key) ?? block.professional_key
          : "Todo el centro",
        title: block.title,
        startsAt: block.starts_at,
        endsAt: block.ends_at,
        isAllDay: block.is_all_day,
      })),
    staff: profiles.map((profile) => ({
      id: profile.professional_key,
      name: profile.display_name,
      email: profile.email,
      role: profile.role === "professional" ? "professional" as const : "owner" as const,
      professionalKey: profile.professional_key,
      mustChangePassword: profile.must_change_password,
      isActive: profile.is_active,
    })),
    services,
    payments: payments.map((payment) => {
      const appointment = appointmentMap.get(payment.appointment_id);
      const client = clientMap.get(payment.client_id);
      return {
        id: payment.id,
        appointmentId: payment.appointment_id,
        client: client?.name ?? "Clienta",
        clientId: payment.client_id,
        service: appointment?.service_name ?? "Tratamiento",
        professionalId: payment.professional_key,
        professional: profileNames.get(payment.professional_key) ?? payment.professional_key,
        startsAt: appointment?.starts_at ?? payment.created_at,
        amountCents: payment.amount_cents,
        discountCents: payment.discount_cents,
        method: payment.method,
        status: payment.status,
        notes: payment.notes,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
      };
    }),
    notifications: notifications.map((notification) => ({
      id: notification.id,
      appointmentId: notification.appointment_id,
      kind: notification.kind,
      slotKey: notification.slot_key,
      status: notification.status,
      openedAt: notification.opened_at,
      sentAt: notification.sent_at,
    })),
  };
}
