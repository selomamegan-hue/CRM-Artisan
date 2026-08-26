import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Bonfil — parlez après chaque intervention";
const description =
  "Appuyez, parlez, c'est gardé. Bonfil écrit ce que vous dites, retrouve le client, " +
  "repère le devis ou la relance à faire, et rassemble tout au même endroit. " +
  "Pensé pour les artisans.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bonfil.app"),
  title: {
    default: title,
    template: "%s · Bonfil",
  },
  description,
  applicationName: "Bonfil",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://bonfil.app",
    siteName: "Bonfil",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
