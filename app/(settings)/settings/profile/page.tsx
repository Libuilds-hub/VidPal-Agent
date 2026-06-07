"use client"

import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { SettingRow } from "@/components/settings/settings-ui"

export default function ProfilePage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="个人信息" description="管理您的基本账户和安全信息" />
        
        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">个人资料</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-4 shadow-xs flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm font-medium bg-muted/70 border border-border/40 text-foreground/80">A</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-sm font-semibold text-foreground">admin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">系统超级管理员</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">账号信息</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-1.5 shadow-xs">
            <SettingRow label="用户名" description="您的系统登录账号">
              <Input value="admin" disabled className="w-[200px] h-8 text-xs bg-muted/20" />
            </SettingRow>
            <SettingRow label="邮箱" description="用于接收通知和报告">
              <Input value="admin@example.com" disabled className="w-[200px] h-8 text-xs bg-muted/20" />
            </SettingRow>
          </div>
        </div>

        <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75">
          <h2 className="text-[12px] font-semibold text-red-500/70 dark:text-red-400/70 uppercase tracking-wider select-none pl-1">危险区域</h2>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 divide-y divide-red-500/10 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <div className="text-sm font-normal text-foreground">退出当前登录</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-normal">安全断开与当前设备的连接并清除会话历史缓存</div>
              </div>
              <button
                onClick={() => {
                  if (confirm("确定要退出当前登录吗？")) {
                    alert("已安全退出登录")
                    window.location.href = "/"
                  }
                }}
                className="h-7 px-3 text-xs font-medium rounded-md border border-border/40 hover:bg-muted/70 dark:hover:bg-muted/40 bg-card transition-all duration-150 cursor-pointer select-none"
              >
                退出登录
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <div className="text-sm font-normal text-red-600 dark:text-red-400">注销系统账号</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-normal">永久删除此账号及所有关联的本地会话历史与数据库，此操作不可逆</div>
              </div>
              <button
                onClick={() => {
                  if (confirm("⚠️ 警告：注销账号将永久删除您的所有数据（包含所有会话历史和数据库配置），此操作无法撤销！\n\n您确定要进行注销操作吗？")) {
                    const confirmation = prompt("确认永久注销？请输入 \"yes\" 确认：")
                    if (confirmation?.toLowerCase() === "yes") {
                      alert("账号注销成功，感谢您的使用！")
                      window.location.href = "/"
                    } else {
                      alert("操作已取消")
                    }
                  }
                }}
                className="h-7 px-3 text-xs font-medium rounded-md bg-red-600 hover:bg-red-700 text-white transition-all duration-150 cursor-pointer select-none border-0"
              >
                注销账号
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
