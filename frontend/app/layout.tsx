import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./generated.css"; // precompiled Tailwind (globals processed)
import ReactQueryProvider from "@/components/ReactQueryProvider";
import AcceptingModeProvider from "@/components/AcceptingModeProvider";
import AcceptingModeToggle from "@/components/AcceptingModeToggle";

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
            {children}
            <AcceptingModeToggle />
          </AcceptingModeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
