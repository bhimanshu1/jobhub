import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "./components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobHub — All your tracked careers in one place",
  description: "Aggregate jobs from any career page (Greenhouse, Lever, Ashby).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/10 mt-12">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-3 text-xs opacity-60">
            <span>
              JobHub · jobs from Greenhouse, Lever, and Ashby career pages
            </span>
            <nav className="flex items-center gap-4">
              <a href="/legal/privacy" className="hover:underline">
                Privacy
              </a>
              <a href="/legal/terms" className="hover:underline">
                Terms
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
