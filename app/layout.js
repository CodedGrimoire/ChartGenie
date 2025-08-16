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

export const metadata = {
  title: "ChartGenie - AI-Powered Database Diagram Generator",
  description: "Create professional database diagrams with AI. Support for Mermaid, LaTeX TikZ, PGF, and PlantUML formats.",
  keywords: "database diagram, ERD, AI, mermaid, latex, plantuml, schema design",
  authors: [{ name: "ChartGenie Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800`}
      >
        {children}
      </body>
    </html>
  );
}
