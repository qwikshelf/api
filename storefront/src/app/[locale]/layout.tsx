import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import QueryProvider from "@/providers/query-provider";
import Navbar from "@/components/layout/navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QwikShelf Store | Fresh Dairy & Essentials",
  description: "Shop fresh dairy, ghee, paneer and daily essentials at QwikShelf Store.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="flex-1">
                {children}
              </div>
              {/* Footer will go here later */}
            </div>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
