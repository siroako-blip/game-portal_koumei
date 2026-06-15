import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ゲームポータル",
  description: "ロストシティ・ラブレター・コヨーテなど定番ボードゲームで遊べるオンライン対戦ポータル",
};

// スマートフォンで等倍表示させるための viewport 設定。
// これがないとモバイルではデスクトップ幅(980px)で描画され、全体が縮小表示される。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
