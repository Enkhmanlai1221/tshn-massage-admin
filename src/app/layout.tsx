import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Хөгжмийн сургууль — Admin",
  description: "Хөгжмийн сургалтын удирдлагын самбар",
};

/**
 * Багш нар голдуу ГАР УТСААР ордог тул viewport-ыг зөв тохируулна.
 * `maximumScale` хязгаарлахгүй — хараа муутай хэрэглэгч томруулж чадах ёстой.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
