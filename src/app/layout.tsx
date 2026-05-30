import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Líder Financeiro",
  description: "Sistema de gestão financeira e administrativa - Desentupidora Líder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
