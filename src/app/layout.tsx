import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { CouponModal } from "@/components/CouponModal";
import { PwaRegister } from "@/components/PwaInstaller";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Unspoken AI — Smart Conversation Replies",
    template: "%s | Unspoken AI",
  },
  description:
    "Upload a chat screenshot or paste a conversation and get three natural reply suggestions — Normal, Rizz, and Flirty — powered by Unspoken AI.",
  keywords: ["conversation replies", "chat assistant", "AI replies", "rizz", "flirty texts", "unspoken ai"],
  authors: [{ name: "Unspoken AI" }],
  creator: "Unspoken AI",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Unspoken",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Unspoken AI",
    title: "Unspoken AI — Smart Conversation Replies",
    description:
      "Upload a chat screenshot and get three natural reply suggestions powered by Unspoken AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Unspoken AI — Smart Conversation Replies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unspoken AI — Smart Conversation Replies",
    description:
      "Upload a chat screenshot and get three natural reply suggestions powered by Unspoken AI.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <link rel="canonical" href={process.env.NEXT_PUBLIC_APP_URL ?? "/"} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Unspoken" />
      </head>
      <body>
        <PwaRegister />
        {children}
        <CouponModal />
      </body>
    </html>
  );
}
