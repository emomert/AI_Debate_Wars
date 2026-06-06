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

// Applies the persisted theme BEFORE first paint so dark mode doesn't flash
// light. Default is light; only an explicit "dark" choice adds the class. Also
// retints the browser-chrome theme-color meta if it already exists (ThemeToggle
// keeps it in sync after hydration).
const THEME_INIT = `(function(){try{if(localStorage.getItem("debator-theme")==="dark"){document.documentElement.classList.add("dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#2E261F")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="font-body antialiased">
        <ArenaProvider>{children}</ArenaProvider>
      </body>
    </html>
  );
}
