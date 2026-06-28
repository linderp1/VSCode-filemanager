import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Longhorn File Browser",
  description: "Browse files stored on Longhorn volumes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-full">{children}</body>
    </html>
  );
}
