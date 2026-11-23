import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MealCrafter",
  description: "Know what is in your fridge and what you can cook tonight.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* Phone-width column; on a laptop it sits centered like the Figma frames. */}
        <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper pt-[env(safe-area-inset-top)] sm:border-x sm:border-line">
          {children}
        </div>
      </body>
    </html>
  );
}
