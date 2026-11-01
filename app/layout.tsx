import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldForge Lite — Game World Planner",
  description:
    "Turn a game-world idea into an editable world bible, interactive map, and downloadable world kit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
