import type { Metadata } from "next";
import "./globals.css";
import "./mb-beauty.css";

export const metadata: Metadata = {
  // Prepared target; activate the Worker only after Manuel approves deployment.
  metadataBase: new URL("https://mb-beauty.leonforge.workers.dev"),
  title: "MB Nurme Beauty | Estética y cuidado personalizado",
  description:
    "Estética, manicura y cuidado personalizado en La Laguna, Tenerife.",
  applicationName: "MB Nurme Beauty",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MB Nurme Beauty", statusBarStyle: "default" },
  openGraph: {
    title: "MB Nurme Beauty",
    description: "Estética, manicura y cuidado personalizado en La Laguna, Tenerife.",
    siteName: "MB Nurme Beauty",
    locale: "es_ES",
    type: "website",
    images: [{ url: "https://mb-beauty.leonforge.workers.dev/brand/logo/mb-nurme-beauty-share.jpg", width: 1200, height: 1200, alt: "MB Nurme Beauty Estética" }],
  },
  twitter: { card: "summary_large_image", title: "MB Nurme Beauty", description: "Estética, manicura y cuidado personalizado en La Laguna, Tenerife.", images: ["https://mb-beauty.leonforge.workers.dev/brand/logo/mb-nurme-beauty-share.jpg"] },
  icons: {
    icon: "/brand/logo/mb-nurme-beauty-favicon-32.png",
    shortcut: "/brand/logo/mb-nurme-beauty-favicon-32.png",
    apple: "/brand/logo/mb-nurme-beauty-apple-touch-icon.png",
  },
};

export const viewport = { themeColor: "#F8F4EC", width: "device-width", initialScale: 1 };

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
