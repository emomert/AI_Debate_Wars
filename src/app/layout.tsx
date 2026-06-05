import type { Metadata, Viewport } from "next";

import "../styles/globals.css";
import { ArenaProvider } from "@/lib/state/ArenaContext";

export const metadata: Metadata = {
  title: "Debator — Make AIs Fight Your Ideas",
  description:
    "A gamified arcade where two AI models debate or discuss your topic under structured rounds, visible costs and an optional judge.",
  applicationName: "Debator",
};

export const viewport: Viewport = {
  themeColor: "#F7F7F2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <ArenaProvider>{children}</ArenaProvider>
      </body>
    </html>
  );
}
