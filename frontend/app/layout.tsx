/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./generated.css"; // precompiled Tailwind (globals processed)
import ReactQueryProvider from "@/components/ReactQueryProvider";
import AcceptingModeProvider from "@/components/AcceptingModeProvider";
import AcceptingModeToggle from "@/components/AcceptingModeToggle";
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Monthaven Acquisition Engine",
  description: "Advanced Lead Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen`}> 
        <ReactQueryProvider>
          <AcceptingModeProvider>
            <ToastProvider>
              {children}
              <AcceptingModeToggle />
            </ToastProvider>
          </AcceptingModeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
