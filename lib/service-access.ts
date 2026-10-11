type ServiceOperator = { role: "owner" | "professional"; professionalKey: string };

export function canEditService(user: ServiceOperator, serviceProfessionalKey: string) {
  return user.role === "owner"
    || (user.professionalKey === "nurme" && serviceProfessionalKey === "nurme");
}
