import type { Metadata, Viewport } from "next";

import "../styles/globals.css";
import { ArenaProvider } from "@/lib/state/ArenaContext";
import { CitationViewerProvider } from "@/components/debate/CitationViewer";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getLocale, getServerDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getServerDictionary();
  return {
    title: d.home.meta.title,
    description: d.home.meta.description,
    applicationName: "Debator",
  };
}

export const viewport: Viewport = {
  themeColor: "#F7F7F2",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="font-body antialiased">
        <LocaleProvider initialLocale={locale}>
          <ArenaProvider>
            <CitationViewerProvider>{children}</CitationViewerProvider>
          </ArenaProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
