import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../index.css";
import { Providers } from "../components/Providers";
import { ThemeProvider } from "../components/ThemeProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "El Prode de Beno",
  description: "Demostrá cuánto sabés de fútbol",
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prode Beno",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} overflow-x-hidden`}>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <Providers>{children}</Providers>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
