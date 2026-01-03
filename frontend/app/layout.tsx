/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./generated.css"; // precompiled Tailwind (globals processed)
import ReactQueryProvider from "@/components/ReactQueryProvider";
import AcceptingModeProvider from "@/components/AcceptingModeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import PushClient from "@/components/PushClient";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export const metadata: Metadata = {
  title: "MAE Platform",
  description: "Advanced Lead Management & Communication System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MAE",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className={`${inter.className} min-h-screen`}> 
        <ReactQueryProvider>
          <AcceptingModeProvider>
            <ToastProvider>
              {children}
              <PushClient />
            </ToastProvider>
          </AcceptingModeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
