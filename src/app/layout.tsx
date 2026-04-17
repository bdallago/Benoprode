import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../index.css";
import { Providers } from "../components/Providers";
import { ThemeProvider } from "../components/ThemeProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "El Prode de Beno | Mundial 2026",
    template: "%s | El Prode de Beno"
  },
  description: "Demostrá cuánto sabés de fútbol. Jugá al prode del Mundial 2026, creá ligas con amigos y competí por ser el mejor pronosticador.",
  keywords: ["prode", "mundial 2026", "fútbol", "predicciones", "juego", "amigos", "ligas", "beno"],
  authors: [{ name: "Beno" }],
  creator: "Beno",
  publisher: "El Prode de Beno",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.elprodedebeno.com.ar"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: '/icono.png?v=3',
    shortcut: '/icono.png?v=3',
    apple: '/icono.png?v=3',
  },
  openGraph: {
    title: "El Prode de Beno | Mundial 2026",
    description: "Demostrá cuánto sabés de fútbol. Jugá al prode del Mundial 2026, creá ligas con amigos y competí por ser el mejor pronosticador.",
    url: "https://www.elprodedebeno.com.ar",
    siteName: "El Prode de Beno",
    images: [
      {
        url: "/og-image.png", // We should add an og-image later
        width: 1200,
        height: 630,
        alt: "El Prode de Beno - Mundial 2026",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "El Prode de Beno | Mundial 2026",
    description: "Demostrá cuánto sabés de fútbol. Jugá al prode del Mundial 2026, creá ligas con amigos y competí por ser el mejor pronosticador.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prode Beno",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
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
