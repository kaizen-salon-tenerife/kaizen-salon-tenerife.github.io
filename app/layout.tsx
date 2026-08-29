import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaizen | Estética, uñas y tatuajes",
  description:
    "Centro de estética, uñas y tatuajes en Barranco Grande, Tenerife. Solicita tu cita de forma sencilla.",
  icons: {
    icon: "/logo-kaizen.png",
    shortcut: "/logo-kaizen.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
