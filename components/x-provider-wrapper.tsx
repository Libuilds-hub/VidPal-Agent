'use client'

import React from 'react'
import { XProvider } from '@ant-design/x'
import zhCN from '@ant-design/x/locale/zh_CN'

interface XProviderWrapperProps {
  children: React.ReactNode
}

export function XProviderWrapper({ children }: XProviderWrapperProps) {
  return <XProvider locale={zhCN}>{children}</XProvider>
}
