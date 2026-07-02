import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Roboto, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const name = "Gymflow";
  return {
    title: name,
    description: "Explore tenant gym routines on Gymflow",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme-storage');
                  var theme = saved ? JSON.parse(saved).state.theme : 'dark';
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  // Default to dark
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${roboto.variable} ${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          {children}
          {/* Footer uses usePathname() (uncached data per Next 16 Cache Components
              semantics). Wrap in Suspense so the page can render without
              waiting for the pathname lookup. */}
          <Suspense>
            <Footer />
          </Suspense>
          <Toaster position="bottom-right" richColors toastOptions={{ unstyled: true }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
