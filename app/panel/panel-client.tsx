"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AgendaWorkspace, {
  type AgendaProfessional,
  type AppointmentRow,
  type ScheduleBlockRow,
} from "./agenda-workspace";

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "professional";
  professionalKey: string;
  mustChangePassword: boolean;
};

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  isTest: boolean;
  isBlocked: boolean;
  blockReason: string;
  blockedAt: string | null;
  professionalId: string;
  professionalName: string;
};

type StaffAccount = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "professional";
  professionalKey: string;
  mustChangePassword: boolean;
  isActive: boolean;
};

type ServiceRow = {
  id: string;
  category: string;
  name: string;
  durationMinutes: number;
  durationLabel: string;
  priceLabel: string;
  professionalKey: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type PaymentRow = {
  id: string;
  appointmentId: string;
  client: string;
  clientId: string;
  service: string;
  professionalId: string;
  professional: string;
  startsAt: string;
  amountCents: number;
  discountCents: number;
  method: "cash" | "card" | "bizum" | "transfer";
  status: "paid" | "pending";
  notes: string;
  paidAt: string | null;
  createdAt: string;
};

type WhatsappNotificationRow = {
  id: string;
  appointmentId: string;
  kind: "confirmation" | "reminder" | "waitlist";
  slotKey: string;
  status: "opened" | "sent";
  openedAt: string;
  sentAt: string | null;
};

type WaitlistOffer = {
  date: string;
  time: string;
};

type AppointmentPrefill = {
  clientId: string;
  professionalId: string;
  serviceName: string;
  date: string;
  duration: number;
  notes: string;
};

type PanelModal =
  | "appointment"
  | "client"
  | "manage"
  | "manageClient"
  | "clientHistory"
  | "block"
  | "completeAppointment"
  | "treatmentRecord"
  | "payment";

type TreatmentRecordView = {
  id: string;
  appointmentId: string;
  client: string;
  service: string;
  professional: string;
  startsAt: string;
  resultNotes: string;
  treatmentDetails: string;
  photoAuthorized: boolean;
  photoDeclineReason: string;
  aftercareProvided: boolean;
  incidentOccurred: boolean;
  incidentNotes: string;
  nextRecommendedDate: string | null;
  createdAt: string;
  photos: Array<{
    id: string;
    kind: "before" | "after";
    url: string;
  }>;
};

const ownerNavigation = ["Resumen", "Agenda", "Clientes", "Servicios", "Equipo", "Cobros", "WhatsApp", "Citas pendientes"];
const professionalNavigation = ["Agenda", "Clientes", "Servicios", "Cobros", "WhatsApp", "Citas pendientes"];
const navIcons: Record<string, string> = {
  Resumen: "⌂",
  Agenda: "□",
  Clientes: "○",
  Servicios: "◫",
  Equipo: "◇",
  Cobros: "€",
  WhatsApp: "✆",
  "Citas pendientes": "◷",
};

export default function PanelClient({
  currentUser,
  initialClients,
  initialAppointments,
  initialScheduleBlocks,
  staffAccounts,
  initialServices,
  initialPayments,
  initialWhatsappNotifications,
}: {
  currentUser: CurrentUser;
  initialClients: ClientRow[];
  initialAppointments: AppointmentRow[];
  initialScheduleBlocks: ScheduleBlockRow[];
  staffAccounts: StaffAccount[];
  initialServices: ServiceRow[];
  initialPayments: PaymentRow[];
  initialWhatsappNotifications: WhatsappNotificationRow[];
}) {
  const isOwner = currentUser.role === "owner";
  const navigation = isOwner ? ownerNavigation : professionalNavigation;
  const serviceStaffAccounts = staffAccounts.filter((staff) => staff.professionalKey !== "adminleon");
  const [view, setView] = useState(isOwner ? "Resumen" : "Agenda");
  const [professional, setProfessional] = useState("Todos");
  const [calendarProfessionalId, setCalendarProfessionalId] = useState(isOwner ? "all" : currentUser.id);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<PanelModal | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [clientBlocked, setClientBlocked] = useState(false);
  const [clientBlockReason, setClientBlockReason] = useState("");
  const [clientPendingDeletion, setClientPendingDeletion] = useState<ClientRow | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    title: string;
    message: string;
    kicker?: string;
    followUp?: AppointmentPrefill;
  } | null>(null);
  const [appointmentPrefill, setAppointmentPrefill] = useState<AppointmentPrefill | null>(null);
  const [allDayBlock, setAllDayBlock] = useState(false);
  const [blockScope, setBlockScope] = useState<"professional" | "center">("professional");
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentRow["status"]>("pending");
  const [photoAuthorization, setPhotoAuthorization] = useState<"authorized" | "declined" | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [incidentOccurred, setIncidentOccurred] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [treatmentRecord, setTreatmentRecord] = useState<TreatmentRecordView | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [paymentAppointment, setPaymentAppointment] = useState<AppointmentRow | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(initialWhatsappNotifications);
  const [whatsappFilter, setWhatsappFilter] = useState<"reminders" | "confirmations" | "waitlist">("reminders");
  const [waitlistOffers, setWaitlistOffers] = useState<Record<string, WaitlistOffer>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [panelOpenedAt] = useState(() => Date.now());

  useEffect(() => {
    const refreshSession = () => {
      fetch("/api/auth/refresh", { method: "POST" })
        .then((response) => {
          if (response.status === 401) window.location.href = "/panel/acceso";
        })
        .catch(() => null);
    };
    const interval = window.setInterval(refreshSession, 45 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const serviceGroups = useMemo(() => {
    return initialServices.reduce<Record<string, ServiceRow[]>>((groups, service) => {
      (groups[service.category] ??= []).push(service);
      return groups;
    }, {});
  }, [initialServices]);

  const agendaProfessionals: AgendaProfessional[] = isOwner
    ? serviceStaffAccounts.filter((staff) => staff.isActive).map((staff) => ({ id: staff.id, name: staff.name, professionalKey: staff.professionalKey }))
    : [{ id: currentUser.id, name: currentUser.name, professionalKey: currentUser.professionalKey }];

  const visibleAppointments = useMemo(() => {
    if (!isOwner || professional === "Todos") return initialAppointments;
    return initialAppointments.filter(
      (appointment) => appointment.professional === professional,
    );
  }, [initialAppointments, isOwner, professional]);

  const pendingWebAppointments = useMemo(() => {
    return initialAppointments
      .filter((appointment) => appointment.bookingRequestId && appointment.status === "pending")
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  }, [initialAppointments]);

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return initialClients;
    return initialClients.filter((client) =>
      `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(term),
    );
  }, [initialClients, search]);

  const selectedClientHistory = useMemo(() => {
    if (!selectedClient) return [];
    return initialAppointments
      .filter((appointment) => appointment.clientId === selectedClient.id)
      .sort(
        (left, right) =>
          new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
      );
  }, [initialAppointments, selectedClient]);

  const completedWithoutPayment = useMemo(
    () => initialAppointments
      .filter((appointment) => appointment.status === "completed" && !appointment.paymentId)
      .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()),
    [initialAppointments],
  );

  const visiblePayments = useMemo(
    () => initialPayments
      .filter((payment) => paymentStatusFilter === "all" || payment.status === paymentStatusFilter)
      .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()),
    [initialPayments, paymentStatusFilter],
  );
  const todayPaymentKey = canaryDateKey(new Date());
  const currentPaymentMonth = todayPaymentKey.slice(0, 7);
  const paidThisMonth = initialPayments.filter(
    (payment) => payment.status === "paid" && payment.paidAt &&
      canaryDateKey(new Date(payment.paidAt)).startsWith(currentPaymentMonth),
  );
  const incomeThisMonth = paidThisMonth.reduce(
    (total, payment) => total + payment.amountCents,
    0,
  );
  const pendingIncome = initialPayments
    .filter((payment) => payment.status === "pending")
    .reduce((total, payment) => total + payment.amountCents, 0);
  const paymentsToday = initialPayments.filter(
    (payment) => payment.status === "paid" && payment.paidAt &&
      canaryDateKey(new Date(payment.paidAt)) === todayPaymentKey,
  ).length;
  const averageTicket = paidThisMonth.length
    ? Math.round(incomeThisMonth / paidThisMonth.length)
    : 0;

  const tomorrowKey = addDateKey(todayPaymentKey, 1);
  const reminderAppointments = initialAppointments.filter(
    (appointment) =>
      appointment.status === "confirmed" &&
      appointment.startsAt.slice(0, 10) === tomorrowKey,
  );
  const confirmationAppointments = initialAppointments.filter(
    (appointment) =>
      appointment.status === "confirmed" &&
      Boolean(appointment.bookingRequestId) &&
      appointment.startsAt.slice(0, 10) >= todayPaymentKey,
  );
  const waitlistAppointments = initialAppointments.filter(
    (appointment) =>
      appointment.status === "confirmed" &&
      appointment.waitlist === true &&
      appointment.startsAt.slice(0, 10) >= todayPaymentKey,
  );
  const reminderPendingCount = reminderAppointments.filter(
    (appointment) => !whatsappWasSent(whatsappNotifications, appointment.id, "reminder"),
  ).length;
  const confirmationPendingCount = confirmationAppointments.filter(
    (appointment) => !whatsappWasSent(whatsappNotifications, appointment.id, "confirmation"),
  ).length;
  const whatsappPendingCount = reminderPendingCount + confirmationPendingCount;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/panel/acceso";
  }

  async function recordWhatsappAction({
    appointment,
    kind,
    slotKey = "",
    message,
    action,
  }: {
    appointment: AppointmentRow;
    kind: WhatsappNotificationRow["kind"];
    slotKey?: string;
    message: string;
    action: "opened" | "sent";
  }) {
    const response = await fetch("/api/whatsapp-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        kind,
        slotKey,
        message,
        action,
      }),
    });
    const result = (await response.json()) as { error?: string; status?: "opened" | "sent" };
    if (!response.ok) {
      setNotice(result.error ?? "No se ha podido guardar el estado del mensaje.");
      return;
    }
    const now = new Date().toISOString();
    setWhatsappNotifications((current) => {
      const existing = current.find(
        (item) => item.appointmentId === appointment.id && item.kind === kind && item.slotKey === slotKey,
      );
      if (existing) {
        return current.map((item) => item === existing ? {
          ...item,
          status: result.status ?? action,
          sentAt: (result.status ?? action) === "sent" ? now : item.sentAt,
        } : item);
      }
      return [...current, {
        id: `local-${appointment.id}-${kind}-${slotKey}`,
        appointmentId: appointment.id,
        kind,
        slotKey,
        status: result.status ?? action,
        openedAt: now,
        sentAt: (result.status ?? action) === "sent" ? now : null,
      }];
    });
    if (action === "sent") setNotice("Mensaje marcado como enviado.");
  }

  async function addClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        notes: form.get("notes"),
        professionalId: form.get("professionalId"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido registrar la clienta.");
      return;
    }
    setNotice("Clienta registrada correctamente.");
    window.setTimeout(() => window.location.reload(), 650);
  }

  async function addAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.get("clientId"),
        professionalId: form.get("professionalId"),
        serviceName: form.get("serviceName"),
        date: form.get("date"),
        time: form.get("time"),
        duration: Number(form.get("duration")),
        notes: form.get("notes"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido crear la cita.");
      return;
    }
    setNotice("Cita añadida correctamente.");
    window.setTimeout(() => window.location.reload(), 650);
  }

  async function updateAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAppointment) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.get("clientId"),
        professionalId: form.get("professionalId"),
        serviceName: form.get("serviceName"),
        date: form.get("date"),
        time: form.get("time"),
        duration: Number(form.get("duration")),
        status: form.get("status"),
        statusReason: form.get("statusReason"),
        notes: form.get("notes"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido modificar la cita.");
      return;
    }
    const savedStatus = String(form.get("status"));
    const clientName = selectedAppointment.client;
    setModal(null);
    setSelectedAppointment(null);
    setConfirmationDialog({
      title: savedStatus === "confirmed" ? "Cita confirmada" : "Cambios guardados",
      message:
        savedStatus === "confirmed"
          ? `La cita de ${clientName} ha sido confirmada y ya está anotada en la agenda.`
          : `Los cambios de la cita de ${clientName} se han guardado correctamente en la agenda.`,
    });
  }

  function closeConfirmationDialog() {
    setConfirmationDialog(null);
    window.location.reload();
  }

  async function addScheduleBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/schedule-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: form.get("professionalId"),
        title: form.get("title"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        allDay: allDayBlock,
        scope: blockScope,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido bloquear el horario.");
      return;
    }
    setNotice("Horario bloqueado correctamente.");
    window.setTimeout(() => window.location.reload(), 650);
  }

  async function deleteScheduleBlock(block: ScheduleBlockRow) {
    if (!block.professionalId && !isOwner) {
      setNotice("Solo Sarai puede modificar los cierres generales del centro.");
      return;
    }
    if (!window.confirm(`¿Eliminar el bloqueo “${block.title}”?`)) return;
    const response = await fetch(`/api/schedule-blocks/${block.id}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setNotice(result.error ?? "No se ha podido eliminar el bloqueo.");
      return;
    }
    window.location.reload();
  }

  async function updateServiceSettings(
    event: React.FormEvent<HTMLFormElement>,
    serviceId: string,
  ) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        durationMinutes: Number(form.get("durationMinutes")),
        priceLabel: form.get("priceLabel"),
        isActive: form.get("isActive") === "true",
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido modificar el servicio.");
      return;
    }
    setNotice("Servicio actualizado correctamente.");
    window.setTimeout(() => window.location.reload(), 500);
  }

  function openAppointment(appointment: AppointmentRow) {
    setSelectedAppointment(appointment);
    setAppointmentStatus(appointment.status);
    setError("");
    setModal("manage");
  }

  function openCompletionForm() {
    if (!selectedAppointment) return;
    setError("");
    setPhotoAuthorization(null);
    setBeforePhoto(null);
    setAfterPhoto(null);
    setIncidentOccurred(false);
    setCompletionSaving(false);
    setModal("completeAppointment");
  }

  async function completeAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAppointment || !photoAuthorization) {
      setError("Indica si la clienta autoriza las fotografías.");
      return;
    }
    setError("");
    setCompletionSaving(true);
    const form = new FormData(event.currentTarget);
    form.set("photoAuthorization", photoAuthorization);
    form.set("aftercareProvided", String(form.get("aftercareProvided") === "on"));
    form.set("incidentOccurred", String(incidentOccurred));
    if (beforePhoto) form.set("beforePhoto", beforePhoto);
    if (afterPhoto) form.set("afterPhoto", afterPhoto);
    const paymentWasPending = form.get("paymentStatus") === "pending";
    const recommendedDate = String(form.get("nextRecommendedDate") ?? "");
    const followUp = recommendedDate
      ? {
          clientId: selectedAppointment.clientId,
          professionalId: selectedAppointment.professionalId,
          serviceName: selectedAppointment.service,
          date: recommendedDate,
          duration: durationMinutes(selectedAppointment.startsAt, selectedAppointment.endsAt),
          notes: "Seguimiento recomendado desde la ficha anterior.",
        }
      : undefined;
    const response = await fetch(`/api/appointments/${selectedAppointment.id}/complete`, {
      method: "POST",
      body: form,
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido guardar la ficha.");
      setCompletionSaving(false);
      return;
    }
    const clientName = selectedAppointment.client;
    setModal(null);
    setSelectedAppointment(null);
    setConfirmationDialog({
      title: "Ficha guardada",
      message: `${paymentWasPending
        ? `La cita de ${clientName} ha finalizado. Su ficha está guardada y el cobro queda señalado como pendiente.`
        : `La cita de ${clientName} ha finalizado. Su ficha y el cobro se guardaron correctamente.`}${recommendedDate
        ? ` La próxima visita está recomendada para el ${formatDateOnly(recommendedDate)}. ¿Quieres programarla ahora?`
        : ""}`,
      followUp,
    });
  }

  function scheduleRecommendedAppointment() {
    const followUp = confirmationDialog?.followUp;
    if (!followUp) return;
    setAppointmentPrefill(followUp);
    setConfirmationDialog(null);
    setError("");
    setModal("appointment");
  }

  async function openTreatmentRecord(recordId: string) {
    setError("");
    setTreatmentRecord(null);
    setRecordLoading(true);
    setModal("treatmentRecord");
    const response = await fetch(`/api/treatment-records/${recordId}`);
    const result = (await response.json()) as {
      error?: string;
      record?: TreatmentRecordView;
    };
    if (!response.ok || !result.record) {
      setError(result.error ?? "No se ha podido abrir la ficha.");
      setRecordLoading(false);
      return;
    }
    setTreatmentRecord(result.record);
    setRecordLoading(false);
  }

  function openPayment(payment: PaymentRow) {
    setSelectedPayment(payment);
    setPaymentAppointment(null);
    setPaymentSaving(false);
    setError("");
    setModal("payment");
  }

  function openPaymentForAppointment(appointment: AppointmentRow) {
    setSelectedPayment(null);
    setPaymentAppointment(appointment);
    setPaymentSaving(false);
    setError("");
    setModal("payment");
  }

  async function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const appointmentId = selectedPayment?.appointmentId ?? paymentAppointment?.id;
    if (!appointmentId) return;
    setPaymentSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      appointmentId,
      amount: form.get("amount"),
      discount: form.get("discount"),
      method: form.get("method"),
      status: form.get("status"),
      notes: form.get("notes"),
    };
    const response = await fetch(
      selectedPayment ? `/api/payments/${selectedPayment.id}` : "/api/payments",
      {
        method: selectedPayment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido guardar el cobro.");
      setPaymentSaving(false);
      return;
    }
    const clientName = selectedPayment?.client ?? paymentAppointment?.client ?? "la clienta";
    const isPaid = form.get("status") === "paid";
    setModal(null);
    setSelectedPayment(null);
    setPaymentAppointment(null);
    setConfirmationDialog({
      kicker: "GESTIÓN DE COBROS",
      title: isPaid ? "Cobro guardado" : "Pago pendiente guardado",
      message: isPaid
        ? `El cobro de ${clientName} se ha registrado correctamente.`
        : `El importe de ${clientName} queda señalado como pendiente de pago.`,
    });
  }

  function openClient(client: ClientRow) {
    setSelectedClient(client);
    setClientBlocked(client.isBlocked);
    setClientBlockReason(client.blockReason);
    setError("");
    setModal("manageClient");
  }

  function openClientHistory(client: ClientRow) {
    setSelectedClient(client);
    setError("");
    setModal("clientHistory");
  }

  async function updateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/clients/${selectedClient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        notes: form.get("notes"),
        professionalId: form.get("professionalId"),
        isBlocked: clientBlocked,
        blockReason: clientBlockReason,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido modificar la ficha.");
      return;
    }
    const wasBlocked = selectedClient.isBlocked;
    const clientName = String(form.get("name"));
    setModal(null);
    setSelectedClient(null);
    setConfirmationDialog({
      kicker: "GESTIÓN DE CLIENTES",
      title: clientBlocked
        ? "Cliente bloqueado"
        : wasBlocked
          ? "Cliente desbloqueado"
          : "Cliente actualizado",
      message: clientBlocked
        ? `La ficha de ${clientName} ha sido bloqueada. El motivo quedó guardado y no podrá reservar online con esos datos.`
        : `Los datos de ${clientName} se han guardado correctamente.`,
    });
  }

  async function deleteClient() {
    if (!clientPendingDeletion) return;
    setError("");
    const clientName = clientPendingDeletion.name;
    const response = await fetch(`/api/clients/${clientPendingDeletion.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No se ha podido eliminar la ficha.");
      return;
    }
    setClientPendingDeletion(null);
    setModal(null);
    setSelectedClient(null);
    setConfirmationDialog({
      kicker: "GESTIÓN DE CLIENTES",
      title: "Cliente eliminado",
      message: `La ficha de ${clientName} y sus citas asociadas se han eliminado correctamente.`,
    });
  }

  return (
    <main className="panel-page">
      <aside className="panel-sidebar">
        <Link className="panel-brand" href="/">
          <Image src="/logo-kaizen.png" alt="Kaizen" width={54} height={54} unoptimized />
          <span><strong>Kaizen</strong><small>Panel interno</small></span>
        </Link>
        <nav aria-label="Secciones del panel">
          {navigation.map((item) => (
            <button
              type="button"
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
              key={item}
            >
              <span>{navIcons[item]}</span>{item}
              {item === "Citas pendientes" && pendingWebAppointments.length > 0 && (
                <b className="pending-nav-count" aria-label={`${pendingWebAppointments.length} citas pendientes`}>
                  {pendingWebAppointments.length}
                </b>
              )}
              {item === "WhatsApp" && whatsappPendingCount > 0 && (
                <b className="pending-nav-count whatsapp-nav-count" aria-label={`${whatsappPendingCount} mensajes pendientes`}>
                  {whatsappPendingCount}
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="panel-user">
          <div>{currentUser.name.slice(0, 1)}</div>
          <span>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.professionalKey === "adminleon" ? "Administrador" : isOwner ? "Propietaria" : "Profesional"}</small>
          </span>
          <button type="button" onClick={logout} aria-label="Cerrar sesión">↪</button>
        </div>
      </aside>

      <section className="panel-main">
        <header className="panel-topbar">
          <div>
            <p>{formatLongDate(new Date())}</p>
            <h1>{view}</h1>
          </div>
          <div className="panel-top-actions">
            <span className="secure-pill">● Acceso seguro</span>
            <button className="panel-secondary" type="button" onClick={() => { setModal("client"); setError(""); }}>
              + Nueva clienta
            </button>
            <button className="panel-primary" type="button" onClick={() => { setAppointmentPrefill(null); setModal("appointment"); setError(""); }} disabled={!initialClients.length}>
              + Nueva cita
            </button>
          </div>
        </header>

        {notice && <div className="panel-notice" role="status">✓ {notice}</div>}

        {view === "Resumen" && isOwner && (
          <>
            <section className="metric-grid">
              <article><small>Próximas citas</small><strong>{futureAppointments(initialAppointments).length}</strong><span>Registradas en el sistema</span></article>
              <article><small>Clientas</small><strong>{initialClients.length}</strong><span>{initialClients.some((client) => client.isTest) ? "Incluye 1 ficha de prueba" : "Fichas reales"}</span></article>
              <article><small>Equipo</small><strong>{serviceStaffAccounts.filter((staff) => staff.isActive).length}</strong><span>Profesionales activas</span></article>
              <article className="pending-metric" role="button" tabIndex={0} onClick={() => setView("Citas pendientes")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setView("Citas pendientes"); }}><small>Solicitudes web</small><strong>{pendingWebAppointments.length}</strong><span>Ver citas pendientes →</span></article>
            </section>
            <section className="panel-columns">
              <AgendaCard
                appointments={futureAppointments(visibleAppointments).slice(0, 4)}
                isOwner={isOwner}
                professional={professional}
                setProfessional={setProfessional}
                professionals={serviceStaffAccounts.map((staff) => staff.name)}
                onShowAll={() => setView("Agenda")}
              />
              <aside className="panel-side-stack">
                <article className="panel-card security-card">
                  <small>Configuración inicial</small>
                  <h2>Accesos del equipo</h2>
                  <p>Sarai puede ver todo. Yeroha y Nurme solamente acceden a sus propias clientas y citas.</p>
                  <button type="button" onClick={() => setView("Equipo")}>Revisar cuentas →</button>
                </article>
                <article className="panel-card match-card">
                  <small>Base preparada</small>
                  <h2>Datos persistentes</h2>
                  <p>Las nuevas clientas y citas quedan guardadas y seguirán disponibles al volver a entrar.</p>
                </article>
              </aside>
            </section>
          </>
        )}

        {view === "Agenda" && (
          <AgendaWorkspace
            appointments={initialAppointments}
            blocks={initialScheduleBlocks}
            isOwner={isOwner}
            professionals={agendaProfessionals}
            selectedProfessionalId={calendarProfessionalId}
            setSelectedProfessionalId={setCalendarProfessionalId}
            onSelectAppointment={openAppointment}
            onDeleteBlock={deleteScheduleBlock}
            onNewBlock={() => { setAllDayBlock(false); setBlockScope("professional"); setError(""); setModal("block"); }}
            onCloseDay={() => { setAllDayBlock(true); setBlockScope("center"); setError(""); setModal("block"); }}
          />
        )}

        {view === "Citas pendientes" && (
          <section className="panel-card panel-full-card pending-bookings-card">
            <div className="panel-card-heading pending-bookings-heading">
              <div>
                <small>Solicitudes recibidas desde la web</small>
                <h2>Citas pendientes de confirmar</h2>
                <p>
                  Revisa los datos de cada reserva. Al confirmar una cita quedará anotada definitivamente en la agenda.
                </p>
              </div>
              <span className="pending-bookings-total">
                {pendingWebAppointments.length} {pendingWebAppointments.length === 1 ? "pendiente" : "pendientes"}
              </span>
            </div>

            <div className="pending-bookings-list">
              {pendingWebAppointments.map((appointment) => (
                <article className="pending-booking-row" key={appointment.id}>
                  <div className="pending-booking-client">
                    <span className="pending-booking-avatar">{initials(appointment.client)}</span>
                    <div>
                      <b>Solicitud web</b>
                      <strong>{appointment.client}</strong>
                      <small>{appointment.clientPhone || appointment.clientEmail || "Sin contacto"}</small>
                    </div>
                  </div>
                  <div className="pending-booking-detail">
                    <small>Servicio</small>
                    <strong>{appointment.service}</strong>
                    <span>{durationLabel(appointment.startsAt, appointment.endsAt)}</span>
                  </div>
                  <div className="pending-booking-detail">
                    <small>Profesional</small>
                    <strong>{appointment.professional}</strong>
                    <span>Asignada</span>
                  </div>
                  <div className="pending-booking-detail">
                    <small>Fecha y hora</small>
                    <strong>{formatFullDate(appointment.startsAt)}</strong>
                    <span>{formatTime(appointment.startsAt)} h</span>
                  </div>
                  <div className="pending-booking-actions">
                    {appointment.holdExpiresAt && (
                      <span className={new Date(appointment.holdExpiresAt).getTime() <= panelOpenedAt ? "expired" : ""}>
                        {holdLabel(appointment.holdExpiresAt, panelOpenedAt)}
                      </span>
                    )}
                    <button type="button" onClick={() => openAppointment(appointment)}>
                      Revisar y confirmar →
                    </button>
                  </div>
                </article>
              ))}
              {!pendingWebAppointments.length && (
                <div className="pending-bookings-empty">
                  <span>✓</span>
                  <h3>Todo está revisado</h3>
                  <p>No hay solicitudes web pendientes de confirmar.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {view === "WhatsApp" && (
          <section className="panel-card panel-full-card whatsapp-center-card">
            <div className="panel-card-heading whatsapp-center-heading">
              <div>
                <small>Mensajes preparados · sin API ni cuotas</small>
                <h2>Notificaciones por WhatsApp</h2>
                <p>
                  El panel prepara el texto y abre WhatsApp Business. Solo tendrás que comprobarlo y pulsar Enviar.
                </p>
              </div>
              <span className="whatsapp-free-badge">0 € por mensaje</span>
            </div>

            <section className="whatsapp-summary" aria-label="Resumen de notificaciones">
              <button className={whatsappFilter === "reminders" ? "active" : ""} type="button" onClick={() => setWhatsappFilter("reminders")}>
                <span className="whatsapp-summary-icon">24h</span>
                <small>Recordatorios de mañana</small>
                <strong>{reminderAppointments.length}</strong>
                <b>{reminderPendingCount ? `${reminderPendingCount} por enviar` : "Todo al día"}</b>
              </button>
              <button className={whatsappFilter === "confirmations" ? "active" : ""} type="button" onClick={() => setWhatsappFilter("confirmations")}>
                <span className="whatsapp-summary-icon">✓</span>
                <small>Confirmaciones web</small>
                <strong>{confirmationAppointments.length}</strong>
                <b>{confirmationPendingCount ? `${confirmationPendingCount} por enviar` : "Todo al día"}</b>
              </button>
              <button className={whatsappFilter === "waitlist" ? "active" : ""} type="button" onClick={() => setWhatsappFilter("waitlist")}>
                <span className="whatsapp-summary-icon">↗</span>
                <small>Lista de espera</small>
                <strong>{waitlistAppointments.length}</strong>
                <b>Proponer un hueco</b>
              </button>
            </section>

            <div className="whatsapp-workspace">
              {whatsappFilter === "reminders" && (
                <>
                  <header className="whatsapp-list-heading">
                    <div><small>Se muestran automáticamente</small><h3>Citas de mañana</h3></div>
                    <p>El mensaje incluye la hora, el servicio y las opciones Confirmar, Cancelar o Reprogramar.</p>
                  </header>
                  <div className="whatsapp-message-list">
                    {reminderAppointments.map((appointment) => {
                      const message = reminderWhatsappMessage(appointment);
                      return (
                        <article className="whatsapp-message-row" key={appointment.id}>
                          <WhatsappClientSummary appointment={appointment} label="Recordatorio 24 horas" />
                          <div className="whatsapp-message-preview"><small>Mensaje preparado</small><p>{message}</p></div>
                          <WhatsappMessageActions
                            appointment={appointment}
                            kind="reminder"
                            message={message}
                            notifications={whatsappNotifications}
                            onAction={(action) => recordWhatsappAction({ appointment, kind: "reminder", message, action })}
                          />
                        </article>
                      );
                    })}
                    {!reminderAppointments.length && <WhatsappEmpty title="No hay recordatorios para mañana" text="Cuando haya una cita confirmada para el día siguiente aparecerá aquí automáticamente." />}
                  </div>
                </>
              )}

              {whatsappFilter === "confirmations" && (
                <>
                  <header className="whatsapp-list-heading">
                    <div><small>Reservas confirmadas en la web</small><h3>Confirmar por WhatsApp</h3></div>
                    <p>Un mensaje de bienvenida da tranquilidad a la clienta y deja por escrito la fecha de su cita.</p>
                  </header>
                  <div className="whatsapp-message-list">
                    {confirmationAppointments.map((appointment) => {
                      const message = confirmationWhatsappMessage(appointment);
                      return (
                        <article className="whatsapp-message-row" key={appointment.id}>
                          <WhatsappClientSummary appointment={appointment} label="Nueva reserva web" />
                          <div className="whatsapp-message-preview"><small>Mensaje preparado</small><p>{message}</p></div>
                          <WhatsappMessageActions
                            appointment={appointment}
                            kind="confirmation"
                            message={message}
                            notifications={whatsappNotifications}
                            onAction={(action) => recordWhatsappAction({ appointment, kind: "confirmation", message, action })}
                          />
                        </article>
                      );
                    })}
                    {!confirmationAppointments.length && <WhatsappEmpty title="No hay reservas web próximas" text="Las nuevas citas confirmadas desde la página aparecerán aquí." />}
                  </div>
                </>
              )}

              {whatsappFilter === "waitlist" && (
                <>
                  <header className="whatsapp-list-heading">
                    <div><small>Solo clientas que marcaron la opción</small><h3>Avisar de un hueco libre</h3></div>
                    <p>Indica el nuevo día y la hora. El mensaje avisará de que el hueco se guarda durante una hora.</p>
                  </header>
                  <div className="whatsapp-message-list">
                    {waitlistAppointments.map((appointment) => {
                      const offer = waitlistOffers[appointment.id] ?? { date: "", time: "" };
                      const slotKey = offer.date && offer.time ? `${offer.date}T${offer.time}` : "";
                      const message = slotKey ? waitlistWhatsappMessage(appointment, offer) : "";
                      return (
                        <article className="whatsapp-message-row waitlist-message-row" key={appointment.id}>
                          <WhatsappClientSummary appointment={appointment} label="Acepta un hueco anterior" />
                          <div className="waitlist-offer-fields">
                            <label><span>Nuevo día</span><input type="date" min={todayPaymentKey} max={appointment.startsAt.slice(0, 10)} value={offer.date} onChange={(event) => setWaitlistOffers((current) => ({ ...current, [appointment.id]: { ...offer, date: event.target.value } }))} /></label>
                            <label><span>Hora</span><input type="time" min="09:30" max="18:00" step="900" value={offer.time} onChange={(event) => setWaitlistOffers((current) => ({ ...current, [appointment.id]: { ...offer, time: event.target.value } }))} /></label>
                          </div>
                          <WhatsappMessageActions
                            appointment={appointment}
                            kind="waitlist"
                            slotKey={slotKey}
                            message={message}
                            notifications={whatsappNotifications}
                            onAction={(action) => recordWhatsappAction({ appointment, kind: "waitlist", slotKey, message, action })}
                          />
                        </article>
                      );
                    })}
                    {!waitlistAppointments.length && <WhatsappEmpty title="No hay clientas en lista de espera" text="Solo aparecerán aquí quienes hayan marcado “Avísame si aparece un hueco antes”." />}
                  </div>
                </>
              )}
            </div>

            <aside className="whatsapp-free-note">
              <span>i</span>
              <p><strong>Funcionamiento gratuito:</strong> la web no envía sola ni lee las respuestas. Después de enviarlo, vuelve al panel y pulsa “Marcar como enviado”.</p>
            </aside>
          </section>
        )}

        {view === "Clientes" && (
          <section className="panel-card panel-full-card">
            <div className="panel-card-heading">
              <div><small>{initialClients.length} fichas accesibles</small><h2>Clientes</h2></div>
              <label className="panel-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar clientes" placeholder="Buscar por nombre o teléfono" /></label>
            </div>
            <div className="client-table real-client-table">
              <div className="table-head"><span>Clienta</span><span>Contacto</span><span>Profesional</span><span>Estado</span><span>Acción</span></div>
              {visibleClients.map((client) => (
                <article key={client.id}>
                  <span><b>{initials(client.name)}</b><strong>{client.name}</strong></span>
                  <span>{client.phone || client.email || "Sin contacto"}</span>
                  <span>{client.professionalName}</span>
                  <span>
                    {client.isBlocked ? (
                      <b className="blocked-client-badge">BLOQUEADA</b>
                    ) : client.isTest ? (
                      <b className="test-client-badge">PRUEBA</b>
                    ) : "Activa"}
                  </span>
                  <span className="client-table-actions">
                    <button className="client-history-button" type="button" onClick={() => openClientHistory(client)}>
                      Ver historial
                    </button>
                    <button className="client-edit-button" type="button" onClick={() => openClient(client)}>
                      Modificar
                    </button>
                  </span>
                </article>
              ))}
              {!visibleClients.length && <p className="panel-empty">No hay clientas que coincidan con la búsqueda.</p>}
            </div>
          </section>
        )}

        {view === "Servicios" && (
          <section className="panel-card panel-full-card service-manager-card">
            <div className="panel-card-heading service-manager-heading">
              <div>
                <small>Catálogo y tiempos de agenda</small>
                <h2>Servicios</h2>
                <p>
                  Las duraciones son orientativas y se usan para calcular cuánto
                  tiempo debe reservarse en la agenda.
                </p>
              </div>
              <span className="service-editor-permission">
                {isOwner ? "Puedes modificar precios y tiempos" : "Consulta de servicios"}
              </span>
            </div>
            {error && <p className="modal-form-error" role="alert">{error}</p>}
            <div className="service-manager-groups">
              {Object.entries(serviceGroups).map(([category, categoryServices]) => (
                <section className="service-manager-group" key={category}>
                  <header>
                    <h3>{category}</h3>
                    <span>{categoryServices.length} servicios</span>
                  </header>
                  <div className="service-manager-list">
                    {categoryServices.map((service) => (
                      <form
                        className="service-manager-row"
                        key={service.id}
                        onSubmit={(event) => updateServiceSettings(event, service.id)}
                      >
                        <div>
                          <strong>{service.name}</strong>
                          <small>
                            {professionalLabel(service.professionalKey)} · {service.priceLabel} · {service.durationLabel}
                          </small>
                        </div>
                        {isOwner ? (
                          <>
                            <label>
                              <span>Precio mostrado</span>
                              <input name="priceLabel" defaultValue={service.priceLabel} maxLength={40} required />
                            </label>
                            <label>
                              <span>Duración</span>
                              <select name="durationMinutes" defaultValue={String(service.durationMinutes)}>
                                {durationOptions()}
                              </select>
                            </label>
                            <label>
                              <span>Reservas</span>
                              <select name="isActive" defaultValue={service.isActive ? "true" : "false"}>
                                <option value="true">Disponible</option>
                                <option value="false">Oculto</option>
                              </select>
                            </label>
                            <button type="submit">Guardar</button>
                          </>
                        ) : (
                          <b>{service.durationLabel || durationText(service.durationMinutes)}</b>
                        )}
                      </form>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {view === "Equipo" && isOwner && (
          <section className="panel-card panel-full-card">
            <div className="panel-card-heading"><div><small>Permisos internos</small><h2>Cuentas del equipo</h2></div></div>
            <div className="staff-account-grid">
              {staffAccounts.map((staff) => (
                <article key={staff.id}>
                  <div className={`team-avatar mark-${staff.professionalKey}`}>{staff.name.slice(0, 1)}</div>
                  <div><h3>{staff.name}</h3><p>{staff.email}</p><span>{staff.professionalKey === "adminleon" ? "Acceso administrativo completo" : staff.role === "owner" ? "Acceso completo" : "Solo sus citas y clientas"}</span></div>
                  <b className={staff.mustChangePassword ? "pending-access" : "active-access"}>{staff.mustChangePassword ? "Primer acceso pendiente" : "Cuenta activada"}</b>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === "Cobros" && (
          <>
            <section className="metric-grid payment-metric-grid">
              <article><small>{isOwner ? "Ingresos del mes" : "Mis cobros del mes"}</small><strong>{formatMoney(incomeThisMonth)}</strong><span>Pagos completados</span></article>
              <article className={pendingIncome ? "payment-pending-metric" : ""}><small>Pendiente de cobro</small><strong>{formatMoney(pendingIncome)}</strong><span>{initialPayments.filter((payment) => payment.status === "pending").length} pagos pendientes</span></article>
              <article><small>Cobros de hoy</small><strong>{paymentsToday}</strong><span>Registrados hoy</span></article>
              <article><small>Ticket medio</small><strong>{formatMoney(averageTicket)}</strong><span>Durante este mes</span></article>
            </section>

            <section className="panel-card panel-full-card payment-dashboard-card">
              <div className="panel-card-heading payment-dashboard-heading">
                <div>
                  <small>{isOwner ? "Control general de Kaizen" : "Solo tus citas y clientas"}</small>
                  <h2>Cobros e ingresos</h2>
                  <p>Consulta pagos, revisa importes pendientes y corrige cualquier dato.</p>
                </div>
                <div className="payment-status-filter" aria-label="Filtrar cobros">
                  <button className={paymentStatusFilter === "all" ? "active" : ""} type="button" onClick={() => setPaymentStatusFilter("all")}>Todos</button>
                  <button className={paymentStatusFilter === "paid" ? "active" : ""} type="button" onClick={() => setPaymentStatusFilter("paid")}>Pagados</button>
                  <button className={paymentStatusFilter === "pending" ? "active" : ""} type="button" onClick={() => setPaymentStatusFilter("pending")}>Pendientes</button>
                </div>
              </div>

              <section className="payment-method-summary" aria-label="Cobros del mes por forma de pago">
                {(["cash", "card", "bizum", "transfer"] as const).map((method) => {
                  const methodPayments = paidThisMonth.filter((payment) => payment.method === method);
                  const total = methodPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
                  return (
                    <article key={method}>
                      <span><Image src={paymentMethodIcon(method)} alt="" width={42} height={42} unoptimized /></span>
                      <div><small>{paymentMethodLabel(method)}</small><strong>{formatMoney(total)}</strong></div>
                      <b>{methodPayments.length}</b>
                    </article>
                  );
                })}
              </section>

              {completedWithoutPayment.length > 0 && (
                <section className="unregistered-payments">
                  <header>
                    <div><strong>Cobros sin registrar</strong><p>Citas antiguas que ya aparecen como realizadas.</p></div>
                    <span>{completedWithoutPayment.length}</span>
                  </header>
                  <div>
                    {completedWithoutPayment.map((appointment) => (
                      <article key={appointment.id}>
                        <div><strong>{appointment.client}</strong><small>{appointment.service} · {formatFullDate(appointment.startsAt)}</small></div>
                        <span>{appointment.professional}</span>
                        <button type="button" onClick={() => openPaymentForAppointment(appointment)}>Registrar cobro</button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="payment-ledger" aria-label="Listado de cobros">
                <div className="payment-ledger-head"><span>Clienta y servicio</span><span>Fecha</span><span>Profesional</span><span>Forma</span><span>Importe</span><span>Estado</span><span>Acción</span></div>
                {visiblePayments.map((payment) => (
                  <article key={payment.id}>
                    <div className="payment-ledger-client"><b>{initials(payment.client)}</b><span><strong>{payment.client}</strong><small>{payment.service}</small></span></div>
                    <time>{formatShortDate(payment.startsAt)}</time>
                    <span>{payment.professional}</span>
                    <span className="payment-method-label"><Image src={paymentMethodIcon(payment.method)} alt="" width={24} height={24} unoptimized /> {paymentMethodLabel(payment.method)}</span>
                    <strong className="payment-ledger-amount">{formatMoney(payment.amountCents)}{payment.discountCents > 0 && <small>−{formatMoney(payment.discountCents)} dto.</small>}</strong>
                    <b className={`payment-status-badge ${payment.status}`}>{payment.status === "paid" ? "Pagado" : "Pendiente"}</b>
                    <button type="button" onClick={() => openPayment(payment)}>Modificar</button>
                  </article>
                ))}
                {!visiblePayments.length && (
                  <div className="payment-ledger-empty"><span>€</span><strong>No hay cobros en este filtro</strong><p>Los nuevos cobros aparecerán aquí al finalizar las citas.</p></div>
                )}
              </section>
            </section>
          </>
        )}
      </section>

      {modal && (
        <div className="panel-modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section className={`panel-modal ${modal === "manage" ? "manage-appointment-modal" : ""} ${modal === "clientHistory" ? "client-history-modal" : ""} ${modal === "completeAppointment" ? "completion-record-modal" : ""} ${modal === "treatmentRecord" ? "treatment-record-modal" : ""} ${modal === "payment" ? "payment-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="panel-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><small>{modalKicker(modal)}</small><h2 id="panel-modal-title">{modal === "block" && blockScope === "center" ? "Cerrar el centro" : modalTitle(modal)}</h2></div><button type="button" onClick={() => setModal(null)} aria-label="Cerrar">×</button></header>
            {modal === "client" ? (
              <form onSubmit={addClient}>
                <label className="field"><span>Nombre completo</span><input name="name" required placeholder="Nombre y apellidos" /></label>
                <div className="field-grid">
                  <label className="field"><span>Teléfono</span><input name="phone" type="tel" placeholder="600 000 000" /></label>
                  <label className="field"><span>Correo</span><input name="email" type="email" placeholder="Opcional" /></label>
                </div>
                {isOwner && <label className="field"><span>Profesional responsable</span><select name="professionalId" required defaultValue=""><option value="" disabled>Seleccionar</option>{serviceStaffAccounts.map((staff) => <option value={staff.id} key={staff.id}>{staff.name}</option>)}</select></label>}
                <label className="field"><span>Observaciones</span><textarea name="notes" rows={3} placeholder="Notas internas opcionales" /></label>
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Guardar clienta</button></footer>
              </form>
            ) : modal === "clientHistory" && selectedClient ? (
              <div className="client-history-content">
                <section className="client-history-profile">
                  <div className="client-history-avatar">{initials(selectedClient.name)}</div>
                  <div>
                    <span>{selectedClient.isBlocked ? "Cliente bloqueado" : "Historial de cliente"}</span>
                    <strong>{selectedClient.name}</strong>
                    <small>{selectedClient.phone || selectedClient.email || "Sin contacto"} · Responsable: {selectedClient.professionalName}</small>
                  </div>
                </section>

                <section className="client-history-metrics" aria-label="Resumen del historial">
                  <article><strong>{selectedClientHistory.length}</strong><span>Citas registradas</span></article>
                  <article><strong>{selectedClientHistory.filter((item) => item.status === "completed").length}</strong><span>Realizadas</span></article>
                  <article><strong>{new Set(selectedClientHistory.map((item) => item.professionalId)).size}</strong><span>Profesionales</span></article>
                </section>

                <section className="client-history-list" aria-label={`Historial de ${selectedClient.name}`}>
                  {selectedClientHistory.map((appointment) => (
                    <article className="client-history-entry" key={appointment.id}>
                      <div className="client-history-date">
                        <strong>{formatHistoryDay(appointment.startsAt)}</strong>
                        <span>{formatHistoryMonth(appointment.startsAt)}</span>
                        <time>{appointment.startsAt.slice(11, 16)}</time>
                      </div>
                      <div className="client-history-details">
                        <div>
                          <h3>{appointment.service}</h3>
                          <span>{appointment.professional} · {durationLabel(appointment.startsAt, appointment.endsAt)}</span>
                        </div>
                        <b className={`client-history-status status-${appointment.status}`}>{statusLabel(appointment.status)}</b>
                        {appointment.statusReason && <p className="client-history-status-reason">Motivo: {appointment.statusReason}</p>}
                        {appointment.notes && <p>{appointment.notes}</p>}
                        {appointment.treatmentRecordId && (
                          <button
                            className="view-treatment-record-button"
                            type="button"
                            onClick={() => openTreatmentRecord(appointment.treatmentRecordId!)}
                          >
                            Ver ficha del tratamiento
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                  {!selectedClientHistory.length && (
                    <div className="client-history-empty">
                      <span>○</span>
                      <strong>Todavía no hay tratamientos registrados</strong>
                      <p>Las próximas citas de esta clienta aparecerán aquí automáticamente.</p>
                    </div>
                  )}
                </section>

                <footer className="client-history-footer">
                  <button type="button" onClick={() => setModal(null)}>Cerrar</button>
                  <button type="button" onClick={() => openClient(selectedClient)}>Modificar cliente</button>
                </footer>
              </div>
            ) : modal === "manageClient" && selectedClient ? (
              <form onSubmit={updateClient}>
                <div className="client-modal-summary">
                  <span>{selectedClient.isBlocked ? "Cliente bloqueado" : "Ficha de cliente"}</span>
                  <strong>{selectedClient.name}</strong>
                  <small>{selectedClient.professionalName} · {selectedClient.phone || selectedClient.email}</small>
                </div>
                <label className="field"><span>Nombre completo</span><input name="name" required defaultValue={selectedClient.name} /></label>
                <div className="field-grid">
                  <label className="field"><span>Teléfono</span><input name="phone" type="tel" defaultValue={selectedClient.phone} placeholder="600 000 000" /></label>
                  <label className="field"><span>Correo</span><input name="email" type="email" defaultValue={selectedClient.email} placeholder="Opcional" /></label>
                </div>
                {isOwner && <label className="field"><span>Profesional responsable</span><select name="professionalId" required defaultValue={selectedClient.professionalId}>{serviceStaffAccounts.map((staff) => <option value={staff.id} key={staff.id}>{staff.name}</option>)}</select></label>}
                <label className="field"><span>Observaciones internas</span><textarea name="notes" rows={3} defaultValue={selectedClient.notes} placeholder="Información útil sobre la clienta" /></label>

                <section className={`client-block-section ${clientBlocked ? "is-blocked" : ""}`}>
                  <div>
                    <span>{clientBlocked ? "Acceso a reservas bloqueado" : "Control de reservas"}</span>
                    <p>{clientBlocked ? "Esta clienta no podrá reservar online usando el mismo nombre y teléfono." : "Utilízalo ante impagos o comportamientos graves."}</p>
                  </div>
                  <button
                    className="client-block-toggle"
                    type="button"
                    onClick={() => {
                      setClientBlocked((value) => !value);
                      setError("");
                    }}
                  >
                    {clientBlocked ? "Desbloquear cliente" : "Bloquear cliente"}
                  </button>
                  {clientBlocked && (
                    <label className="field client-block-reason">
                      <span>Motivo del bloqueo</span>
                      <textarea
                        value={clientBlockReason}
                        onChange={(event) => setClientBlockReason(event.target.value)}
                        rows={3}
                        required
                        placeholder="Ej. Impago pendiente o comportamiento inapropiado"
                      />
                      <small>El motivo es privado y solamente lo verá el equipo de Kaizen.</small>
                    </label>
                  )}
                </section>

                <section className="client-delete-section">
                  <div><strong>Eliminar cliente</strong><p>Elimina definitivamente la ficha y sus citas asociadas.</p></div>
                  <button type="button" onClick={() => { setError(""); setClientPendingDeletion(selectedClient); }}>Eliminar cliente</button>
                </section>
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Guardar cambios</button></footer>
              </form>
            ) : modal === "appointment" ? (
              <form onSubmit={addAppointment}>
                {appointmentPrefill && (
                  <section className="follow-up-prefill-note">
                    <span>Próxima visita recomendada</span>
                    <strong>Datos preparados</strong>
                    <p>Revisa la fecha, elige una hora disponible y confirma la nueva cita.</p>
                  </section>
                )}
                <label className="field"><span>Clienta</span><select name="clientId" required defaultValue={appointmentPrefill?.clientId ?? ""}><option value="" disabled>Seleccionar</option>{initialClients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
                <label className="field"><span>Servicio</span><input name="serviceName" required defaultValue={appointmentPrefill?.serviceName ?? ""} placeholder="Ej. Manicura semipermanente" /></label>
                {isOwner && <label className="field"><span>Profesional</span><select name="professionalId" required defaultValue={appointmentPrefill?.professionalId ?? ""}><option value="" disabled>Seleccionar</option>{serviceStaffAccounts.map((staff) => <option value={staff.id} key={staff.id}>{staff.name}</option>)}</select></label>}
                <div className="field-grid">
                  <label className="field"><span>Fecha</span><input name="date" required type="date" defaultValue={appointmentPrefill?.date ?? todayInputValue()} /></label>
                  <label className="field"><span>{appointmentPrefill ? "Hora · elige una" : "Hora"}</span><input name="time" required type="time" min="09:30" max="18:00" step="900" defaultValue={appointmentPrefill ? "" : "09:30"} /></label>
                </div>
                <label className="field"><span>Duración</span><select name="duration" defaultValue={String(appointmentPrefill?.duration ?? 60)}>{durationOptions()}</select></label>
                <label className="field"><span>Notas internas</span><textarea name="notes" rows={2} defaultValue={appointmentPrefill?.notes ?? ""} placeholder="Información útil para la cita" /></label>
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={() => { setAppointmentPrefill(null); setModal(null); }}>Cancelar</button><button type="submit">Añadir cita</button></footer>
              </form>
            ) : modal === "manage" && selectedAppointment ? (
              <form onSubmit={updateAppointment}>
                <div className="appointment-modal-summary">
                  <span>{selectedAppointment.bookingRequestId ? (selectedAppointment.status === "confirmed" ? "Reserva web confirmada" : "Solicitud web pendiente") : selectedAppointment.professional}</span>
                  <strong>{selectedAppointment.client}</strong>
                  <small>{formatShortDate(selectedAppointment.startsAt)} · {formatTime(selectedAppointment.startsAt)} · {durationLabel(selectedAppointment.startsAt, selectedAppointment.endsAt)}</small>
                  {selectedAppointment.bookingRequestId && selectedAppointment.holdExpiresAt && (
                    <small className="web-hold-status">{holdLabel(selectedAppointment.holdExpiresAt, panelOpenedAt)}</small>
                  )}
                </div>
                <label className="field"><span>Clienta</span><select name="clientId" required defaultValue={selectedAppointment.clientId}>{initialClients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
                <label className="field"><span>Servicio</span><input name="serviceName" required defaultValue={selectedAppointment.service} /></label>
                {isOwner && <label className="field"><span>Profesional</span><select name="professionalId" required defaultValue={selectedAppointment.professionalId}>{serviceStaffAccounts.map((staff) => <option value={staff.id} key={staff.id}>{staff.name}</option>)}</select></label>}
                <div className="field-grid">
                  <label className="field"><span>Fecha</span><input name="date" required type="date" defaultValue={selectedAppointment.startsAt.slice(0, 10)} /></label>
                  <label className="field"><span>Hora</span><input name="time" required type="time" min="09:30" max="18:00" step="900" defaultValue={selectedAppointment.startsAt.slice(11, 16)} /></label>
                </div>
                <div className="field-grid">
                  <label className="field"><span>Duración</span><select name="duration" defaultValue={String(durationMinutes(selectedAppointment.startsAt, selectedAppointment.endsAt))}>{durationOptions()}</select></label>
                  <label className="field"><span>Estado</span><select name="status" value={appointmentStatus} onChange={(event) => setAppointmentStatus(event.target.value as AppointmentRow["status"])}><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option>{selectedAppointment.status === "completed" && <option value="completed">Realizada</option>}<option value="cancelled">Cancelada</option><option value="no_show">No acudió</option></select></label>
                </div>
                {(appointmentStatus === "cancelled" || appointmentStatus === "no_show") && (
                  <label className="field appointment-status-reason">
                    <span>{appointmentStatus === "cancelled" ? "Motivo de la cancelación" : "Motivo de la ausencia"}</span>
                    <textarea name="statusReason" rows={2} required defaultValue={selectedAppointment.statusReason} placeholder={appointmentStatus === "cancelled" ? "Ej. La clienta avisó con antelación" : "Ej. No acudió y no respondió"} />
                  </label>
                )}
                <label className="field"><span>Notas internas</span><textarea name="notes" rows={3} defaultValue={selectedAppointment.notes} placeholder="Información útil para la cita" /></label>
                {selectedAppointment.status === "confirmed" && (
                  <section className="finish-appointment-section">
                    <div>
                      <strong>¿El tratamiento terminó antes?</strong>
                      <p>Márcalo como realizado para liberar inmediatamente el tiempo restante.</p>
                    </div>
                    <button type="button" onClick={openCompletionForm}>Finalizar y abrir ficha</button>
                  </section>
                )}
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={() => setModal(null)}>Cerrar</button><button type="submit">Guardar cambios</button></footer>
              </form>
            ) : modal === "completeAppointment" && selectedAppointment ? (
              <form className="completion-record-form" onSubmit={completeAppointment}>
                <section className="completion-client-summary">
                  <div className="completion-check" aria-hidden="true">✓</div>
                  <div>
                    <span>Cita terminada</span>
                    <strong>{selectedAppointment.client}</strong>
                    <small>{selectedAppointment.service} · {selectedAppointment.professional}</small>
                  </div>
                </section>

                <section className="completion-step">
                  <div className="completion-step-number">1</div>
                  <div className="completion-step-heading">
                    <strong>¿Cómo quedó el tratamiento?</strong>
                    <p>Una frase sencilla es suficiente.</p>
                  </div>
                  <label className="field completion-wide-field">
                    <span>Resultado</span>
                    <textarea name="resultNotes" rows={3} required placeholder="Ej. Manicura terminada correctamente, color azul marino." />
                  </label>
                </section>

                <section className="completion-step">
                  <div className="completion-step-number">2</div>
                  <div className="completion-step-heading">
                    <strong>Fotografías</strong>
                    <p>Son opcionales, pero necesitamos guardar la decisión de la clienta.</p>
                  </div>
                  <div className="photo-authorization-options" role="group" aria-label="Autorización de fotografías">
                    <button
                      className={photoAuthorization === "authorized" ? "selected" : ""}
                      type="button"
                      onClick={() => { setPhotoAuthorization("authorized"); setError(""); }}
                    >
                      <span aria-hidden="true">✓</span>
                      <strong>Sí autoriza</strong>
                      <small>Podemos añadir fotos</small>
                    </button>
                    <button
                      className={photoAuthorization === "declined" ? "selected declined" : ""}
                      type="button"
                      onClick={() => { setPhotoAuthorization("declined"); setBeforePhoto(null); setAfterPhoto(null); setError(""); }}
                    >
                      <span aria-hidden="true">×</span>
                      <strong>No autoriza</strong>
                      <small>No se guardará ninguna foto</small>
                    </button>
                  </div>

                  {photoAuthorization === "authorized" && (
                    <div className="treatment-photo-grid">
                      <PhotoPicker
                        kind="Antes"
                        file={beforePhoto}
                        onFile={setBeforePhoto}
                      />
                      <PhotoPicker
                        kind="Después"
                        file={afterPhoto}
                        onFile={setAfterPhoto}
                      />
                    </div>
                  )}
                  {photoAuthorization === "declined" && (
                    <label className="field completion-wide-field photo-decline-note">
                      <span>Nota breve</span>
                      <textarea name="photoDeclineReason" rows={2} required placeholder="Ej. La clienta prefiere no aparecer en fotografías." />
                    </label>
                  )}
                </section>

                <section className="completion-step">
                  <div className="completion-step-number">3</div>
                  <div className="completion-step-heading">
                    <strong>Cuidados y observaciones</strong>
                    <p>Marca lo necesario antes de cerrar.</p>
                  </div>
                  <label className="completion-check-row">
                    <input type="checkbox" name="aftercareProvided" />
                    <span><strong>Se explicaron los cuidados posteriores</strong><small>Por ejemplo, limpieza, hidratación o recomendaciones.</small></span>
                  </label>
                  <div className="incident-question">
                    <span>¿Hubo alguna incidencia?</span>
                    <div>
                      <button className={!incidentOccurred ? "selected" : ""} type="button" onClick={() => setIncidentOccurred(false)}>No</button>
                      <button className={incidentOccurred ? "selected warning" : ""} type="button" onClick={() => setIncidentOccurred(true)}>Sí</button>
                    </div>
                  </div>
                  {incidentOccurred && (
                    <label className="field completion-wide-field">
                      <span>¿Qué ocurrió?</span>
                      <textarea name="incidentNotes" rows={2} required placeholder="Describe brevemente la incidencia." />
                    </label>
                  )}
                </section>

                <section className="completion-step payment-completion-step">
                  <div className="completion-step-number">4</div>
                  <div className="completion-step-heading">
                    <strong>Registrar el cobro</strong>
                    <p>Indica el precio final y cómo se ha pagado.</p>
                  </div>
                  <div className="field-grid completion-payment-amounts">
                    <label className="field">
                      <span>Precio final (€)</span>
                      <input name="paymentAmount" type="text" inputMode="decimal" required placeholder="Ej. 25,00" />
                    </label>
                    <label className="field">
                      <span>Descuento (€) · opcional</span>
                      <input name="paymentDiscount" type="text" inputMode="decimal" defaultValue="0" />
                    </label>
                  </div>
                  <fieldset className="payment-choice-fieldset">
                    <legend>Forma de pago</legend>
                    <div className="payment-method-choices">
                      {(["cash", "card", "bizum", "transfer"] as const).map((method) => (
                        <label key={method}>
                          <input type="radio" name="paymentMethod" value={method} defaultChecked={method === "cash"} />
                          <span><Image src={paymentMethodIcon(method)} alt="" width={42} height={42} unoptimized /></span>
                          <strong>{paymentMethodLabel(method)}</strong>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="payment-choice-fieldset">
                    <legend>Estado del pago</legend>
                    <div className="payment-status-choices">
                      <label><input type="radio" name="paymentStatus" value="paid" defaultChecked /><span>✓</span><strong>Pagado</strong></label>
                      <label><input type="radio" name="paymentStatus" value="pending" /><span>!</span><strong>Pendiente</strong></label>
                    </div>
                  </fieldset>
                  <label className="field completion-wide-field">
                    <span>Nota del cobro · opcional</span>
                    <textarea name="paymentNotes" rows={2} placeholder="Ej. Queda una parte pendiente o descuento especial." />
                  </label>
                </section>

                <details className="completion-optional-details">
                  <summary>Añadir detalles opcionales</summary>
                  <div>
                    <label className="field">
                      <span>Productos, técnica o color</span>
                      <textarea name="treatmentDetails" rows={2} placeholder="Información que pueda ser útil en la próxima visita." />
                    </label>
                    <label className="field">
                      <span>Próxima visita recomendada</span>
                      <input name="nextRecommendedDate" type="date" />
                    </label>
                  </div>
                </details>

                {error && <p className="modal-form-error completion-error" role="alert">{error}</p>}
                <footer className="completion-footer">
                  <button type="button" onClick={() => setModal("manage")}>Volver</button>
                  <button type="submit" disabled={completionSaving}>
                    {completionSaving ? "Guardando ficha…" : "Guardar ficha y finalizar"}
                  </button>
                </footer>
              </form>
            ) : modal === "treatmentRecord" ? (
              <div className="treatment-record-view">
                {recordLoading && <div className="treatment-record-loading">Cargando ficha…</div>}
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                {treatmentRecord && (
                  <>
                    <section className="treatment-record-summary">
                      <span>Tratamiento realizado</span>
                      <strong>{treatmentRecord.client}</strong>
                      <small>{treatmentRecord.service} · {treatmentRecord.professional} · {formatFullDate(treatmentRecord.startsAt)}</small>
                    </section>
                    <section className="treatment-record-result">
                      <small>Resultado</small>
                      <p>{treatmentRecord.resultNotes}</p>
                    </section>
                    {treatmentRecord.photos.length > 0 && (
                      <section className="treatment-record-photos">
                        {(["before", "after"] as const).map((kind) => {
                          const photo = treatmentRecord.photos.find((item) => item.kind === kind);
                          return photo ? (
                            <figure key={photo.id}>
                              <Image src={photo.url} alt={kind === "before" ? "Fotografía antes del tratamiento" : "Fotografía después del tratamiento"} width={520} height={390} unoptimized />
                              <figcaption>{kind === "before" ? "Antes" : "Después"}</figcaption>
                            </figure>
                          ) : null;
                        })}
                      </section>
                    )}
                    <section className="treatment-record-facts">
                      <article><span>Fotografías</span><strong>{treatmentRecord.photoAuthorized ? "Autorizadas" : "No autorizadas"}</strong>{!treatmentRecord.photoAuthorized && <small>{treatmentRecord.photoDeclineReason}</small>}</article>
                      <article><span>Cuidados posteriores</span><strong>{treatmentRecord.aftercareProvided ? "Explicados" : "No marcado"}</strong></article>
                      <article><span>Incidencias</span><strong>{treatmentRecord.incidentOccurred ? "Sí" : "Ninguna"}</strong>{treatmentRecord.incidentOccurred && <small>{treatmentRecord.incidentNotes}</small>}</article>
                      {treatmentRecord.nextRecommendedDate && <article><span>Próxima visita</span><strong>{formatDateOnly(treatmentRecord.nextRecommendedDate)}</strong></article>}
                    </section>
                    {treatmentRecord.treatmentDetails && (
                      <section className="treatment-record-details"><small>Detalles adicionales</small><p>{treatmentRecord.treatmentDetails}</p></section>
                    )}
                    <footer><button type="button" onClick={() => setModal(null)}>Cerrar ficha</button></footer>
                  </>
                )}
              </div>
            ) : modal === "payment" && (selectedPayment || paymentAppointment) ? (
              <form className="payment-form" onSubmit={savePayment}>
                <section className="payment-form-summary">
                  <span>{selectedPayment ? "Cobro registrado" : "Cobro sin registrar"}</span>
                  <strong>{selectedPayment?.client ?? paymentAppointment?.client}</strong>
                  <small>{selectedPayment?.service ?? paymentAppointment?.service} · {selectedPayment?.professional ?? paymentAppointment?.professional} · {formatFullDate(selectedPayment?.startsAt ?? paymentAppointment!.startsAt)}</small>
                </section>
                <div className="field-grid payment-form-amounts">
                  <label className="field"><span>Precio final (€)</span><input name="amount" type="text" inputMode="decimal" required defaultValue={selectedPayment ? centsInput(selectedPayment.amountCents) : ""} placeholder="Ej. 25,00" /></label>
                  <label className="field"><span>Descuento (€) · opcional</span><input name="discount" type="text" inputMode="decimal" defaultValue={selectedPayment ? centsInput(selectedPayment.discountCents) : "0"} /></label>
                </div>
                <fieldset className="payment-choice-fieldset">
                  <legend>Forma de pago</legend>
                  <div className="payment-method-choices">
                    {(["cash", "card", "bizum", "transfer"] as const).map((method) => (
                      <label key={method}>
                        <input type="radio" name="method" value={method} defaultChecked={(selectedPayment?.method ?? "cash") === method} />
                        <span><Image src={paymentMethodIcon(method)} alt="" width={42} height={42} unoptimized /></span><strong>{paymentMethodLabel(method)}</strong>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="payment-choice-fieldset">
                  <legend>Estado del pago</legend>
                  <div className="payment-status-choices">
                    <label><input type="radio" name="status" value="paid" defaultChecked={(selectedPayment?.status ?? "paid") === "paid"} /><span>✓</span><strong>Pagado</strong></label>
                    <label><input type="radio" name="status" value="pending" defaultChecked={selectedPayment?.status === "pending"} /><span>!</span><strong>Pendiente</strong></label>
                  </div>
                </fieldset>
                <label className="field"><span>Nota · opcional</span><textarea name="notes" rows={3} defaultValue={selectedPayment?.notes ?? ""} placeholder="Información privada sobre este cobro." /></label>
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" disabled={paymentSaving}>{paymentSaving ? "Guardando…" : "Guardar cobro"}</button></footer>
              </form>
            ) : modal === "block" ? (
              <form onSubmit={addScheduleBlock}>
                <label className="field"><span>Motivo</span><input name="title" required placeholder={blockScope === "center" ? "Ej. Festivo local o cierre especial" : "Ej. Descanso, vacaciones o formación"} /></label>
                {isOwner && allDayBlock && (
                  <label className="field">
                    <span>Aplicar el cierre a</span>
                    <select value={blockScope} onChange={(event) => setBlockScope(event.target.value as "professional" | "center")}>
                      <option value="center">Todo el centro</option>
                      <option value="professional">Una profesional</option>
                    </select>
                  </label>
                )}
                {isOwner && blockScope === "professional" && <label className="field"><span>Profesional</span><select name="professionalId" required defaultValue={calendarProfessionalId === "all" ? "" : calendarProfessionalId}><option value="" disabled>Seleccionar</option>{serviceStaffAccounts.filter((staff) => staff.isActive).map((staff) => <option value={staff.id} key={staff.id}>{staff.name}</option>)}</select></label>}
                <label className="block-all-day"><input type="checkbox" checked={allDayBlock} onChange={(event) => { setAllDayBlock(event.target.checked); if (!event.target.checked) setBlockScope("professional"); }} /><span><strong>Bloquear días completos</strong><small>Ideal para vacaciones, festivos o ausencias.</small></span></label>
                <div className="field-grid">
                  <label className="field"><span>Desde</span><input name="startDate" required type="date" defaultValue={todayInputValue()} /></label>
                  <label className="field"><span>Hasta</span><input name="endDate" required type="date" defaultValue={todayInputValue()} /></label>
                </div>
                {!allDayBlock && <div className="field-grid">
                  <label className="field"><span>Hora inicial</span><input name="startTime" required type="time" min="09:30" max="18:00" step="900" defaultValue="09:30" /></label>
                  <label className="field"><span>Hora final</span><input name="endTime" required type="time" min="09:30" max="18:00" step="900" defaultValue="10:00" /></label>
                </div>}
                {error && <p className="modal-form-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">{blockScope === "center" ? "Cerrar el centro" : "Bloquear horario"}</button></footer>
              </form>
            ) : null}
          </section>
        </div>
      )}

      {clientPendingDeletion && (
        <div className="client-delete-confirmation-backdrop" role="presentation">
          <section
            className="client-delete-confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="client-delete-confirmation-title"
            aria-describedby="client-delete-confirmation-message"
          >
            <div className="client-delete-warning-icon" aria-hidden="true">!</div>
            <small>ACCIÓN PERMANENTE</small>
            <h2 id="client-delete-confirmation-title">¿Eliminar esta clienta?</h2>
            <p id="client-delete-confirmation-message">
              ¿Estás seguro de que deseas eliminar a <strong>{clientPendingDeletion.name}</strong>? También se eliminarán sus citas y esta acción no se puede deshacer.
            </p>
            {error && <p className="modal-form-error" role="alert">{error}</p>}
            <div className="client-delete-confirmation-actions">
              <button type="button" onClick={() => { setError(""); setClientPendingDeletion(null); }}>Cancelar</button>
              <button type="button" onClick={deleteClient}>Sí, eliminar cliente</button>
            </div>
          </section>
        </div>
      )}

      {confirmationDialog && (
        <div className="appointment-confirmation-backdrop" role="presentation">
          <section
            className="appointment-confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-confirmation-title"
            aria-describedby="appointment-confirmation-message"
          >
            <div className="appointment-confirmation-icon" aria-hidden="true">✓</div>
            <small>{confirmationDialog.kicker ?? "GESTIÓN DE LA CITA"}</small>
            <h2 id="appointment-confirmation-title">{confirmationDialog.title}</h2>
            <p id="appointment-confirmation-message">{confirmationDialog.message}</p>
            {confirmationDialog.followUp ? (
              <div className="appointment-confirmation-actions">
                <button type="button" onClick={closeConfirmationDialog}>Ahora no</button>
                <button type="button" autoFocus onClick={scheduleRecommendedAppointment}>Programar próxima cita</button>
              </div>
            ) : (
              <button type="button" autoFocus onClick={closeConfirmationDialog}>Entendido</button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function AgendaCard({
  appointments,
  isOwner,
  professional,
  setProfessional,
  professionals,
  onShowAll,
}: {
  appointments: AppointmentRow[];
  isOwner: boolean;
  professional: string;
  setProfessional: (value: string) => void;
  professionals: string[];
  onShowAll?: () => void;
}) {
  return (
    <section className="panel-card agenda-card">
      <div className="panel-card-heading">
        <div><small>Agenda guardada</small><h2>Próximas citas</h2></div>
        {isOwner && <div className="professional-filter">{["Todos", ...professionals].map((name) => <button className={professional === name ? "active" : ""} type="button" onClick={() => setProfessional(name)} key={name}>{name}</button>)}</div>}
      </div>
      <div className="agenda-list">
        {appointments.map((appointment) => (
          <article key={appointment.id}>
            <time>{formatTime(appointment.startsAt)}</time>
            <div className={`appointment-mark mark-${appointment.professional.toLowerCase()}`} />
            <div className="appointment-main"><strong>{appointment.client}</strong><span>{appointment.service}{appointment.bookingRequestId && <b className="web-request-badge">WEB</b>}</span></div>
            <div className="appointment-meta"><strong>{appointment.professional}</strong><span>{formatShortDate(appointment.startsAt)} · {durationLabel(appointment.startsAt, appointment.endsAt)}</span></div>
            <span className={`status ${appointment.status === "confirmed" ? "confirmed" : "pending"}`}>{statusLabel(appointment.status)}</span>
            <button type="button" aria-label={`Opciones para ${appointment.client}`}>•••</button>
          </article>
        ))}
        {!appointments.length && <p className="panel-empty">Todavía no hay citas registradas.</p>}
      </div>
      {onShowAll && <button className="show-all" type="button" onClick={onShowAll}>Ver agenda completa →</button>}
    </section>
  );
}

function WhatsappClientSummary({
  appointment,
  label,
}: {
  appointment: AppointmentRow;
  label: string;
}) {
  return (
    <div className="whatsapp-client-summary">
      <span className="whatsapp-client-avatar">{initials(appointment.client)}</span>
      <div>
        <small>{label}</small>
        <strong>{appointment.client}</strong>
        <p>{appointment.service} · {appointment.professional}</p>
        <b>{formatFullDate(appointment.startsAt)} · {formatTime(appointment.startsAt)} h</b>
      </div>
    </div>
  );
}

function WhatsappMessageActions({
  appointment,
  kind,
  slotKey = "",
  message,
  notifications,
  onAction,
}: {
  appointment: AppointmentRow;
  kind: WhatsappNotificationRow["kind"];
  slotKey?: string;
  message: string;
  notifications: WhatsappNotificationRow[];
  onAction: (action: "opened" | "sent") => void;
}) {
  const notification = notifications.find(
    (item) => item.appointmentId === appointment.id && item.kind === kind && item.slotKey === slotKey,
  );
  const phone = normalizeWhatsappPhone(appointment.clientPhone);
  const ready = Boolean(phone && message);
  return (
    <div className="whatsapp-message-actions">
      {notification?.status === "sent" ? (
        <span className="whatsapp-sent-status">✓ Enviado</span>
      ) : notification ? (
        <span className="whatsapp-opened-status">WhatsApp abierto</span>
      ) : (
        <span className="whatsapp-pending-status">Pendiente</span>
      )}
      {ready ? (
        <a
          className="whatsapp-open-button"
          href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => onAction("opened")}
        >
          <span aria-hidden="true">✆</span>
          Abrir WhatsApp
        </a>
      ) : (
        <button className="whatsapp-open-button" type="button" disabled>
          {phone ? "Indica día y hora" : "Falta teléfono"}
        </button>
      )}
      {ready && notification?.status !== "sent" && (
        <button className="whatsapp-mark-sent" type="button" onClick={() => onAction("sent")}>
          Marcar como enviado
        </button>
      )}
    </div>
  );
}

function WhatsappEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="whatsapp-empty">
      <span>✓</span>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function futureAppointments(items: AppointmentRow[]) {
  const now = Date.now();
  return items.filter(
    (item) =>
      new Date(item.startsAt).getTime() >= now &&
      (item.status === "pending" || item.status === "confirmed"),
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Atlantic/Canary",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function durationLabel(start: string, end: string) {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function statusLabel(status: AppointmentRow["status"]) {
  return { pending: "Pendiente", confirmed: "Confirmada", completed: "Realizada", cancelled: "Cancelada", no_show: "No acudió" }[status];
}

function holdLabel(value: string, referenceTime: number) {
  const expires = new Date(value);
  if (expires.getTime() <= referenceTime) return "Bloqueo provisional vencido";
  return `Bloqueo provisional hasta las ${new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Atlantic/Canary",
  }).format(expires)} h`;
}

function modalKicker(modal: PanelModal) {
  return {
    client: "Nueva ficha",
    appointment: "Nueva reserva",
    manage: "Gestión de la cita",
    manageClient: "Gestión de clientes",
    clientHistory: "Registro de visitas",
    block: "Disponibilidad interna",
    completeAppointment: "Cierre de la cita",
    treatmentRecord: "Ficha privada",
    payment: "Control de pagos",
  }[modal];
}

function modalTitle(modal: PanelModal) {
  return {
    client: "Registrar una clienta",
    appointment: "Añadir una cita",
    manage: "Modificar cita",
    manageClient: "Modificar cliente",
    clientHistory: "Historial de la clienta",
    block: "Bloquear horario",
    completeAppointment: "Completar ficha",
    treatmentRecord: "Ficha del tratamiento",
    payment: "Registrar cobro",
  }[modal];
}

function PhotoPicker({
  kind,
  file,
  onFile,
}: {
  kind: "Antes" | "Después";
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const id = kind.toLowerCase();
  return (
    <section className={`treatment-photo-picker ${file ? "has-file" : ""}`}>
      <div>
        <span aria-hidden="true">{file ? "✓" : "＋"}</span>
        <strong>Foto {kind.toLowerCase()}</strong>
        <small>{file ? file.name : "Opcional"}</small>
      </div>
      <div className="treatment-photo-actions">
        <label htmlFor={`${id}-camera`}>Tomar foto</label>
        <input
          id={`${id}-camera`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
        <label htmlFor={`${id}-gallery`}>Elegir del álbum</label>
        <input
          id={`${id}-gallery`}
          type="file"
          accept="image/*"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {file && <button type="button" onClick={() => onFile(null)}>Quitar foto</button>}
    </section>
  );
}

function formatHistoryDay(value: string) {
  return String(Number(value.slice(8, 10)));
}

function formatHistoryMonth(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "2-digit",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00`))
    .replace(" de ", " ");
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function centsInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function paymentMethodLabel(method: PaymentRow["method"]) {
  return {
    cash: "Efectivo",
    card: "Tarjeta",
    bizum: "Bizum",
    transfer: "Transferencia",
  }[method];
}

function paymentMethodIcon(method: PaymentRow["method"]) {
  return {
    cash: "/icons/payment-cash.svg",
    card: "/icons/payment-card.svg",
    bizum: "/icons/payment-bizum.svg",
    transfer: "/icons/payment-transfer.svg",
  }[method];
}

function canaryDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Atlantic/Canary",
  }).format(date);
}

function addDateKey(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeWhatsappPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  return digits.length >= 11 ? digits : "";
}

function whatsappFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "clienta";
}

function whatsappDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function confirmationWhatsappMessage(appointment: AppointmentRow) {
  return `Hola ${whatsappFirstName(appointment.client)} 👋 Tu cita en Kaizen está confirmada ✅\n\n📅 ${whatsappDate(appointment.startsAt)}\n🕒 ${appointment.startsAt.slice(11, 16)} h\n✨ ${appointment.service}\n👩‍💼 ${appointment.professional}\n📍 Edificio Airam, local 14, Barranco Grande\n\nSi necesitas modificarla, escríbenos con antelación. ¡Te esperamos!`;
}

function reminderWhatsappMessage(appointment: AppointmentRow) {
  return `Hola ${whatsappFirstName(appointment.client)} 👋 Te recordamos que mañana tienes una cita en Kaizen.\n\n🕒 ${appointment.startsAt.slice(11, 16)} h\n✨ ${appointment.service}\n👩‍💼 ${appointment.professional}\n📍 Edificio Airam, local 14, Barranco Grande\n\nRespóndenos con una opción:\n1️⃣ Confirmo mi asistencia\n2️⃣ Necesito cancelar\n3️⃣ Quiero reprogramar\n\nRecuerda que puedes cancelar hasta 6 horas antes. ¡Te esperamos!`;
}

function waitlistWhatsappMessage(appointment: AppointmentRow, offer: WaitlistOffer) {
  return `Hola ${whatsappFirstName(appointment.client)} 👋 Ha quedado libre un hueco en Kaizen para ${appointment.service}.\n\n📅 ${whatsappDate(offer.date)}\n🕒 ${offer.time} h\n👩‍💼 ${appointment.professional}\n\nSi te interesa, responde SÍ durante la próxima hora. Si no recibimos respuesta, ofreceremos el hueco a la siguiente clienta. Tu cita actual seguirá guardada hasta que confirmemos el cambio contigo.`;
}

function whatsappWasSent(
  notifications: WhatsappNotificationRow[],
  appointmentId: string,
  kind: WhatsappNotificationRow["kind"],
) {
  return notifications.some(
    (item) => item.appointmentId === appointmentId && item.kind === kind && item.status === "sent",
  );
}

function durationMinutes(start: string, end: string) {
  return Math.round(
    (new Date(`${end}Z`).getTime() - new Date(`${start}Z`).getTime()) / 60000,
  );
}

function durationOptions() {
  return [
    [15, "15 minutos"],
    [30, "30 minutos"],
    [45, "45 minutos"],
    [60, "1 hora"],
    [90, "1 h 30 min"],
    [120, "2 horas"],
    [150, "2 h 30 min"],
    [180, "3 horas"],
    [240, "4 horas"],
  ].map(([value, label]) => <option value={value} key={value}>{label}</option>);
}

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function professionalLabel(professionalKey: string) {
  return {
    sarai: "Sarai",
    yeroha: "Yeroha",
    nurme: "Nurme",
  }[professionalKey] ?? "Equipo Kaizen";
}

function durationText(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}
