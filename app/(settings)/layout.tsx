import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SettingsSidebar } from "@/components/settings/settings-sidebar"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <SettingsSidebar />
      <SidebarInset className="bg-background">
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
