import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://verseborn-episodic-jrpg.benji-pendragon.chatgpt.site"),
  title: "Verseborn: Episodic JRPG",
  description:
    "A 16-bit turn-based Verseborn JRPG inspired by the first four comic issues.",
  openGraph: {
    title: "Verseborn: Episodic JRPG",
    description:
      "Explore Cindervale in a 16-bit turn-based JRPG inspired by Verseborn Issues 1-4.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
