import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Массаж салон — Admin",
  description: "Массаж / spa салоны удирдлагын самбар",
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
