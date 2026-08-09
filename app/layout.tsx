import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import ReadingRulerOverlay from "./components/ReadingRulerOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse: AxionHR Well-Being Guardian",
  description: "Enterprise-grade employee well-being dashboard and privacy-safe guardian.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AccessibilityProvider>
          <ReadingRulerOverlay />
          {children}
        </AccessibilityProvider>
      </body>
    </html>
  );
}
