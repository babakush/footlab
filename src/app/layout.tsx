import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FOOTLAB · Rendimiento para futbolistas", template: "%s · FOOTLAB" },
  description:
    "Planifica tu semana, registra tus entrenamientos y sigue tu evolución física. La plataforma de rendimiento para futbolistas amateurs, juveniles y semiprofesionales.",
  applicationName: "FOOTLAB",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!bg-elevated !border-border !text-foreground !rounded-xl",
              description: "!text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
