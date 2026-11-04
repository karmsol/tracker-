import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans_Devanagari, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const noto = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-devanagari" });

export const metadata: Metadata = {
  title: { default: "Karm Karo", template: "%s · Karm Karo" },
  description: "Assign the work, then do the work. Team tasks in English, Hindi, and Hinglish.",
  applicationName: "Karm Karo",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Karm Karo" },
};

export const viewport: Viewport = {
  themeColor: "#1a1744",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const lang = jar.get("karm_locale")?.value === "hi" ? "hi" : "en";
  return (
    <html lang={lang} suppressHydrationWarning className={`${outfit.variable} ${fraunces.variable} ${noto.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
