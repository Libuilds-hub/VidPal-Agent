import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { XProviderWrapper } from "@/components/x-provider-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
