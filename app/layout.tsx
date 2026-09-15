import type { Metadata } from "next";

import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://clubexxi.com.br"),
  title: "Clube 21 — uma carta sua, todo mês",
  description:
    "Clube de correspondência por assinatura. Todo mês um envelope de papel na sua casa. Frete incluso, enviamos pro mundo todo.",
  openGraph: {
    title: "Clube 21",
    description: "Todo mês um envelope novo na sua casa, com cartas de verdade.",
    images: ["/clube21/logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/zrw7ppl.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
