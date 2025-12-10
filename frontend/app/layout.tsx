import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import AcceptingModeProvider from "@/components/AcceptingModeProvider";
import AcceptingModeToggle from "@/components/AcceptingModeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Monthaven Acquisition Engine",
  description: "Institutional Real Estate Acquisition Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#0B0F19] text-slate-100`}>
        {/* The grid background can stay global */}
        <div className="mae-grid" aria-hidden="true" />
        
        <ReactQueryProvider>
          <AcceptingModeProvider>
            {children}
            <AcceptingModeToggle />
          </AcceptingModeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
