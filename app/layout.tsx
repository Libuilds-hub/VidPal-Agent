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
  title: "视频总结分析工具",
  description: "多平台视频总结分析工具，帮助个人学习者高效理解和管理视频内容",
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
