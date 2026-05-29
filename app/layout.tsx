import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { XProviderWrapper } from "@/components/x-provider-wrapper";

const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VidPal - AI 视频学习助手",
  description: "VidPal 多平台视频总结分析工具，AI 驱动的视频学习陪伴助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <AntdRegistry>
          <XProviderWrapper>
            <TooltipProvider>{children}</TooltipProvider>
          </XProviderWrapper>
        </AntdRegistry>
      </body>
    </html>
  );
}
