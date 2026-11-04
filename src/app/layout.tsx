import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});
const noto = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-devanagari",
});

export const metadata: Metadata = {
  title: { default: "Karm Karo", template: "%s · Karm Karo" },
  description: "Assign the work, then do the work. Team tasks in English, Hindi, and Hinglish.",
  applicationName: "Karm Karo",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Karm Karo" },
};

export const viewport: Viewport = {
  themeColor: "#10101f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const lang = jar.get("karm_locale")?.value === "hi" ? "hi" : "en";
  return (
    <html lang={lang} suppressHydrationWarning className={`${jakarta.variable} ${noto.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
