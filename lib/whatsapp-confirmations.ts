type ConfirmationAppointment = {
  status: string;
  startsAt: string;
};

// Confirmations apply to appointments from both the staff panel and public booking.
export function appointmentsForConfirmation<T extends ConfirmationAppointment>(
  appointments: T[],
  today: string,
): T[] {
  return appointments.filter(
    (appointment) => appointment.status === "confirmed" && appointment.startsAt.slice(0, 10) >= today,
  );
}
