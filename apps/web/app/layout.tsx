import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Helper",
  description: "Local AI-assisted U.S. stock analysis dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
