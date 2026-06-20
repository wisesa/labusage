import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin User Login",
  description: "Halaman admin untuk CRUD username dan password aplikasi client.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
