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
      <body className={`${inter.className} antialiased`}> 
        <div className="mae-grid" aria-hidden="true" />
        <ReactQueryProvider>
          <AcceptingModeProvider>
            <div className="layout-shell">
              <main className="command-surface custom-scrollbar">
                <div className="command-inner">{children}</div>
              </main>
              <AcceptingModeToggle />
            </div>
          </AcceptingModeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
