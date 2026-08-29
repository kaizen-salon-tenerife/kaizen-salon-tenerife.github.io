export const MAX_TREATMENT_PHOTO_BYTES = 10 * 1024 * 1024;

export function treatmentPhotoPath({
  professionalKey,
  clientId,
  recordId,
  kind,
  file,
}: {
  professionalKey: string;
  clientId: string;
  recordId: string;
  kind: "before" | "after";
  file: File;
}) {
  return `${professionalKey}/${clientId}/${recordId}/${kind}-${crypto.randomUUID()}.${extensionFor(file)}`;
}

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return byType[file.type] ?? "jpg";
}
