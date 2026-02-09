import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/layout/ClientProviders";

export const metadata: Metadata = {
  title: "Pro Se Coach — NY Family Court Order of Protection",
  description:
    "Educational tool for understanding NY Family Court Orders of Protection. Not legal advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
