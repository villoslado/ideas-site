import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "405 AI Business Ideas",
  description:
    "405 AI-generated business ideas across three models — filter, search, and like.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white text-neutral-900">{children}</body>
    </html>
  );
}
